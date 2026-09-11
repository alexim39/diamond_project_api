import { ValidationException } from '../../../shared/domain/AppError.js';
import { AUDIENCE_SCOPES, LEADERSHIP_LEVELS } from '../../community/domain/Post.entity.js';

export { AUDIENCE_SCOPES, LEADERSHIP_LEVELS };
export const RSVP_STATUSES = ['going', 'interested', 'declined'];

const text = (value, field, { min = 1, max = 2000 } = {}) => {
  const s = String(value ?? '').trim();
  if (s.length < min || s.length > max) throw new ValidationException(`Invalid ${field}`);
  return s;
};

const asDate = (value, field) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new ValidationException(`Invalid ${field}`);
  return d;
};

/** @param {{title,body,startsAt,endsAt,location,scope}} input (Zod-whitelisted) */
export const createEventEntity = (input) => {
  if (!AUDIENCE_SCOPES.includes(input.scope)) throw new ValidationException('Invalid audience');
  const startsAt = asDate(input.startsAt, 'startsAt');
  let endsAt = null;
  if (input.endsAt !== undefined && input.endsAt !== null && String(input.endsAt).trim() !== '') {
    endsAt = asDate(input.endsAt, 'endsAt');
    if (endsAt <= startsAt) throw new ValidationException('Event end must be after its start');
  }
  return {
    title: text(input.title, 'title', { min: 2, max: 120 }),
    body: text(input.body, 'event details'),
    startsAt,
    endsAt,
    location: input.location === undefined || input.location === null
      ? ''
      : String(input.location).trim().slice(0, 200),
    scope: input.scope,
  };
};

/** @param {unknown} value */
export const assertRsvpStatus = (value) => {
  if (!RSVP_STATUSES.includes(value)) throw new ValidationException('Invalid RSVP status');
  return value;
};
