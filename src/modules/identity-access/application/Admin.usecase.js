import { ConflictException, ForbiddenException, NotFoundException } from '../../../shared/domain/AppError.js';
import { lenientRole, normalizeRole } from '../domain/PartnerRole.js';
import { toSafePartner } from '../domain/Partner.entity.js';

/**
 * Change a partner's role. Guards: cannot change your own role (would
 * lock you out or self-escalate silently) and cannot demote the last admin.
 */
export class SetPartnerRoleUseCase {
  /** @param {{partners}} deps */
  constructor({ partners }) {
    this.partners = partners;
  }

  async execute({ requesterId, partnerId, role }) {
    const next = normalizeRole(role);
    if (String(requesterId) === String(partnerId)) {
      throw new ForbiddenException('You cannot change your own role');
    }
    const target = await this.partners.findById(partnerId);
    if (!target) throw new NotFoundException('Partner not found');

    if (lenientRole(target.role) === 'admin' && next !== 'admin') {
      const remaining = await this.partners.countByRole('admin');
      if (remaining <= 1) {
        throw new ConflictException('Cannot demote the last admin');
      }
    }

    const updated = await this.partners.updateById(partnerId, { role: next });
    return toSafePartner(updated);
  }
}

/** Paginated partner directory for the admin console (safe fields only). */
export class ListPartnersUseCase {
  /** @param {{partners}} deps */
  constructor({ partners }) {
    this.partners = partners;
  }

  async execute({ limit = 25, skip = 0, q = '', role = null, suspended = 'all' } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const sk = Math.max(Number(skip) || 0, 0);
    const { items, total } = await this.partners.listPartners({
      limit: lim,
      skip: sk,
      q: String(q ?? '').trim(),
      role: role && role !== 'all' ? String(role).toLowerCase() : null,
      suspended: ['yes', 'no'].includes(suspended) ? suspended : 'all',
    });
    return { items: items.map(toSafePartner), total, limit: lim, skip: sk };
  }
}

/** Platform headcount for the admin console — totals, growth, roles, suspended. */
export class PlatformStatsUseCase {
  /** @param {{partners, progress?}} deps (progress optional — levels omitted without it) */
  constructor({ partners, progress = null }) {
    Object.assign(this, { partners, progress });
  }

  async execute() {
    const base = await this.partners.platformStats();
    let levels = {};
    if (this.progress?.levelDistribution) {
      levels = await this.progress.levelDistribution().catch(() => ({}));
    }
    const distributed = Object.values(levels).reduce((s, n) => s + Number(n), 0);
    return {
      ...base,
      levels,
      // Partners without a journey record yet (never touched progression).
      unranked: Math.max(0, base.total - distributed),
    };
  }
}

/**
 * Suspend / unsuspend a partner. Guards mirror role changes: never
 * yourself (locks you out mid-session) and never the last admin while
 * they still hold the role (locks the console out). Suspension blocks
 * signin immediately; live sessions die at the next session check.
 */
export class SetSuspendUseCase {
  /** @param {{partners, sessions?}} deps (`sessions` = {revoke, clear}; revoked live JWTs on suspend) */
  constructor({ partners, sessions = null }) {
    Object.assign(this, { partners, sessions });
  }

  async execute({ requesterId, partnerId, suspended, reason = null }) {
    if (String(requesterId) === String(partnerId)) {
      throw new ForbiddenException('You cannot suspend your own account');
    }
    const target = await this.partners.findById(partnerId);
    if (!target) throw new NotFoundException('Partner not found');

    const next = !!suspended;
    if (next && lenientRole(target.role) === 'admin') {
      const remaining = await this.partners.countByRole('admin');
      if (remaining <= 1) {
        throw new ConflictException('Cannot suspend the last admin');
      }
    }

    const cleanReason = reason === undefined || reason === null || String(reason).trim() === ''
      ? null
      : String(reason).trim().slice(0, 500);
    const updated = await this.partners.updateById(partnerId, next
      ? { suspendedAt: new Date(), suspendReason: cleanReason }
      : { suspendedAt: null, suspendReason: null });
    // Live JWTs die on the next call (denylist); unsuspend clears it.
    if (this.sessions) {
      if (next) await this.sessions.revoke(String(partnerId), { reason: cleanReason, by: String(requesterId) }).catch(() => null);
      else await this.sessions.clear(String(partnerId)).catch(() => null);
    }
    return toSafePartner(updated);
  }
}

/**
 * Reset-on-behalf: an admin triggers the standard reset flow for a member
 * by id. The link goes to the MEMBER's email — admins never see or set
 * passwords. Unknown ids 404 (admin console, no enumeration concern).
 */
export class ResetOnBehalfUseCase {
  /** @param {{partners, reset}} deps (`reset` = RequestPasswordResetUseCase) */
  constructor({ partners, reset }) {
    Object.assign(this, { partners, reset });
  }

  async execute({ partnerId }) {
    const target = await this.partners.findById(partnerId);
    if (!target) throw new NotFoundException('Partner not found');
    if (!target.email) throw new ConflictException('Partner has no email on record');
    return this.reset.execute({ email: String(target.email).toLowerCase() });
  }
}

/**
 * GDPR erasure: anonymize PII + delete member-owned working data.
 * Guards: never yourself, never the last admin, and never a partner
 * with downline — reassign recruits first (dangling partnerOf links
 * would orphan subtrees in trees, compliance and commission flow).
 *
 * Boundary (documented, deliberate): financial records (ledger entries,
 * transactions, carts/orders) and community posts are RETAINED for
 * dispute and accounting history; the author link stays but the profile
 * behind it is anonymous. The audit row records targetId + counts only —
 * never the erased PII.
 */
export class ErasePartnerUseCase {
  /** @param {{partners, prospects, tickets, codes, sessions?}} deps */
  constructor({ partners, prospects, tickets, codes, sessions = null }) {
    Object.assign(this, { partners, prospects, tickets, codes, sessions });
  }

  async execute({ requesterId, partnerId }) {
    if (String(requesterId) === String(partnerId)) {
      throw new ForbiddenException('You cannot erase your own account');
    }
    const target = await this.partners.findById(partnerId);
    if (!target) throw new NotFoundException('Partner not found');
    if (lenientRole(target.role) === 'admin') {
      const remaining = await this.partners.countByRole('admin');
      if (remaining <= 1) {
        throw new ConflictException('Cannot erase the last admin');
      }
    }
    const downline = await this.partners.countDownline
      ? await this.partners.countDownline(partnerId)
      : 0;
    if (downline > 0) {
      throw new ConflictException(`Reassign ${downline} downline member(s) before erasing this account`);
    }

    const tag = `${String(target._id ?? target.id ?? partnerId).slice(-6)}${Math.random().toString(36).slice(2, 6)}`;
    const anonymized = {
      name: 'Deleted',
      surname: 'Member',
      email: `deleted_${tag}@deleted.local`.toLowerCase(),
      phone: `deleted_${tag}`,
      username: `deleted_${tag}`.toLowerCase(),
      password: `unusable:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`,
      bio: null,
      profileImage: null,
      testimonial: null,
      jobTitle: null,
      educationBackground: null,
      hobby: null,
      skill: null,
      whatsappGroupLink: null,
      whatsappChatLink: null,
      linkedinPage: null,
      youtubePage: null,
      instagramPage: null,
      tiktokPage: null,
      facebookPage: null,
      twitterPage: null,
      address: null,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      suspendedAt: new Date(),
      suspendReason: 'Account erased (GDPR)',
    };
    const updated = await this.partners.updateById(partnerId, anonymized);

    const removed = { prospects: 0, tickets: 0, codes: 0 };
    if (this.prospects?.deleteByPartner) {
      removed.prospects = await this.prospects.deleteByPartner(partnerId).catch(() => 0);
    }
    if (this.tickets?.deleteByPartner) {
      removed.tickets = await this.tickets.deleteByPartner(partnerId).catch(() => 0);
    }
    if (this.codes?.deleteByPartner) {
      removed.codes = await this.codes.deleteByPartner(partnerId).catch(() => 0);
    }
    if (this.sessions?.revoke) {
      await this.sessions.revoke(String(partnerId), { reason: 'Account erased', by: String(requesterId) }).catch(() => null);
    }
    return { erased: toSafePartner(updated), removed };
  }
}
