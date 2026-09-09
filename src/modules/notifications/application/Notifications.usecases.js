import { buildProspectNotifications } from '../../crm/domain/Prospect.notifications.js';
import { buildConversionAlerts, buildInactivityAlerts, buildReleaseAlerts } from '../domain/Feed.items.js';

const rankUrgency = (a) => (a.urgency ? 0 : 1);

/**
 * Unified feed: follow-ups (crm builder) + inactivity + conversions +
 * commission releases, minus read items. Urgent first, newest first.
 */
export class GetNotificationFeedUseCase {
  /** @param {{prospects, ledger, reads}} deps */
  constructor({ prospects, ledger, reads }) {
    this.prospects = prospects;
    this.ledger = ledger;
    this.reads = reads;
  }

  async execute({ partnerId, now = new Date(), limit = 100 }) {
    const { items: list } = await this.prospects.findByPartnerId(partnerId, { limit: 500, skip: 0 });
    const [read, releases] = await Promise.all([
      this.reads.readIds(partnerId),
      this.ledger.findReleasedSince(partnerId, 30),
    ]);

    const all = [
      ...buildProspectNotifications(list, now).map((n) => ({
        id: `followup:${n.prospectId}:${n.communication?._id ?? n.communication?.id ?? n.tag}`,
        kind: 'followup',
        urgency: n.urgency === true,
        title: n.title,
        body: n.description ?? '',
        icon: n.icon ?? 'notifications',
        tag: n.tag ?? '',
        link: `/dashboard/prospects/detail/${n.prospectId}`,
        at: n.communication?.date ?? now.toISOString(),
      })),
      ...buildInactivityAlerts(list, now),
      ...buildConversionAlerts(list, { now }),
      ...buildReleaseAlerts(releases, { now }),
    ];

    const unread = all.filter((n) => !read.has(n.id));
    unread.sort((a, b) => rankUrgency(a) - rankUrgency(b) || new Date(b.at) - new Date(a.at));
    const lim = Math.min(Math.max(Number(limit) || 100, 1), 200);
    return {
      items: unread.slice(0, lim),
      total: unread.length,
      unreadCount: unread.filter((n) => n.urgency).length,
    };
  }
}

/** Persist read-state for feed item ids (idempotent). */
export class MarkNotificationsReadUseCase {
  /** @param {{reads}} deps */
  constructor({ reads }) {
    this.reads = reads;
  }

  async execute({ partnerId, ids }) {
    const clean = [...new Set((ids ?? []).map(String))].filter(Boolean).slice(0, 200);
    if (clean.length > 0) await this.reads.markRead(partnerId, clean);
    return { marked: clean.length };
  }
}
