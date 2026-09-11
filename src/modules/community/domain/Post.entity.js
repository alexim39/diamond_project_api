import { ValidationException } from '../../../shared/domain/AppError.js';

export const POST_KINDS = ['standard', 'announcement', 'recognition', 'training', 'event'];
export const POST_KIND_LABELS = {
  standard: 'Post',
  announcement: 'Announcement',
  recognition: 'Recognition',
  training: 'Training',
  event: 'Event',
};
export const AUDIENCE_SCOPES = ['global', 'team', 'leadership'];
export const LEADERSHIP_LEVELS = ['ecl', 'cell_leader', 'g_leader', 'g8'];

const text = (value, field, { min = 1, max = 2000 } = {}) => {
  const s = String(value ?? '').trim();
  if (s.length < min || s.length > max) throw new ValidationException(`Invalid ${field}`);
  return s;
};

/** @param {{kind,title,body,link,scope}} input (Zod-whitelisted) */
export const createPostEntity = (input) => {
  if (!POST_KINDS.includes(input.kind)) throw new ValidationException('Invalid post kind');
  if (!AUDIENCE_SCOPES.includes(input.scope)) throw new ValidationException('Invalid audience');
  const link = input.link === undefined || input.link === null || String(input.link).trim() === ''
    ? ''
    : text(input.link, 'link', { max: 500 });
  return {
    kind: input.kind,
    title: input.title === undefined || input.title === null || String(input.title).trim() === ''
      ? ''
      : text(input.title, 'title', { min: 2, max: 120 }),
    body: text(input.body, 'post body'),
    link,
    scope: input.scope,
  };
};

/** @param {{body,parentId}} input (Zod-whitelisted) */
export const createCommentEntity = (input) => ({
  body: text(input.body, 'comment body', { max: 1000 }),
});

/**
 * Pure @mention extraction — unique lowercase usernames in order.
 * Stored for future push; the UI highlights them from body text today.
 */
export const extractMentions = (body) => {
  const out = [];
  const seen = new Set();
  for (const m of String(body ?? '').matchAll(/@([A-Za-z0-9_.]{2,40})/g)) {
    const handle = m[1].toLowerCase();
    if (!seen.has(handle)) {
      seen.add(handle);
      out.push(handle);
    }
  }
  return out;
};
