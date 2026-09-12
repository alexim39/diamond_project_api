import { PartnersModel, ReservationCodeModel } from './Auth.models.js';

const opts = (session) => (session ? { session } : {});
const byId = (session) => (session ? { session } : {});

/**
 * Mongo implementations of the identity-access repository contracts.
 * Reads use `.lean()` — callers get plain objects, never Mongoose docs.
 */
export class MongoPartnerRepository {
  async findByEmail(email) {
    return PartnersModel.findOne({ email }).lean();
  }
  async findById(id, { session } = {}) {
    return PartnersModel.findById(id, null, byId(session)).lean();
  }
  async existsByUsername(username, { session } = {}) {
    return (await PartnersModel.exists({ username }).setOptions(opts(session))) !== null;
  }
  async existsByReservationCode(reservationCode, { session } = {}) {
    return (await PartnersModel.exists({ reservationCode }).setOptions(opts(session))) !== null;
  }
  async create(data, { session } = {}) {
    const [doc] = await PartnersModel.create([data], opts(session));
    return doc.toObject();
  }
  async updateById(id, patch, { session } = {}) {    // Strip `undefined` so clearing resetPasswordToken works via $unset-safe set
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const unset = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v === undefined).map(([k]) => [k, '']),
    );
    const update = { ...(Object.keys(clean).length ? { $set: clean } : {}) };
    if (Object.keys(unset).length) update.$unset = unset;
    return PartnersModel.findByIdAndUpdate(id, update, { new: true, ...opts(session) }).lean();
  }
  /** Case-insensitive role count (absorbs legacy 'User'/'admin' casing). */
  async countByRole(role) {
    return PartnersModel.find({ role: String(role) })
      .collation({ locale: 'en', strength: 2 })
      .countDocuments();
  }
  /** Admin directory listing — lean, paginated, safe fields projected upstream. */
  async listPartners({ limit = 25, skip = 0, q = '' }) {
    const filter = {};
    if (q) {
      const escaped = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      filter.$or = [{ name: re }, { surname: re }, { username: re }, { email: re }];
    }
    const [items, total] = await Promise.all([
      PartnersModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PartnersModel.countDocuments(filter),
    ]);
    return { items, total };
  }
}

export class MongoReservationRepository {
  async findByCode(code, { session } = {}) {
    const doc = await ReservationCodeModel.findOne({ code: String(code).trim() })
      .collation({ locale: 'en', strength: 2 })
      .setOptions(opts(session))
      .lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      status: doc.status,
      partnerId: doc.partnerId ? String(doc.partnerId) : null,
      prospectId: doc.prospectId ? String(doc.prospectId) : null,
    };
  }

  async markUsed(code, { session } = {}) {
    const res = await ReservationCodeModel.updateOne(
      { code: String(code).trim() },
      { $set: { status: 'Used' } },
      opts(session),
    );
    return { used: (res.modifiedCount ?? 0) > 0 };
  }
}
