import { ValidationException } from '../../../shared/domain/AppError.js';

/**
 * Reservation lifecycle — ONE machine, every writer agrees:
 * Pending (prospect-submitted, awaiting review) → Approved (ready to use;
 * upline-recorded codes land here directly) → Used (stamped at signup).
 * Legacy treated Approved as consumed while v1 treated it as ready —
 * that collision stranded codes; `Used` now owns "consumed".
 */
export const RESERVATION_STATUSES = ['Pending', 'Approved', 'Used'];

const objectIdLike = (v) => /^[a-fA-F0-9]{24}$/.test(String(v ?? ''));

const text = (value, field, { min = 1, max = 2000 } = {}) => {
  const s = String(value ?? '').trim();
  if (s.length < min || s.length > max) throw new ValidationException(`Invalid ${field}`);
  return s;
};

/** @param {{code, prospectId?}} input (Zod-whitelisted upstream) */
export const createRecordEntity = (input) => {
  const entity = { code: text(input.code, 'reservation code', { min: 3, max: 64 }) };
  if (input.prospectId !== undefined && input.prospectId !== null && String(input.prospectId).trim() !== '') {
    if (!objectIdLike(input.prospectId)) throw new ValidationException('Invalid prospect id');
    entity.prospectId = String(input.prospectId);
  }
  return entity;
};
