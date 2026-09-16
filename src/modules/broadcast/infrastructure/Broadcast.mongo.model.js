import mongoose from 'mongoose';

/**
 * Broadcast record — one row per platform-wide notice. The per-member
 * inbox rows live in stored-notifications (keyed `broadcast:<id>` for
 * dedupe); this row is the history/audit source.
 */
const broadcastSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, required: true, maxlength: 2000 },
    link: { type: String, default: null, maxlength: 500 },
    priority: { type: String, enum: ['high', 'medium'], default: 'high' },
    createdBy: { type: String, required: true, index: true },
    recipientCount: { type: Number, default: 0 },
    capped: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
broadcastSchema.index({ createdAt: -1 });

export const BroadcastModel = mongoose.models.Broadcast
  ?? mongoose.model('Broadcast', broadcastSchema);
