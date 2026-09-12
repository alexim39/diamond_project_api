import { ConflictException } from '../../../shared/domain/AppError.js';
import { ReservationCodeModel } from '../../../apps/reservation-code/models/reservation-code.model.js';

const oid = (v) => String(v);
const shaped = (o) => (o ? { ...o, id: oid(o._id), partnerId: oid(o.partnerId) } : null);

/** Mongo implementation on the shared `reservation-codes` collection. Reads use `.lean()`. */
export class MongoReservationStore {
  async findByCode(code) {
    const doc = await ReservationCodeModel.findOne({ code: String(code).trim() })
      .collation({ locale: 'en', strength: 2 })
      .lean();
    if (!doc) return null;
    return {
      ...shaped(doc),
      status: doc.status,
      prospectId: doc.prospectId ? oid(doc.prospectId) : null,
    };
  }

  /**
   * Upline records a code: new codes land Approved (ready to use —
   * the recorder IS the verified referrer); re-recording your own code
   * attaches/updates the prospect link. Another partner's code → 409.
   */
  async record({ code, partnerId, prospectId = null }) {
    const existing = await this.findByCode(code);
    if (existing) {
      if (String(existing.partnerId) !== String(partnerId)) {
        throw new ConflictException('This reservation code is already recorded by another partner');
      }
      const doc = await ReservationCodeModel.findOneAndUpdate(
        { code: String(code).trim() },
        { $set: { status: 'Approved', ...(prospectId ? { prospectId } : {}) } },
        { new: true },
      ).lean();
      return { ...shaped(doc), status: doc.status, prospectId: doc.prospectId ? oid(doc.prospectId) : null };
    }
    const doc = await ReservationCodeModel.create({
      code: String(code).trim(),
      partnerId,
      ...(prospectId ? { prospectId } : {}),
      status: 'Approved',
    });
    const o = doc.toObject();
    return { ...shaped(o), status: o.status, prospectId: o.prospectId ? oid(o.prospectId) : null };
  }

  async markUsed(code, { session } = {}) {
    const res = await ReservationCodeModel.updateOne(
      { code: String(code).trim() },
      { $set: { status: 'Used' } },
      session ? { session } : {},
    );
    return { used: (res.modifiedCount ?? 0) > 0 };
  }

  async listByPartner(partnerId, limit = 50) {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const docs = await ReservationCodeModel.find({ partnerId })
      .sort({ createdAt: -1 })
      .limit(lim)
      .lean();
    return docs.map((d) => ({
      ...shaped(d),
      status: d.status,
      prospectId: d.prospectId ? oid(d.prospectId) : null,
    }));
  }
}
