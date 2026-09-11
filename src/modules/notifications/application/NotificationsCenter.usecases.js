import { ForbiddenException, NotFoundException } from '../../../shared/domain/AppError.js';
import { createNotificationEntity, createPreferencesEntity, resolvePreferences } from '../domain/StoredNotifications.js';

/**
 * Producer API (no HTTP create — stored items are written server-side only).
 * Duplicate suppression: a racing/duplicate keyed write (E11000 on the
 * unique (recipientId, key)) resolves to the existing row with
 * `{deduped: true}` instead of throwing — reruns never double-notify.
 */
export class NotifyUseCase {
  /** @param {{stored}} deps */
  constructor({ stored }) {
    this.stored = stored;
  }

  async execute({ recipientId, ...input }) {
    const data = { ...createNotificationEntity(input), recipientId };
    try {
      return await this.stored.create(data);
    } catch (error) {
      if (data.key && (error?.code === 11000 || /duplicate key/i.test(error?.message ?? ''))) {
        const existing = await this.stored.findByKey(recipientId, data.key);
        if (existing) return { ...existing, deduped: true };
      }
      throw error;
    }
  }
}

const asStoredItem = (row) => ({
  id: String(row.id),
  kind: row.category,
  category: row.category,
  priority: row.priority,
  urgency: row.priority === 'critical',
  title: row.title,
  body: row.body,
  icon: row.icon ?? 'notifications',
  tag: row.category,
  link: row.link ?? null,
  at: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
  origin: 'stored',
  read: row.readAt !== null && row.readAt !== undefined,
});

const asDerivedItem = (item) => ({ ...item, origin: 'derived', read: false });

/**
 * Unified center list: stored items (filterable, searchable, paged) plus
 * the derived feed section. Derived ids are marked so the UI only offers
 * archive/delete on stored rows (derived rejects with 400).
 */
export class ListCenterUseCase {
  /** @param {{stored, feed}} deps */
  constructor({ stored, feed }) {
    Object.assign(this, { stored, feed });
  }

  async execute({ partnerId, unreadOnly = false, search = '', cursor = null, limit = 50 }) {
    const [stored, derived] = await Promise.all([
      this.stored.list(partnerId, { unreadOnly, search, cursor, limit }),
      unreadOnly || search || cursor
        ? []
        : this.feed.execute({ partnerId, limit: 50 }).then((f) => f.items ?? []),
    ]);
    return {
      stored: stored.items.map(asStoredItem),
      derived: (derived ?? []).map(asDerivedItem),
      hasMore: stored.hasMore,
    };
  }
}

const assertOwned = (row, partnerId, what = 'Notification') => {
  if (!row) throw new NotFoundException(`${what} not found`);
  if (String(row.recipientId) !== String(partnerId)) throw new ForbiddenException('Not your notification');
  return row;
};

export class MarkStoredReadUseCase {
  /** @param {{stored}} deps */
  constructor({ stored }) {
    this.stored = stored;
  }

  async execute({ partnerId, id }) {
    const row = await this.stored.findById(id);
    assertOwned(row, partnerId);
    return this.stored.markRead(partnerId, id);
  }
}

export class ArchiveNotificationUseCase {
  /** @param {{stored}} deps */
  constructor({ stored }) {
    this.stored = stored;
  }

  async execute({ partnerId, id }) {
    const row = await this.stored.findById(id);
    assertOwned(row, partnerId);
    return this.stored.archive(partnerId, id);
  }
}

export class RemoveNotificationUseCase {
  /** @param {{stored}} deps */
  constructor({ stored }) {
    this.stored = stored;
  }

  async execute({ partnerId, id }) {
    const row = await this.stored.findById(id);
    assertOwned(row, partnerId);
    return this.stored.remove(partnerId, id);
  }
}

export class BulkCenterUseCase {
  /** @param {{stored}} deps */
  constructor({ stored }) {
    this.stored = stored;
  }

  async execute({ partnerId, action }) {
    if (action === 'read-all') return this.stored.markAllRead(partnerId);
    return this.stored.archiveAll(partnerId);
  }
}

export class GetPreferencesUseCase {
  /** @param {{stored}} deps */
  constructor({ stored }) {
    this.stored = stored;
  }

  async execute({ partnerId }) {
    return resolvePreferences(await this.stored.getPreferences(partnerId));
  }
}

export class UpdatePreferencesUseCase {
  /** @param {{stored}} deps */
  constructor({ stored }) {
    this.stored = stored;
  }

  async execute({ partnerId, prefs }) {
    const saved = await this.stored.savePreferences(partnerId, createPreferencesEntity(prefs));
    return resolvePreferences(saved);
  }
}
