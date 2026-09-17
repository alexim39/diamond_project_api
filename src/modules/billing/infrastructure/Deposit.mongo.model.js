import mongoose from 'mongoose';

/**
 * Deposit intent — one row per wallet top-up attempt. `reference` is the
 * idempotency key shared with Opay (their 02004 + our callback dedupe both
 * key off it). Rows never delete: abandoned attempts are history.
 */
const depositSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    amountNgn: { type: Number, required: true, min: 0 },
    amountKobo: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['created', 'pending', 'success', 'failed', 'closed'],
      default: 'created',
      index: true,
    },
    orderNo: { type: String, default: null },
    creditedAt: { type: Date, default: null },
    lastCallback: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);
depositSchema.index({ partnerId: 1, createdAt: -1 });

export const DepositIntentModel = mongoose.models['Deposit-intent']
  ?? mongoose.model('Deposit-intent', depositSchema);
