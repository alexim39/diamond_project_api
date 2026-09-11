import { resolvePreferences } from '../domain/StoredNotifications.js';

const excerptOf = (text, max = 140) => {
  const s = String(text ?? '').trim().replace(/\s+/g, ' ');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

/**
 * @mention fan-out (N4): stored in-app item + immediate email per prefs.
 * Best-effort by design — a mention must never fail the post/comment
 * that carries it (same convention as promotion recognition).
 *
 * Rules: unknown handles and self-mentions are skipped; in-app is always
 * written (keyed `mention:<type>:<id>:<handle>`, reruns no-op via
 * `findByKey` + the unique-key backstop); email goes out only when the
 * recipient opted into community email AND their digest is `immediate`
 * (daily/weekly/off keep the in-app item for a future digest job).
 * SMS/push senders do not exist yet — preferences reserve the flags.
 */
export class FanoutMentionsUseCase {
  /** @param {{community, stored, notify, mailer}} deps */
  constructor({ community, stored, notify, mailer }) {
    Object.assign(this, { community, stored, notify, mailer });
  }

  /**
   * @param {{authorId, sourceType, sourceId, handles, text}} input
   * (`handles` are the stored mentions — one parser, `extractMentions`.)
   * @returns {{notified, emailed, skipped, failed}}
   */
  async execute({ authorId, sourceType, sourceId, handles = [], text = '' }) {
    const result = { notified: 0, emailed: 0, skipped: 0, failed: [] };
    try {
      const clean = [...new Set((handles ?? []).map((h) => String(h ?? '').toLowerCase()))].filter(Boolean);
      if (clean.length === 0) return result;
      const [authorHandle, labels, recipients] = await Promise.all([
        this.community.findUsername(authorId).catch(() => null),
        this.community.authorLabels([authorId]).catch(() => ({})),
        this.community.findPartnersByUsernames(clean).catch(() => []),
      ]);
      const authorName = labels[String(authorId)]?.name ?? 'Someone';
      const excerpt = excerptOf(text);
      for (const r of recipients) {
        if (String(r.partnerId) === String(authorId) || r.username === authorHandle) {
          result.skipped += 1;
          continue;
        }
        try {
          const key = `mention:${sourceType}:${sourceId}:${r.username}`;
          if (await this.stored.findByKey(r.partnerId, key).catch(() => null)) {
            result.skipped += 1;
            continue;
          }
          await this.notify.execute({
            recipientId: r.partnerId,
            category: 'community',
            priority: 'medium',
            title: `${authorName} mentioned you`,
            body: excerpt || 'You were mentioned in Community.',
            icon: 'alternate_email',
            link: '/dashboard/community',
            key,
          });
          result.notified += 1;
          const prefs = resolvePreferences(await this.stored.getPreferences(r.partnerId).catch(() => null));
          if (prefs.channels.community.email === true && prefs.emailDigest === 'immediate' && r.email) {
            await this.mailer.sendMention({ to: r.email, authorName, excerpt, sourceType });
            result.emailed += 1;
          }
        } catch (error) {
          result.failed.push({ partner: String(r.partnerId), error: error?.message ?? String(error) });
        }
      }
    } catch (error) {
      result.failed.push({ error: error?.message ?? String(error) });
    }
    return result;
  }
}
