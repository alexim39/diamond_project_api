import { ProspectModel, PartnersModel } from './Prospect.models.js';
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
