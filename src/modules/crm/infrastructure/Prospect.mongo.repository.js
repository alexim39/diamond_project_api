import { ProspectModel, PartnersModel, ReservationCodeModel } from './Prospect.models.js';
import { ProspectMapper } from './Prospect.mapper.js';

/** Mongo implementation of the crm repository contracts. Reads use `.lean()`. */
export class MongoProspectRepository {
  async create(data) {
    const doc = await ProspectModel.create(ProspectMapper.toPersistence(data));
    return ProspectMapper.toDomain(doc);
  }

  async findById(id) {
    return ProspectMapper.toDomain(await ProspectModel.findById(id).lean());
  }

  async findByPartnerId(partnerId, { limit = 100, skip = 0 } = {}) {
    const [items, total] = await Promise.all([
      ProspectModel.find({ partnerId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ProspectModel.countDocuments({ partnerId }),
    ]);
    return { items: items.map(ProspectMapper.toDomain), total };
  }

  /** Goal-engine counters: created + converted within a window. */
  async countCreated(partnerId, start, end) {
    return ProspectModel.countDocuments({ partnerId, createdAt: { $gte: start, $lte: end } });
  }

  async countConverted(partnerId, start, end) {
    return ProspectModel.countDocuments({
      partnerId,
      'status.stage': 'Converted',
      updatedAt: { $gte: start, $lte: end },
    });
  }

  /**
   * Cohort funnel: prospects created in-window grouped by current stage.
   * Documents without a stage overlay (legacy) count as 'New'.
   */
  async stageDistribution(partnerId, start, end) {
    const rows = await ProspectModel.aggregate([
      { $match: { partnerId, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $ifNull: ['$status.stage', 'New'] }, count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
  }

  /** Hottest pipeline: currently in negotiation, most recently touched first. */
  async findReadyToConvert(partnerId, limit = 5) {
    const docs = await ProspectModel.find({ partnerId, 'status.stage': 'In Negotiation' })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();
    return docs.map(ProspectMapper.toDomain);
  }

  async findDuplicate(partnerId, { phone, email }) {
    const or = [];
    if (phone) or.push({ prospectPhone: phone });
    if (email) or.push({ prospectEmail: email });
    if (or.length === 0) return null;
    return ProspectMapper.toDomain(
      await ProspectModel.findOne({ partnerId, $or: or }).lean(),
    );
  }

  async updateFields(id, patch) {
    if (Object.keys(patch).length === 0) return this.findById(id);
    return ProspectMapper.toDomain(
      await ProspectModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean(),
    );
  }

  async updateStatus(id, overlay) {
    const dotted = Object.fromEntries(Object.entries(overlay).map(([k, v]) => [`status.${k}`, v]));
    dotted['status.updatedAt'] = new Date();
    return ProspectMapper.toDomain(
      await ProspectModel.findByIdAndUpdate(id, { $set: dotted }, { new: true, runValidators: true }).lean(),
    );
  }

  async pushCommunication(id, communication) {
    return ProspectMapper.toDomain(
      await ProspectModel.findByIdAndUpdate(
        id,
        { $push: { communications: communication } },
        { new: true, runValidators: true },
      ).lean(),
    );
  }

  async pullCommunication(prospectId, communicationId) {
    const prospect = ProspectMapper.toDomain(
      await ProspectModel.findByIdAndUpdate(
        prospectId,
        { $pull: { communications: { _id: communicationId } } },
        { new: true },
      ).lean(),
    );
    if (!prospect) return { prospect: null, removed: false };
    const removed = !prospect.communications.some((c) => String(c._id ?? c.id) === String(communicationId));
    return { prospect, removed };
  }

  async deleteById(id) {
    return (await ProspectModel.findByIdAndDelete(id).lean()) !== null;
  }
}

export class MongoPartnerLookup {
  async exists(partnerId) {
    return (await PartnersModel.exists({ _id: partnerId })) !== null;
  }
}

/**
 * Minimal reservation-code writer for prospect conversion.
 * Issues partner-approved codes (upline converts own prospect, so no
 * Pending round-trip). Same `reservation-codes` collection as legacy.
 */
export class MongoReservationCodes {
  async existsByCode(code) {
    return (await ReservationCodeModel.exists({ code })) !== null;
  }

  async createApproved({ code, partnerId, prospectId }) {
    const doc = await ReservationCodeModel.create({
      code,
      partnerId,
      prospectId,
      status: 'Approved',
    });
    return { id: String(doc._id), code: doc.code, status: doc.status };
  }
}
