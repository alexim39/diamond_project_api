import express from 'express';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { rateLimit } from '../../../shared/http/rateLimit.js';
import { SignupSchema, SigninSchema, ResetRequestSchema, ResetConfirmSchema } from './Auth.validator.js';
import { makeAuthController } from './Auth.controller.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { SignupUseCase } from '../application/Signup.usecase.js';
import { SigninUseCase } from '../application/Signin.usecase.js';
import { GetCurrentPartnerUseCase } from '../application/GetCurrentPartner.usecase.js';
import { RequestPasswordResetUseCase, ResetPasswordUseCase } from '../application/PasswordReset.usecase.js';
import { MongoPartnerRepository, MongoReservationRepository } from '../infrastructure/Auth.mongo.repository.js';
import { BcryptPasswordHasher, JwtSessionIssuer } from '../infrastructure/Auth.crypto.js';
import { PasswordResetMailer } from '../infrastructure/clients/PasswordResetMailer.js';
import { clearRevocations } from '../infrastructure/SessionRevocation.js';
import { runInTransaction } from '../infrastructure/Auth.models.js';

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildAuthRouter = (deps = {}) => {
  const partners = deps.partners ?? new MongoPartnerRepository();
  const reservations = deps.reservations ?? new MongoReservationRepository();
  const hasher = deps.hasher ?? new BcryptPasswordHasher();
  const sessions = deps.sessions ?? new JwtSessionIssuer();
  const tx = deps.tx ?? { runInTransaction };
  const mailer = deps.mailer ?? new PasswordResetMailer();
  const frontendUrl = deps.frontendUrl ?? process.env.FRONTEND_URL ?? 'https://c21fg.online';

  const controller = makeAuthController({
    signup: new SignupUseCase({ partners, reservations, hasher, tx }),
    signin: new SigninUseCase({
      partners, hasher, sessions,
      revocations: deps.revocations ?? { clear: clearRevocations },
    }),
    getCurrentPartner: new GetCurrentPartnerUseCase({ partners }),
    requestPasswordReset: new RequestPasswordResetUseCase({ partners, mailer, frontendUrl }),
    resetPassword: new ResetPasswordUseCase({ partners, hasher }),
  });

  const router = express.Router();
  // Brute-force guard on credential + reset endpoints (per-IP budgets).
  const authLimit = rateLimit({ name: 'auth-attempt', windowMs: 60000, max: 10 });
  const resetLimit = rateLimit({ name: 'auth-reset', windowMs: 60000, max: 5 });
  router.post('/signup', authLimit, validate({ body: SignupSchema }), controller.signup);
  router.post('/signin', authLimit, validate({ body: SigninSchema }), controller.signin);
  router.post('/signout', controller.signout);
  router.get('/me', requireAuth, controller.me);
  router.get('/', requireAuth, controller.me); // legacy alias for GET /auth
  // Presence heartbeat — the dashboard shell pings every few minutes while
  // open; the write is throttled server-side (see touchPresence), and the
  // admin directory reads it as "Online now" (5-min window).
  router.post('/ping', requireAuth, asyncHandler(async (req, res) => {
    await partners.touchPresence(req.auth?.partnerId).catch(() => false);
    res.status(200).json({ message: 'Presence recorded', success: true });
  }));
  router.post('/reset-password-request', resetLimit, validate({ body: ResetRequestSchema }), controller.requestPasswordReset);
  router.post('/reset-password', validate({ body: ResetConfirmSchema }), controller.resetPassword);
  return router;
};

export default buildAuthRouter();
