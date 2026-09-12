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
  /**
   * Ora AI assistant (DeepSeek, OpenAI-compatible). The key lives ONLY in
   * env — never in code, logs or the frontend. Empty key = chat endpoints
   * answer 503 with a clear message instead of failing obscurely.
   */
  get ora() {
    return {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      maxTokens: Number(process.env.DEEPSEEK_MAX_TOKENS || 800),
      timeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS || 30000),
      dailyLimit: Number(process.env.ORA_DAILY_LIMIT || 50),
    };
  },
  /**
   * Web-push (VAPID). Empty until production keys land in env —
   * the sender factory falls back to a logging sender meanwhile.
   * Generate once: npx web-push generate-vapid-keys
   */
  get push() {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY || '',
      privateKey: process.env.VAPID_PRIVATE_KEY || '',
      subject: process.env.VAPID_SUBJECT || 'mailto:noreply@diamondprojectonline.com',
      enabled: Boolean(process.env.VAPID_PUBLIC_KEY) && Boolean(process.env.VAPID_PRIVATE_KEY),
    };
  },
  /** Absolute base URL for push-click targets (fallback: relative path). */
  get appBaseUrl() {
    return (process.env.APP_BASE_URL || '').replace(/\/+$/, '');
  },
  /**
   * SMS via a generic HTTP provider (Termii-compatible shape documented
   * in .env.example). `disabled` (default) logs instead of sending.
   */
  get sms() {
    let headers = {};
    let extra = {};
    try { headers = JSON.parse(process.env.SMS_HTTP_HEADERS || '{}'); } catch { headers = {}; }
    try { extra = JSON.parse(process.env.SMS_HTTP_EXTRA || '{}'); } catch { extra = {}; }
    return {
      provider: process.env.SMS_PROVIDER || 'disabled',
      url: process.env.SMS_HTTP_URL || '',
      method: (process.env.SMS_HTTP_METHOD || 'POST').toUpperCase(),
      headers,
      toField: process.env.SMS_HTTP_TO_FIELD || 'to',
      messageField: process.env.SMS_HTTP_MESSAGE_FIELD || 'message',
      extra,
      senderId: process.env.SMS_SENDER_ID || 'DiamondProj',
      timeoutMs: Number(process.env.SMS_HTTP_TIMEOUT_MS || 8000),
      enabled: (process.env.SMS_PROVIDER || 'disabled') !== 'disabled' && Boolean(process.env.SMS_HTTP_URL),
    };
  },
};
