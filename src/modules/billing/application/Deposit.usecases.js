import { AppError, ValidationException, NotFoundException } from '../../../shared/domain/AppError.js';
import { assertDepositAmount, newDepositReference, toKobo } from '../domain/Deposit.js';
import { verifyCallbackSignature } from '../infrastructure/OpayClient.js';
import { DepositIntentModel } from '../infrastructure/Deposit.mongo.model.js';
import { PartnersModel, TransactionModel, runInTransaction } from '../infrastructure/Billing.models.js';

/**
 * POST /v1/billing/deposit/init — open a cashier session for a top-up.
 * Amount comes from the member but is re-validated + converted server-side;
 * the reference is ours (unique), never the client's.
 */
export class InitDepositUseCase {
  /** @param {{deposits, opay, partners, urls}} deps */
  constructor({ deposits, opay, partners, urls }) {
    Object.assign(this, {
      deposits: deposits ?? DepositIntentModel,
      opay,
      partners: partners ?? PartnersModel,
      urls: urls ?? {},
    });
  }

  async execute({ partnerId, amountNgn, contact = {} }) {
    const amount = assertDepositAmount(amountNgn);
    if (!this.opay?.enabled) {
      throw new AppError('Deposits are not available right now', 503, 'DEPOSITS_DISABLED');
    }
    const member = await this.partners.findById(partnerId).select('name surname email phone').lean();
    if (!member) throw new NotFoundException('Partner not found');

    const amountKobo = toKobo(amount);
    let reference = newDepositReference();
    let intent = await this.deposits.create({
      reference, partnerId, amountNgn: amount, amountKobo, status: 'created',
    }).catch(async (err) => {
      if (err?.code !== 11000) throw err;
      reference = newDepositReference();
      return this.deposits.create({ reference, partnerId, amountNgn: amount, amountKobo, status: 'created' });
    });

    const name = [member.name, member.surname].filter(Boolean).join(' ') || member.username;
    let opened;
    try {
      opened = await this.opay.createCashier({
        reference,
        amountKobo,
        email: contact.email ?? member.email ?? '',
        name: contact.name ?? name,
        phone: contact.phone ?? member.phone ?? '',
        userId: String(partnerId),
        callbackUrl: this.urls.callbackUrl ?? null,
        returnUrl: this.urls.returnUrl ? `${this.urls.returnUrl}?reference=${reference}` : null,
        cancelUrl: this.urls.cancelUrl ?? this.urls.returnUrl ?? null,
      });
    } catch (err) {
      await this.deposits.updateOne({ _id: intent._id }, { $set: { status: 'failed' } }).catch(() => null);
      throw new ValidationException(`Could not open checkout: ${err?.message ?? 'gateway error'}`);
    }
    intent = await this.deposits.findByIdAndUpdate(
      intent._id,
      { $set: { status: 'pending', orderNo: opened.orderNo ?? null } },
      { new: true },
    ).lean();
    return {
      reference,
      orderNo: opened.orderNo ?? null,
      cashierUrl: opened.cashierUrl,
      amountNgn: amount,
      expiresInMinutes: 30,
      intent: { id: String(intent._id), status: intent.status },
    };
  }
}

/**
 * POST /v1/billing/deposit/callback — PUBLIC Opay webhook.
 * Order of operations is the security model: verify signature →
 * load intent → cross-check via query-status → credit once →
 * always answer 200 (Opay retries non-2xx for 72h; idempotency makes
 * retries safe, failures loud in logs instead).
 */
export class HandleDepositCallbackUseCase {
  /** @param {{deposits, opay, privateKey, notifier?}} deps */
  constructor({ deposits, opay, privateKey, notifier = null }) {
    Object.assign(this, { deposits: deposits ?? DepositIntentModel, opay, privateKey, notifier });
  }

  async execute({ payload, sha512 }) {
    if (!verifyCallbackSignature(payload, sha512, this.privateKey ?? '')) {
      const err = new Error('Invalid callback signature');
      err.code = 'BAD_SIGNATURE';
      throw err;
    }
    const reference = String(payload?.reference ?? '');
    const intent = await this.deposits.findOne({ reference }).lean();
    if (!intent) {
      const err = new Error(`Unknown deposit reference ${reference}`);
      err.code = 'UNKNOWN_REFERENCE';
      throw err;
    }
    if (intent.status === 'success') return { status: 'success', deduped: true, reference };

    // Docs-recommended cross-verification before trusting the push.
    let live = null;
    try {
      live = await this.opay.queryStatus(reference);
    } catch (err) {
      console.error(`[deposit] status cross-check failed for ${reference}: ${err?.message ?? err}`);
    }
    const success = String(payload?.status ?? '').toUpperCase() === 'SUCCESS'
      && (!live || String(live.status ?? '').toUpperCase() === 'SUCCESS');
    if (!success) {
      const terminal = ['FAIL', 'CLOSE'].includes(String(live?.status ?? payload?.status ?? '').toUpperCase());
      await this.deposits.updateOne({ _id: intent._id }, {
        $set: { status: terminal ? 'failed' : intent.status, lastCallback: payload },
      }).catch(() => null);
      return { status: terminal ? 'failed' : intent.status, reference, verifiedLive: !!live };
    }

    // Credit exactly once: atomically claim the intent (status flip) and
    // only the claim winner credits. Retries and concurrent callbacks
    // converge on `deduped: true` instead of double credit.
    const claimed = await runInTransaction(async (session) => {
      const opt = session ? { session } : {};
      const doc = await this.deposits.findOneAndUpdate(
        { _id: intent._id, status: { $ne: 'success' } },
        { $set: { status: 'success', creditedAt: new Date(), lastCallback: payload } },
        { new: false, ...opt },
      ).lean().catch(() => null);
      if (!doc) return null;
      await PartnersModel.findByIdAndUpdate(
        doc.partnerId,
        { $inc: { balance: doc.amountNgn } },
        opt,
      );
      await TransactionModel.create([{
        partnerId: doc.partnerId,
        amount: doc.amountNgn,
        status: 'Completed',
        paymentMethod: 'Opay Deposit',
        transactionType: 'Credit',
        reference: doc.reference,
      }], opt);
      return doc;
    }).catch(() => null);
    const deduped = !claimed;

    if (this.notifier && claimed) {
      await this.notifier(intent.partnerId, intent.amountNgn, reference).catch(() => null);
    }
    return { status: 'success', deduped, reference };
  }
}

/** GET /v1/billing/deposit/status — owner-scoped intent + live refresh. */
export class DepositStatusUseCase {
  /** @param {{deposits, opay}} deps */
  constructor({ deposits, opay }) {
    Object.assign(this, { deposits: deposits ?? DepositIntentModel, opay });
  }

  async execute({ partnerId, reference }) {
    const intent = await this.deposits.findOne({
      reference: String(reference ?? ''),
      partnerId,
    }).lean();
    if (!intent) throw new NotFoundException('Deposit not found');
    let live = null;
    if (intent.status !== 'success' && this.opay?.enabled) {
      try {
        live = await this.opay.queryStatus(intent.reference);
      } catch {
        live = null; // stored state below still answers
      }
    }
    return {
      reference: intent.reference,
      status: intent.status,
      amountNgn: intent.amountNgn,
      orderNo: intent.orderNo ?? null,
      creditedAt: intent.creditedAt ?? null,
      liveStatus: live?.status ?? null,
    };
  }
}
