/**
 * Central env access for NEW code.
 * Never throws for missing optional values so legacy boot
 * (`server.js` reading process.env directly) keeps working.
 * Add Zod strict validation here once all required vars are confirmed.
 */
export const env = {
  get port() {
    return Number(process.env.PORT || 8080);
  },
  get jwtSecret() {
    return process.env.JWTTOKENSECRET || '';
  },
  /** Comma-separated owner inboxes for support notifications. */
  get supportOwnerEmails() {
    const raw = process.env.SUPPORT_OWNER_EMAILS || 'ago.fnc@gmail.com';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  },
  get mongodb() {
    return {
      username: process.env.MONGODB_USERNAME || '',
      password: process.env.MONGODB_PASSWORD || '',
      database: process.env.MONGODB_DATABASE || '',
    };
  },
};
