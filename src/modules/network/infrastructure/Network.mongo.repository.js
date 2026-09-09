// Strangler note: reuse the legacy compiled Partner model — same
// collection, projected read-model only (no writes in this slice).
import { PartnersModel } from '../../../apps/partner/models/partner.model.js';
import { toNetworkNode } from '../domain/Network.entity.js';

const project = (doc) => {
  if (!doc) return null;
  const node = toNetworkNode(doc);
  const raw = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  node.parentId = raw.partnerOf ? String(raw.partnerOf) : null;
  return node;
};

/** Mongo implementation of the network read contracts. All reads `.lean()`. */
export class MongoNetworkRepository {
  async findNode(id) {
    return project(await PartnersModel.findById(id).lean());
  }

  async findChildren(parentIds, limit) {
    if (parentIds.length === 0) return [];
    const docs = await PartnersModel.find({ partnerOf: { $in: parentIds } })
      .sort({ username: 1 })
      .limit(Math.max(0, limit * parentIds.length))
      .lean();
    return docs.map(project);
  }
}
