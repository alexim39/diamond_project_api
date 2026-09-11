/**
 * Delivery channel resolution + payload shaping — pure.
 * The matrix is `{inApp, email, sms, push}` per category; `push` rides
 * with the N-series defaults (off until the user opts in).
 */

export const DELIVERY_CHANNELS = ['inApp', 'email', 'sms', 'push'];

const SMS_MAX = 459; // 3 GSM segments — providers concatenate beyond this.

/** Light E.164-ish normalization (providers reject spaces/dashes). */
export const normalizePhone = (raw) => {
  const digits = String(raw ?? '').replace(/[^\d+]/g, '');
  return digits.length >= 7 ? digits : null;
};

export const smsBody = (title, body) => {
  const text = `${String(title ?? '').trim()} — ${String(body ?? '').trim()}`.trim();
  return text.length > SMS_MAX ? `${text.slice(0, SMS_MAX - 1)}…` : text;
};

export const pushPayload = ({ title, body, link }, appBaseUrl = '') => ({
  title: String(title ?? 'Diamond Project').slice(0, 120),
  body: String(body ?? '').slice(0, 240),
  url: appBaseUrl ? `${appBaseUrl}${link ?? '/dashboard/notifications/center'}` : (link ?? '/dashboard/notifications/center'),
  tag: 'diamond-project',
});

/**
 * Resolve which off-device channels fire for one recipient.
 * @param {{prefs, category, emailPolicy}} input (`immediate-only` holds
 *   email for non-immediate digests — the digest sender owns those).
 */
export const resolveChannels = ({ prefs, category, emailPolicy = 'always' } = {}) => {
  const row = prefs?.channels?.[category] ?? { inApp: true, email: false, sms: false, push: false };
  const emailOk = row.email === true && (emailPolicy !== 'immediate-only' || prefs?.emailDigest === 'immediate');
  return {
    inApp: row.inApp !== false,
    email: emailOk,
    sms: row.sms === true,
    push: row.push === true,
  };
};

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Plain escaped email body for generic sends (templates own the pretty ones). */
export const plainEmailHtml = (title, body, link = '/dashboard/notifications/center') => `
  <p><strong>${escapeHtml(title)}</strong></p>
  <p>${escapeHtml(body)}</p>
  <p><a href="${escapeHtml(link)}">Open in Diamond Project</a></p>
`;
