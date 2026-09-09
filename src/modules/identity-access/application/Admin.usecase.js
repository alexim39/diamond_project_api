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
