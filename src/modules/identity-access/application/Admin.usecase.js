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

  async execute({ limit = 25, skip = 0, q = '' }) {
    const lim = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const sk = Math.max(Number(skip) || 0, 0);
    const { items, total } = await this.partners.listPartners({ limit: lim, skip: sk, q: String(q ?? '').trim() });
    return { items: items.map(toSafePartner), total, limit: lim, skip: sk };
  }
}

/** Platform headcount for the admin console — totals, growth, roles, suspended. */
export class PlatformStatsUseCase {
  /** @param {{partners}} deps */
  constructor({ partners }) {
    this.partners = partners;
  }

  async execute() {
    return this.partners.platformStats();
  }
}

/**
 * Suspend / unsuspend a partner. Guards mirror role changes: never
 * yourself (locks you out mid-session) and never the last admin while
 * they still hold the role (locks the console out). Suspension blocks
 * signin immediately; live sessions die at the next session check.
 */
export class SetSuspendUseCase {
  /** @param {{partners}} deps */
  constructor({ partners }) {
    this.partners = partners;
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
    return toSafePartner(updated);
  }
}
