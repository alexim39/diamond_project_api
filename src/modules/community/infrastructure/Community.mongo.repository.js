import mongoose from 'mongoose';
import { PartnersModel } from '../../../apps/partner/models/partner.model.js';

const postSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    kind: { type: String, enum: ['standard', 'announcement', 'recognition', 'training', 'event'], required: true, index: true },
    title: { type: String, default: '', maxlength: 120 },
    body: { type: String, required: true, maxlength: 2000 },
    link: { type: String, default: '', maxlength: 500 },
    scope: { type: String, enum: ['global', 'team', 'leadership'], required: true, index: true },
    pinned: { type: Boolean, default: false },
    auto: { type: Boolean, default: false, index: true },
    refType: { type: String, default: '' },
    refId: { type: String, default: '' },
    mentions: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
postSchema.index({ scope: 1, createdAt: -1 });

const commentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    body: { type: String, required: true, maxlength: 1000 },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityComment', default: null },
    mentions: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
commentSchema.index({ postId: 1, createdAt: 1 });

const likeSchema = new mongoose.Schema(
  {
    targetType: { type: String, enum: ['post', 'comment'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
likeSchema.index({ targetType: 1, targetId: 1, partnerId: 1 }, { unique: true });

const savedSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
savedSchema.index({ partnerId: 1, postId: 1 }, { unique: true });

const reportSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
    reason: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
reportSchema.index({ partnerId: 1, postId: 1 }, { unique: true });

export const PostModel = mongoose.models.CommunityPost ?? mongoose.model('CommunityPost', postSchema);
export const CommentModel = mongoose.models.CommunityComment ?? mongoose.model('CommunityComment', commentSchema);
export const LikeModel = mongoose.models.CommunityLike ?? mongoose.model('CommunityLike', likeSchema);
export const SavedModel = mongoose.models.CommunitySaved ?? mongoose.model('CommunitySaved', savedSchema);
export const PostReportModel = mongoose.models.CommunityReport ?? mongoose.model('CommunityReport', reportSchema);

const oid = (v) => String(v);
const shaped = (o) => {
  if (!o) return null;
  const out = { ...o, id: oid(o._id) };
  if (out.authorId !== undefined) out.authorId = oid(out.authorId);
  if (out.postId !== undefined) out.postId = oid(out.postId);
  return out;
};

/** Mongo implementation of the community store. Reads use `.lean()`. */
export class MongoCommunityStore {
  async createPost(data) {
    return shaped((await PostModel.create(data)).toObject());
  }

  async findPostById(id) {
    return shaped(await PostModel.findById(id).lean());
  }

  async findCommentById(id) {
    return shaped(await CommentModel.findById(id).lean());
  }

  /** Username directory for @mention autocomplete (safe fields only). */
  async searchDirectory(query, limit = 10) {
    const q = String(query ?? '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (q.length < 2) return [];
    const docs = await PartnersModel.find({ username: { $regex: `^${q}`, $options: 'i' } })
      .select('username name surname')
      .limit(Math.min(Math.max(Number(limit) || 10, 1), 20))
      .lean();
    return docs.map((d) => ({
      username: d.username,
      name: [d.name, d.surname].filter(Boolean).join(' ') || d.username,
    }));
  }

  /** Newest-first candidates (visibility filtered in the use case). */
  async recentCandidates(before, limit = 60, excludeIds = []) {
    const filter = before ? { createdAt: { $lt: before } } : {};
    if (excludeIds.length > 0) filter._id = { $nin: excludeIds };
    // Pinned announcements surface first within the window.
    const docs = await PostModel.find(filter).sort({ pinned: -1, createdAt: -1 }).limit(limit).lean();
    return docs.map(shaped);
  }

  async setPinned(id, pinned) {
    const doc = await PostModel.findByIdAndUpdate(id, { $set: { pinned } }, { new: true }).lean();
    return shaped(doc);
  }

  async toggleLike(targetType, targetId, partnerId) {
    const existing = await LikeModel.findOne({ targetType, targetId, partnerId }).lean();
    if (existing) {
      await LikeModel.deleteOne({ _id: existing._id });
      return { liked: false };
    }
    await LikeModel.create({ targetType, targetId, partnerId });
    return { liked: true };
  }

  async likeCounts(targetType, targetIds) {
    if (targetIds.length === 0) return {};
    const rows = await LikeModel.aggregate([
      { $match: { targetType, targetId: { $in: targetIds } } },
      { $group: { _id: '$targetId', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((r) => [oid(r._id), r.count]));
  }

  async likedByMe(targetType, targetIds, partnerId) {
    if (targetIds.length === 0) return new Set();
    const rows = await LikeModel.find({ targetType, targetId: { $in: targetIds }, partnerId })
      .select('targetId')
      .lean();
    return new Set(rows.map((r) => oid(r.targetId)));
  }

  async addComment({ postId, authorId, body, parentId, mentions }) {
    return shaped((await CommentModel.create({ postId, authorId, body, parentId: parentId ?? null, mentions: mentions ?? [] })).toObject());
  }

  async listComments(postId, limit = 100) {
    const docs = await CommentModel.find({ postId }).sort({ createdAt: 1 }).limit(limit).lean();
    return docs.map(shaped);
  }

  async commentCounts(postIds) {
    if (postIds.length === 0) return {};
    const rows = await CommentModel.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: '$postId', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((r) => [oid(r._id), r.count]));
  }

  async toggleSave(partnerId, postId) {
    const existing = await SavedModel.findOne({ partnerId, postId }).lean();
    if (existing) {
      await SavedModel.deleteOne({ _id: existing._id });
      return { saved: false };
    }
    await SavedModel.create({ partnerId, postId });
    return { saved: true };
  }

  async savedByMe(postIds, partnerId) {
    if (postIds.length === 0) return new Set();
    const rows = await SavedModel.find({ postId: { $in: postIds }, partnerId }).select('postId').lean();
    return new Set(rows.map((r) => oid(r.postId)));
  }

  async savedCounts(postIds) {
    if (postIds.length === 0) return {};
    const rows = await SavedModel.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: '$postId', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((r) => [oid(r._id), r.count]));
  }

  async report(partnerId, postId, reason) {
    await PostReportModel.updateOne(
      { partnerId, postId },
      { $setOnInsert: { partnerId, postId, reason } },
      { upsert: true },
    );
    return { reported: true };
  }

  async reportedByMe(partnerId) {
    const rows = await PostReportModel.find({ partnerId }).select('postId').lean();
    return new Set(rows.map((r) => oid(r.postId)));
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

  /** Raw engagement rows for analytics (bounded window). */
  async engagementSince(since) {
    const [posts, likes, comments] = await Promise.all([
      PostModel.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { kind: '$kind', author: '$authorId' }, count: { $sum: 1 } } },
      ]),
      LikeModel.countDocuments({ createdAt: { $gte: since } }),
      CommentModel.countDocuments({ createdAt: { $gte: since } }),
    ]);
    return { posts, likes, comments };
  }
}
