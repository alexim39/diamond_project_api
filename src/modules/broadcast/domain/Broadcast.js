import { ValidationException } from '../../../shared/domain/AppError.js';

/** Max recipients per send — bounds the fan-out write burst. */
export const BROADCAST_CAP = 5000;

const text = (v, field, { min = 1, max = 2000 } = {}) => {
  const s = String(v ?? '').trim();
  if (s.length < min || s.length > max) throw new ValidationException(`Invalid ${field}`);
  return s;
};

/** Pure input factory — throws on bad shape before anything is stored. */
export const createBroadcastInput = (input) => ({
  title: text(input?.title, 'title', { min: 3, max: 140 }),
  body: text(input?.body, 'body', { min: 3, max: 2000 }),
  link: input?.link === undefined || input?.link === null || String(input.link).trim() === ''
    ? null
    : text(input.link, 'link', { min: 2, max: 500 }),
  priority: ['high', 'medium'].includes(input?.priority) ? input.priority : 'high',
});
