import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { InitDepositUseCase, HandleDepositCallbackUseCase, DepositStatusUseCase } from '../application/Deposit.usecases.js';
import { OpayClient, OPAY_TEST_BASE, OPAY_LIVE_BASE } from '../infrastructure/OpayClient.js';
import { NotifyUseCase } from '../../notifications/application/NotificationsCenter.usecases.js';
import { MongoStoredNotificationStore } from '../../notifications/infrastructure/StoredNotifications.mongo.repository.js';
import { DEPOSIT_MAX_NGN, DEPOSIT_MIN_NGN } from '../domain/Deposit.js';

const InitSchema = z.object({
  amountNgn: z.number().min(DEPOSIT_MIN_NGN).max(DEPOSIT_MAX_NGN),
  email: z.string().trim().email().max(254).optional(),
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(20).optional(),
});

const StatusQuery = z.object({
  reference: z.string().trim().min(1).max(64),
});

/** Mode-aware Opay config: OPAY_MODE=live selects LIVE_* keys, default test.
 * Legacy single OPAY_PUBLIC_KEY / OPAY_PRIVATE_KEY / OPAY_BASE_URL kept as
 * fallback so older envs keep working. Pure — unit-tested, no I/O. */
export const resolveOpayConfig = (env = process.env) => {
  const live = String(env.OPAY_MODE ?? 'test').toLowerCase() === 'live';
  const conf = live
    ? {
        baseUrl: env.OPAY_LIVE_BASE || OPAY_LIVE_BASE,
        publicKey: env.OPAY_LIVE_PUBLIC_KEY || '',
        privateKey: env.OPAY_LIVE_PRIVATE_KEY || '',
      }
    : {
        baseUrl: env.OPAY_TEST_BASE || OPAY_TEST_BASE,
        publicKey: env.OPAY_TEST_PUBLIC_KEY || '',
        privateKey: env.OPAY_TEST_PRIVATE_KEY || '',
      };
  if (!conf.publicKey) conf.publicKey = env.OPAY_PUBLIC_KEY || '';
  if (!conf.privateKey) conf.privateKey = env.OPAY_PRIVATE_KEY || '';
  if (env.OPAY_BASE_URL) conf.baseUrl = env.OPAY_BASE_URL;
  conf.merchantId = env.OPAY_MERCHANT_ID || '';
  conf.mode = live ? 'live' : 'test';
  return conf;
};

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildDepositRouter = (deps = {}) => {
  const conf = resolveOpayConfig();
  const opay = deps.opay ?? new OpayClient(conf);
  const frontendBase = (process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'https://c21fg.online').replace(/\/+$/, '');
  const notifyStore = new MongoStoredNotificationStore();
  const notify = new NotifyUseCase({ stored: notifyStore });

  const init = deps.init ?? new InitDepositUseCase({
    opay,
    urls: {
      callbackUrl: process.env.OPAY_CALLBACK_URL || undefined,
      returnUrl: `${frontendBase}/dashboard/wallet/deposit/result`,
      cancelUrl: `${frontendBase}/dashboard/wallet/deposit`,
    },
  });
  const callback = deps.callback ?? new HandleDepositCallbackUseCase({
    opay,
    privateKey: conf.privateKey,
    notifier: async (partnerId, amountNgn, reference) => {
      await notify.execute({
        recipientId: String(partnerId),
        category: 'system',
        priority: 'high',
        title: `Wallet credited ₦${Number(amountNgn).toLocaleString()}`,
        body: `Your Opay deposit (${reference}) is confirmed.`,
        icon: 'account_balance_wallet',
        link: '/dashboard/wallet/history',
        key: `deposit:${reference}`,
      });
    },
  });
  const status = deps.status ?? new DepositStatusUseCase({ opay });

  const router = express.Router();

  router.post('/deposit/init', requireAuth, validate({ body: InitSchema }), asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const data = await init.execute({
      partnerId: req.auth?.partnerId,
      amountNgn: body.amountNgn,
      contact: { email: body.email, name: body.name, phone: body.phone },
    });
    res.status(200).json({ message: 'Checkout opened — complete payment with Opay', data, success: true });
  }));

  router.get('/deposit/status', requireAuth, validate({ query: StatusQuery }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    const data = await status.execute({ partnerId: req.auth?.partnerId, reference: q.reference });
    res.status(200).json({ message: 'Deposit status retrieved successfully', data, success: true });
  }));

  // PUBLIC Opay webhook — signature-verified inside the usecase, always 200
  // on handled outcomes (Opay retries non-2xx for 72h; only unknown
  // references and bad signatures 4xx, which must NOT be retried).
  router.post('/deposit/callback', asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    try {
      const data = await callback.execute({ payload: body.payload ?? null, sha512: body.sha512 ?? null });
      res.status(200).json({ message: 'Callback handled', data, success: true });
    } catch (err) {
      if (err?.code === 'BAD_SIGNATURE' || err?.code === 'UNKNOWN_REFERENCE') {
        return res.status(400).json({ message: err.message, success: false, code: err.code });
      }
      throw err;
    }
  }));

  return router;
};

export default buildDepositRouter();
