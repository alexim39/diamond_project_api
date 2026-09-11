import mongoose from 'mongoose';
import { PartnersModel } from '../../../apps/partner/models/partner.model.js';

const eventSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 2000 },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, default: null },
    location: { type: String, default: '', maxlength: 200 },
    scope: { type: String, enum: ['global', 'team', 'leadership'], required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
eventSchema.index({ scope: 1, startsAt: 1 });

const rsvpSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    status: { type: String, enum: ['going', 'interested', 'declined'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);
rsvpSchema.index({ eventId: 1, partnerId: 1 }, { unique: true });

export const EventModel = mongoose.models.Event ?? mongoose.model('Event', eventSchema);
export const EventRsvpModel = mongoose.models.EventRsvp ?? mongoose.model('EventRsvp', rsvpSchema);

const oid = (v) => String(v);
// Aggregate $match does not cast strings to ObjectId (see community
// counts fix) — coerce explicitly for every $in over an ObjectId field.
const toObjectId = (v) => (v instanceof mongoose.Types.ObjectId ? v : new mongoose.Types.ObjectId(String(v)));
const oidList = (ids) => (ids ?? []).map(toObjectId);
const shaped = (o) => {
  if (!o) return null;
  const out = { ...o, id: oid(o._id) };
  if (out.authorId !== undefined) out.authorId = oid(out.authorId);
  if (out.eventId !== undefined) out.eventId = oid(out.eventId);
  if (out.partnerId !== undefined) out.partnerId = oid(out.partnerId);
  return out;
};

const emptyCounts = () => ({ going: 0, interested: 0, declined: 0, total: 0 });

/** Mongo implementation of the event store. Reads use `.lean()`. */
export class MongoEventStore {
  async createEvent(data) {
    return shaped((await EventModel.create(data)).toObject());
  }

  async findEventById(id) {
    return shaped(await EventModel.findById(id).lean());
  }

  /** Future-first candidates (visibility filtered in the use case). */
  async upcomingCandidates(now, limit = 60) {
    const docs = await EventModel.find({ startsAt: { $gte: now } })
      .sort({ startsAt: 1 })
      .limit(Math.min(Math.max(Number(limit) || 60, 1), 200))
      .lean();
    return docs.map(shaped);
  }

  async listByAuthor(authorId, limit = 50) {
    const docs = await EventModel.find({ authorId })
      .sort({ startsAt: -1 })
      .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
      .lean();
    return docs.map(shaped);
  }

  async deleteEvent(id) {
    const [res] = await Promise.all([
      EventModel.deleteOne({ _id: id }),
      EventRsvpModel.deleteMany({ eventId: id }),
    ]);
    return { deleted: res.deletedCount > 0 };
  }

  async upsertRsvp(eventId, partnerId, status) {
    const doc = await EventRsvpModel.findOneAndUpdate(
      { eventId, partnerId },
      { $set: { status } },
      { new: true, upsert: true },
    ).lean();
    return shaped(doc);
  }

  async rsvpCounts(eventIds) {
    const out = Object.fromEntries(eventIds.map((id) => [String(id), emptyCounts()]));
    if (eventIds.length === 0) return out;
    const rows = await EventRsvpModel.aggregate([
      { $match: { eventId: { $in: oidList(eventIds) } } },
      { $group: { _id: { event: '$eventId', status: '$status' }, count: { $sum: 1 } } },
    ]);
    for (const r of rows) {
      const key = oid(r._id.event);
      if (out[key] && r._id.status in out[key]) {
        out[key][r._id.status] = r.count;
        out[key].total += r.count;
      }
    }
    return out;
  }

  async myRsvps(eventIds, partnerId) {
    if (eventIds.length === 0) return {};
    const rows = await EventRsvpModel.find({ eventId: { $in: eventIds }, partnerId })
      .select('eventId status')
      .lean();
    return Object.fromEntries(rows.map((r) => [oid(r.eventId), r.status]));
  }

  async authorLabels(ids) {
    const uniq = [...new Set(ids.map(String))].filter(Boolean);
    if (uniq.length === 0) return {};
    const docs = await PartnersModel.find({ _id: { $in: uniq } }).select('username name surname').lean();
    return Object.fromEntries(docs.map((d) => [oid(d._id), {
      username: d.username,
      name: [d.name, d.surname].filter(Boolean).join(' ') || d.username,
    }]));
  }
}
