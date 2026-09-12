import mongoose from 'mongoose';

const stampSchema = new mongoose.Schema(
  { done: { type: Boolean, default: false }, at: { type: Date, default: null } },
  { _id: false },
);

const progressionSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, unique: true },
    /** Last derived level (refreshed on read; distribution reads this). */
    level: { type: String, default: 'partner', index: true },
    levelAt: { type: Date, default: null },
    ipo: { type: stampSchema, default: () => ({}) },
    qsg: { type: stampSchema, default: () => ({}) },
    smo: { type: stampSchema, default: () => ({}) },
    accounts: { count: { type: Number, default: 0, min: 0 } },
    fullTime: { type: stampSchema, default: () => ({}) },
    office: { type: stampSchema, default: () => ({}) },
    officeAddress: { type: String, default: '' },
    g8Request: { status: { type: String, enum: ['none', 'submitted', 'approved'], default: 'none' }, at: { type: Date, default: null } },
    onboardingSession: { type: stampSchema, default: () => ({}) },
    qualifiedConfirmed: { type: stampSchema, default: () => ({}) },
    nomination: {
      status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
      note: { type: String, default: '', maxlength: 500 },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
      at: { type: Date, default: null },
      // Counted G8 approvals — distinct approvers, threshold in levels.js.
      approvals: [{
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
        at: { type: Date, default: Date.now },
        _id: false,
      }],
      decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
      decidedAt: { type: Date, default: null },
    },
    appointment: { type: stampSchema, default: () => ({}) },
    appointedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
    /** Audit trail of milestone changes (capped). */
    events: [{
      at: { type: Date, default: Date.now },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
      key: { type: String },
      _id: false,
    }],
  },
  { timestamps: true },
);

export const ProgressionModel =
  mongoose.models.Progression ?? mongoose.model('Progression', progressionSchema);

const oid = (v) => String(v);
const shaped = (o) => (o ? { ...o, id: oid(o._id), partnerId: oid(o.partnerId) } : null);

/** Mongo implementation of the progression store. Reads use `.lean()`. */
export class MongoProgressionStore {
  async findByPartner(partnerId) {
    return shaped(await ProgressionModel.findOne({ partnerId }).lean());
  }

  async ensure(partnerId) {
    return shaped(await ProgressionModel.findOneAndUpdate(
      { partnerId },
      { $setOnInsert: { partnerId, level: 'partner' } },
      { new: true, upsert: true },
    ).lean());
  }

  async upsertMilestones(partnerId, patch, event) {
    const row = await ProgressionModel.findOneAndUpdate(
      { partnerId },
      {
        $set: patch,
        $push: { events: { $each: [event], $slice: -100 } },
      },
      { new: true, upsert: true },
    ).lean();
    return shaped(row);
  }

  async setLevel(partnerId, level) {
    const row = await ProgressionModel.findOneAndUpdate(
      { partnerId },
      { $set: { level, levelAt: new Date() } },
      { new: true, upsert: true },
    ).lean();
    return shaped(row);
  }

  /** Stored levels for a bounded id set (distribution reads this). */
  async levelsFor(partnerIds) {
    if (partnerIds.length === 0) return {};
    const rows = await ProgressionModel.find({ partnerId: { $in: partnerIds } })
      .select('partnerId level')
      .lean();
    return Object.fromEntries(rows.map((r) => [oid(r.partnerId), r.level ?? 'partner']));
  }

  async requestNomination(partnerId, note) {
    const row = await ProgressionModel.findOneAndUpdate(
      { partnerId },
      { $set: { nomination: { status: 'pending', note, by: partnerId, at: new Date(), approvals: [], decidedBy: null, decidedAt: null } } },
      { new: true, upsert: true },
    ).lean();
    return shaped(row);
  }

  /**
   * One approval from a distinct G8/admin approver (`$ne` guard makes
   * concurrent double-approvals impossible). Flips to approved at the
   * required count. Returns `{doc, duplicate}` — null doc = nothing pending.
   */
  async approveNomination(partnerId, approverId, required) {
    const before = await ProgressionModel.findOne({ partnerId }).lean();
    if (!before || before.nomination?.status !== 'pending') return null;
    const duplicate = (before.nomination.approvals ?? []).some((a) => String(a.by) === String(approverId));
    if (!duplicate) {
      await ProgressionModel.updateOne(
        { partnerId, 'nomination.status': 'pending', 'nomination.approvals.by': { $ne: approverId } },
        { $push: { 'nomination.approvals': { by: approverId, at: new Date() } } },
      );
    }
    const after = await ProgressionModel.findOne({ partnerId }).lean();
    const count = after?.nomination?.approvals?.length ?? 0;
    if (!duplicate && after?.nomination?.status === 'pending' && count >= required) {
      await ProgressionModel.updateOne(
        { partnerId },
        { $set: { 'nomination.status': 'approved', 'nomination.decidedAt': new Date() } },
      );
      after.nomination.status = 'approved';
    }
    return { doc: shaped(after), duplicate };
  }

  async rejectNomination(partnerId, decidedBy) {
    const row = await ProgressionModel.findOneAndUpdate(
      { partnerId, 'nomination.status': 'pending' },
      { $set: { 'nomination.status': 'rejected', 'nomination.decidedBy': decidedBy, 'nomination.decidedAt': new Date() } },
      { new: true },
    ).lean();
    return shaped(row);
  }

  /** Pending G-nominations within a bounded id set (oversight inbox). */
  async listPendingNominations(partnerIds, limit = 100) {
    if (partnerIds.length === 0) return [];
    const rows = await ProgressionModel.find({ partnerId: { $in: partnerIds }, 'nomination.status': 'pending' })
      .select('partnerId level nomination updatedAt')
      .sort({ updatedAt: -1 })
      .limit(Math.min(Math.max(Number(limit) || 100, 1), 200))
      .lean();
    return rows.map(shaped);
  }
}
