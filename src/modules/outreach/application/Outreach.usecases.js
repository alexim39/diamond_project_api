import { AppError, NotFoundException, ValidationException } from '../../../shared/domain/AppError.js';
import { createBulkEmailEntity, createBulkSmsEntity } from '../domain/Outreach.entity.js';
import { PartnersModel } from '../../../apps/partner/models/partner.model.js';
import { TransactionModel } from '../../../apps/transaction/models/transaction.model.js';
import { ParterSMSModel } from '../../../apps/sms/models/sms.model.js';
import { ParterEmailsModel } from '../../../apps/email/models/email.model.js';
import { ScheduledSmsModel } from '../infrastructure/ScheduledSms.model.js';
import { sendEmail } from '../../../services/emailService.js';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

/**
 * Shared charge + send + record core (used by immediate sends and the
 * scheduled worker). Charge happens at send time, so cancelled or
 * never-due items never touch the wallet.
 */
export const deliverBulkSms = async ({ partners, transactions, records, sms }, { partnerId, to, body, campaignId = null, reference = null }) => {
  const entity = createBulkSmsEntity({ to, body });
  const partner = await partners.findById(partnerId);
  if (!partner) throw new NotFoundException('Partner not found');
  if ((partner.balance ?? 0) < entity.cost) {
    throw new AppError('Insufficient balance for transaction', 401, 'INSUFFICIENT_BALANCE');
  }
  partner.balance -= entity.cost;
  await partner.save();
  const transaction = await transactions.create({
    partnerId: partner._id,
    amount: entity.cost,
    status: 'Completed',
    paymentMethod: 'SMS Charge',
    transactionType: 'Debit',
    reference: reference ?? Math.floor(100000000 + Math.random() * 900000000).toString(),
  });

  const failed = [];
  let sent = 0;
  let index = 0;
  for (const recipient of entity.to) {
    const ref = `${transaction._id}:${index}`;
    index += 1;
    try {
      // eslint-disable-next-line no-await-in-loop
      await sms.send({ to: recipient, title: '', body: entity.body, extra: { customer_reference: ref } });
      sent += 1;
    } catch (error) {
      failed.push({ to: recipient, error: error?.message ?? 'Send failed' });
    }
  }
  const status = failed.length === 0 ? 'success' : sent === 0 ? 'failed' : 'partial';
  await records.create({
    smsBody: entity.body,
    partnerId: partner._id,
    prospect: entity.to,
    transactionId: transaction._id,
    status,
    cost: entity.cost,
    ...(campaignId ? { campaignId } : {}),
  });
  return {
    sent,
    failed,
    total: entity.to.length,
    pages: entity.pages,
    cost: entity.cost,
    transactionId: String(transaction._id),
    status,
  };
};

/**
 * POST /v1/outreach/sms — one call replaces the legacy three-step
 * (charge → browser-direct gateway → save). Same economics as billing
 * bulkSMSCharge (per-page rate, wallet debit, Completed/Debit record);
 * the gateway secret never leaves the server. Charge happens only when
 * a real sender is configured — a disabled provider answers 503 before
 * any money moves. Per-recipient failures are collected, never fatal.
 */
export class SendBulkSmsUseCase {
  /** @param {{partners, transactions, records, sms, smsEnabled, campaigns?}} deps */
  constructor({ partners, transactions, records, sms, smsEnabled = true, campaigns = null } = {}) {
    Object.assign(this, {
      partners: partners ?? PartnersModel,
      transactions: transactions ?? TransactionModel,
      records: records ?? ParterSMSModel,
      sms,
      smsEnabled,
      campaigns,
    });
  }

  async execute({ partnerId, to, body, campaignId = null }) {
    if (!this.smsEnabled || !this.sms) {
      throw new AppError('SMS sending is not configured yet', 503, 'SMS_NOT_CONFIGURED');
    }
    let campaign = null;
    if (campaignId !== undefined && campaignId !== null && String(campaignId).trim() !== '') {
      const id = String(campaignId).trim();
      if (!OBJECT_ID_RE.test(id)) throw new ValidationException('Invalid campaign');
      campaign = this.campaigns
        ? await this.campaigns.findOwned(id, String(partnerId)).catch(() => null)
        : null;
      if (!campaign) throw new NotFoundException('Campaign not found');
    }
    return deliverBulkSms(
      { partners: this.partners, transactions: this.transactions, records: this.records, sms: this.sms },
      { partnerId, to, body, campaignId: campaign ? String(campaign._id ?? campaign.id ?? campaignId) : null },
    );
  }
}

/**
 * Shared bulk-email core (used by the scheduled worker). Free channel —
 * no wallet movement; per-recipient failures collected like SMS.
 */
export const deliverBulkEmail = async ({ partners, records, mail }, { partnerId, to, subject, body }) => {
  const entity = createBulkEmailEntity({ to, subject, body });
  const partner = await partners.findById(partnerId);
  if (!partner) throw new NotFoundException('Partner not found');
  const failed = [];
  let sent = 0;
  for (const recipient of entity.to) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await mail(recipient, entity.subject, entity.body);
      sent += 1;
    } catch (error) {
      failed.push({ to: recipient, error: error?.message ?? 'Send failed' });
    }
  }
  const status = failed.length === 0 ? 'success' : sent === 0 ? 'failed' : 'partial';
  await records.create({
    emailSubject: entity.subject,
    emailBody: entity.body,
    partnerId: partner._id,
    prospects: entity.to,
  });
  return { sent, failed, total: entity.to.length, status };
};

/** Outbox write — validated now, charged at fire time by the worker. */
export class ScheduleBulkSmsUseCase {
  /** @param {{schedules, campaigns?}} deps */
  constructor({ schedules, campaigns = null } = {}) {
    Object.assign(this, {
      schedules: schedules ?? ScheduledSmsModel,
      campaigns,
    });
  }

  async execute({ partnerId, to, body, sendAt, campaignId = null, channel = 'sms', subject = '' }) {
    if (channel !== 'sms' && channel !== 'email') throw new ValidationException('Invalid channel');
    const entity = channel === 'email'
      ? createBulkEmailEntity({ to, subject, body })
      : createBulkSmsEntity({ to, body });
    const at = sendAt instanceof Date ? sendAt : new Date(sendAt);
    if (Number.isNaN(at.getTime())) throw new ValidationException('Invalid scheduled time');
    if (at.getTime() <= Date.now()) throw new ValidationException('Scheduled time must be in the future');
    if (at.getTime() - Date.now() > 30 * 86400000) {
      throw new ValidationException('Scheduled time must be within 30 days');
    }
    let campaign = null;
    if (channel === 'sms' && campaignId !== undefined && campaignId !== null && String(campaignId).trim() !== '') {
      const id = String(campaignId).trim();
      if (!OBJECT_ID_RE.test(id)) throw new ValidationException('Invalid campaign');
      campaign = this.campaigns
        ? await this.campaigns.findOwned(id, String(partnerId)).catch(() => null)
        : null;
      if (!campaign) throw new NotFoundException('Campaign not found');
    }
    const doc = await this.schedules.create({
      partnerId,
      channel,
      to: entity.to,
      smsBody: entity.body,
      emailSubject: channel === 'email' ? entity.subject : '',
      campaignId: campaign ? (campaign._id ?? campaign.id ?? null) : null,
      sendAt: at,
      status: 'scheduled',
    });
    return {
      id: String(doc._id),
      channel,
      to: entity.to,
      pages: channel === 'sms' ? entity.pages : null,
      cost: channel === 'sms' ? entity.cost : 0,
      sendAt: doc.sendAt,
    };
  }
}

/** Partner's scheduled outbox (upcoming + recent), newest first. */
export class ListScheduledSmsUseCase {
  /** @param {{schedules}} deps */
  constructor({ schedules } = {}) {
    this.schedules = schedules ?? ScheduledSmsModel;
  }

  async execute({ partnerId, limit = 50, channel = null }) {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const filter = { partnerId };
    if (channel === 'sms' || channel === 'email') filter.channel = channel;
    const docs = await this.schedules
      .find(filter)
      .sort({ sendAt: -1 })
      .limit(lim)
      .lean();
    return docs.map((d) => ({
      id: String(d._id),
      channel: d.channel ?? 'sms',
      to: d.to ?? [],
      total: (d.to ?? []).length,
      smsBody: d.smsBody ?? '',
      emailSubject: d.emailSubject ?? '',
      campaignId: d.campaignId ? String(d.campaignId) : null,
      sendAt: d.sendAt,
      status: d.status,
      attempts: d.attempts ?? 0,
      result: d.result ?? null,
      createdAt: d.createdAt,
    }));
  }
}

/** Cancel own scheduled send (sent/failed rows are history, not cancellable). */
export class CancelScheduledSmsUseCase {
  /** @param {{schedules}} deps */
  constructor({ schedules } = {}) {
    this.schedules = schedules ?? ScheduledSmsModel;
  }

  async execute({ partnerId, scheduleId }) {
    const doc = await this.schedules.findOneAndUpdate(
      { _id: scheduleId, partnerId, status: 'scheduled' },
      { $set: { status: 'cancelled' } },
      { new: true },
    ).lean();
    if (!doc) throw new NotFoundException('Scheduled send not found');
    return { cancelled: true };
  }
}
