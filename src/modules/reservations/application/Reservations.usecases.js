import { ConflictException, NotFoundException, ValidationException } from '../../../shared/domain/AppError.js';
import { createRecordEntity } from '../domain/Reservation.entity.js';
import { PartnersModel } from '../../../apps/partner/models/partner.model.js';
import { ProspectModel } from '../../../apps/prospect/models/prospect.model.js';
import { NotifyUseCase } from '../../notifications/application/NotificationsCenter.usecases.js';
import { MongoStoredNotificationStore } from '../../notifications/infrastructure/StoredNotifications.mongo.repository.js';
import { sendEmail } from '../../../services/emailService.js';

/** POST /v1/reservations/record — upline links a code (→ Approved, ready to use). */
export class RecordReservationUseCase {
  /** @param {{reservations}} deps */
  constructor({ reservations }) {
    this.reservations = reservations;
  }

  async execute({ referrerId, code, prospectId = null }) {
    const entity = createRecordEntity({ code, prospectId });
    return this.reservations.record({ ...entity, partnerId: referrerId });
  }
}

/** GET /v1/reservations/mine — codes this partner recorded. */
export class ListMyReservationsUseCase {
  /** @param {{reservations}} deps */
  constructor({ reservations }) {
    this.reservations = reservations;
  }

  async execute({ referrerId, limit = 50 }) {
    const items = await this.reservations.listByPartner(referrerId, limit);
    return {
      items: items.map((r) => ({
        id: String(r.id),
        code: r.code,
        status: r.status,
        prospectId: r.prospectId ?? null,
        createdAt: r.createdAt ?? null,
      })),
      total: items.length,
    };
  }
}

const REVIEW_STATUSES = ['Pending', 'Approved', 'Rejected', 'Used'];

/** GET /v1/reservations/queue — admin review of legacy Pending codes. */
export class ListReviewQueueUseCase {
  /** @param {{reservations}} deps */
  constructor({ reservations }) {
    this.reservations = reservations;
  }

  async execute({ status = 'Pending', limit = 50, skip = 0, q = '' }) {
    if (!REVIEW_STATUSES.includes(status) && status !== 'All') {
      throw new ValidationException('Invalid status filter');
    }
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const sk = Math.max(Number(skip) || 0, 0);
    const [{ items, total }, summary] = await Promise.all([
      this.reservations.listByStatus(status, lim, sk, q),
      this.reservations.statusSummary().catch(() => null),
    ]);
    // NOTE: filter raw values BEFORE String() — String(null) is the
    // truthy string 'null', which poisons the $in cast and blanks EVERY
    // label via the catch fallback. That was the empty-column bug.
    const partnerIds = [...new Set(items.map((r) => r.partnerId).filter(Boolean).map(String))];
    const prospectIds = [...new Set(items.map((r) => r.prospectId).filter(Boolean).map(String))];
    const codes = [...new Set(items.map((r) => String(r.code ?? '')).filter(Boolean))];
    const [partners, prospects, consumers] = await Promise.all([
      partnerIds.length > 0
        ? PartnersModel.find({ _id: { $in: partnerIds } }).select('username name surname').lean().catch(() => [])
        : [],
      prospectIds.length > 0
        ? ProspectModel.find({ _id: { $in: prospectIds } }).select('prospectName prospectSurname prospectPhone').lean().catch(() => [])
        : [],
      // Consumer: the partner account holding this code at signup (Used codes
      // always resolve; Approved codes resolve once consumed).
      codes.length > 0
        ? PartnersModel.find({ reservationCode: { $in: codes } }).select('username name surname reservationCode').lean().catch(() => [])
        : [],
    ]);
    const partnerLabels = Object.fromEntries((partners ?? []).map((p) => [String(p._id), {
      username: p.username,
      name: [p.name, p.surname].filter(Boolean).join(' ') || p.username,
    }]));
    const prospectLabels = Object.fromEntries((prospects ?? []).map((p) => [String(p._id), {
      name: [p.prospectName, p.prospectSurname].filter(Boolean).join(' ') || 'Unnamed',
      phone: p.prospectPhone ?? '',
    }]));
    const consumerLabels = Object.fromEntries((consumers ?? []).map((p) => [String(p.reservationCode), {
      username: p.username,
      name: [p.name, p.surname].filter(Boolean).join(' ') || p.username,
    }]));
    return {
      items: items.map((r) => ({
        id: String(r.id ?? r._id),
        code: r.code,
        status: r.status,
        createdAt: r.createdAt ?? null,
        issuer: partnerLabels[String(r.partnerId)] ?? (r.partnerId
          ? { username: String(r.partnerId).slice(-6), name: 'Former member' }
          : null),
        prospect: r.prospectId ? (prospectLabels[String(r.prospectId)] ?? { name: 'Unknown', phone: '' }) : null,
        consumer: consumerLabels[String(r.code)] ?? null,
      })),
      total,
      summary,
    };
  }
}

/**
 * DELETE (admin) — hard delete with lifecycle guards. Pending/Rejected go
 * freely; Approved only while no partner account holds the code; Used is
 * history and never deletable (409 either way).
 */
export class DeleteReservationUseCase {
  /** @param {{reservations}} deps */
  constructor({ reservations }) {
    this.reservations = reservations;
  }

  async execute({ reservationId }) {
    const existing = await this.reservations.findById(reservationId);
    if (!existing) throw new NotFoundException('Reservation code not found');
    if (existing.status === 'Used') {
      throw new ConflictException('Used codes are history and cannot be deleted');
    }
    if (existing.status === 'Approved') {
      const held = await PartnersModel.exists({ reservationCode: existing.code }).catch(() => null);
      if (held) throw new ConflictException('Code is held by a partner account and cannot be deleted');
    }
    return this.reservations.hardDelete(reservationId);
  }
}

/** PATCH /v1/reservations/:id — admin moves a code between review states. */
export class DecideReservationUseCase {
  /** @param {{reservations}} deps */
  constructor({ reservations }) {
    this.reservations = reservations;
  }

  async execute({ reservationId, status }) {
    // Used is terminal (signup history); everything else moves freely so
    // admins can re-queue (→Pending) or kill (→Rejected) any live code.
    const TRANSITIONS = {
      Pending: ['Approved', 'Rejected'],
      Approved: ['Pending', 'Rejected'],
      Rejected: ['Pending', 'Approved'],
      Used: [],
    };
    if (!Object.values(TRANSITIONS).flat().includes(status)) {
      throw new ValidationException('Invalid status');
    }
    const existing = await this.reservations.findById(reservationId);
    if (!existing) throw new NotFoundException('Reservation code not found');
    const from = existing.status;
    if (!(TRANSITIONS[from] ?? []).includes(status)) {
      throw new ConflictException(
        from === 'Used'
          ? 'Used codes are history and cannot be moved'
          : `Cannot move code from ${from} to ${status}`,
      );
    }
    const updated = await this.reservations.decide(reservationId, status, [from]);
    // Null = raced out of the expected state between the two reads.
    if (!updated) throw new ConflictException(`Code is no longer ${from}`);
    // Best-effort issuer notice — never fails the decision.
    const moveNote = status === 'Approved'
      ? { title: `Code ${updated.code} approved — ready to use`, body: 'The reservation code is now usable at signup.', subject: 'Reservation code approved' }
      : status === 'Rejected'
        ? { title: `Code ${updated.code} was not approved`, body: 'The reservation code was rejected and can no longer be used.', subject: 'Reservation code not approved' }
        : { title: `Code ${updated.code} is back under review`, body: 'The reservation code is pending admin review again.', subject: 'Reservation code under review' };
    try {
      const stored = new MongoStoredNotificationStore();
      await new NotifyUseCase({ stored }).execute({
        recipientId: String(updated.partnerId),
        category: 'team',
        priority: status === 'Rejected' ? 'high' : 'medium',
        title: moveNote.title,
        body: moveNote.body,
        icon: 'confirmation_number',
        link: '/dashboard/mentorship/partners/my-partners',
        key: `reservation:${updated.id ?? reservationId}:${status}:${Date.now()}`,
      }).catch(() => null);
      const issuer = await PartnersModel.findById(updated.partnerId).select('email').lean().catch(() => null);
      if (issuer?.email) {
        await sendEmail(
          issuer.email,
          moveNote.subject,
          `<p>Code <strong>${updated.code}</strong> was ${status.toLowerCase()}.</p>`,
        ).catch(() => null);
      }
    } catch { /* notify never fails the decision */ }
    return updated;
  }
}
