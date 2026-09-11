import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    category: { type: String, required: true, index: true },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 2000 },
    icon: { type: String, default: 'notifications', maxlength: 40 },
    link: { type: String, default: null, maxlength: 500 },
    // Producer idempotency key (N2 daily brief) — only set for keyed writes.
    key: { type: String, default: null, maxlength: 120 },
    readAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
notificationSchema.index({ recipientId: 1, archivedAt: 1, createdAt: -1 });
// Duplicate suppression: same producer key → same logical item, one row.
notificationSchema.index(
  { recipientId: 1, key: 1 },
  { unique: true, partialFilterExpression: { key: { $type: 'string' } } },
);
notificationSchema.index({ title: 'text', body: 'text' });

const preferenceSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, unique: true },
    channels: { type: Object, default: {} },
    emailDigest: { type: String, enum: ['immediate', 'daily', 'weekly', 'off'], default: 'immediate' },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export const StoredNotificationModel =
  mongoose.models['Stored-notification'] ?? mongoose.model('Stored-notification', notificationSchema);
export const NotificationPreferenceModel =
  mongoose.models['Notification-preference'] ?? mongoose.model('Notification-preference', preferenceSchema);

const oid = (v) => String(v);
const shaped = (o) => (o ? { ...o, id: oid(o._id), recipientId: oid(o.recipientId) } : null);

/** Mongo implementation of the stored-notification contract. Reads use `.lean()`. */
export class MongoStoredNotificationStore {
  async create(data) {
    return shaped((await StoredNotificationModel.create(data)).toObject());
  }

  async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return shaped(await StoredNotificationModel.findById(id).lean());
  }

  async findByKey(recipientId, key) {
    if (!key) return null;
    return shaped(await StoredNotificationModel.findOne({ recipientId, key }).lean());
  }

  /** True when any `daily:<day>:*` slot already exists (rerun guard). */
  async hasBriefForDay(recipientId, day) {
    const exists = await StoredNotificationModel.exists({
      recipientId,
      key: { $gte: `daily:${day}:`, $lt: `daily:${day};` },
    });
    return exists !== null;
  }

  async list(partnerId, { unreadOnly = false, search = '', cursor = null, limit = 50 } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const filter = { recipientId: partnerId, archivedAt: null };
    if (unreadOnly) filter.readAt = null;
    if (search) filter.$text = { $search: search };
    if (cursor) {
      const anchor = await StoredNotificationModel.findById(cursor).select('createdAt').lean();
      if (anchor) {
        filter.$or = [
          { createdAt: { $lt: anchor.createdAt } },
          { createdAt: anchor.createdAt, _id: { $lt: anchor._id } },
        ];
      }
    }
    const docs = await StoredNotificationModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(lim + 1)
      .lean();
    const hasMore = docs.length > lim;
    return { items: docs.slice(0, lim).map(shaped), hasMore };
  }

  async markRead(partnerId, id) {
    const doc = await StoredNotificationModel.findOneAndUpdate(
      { _id: id, recipientId: partnerId, archivedAt: null },
      { $set: { readAt: new Date() } },
      { new: true },
    ).lean();
    return shaped(doc);
  }

  async markAllRead(partnerId) {
    const res = await StoredNotificationModel.updateMany(
      { recipientId: partnerId, archivedAt: null, readAt: null },
      { $set: { readAt: new Date() } },
    );
    return { marked: res.modifiedCount ?? 0 };
  }

  async archive(partnerId, id) {
    const doc = await StoredNotificationModel.findOneAndUpdate(
      { _id: id, recipientId: partnerId, archivedAt: null },
      { $set: { archivedAt: new Date() } },
      { new: true },
    ).lean();
    return shaped(doc);
  }

  async archiveAll(partnerId) {
    const res = await StoredNotificationModel.updateMany(
      { recipientId: partnerId, archivedAt: null },
      { $set: { archivedAt: new Date() } },
    );
    return { archived: res.modifiedCount ?? 0 };
  }

  async remove(partnerId, id) {
    const res = await StoredNotificationModel.deleteOne({ _id: id, recipientId: partnerId });
    return { deleted: res.deletedCount > 0 };
  }

  async unreadCount(partnerId) {
    return StoredNotificationModel.countDocuments({ recipientId: partnerId, archivedAt: null, readAt: null });
  }

  async getPreferences(partnerId) {
    const doc = await NotificationPreferenceModel.findOne({ partnerId }).lean();
    return doc ? { channels: doc.channels ?? {}, emailDigest: doc.emailDigest ?? 'immediate' } : null;
  }

  async savePreferences(partnerId, prefs) {
    const doc = await NotificationPreferenceModel.findOneAndUpdate(
      { partnerId },
      { $set: { channels: prefs.channels ?? {}, emailDigest: prefs.emailDigest ?? 'immediate' } },
      { new: true, upsert: true },
    ).lean();
    return { channels: doc.channels ?? {}, emailDigest: doc.emailDigest ?? 'immediate' };
  }
}
