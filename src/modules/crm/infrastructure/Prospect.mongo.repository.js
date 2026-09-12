import { ProspectModel, PartnersModel, ReservationCodeModel } from './Prospect.models.js';
import { ProspectMapper } from './Prospect.mapper.js';
import { normalizePhone } from '../domain/Prospect.entity.js';

/** Mongo implementation of the crm repository contracts. Reads use `.lean()`. */
export class MongoProspectRepository {
  async create(data) {
    const doc = await ProspectModel.create(ProspectMapper.toPersistence(data));
    return ProspectMapper.toDomain(doc);
  }

  async findById(id) {
    return ProspectMapper.toDomain(await ProspectModel.findById(id).lean());
  }

  async findByPartnerId(partnerId, { limit = 100, skip = 0, q, stage } = {}) {
    const filter = { partnerId };
    if (q) {
      const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      filter.$or = [{ prospectName: re }, { prospectSurname: re }, { prospectPhone: re }, { prospectEmail: re }];
    }
    if (stage) filter['status.stage'] = stage;
    const [items, total] = await Promise.all([
      ProspectModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ProspectModel.countDocuments(filter),
    ]);
    return { items: items.map(ProspectMapper.toDomain), total };
  }

  /** Goal-engine counters: created + converted within a window. */
  async countCreated(partnerId, start, end) {
    return ProspectModel.countDocuments({ partnerId, createdAt: { $gte: start, $lte: end } });
  }

  /** Earliest prospect per partner: {partnerId: ms} (one aggregate). */
  async firstProspectDates(ids) {
    if (ids.length === 0) return {};
    const rows = await ProspectModel.aggregate([
      { $match: { partnerId: { $in: ids.map(String) } } },
      { $group: { _id: '$partnerId', firstAt: { $min: '$createdAt' } } },
    ]);
    return Object.fromEntries(rows.map((r) => [String(r._id), new Date(r.firstAt).getTime()]));
  }
  async countConverted(partnerId, start, end) {
    return ProspectModel.countDocuments({
      partnerId,
      'status.stage': 'Converted',
      updatedAt: { $gte: start, $lte: end },
    });
  }

  /** Prospects touched (any communication logged) since `since` — leadership signal. */
  async countTouchedSince(partnerId, since) {
    return ProspectModel.countDocuments({
      partnerId,
      communications: { $elemMatch: { date: { $gte: since } } },
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
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    if (!normalizedPhone && !normalizedEmail) return null;
    // Normalize-aware check: fetch partner's phones/emails and compare in memory
    // so "0803 123 4567" and "08031234567" collide correctly, and legacy
    // spaced values still match. Bounded by partner (hundreds, not thousands).
    const docs = await ProspectModel.find({ partnerId }).select('prospectPhone prospectEmail').lean();
    const hit = docs.find((d) => {
      if (normalizedPhone && normalizePhone(d.prospectPhone ?? '') === normalizedPhone) return true;
      if (normalizedEmail && d.prospectEmail && String(d.prospectEmail).trim().toLowerCase() === normalizedEmail) return true;
      return false;
    });
    return hit ? ProspectMapper.toDomain(await ProspectModel.findById(hit._id).lean()) : null;
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

  /** Unsubmitted onboarding-list rows, oldest first. */
  async listUnsubmitted(partnerId) {
    const docs = await ProspectModel.find({ partnerId, listSubmitted: { $ne: true } })
      .sort({ createdAt: 1 })
      .lean();
    return docs.map(ProspectMapper.toDomain);
  }

  /** Submitted batches with per-stage progress, newest batch first. */
  async submittedBatches(partnerId) {
    const rows = await ProspectModel.aggregate([
      { $match: { partnerId, listSubmitted: true } },
      {
        $group: {
          _id: '$listBatch',
          count: { $sum: 1 },
          submittedAt: { $max: '$listSubmittedAt' },
          stages: { $push: { $ifNull: ['$status.stage', 'New'] } },
        },
      },
      { $sort: { submittedAt: -1 } },
    ]);
    return rows.map((r) => {
      const stageCounts = {};
      for (const s of r.stages) stageCounts[s] = (stageCounts[s] ?? 0) + 1;
      return {
        batch: r._id ?? 'legacy',
        submittedAt: r.submittedAt,
        total: r.count,
        stageCounts,
        worked: r.count - (stageCounts.New ?? 0),
      };
    });
  }

  /**
   * Stamp every unsubmitted row as one submitted batch. Returns the count
   * stamped (0 when there is nothing to submit — the use case enforces
   * the minimum before calling).
   */
  async submitContactList(partnerId, batch) {
    const now = new Date();
    const res = await ProspectModel.updateMany(
      { partnerId, listSubmitted: { $ne: true } },
      { $set: { listSubmitted: true, listSubmittedAt: now, listBatch: batch } },
    );
    return { count: res.modifiedCount ?? 0, submittedAt: now };
  }

  /** Submitted contact rows across partners, oldest first (bounded). */
  async submittedContacts(partnerIds, limit = 500) {
    if (partnerIds.length === 0) return [];
    const lim = Math.min(Math.max(Number(limit) || 500, 1), 1000);
    const docs = await ProspectModel.find({ partnerId: { $in: partnerIds.map(String) }, listSubmitted: true })
      .select('partnerId prospectName prospectSurname prospectPhone relationship priority bestTimeToCall consentToContact listBatch status createdAt')
      .sort({ createdAt: 1 })
      .limit(lim)
      .lean();
    return docs.map(ProspectMapper.toDomain);
  }

  /** Submitted batches across many partners (upline view, bounded). */
  async downlineSubmittedBatches(partnerIds) {
    if (partnerIds.length === 0) return [];
    const rows = await ProspectModel.aggregate([
      { $match: { partnerId: { $in: partnerIds.map(String) }, listSubmitted: true } },
      {
        $group: {
          _id: { partnerId: '$partnerId', batch: '$listBatch' },
          count: { $sum: 1 },
          submittedAt: { $max: '$listSubmittedAt' },
          stages: { $push: { $ifNull: ['$status.stage', 'New'] } },
        },
      },
      { $sort: { submittedAt: -1 } },
      { $limit: 200 },
    ]);
    return rows.map((r) => {
      const stageCounts = {};
      for (const s of r.stages) stageCounts[s] = (stageCounts[s] ?? 0) + 1;
      return {
        partnerId: String(r._id.partnerId),
        batch: r._id.batch ?? 'legacy',
        submittedAt: r.submittedAt,
        total: r.count,
        stageCounts,
        worked: r.count - (stageCounts.New ?? 0),
      };
    });
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
