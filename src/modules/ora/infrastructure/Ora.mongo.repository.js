import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 8000 },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    title: { type: String, default: 'New conversation', maxlength: 120 },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);
conversationSchema.index({ partnerId: 1, updatedAt: -1 });

export const OraConversationModel =
  mongoose.models['Ora-conversation'] ?? mongoose.model('Ora-conversation', conversationSchema);

const MAX_MESSAGES = 100;

const oid = (v) => String(v);
const shaped = (o) => (o ? { ...o, id: oid(o._id), partnerId: oid(o.partnerId) } : null);

/** Mongo implementation of the ora conversation contract. Reads use `.lean()`. */
export class MongoOraConversationStore {
  async create(partnerId, title) {
    const clean = String(title ?? '').trim().slice(0, 120) || 'New conversation';
    return shaped((await OraConversationModel.create({ partnerId, title: clean })).toObject());
  }

  async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return shaped(await OraConversationModel.findById(id).lean());
  }

  async listByPartner(partnerId, limit = 20) {
    const lim = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const docs = await OraConversationModel.find({ partnerId })
      .select('title updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .limit(lim)
      .lean();
    return docs.map(shaped);
  }

  /** Appends one message; trims oldest beyond the cap so history stays bounded. */
  async appendMessage(id, message) {
    const doc = await OraConversationModel.findOneAndUpdate(
      { _id: id },
      { $push: { messages: { $each: [message], $slice: -MAX_MESSAGES } } },
      { new: true },
    ).lean();
    return shaped(doc);
  }

  async remove(partnerId, id) {
    const res = await OraConversationModel.deleteOne({ _id: id, partnerId });
    return { deleted: res.deletedCount > 0 };
  }
}
