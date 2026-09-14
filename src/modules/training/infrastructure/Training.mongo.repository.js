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

export { TrainingQuizModel } from './TrainingQuiz.mongo.model.js';

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

  // Quiz overrides (admin-owned) — one doc per lesson, merged over the code catalog.
  async getQuiz(courseId, lessonId) {
    const { TrainingQuizModel } = await import('./TrainingQuiz.mongo.model.js');
    const doc = await TrainingQuizModel.findOne({ courseId, lessonId }).lean();
    return doc?.quiz ?? null;
  }

  async listQuizzes() {
    const { TrainingQuizModel } = await import('./TrainingQuiz.mongo.model.js');
    const docs = await TrainingQuizModel.find({}).lean();
    return docs.map((d) => ({ courseId: d.courseId, lessonId: d.lessonId, quiz: d.quiz }));
  }

  async upsertQuiz(courseId, lessonId, quiz) {
    const { TrainingQuizModel } = await import('./TrainingQuiz.mongo.model.js');
    const doc = await TrainingQuizModel.findOneAndUpdate(
      { courseId, lessonId },
      { $set: { quiz } },
      { new: true, upsert: true },
    ).lean();
    return { courseId: doc.courseId, lessonId: doc.lessonId, quiz: doc.quiz };
  }
}
