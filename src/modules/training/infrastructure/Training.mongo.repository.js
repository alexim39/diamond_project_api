import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema(
  {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    courseId: { type: String, required: true, index: true },
    completedLessons: { type: [String], default: [] },
    certificateAt: { type: Date, default: null },
  },
  { timestamps: true },
);
progressSchema.index({ partnerId: 1, courseId: 1 }, { unique: true });

export const TrainingProgressModel =
  mongoose.models['Training-progress'] ?? mongoose.model('Training-progress', progressSchema);

const oid = (v) => String(v);
const shaped = (o) => (o ? { ...o, id: oid(o._id), partnerId: oid(o.partnerId) } : null);

/** Mongo implementation of the training store. Reads use `.lean()`. */
export class MongoTrainingStore {
  async findByPartner(partnerId, courseId) {
    return shaped(await TrainingProgressModel.findOne({ partnerId, courseId }).lean());
  }

  async listByPartner(partnerId) {
    const rows = await TrainingProgressModel.find({ partnerId }).lean();
    return rows.map(shaped);
  }

  /** Idempotent lesson completion; stamps the certificate on the last one. */
  async completeLesson(partnerId, courseId, lessonId, certified) {
    const update = { $addToSet: { completedLessons: lessonId } };
    if (certified) update.$set = { certificateAt: new Date() };
    const row = await TrainingProgressModel.findOneAndUpdate(
      { partnerId, courseId },
      update,
      { new: true, upsert: true },
    ).lean();
    return shaped(row);
  }
}
