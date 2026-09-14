import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { requireRole } from '../../identity-access/interface/RequireRole.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { MongoTrainingStore } from '../../training/infrastructure/Training.mongo.repository.js';
import { COURSES } from '../../training/domain/Training.catalog.js';

const slug = z.string().trim().min(1).max(64);

const QuizQuestionSchema = z.object({
  q: z.string().trim().min(3).max(500),
  options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
  answer: z.number().int().min(0),
}).refine((o) => o.answer < o.options.length, { message: 'Answer index out of range', path: ['answer'] });

const QuizSchema = z.array(QuizQuestionSchema).min(1).max(4);

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildAdminTrainingRouter = (deps = {}) => {
  const training = deps.training ?? new MongoTrainingStore();

  const router = express.Router();
  router.use(requireAuth, requireRole('admin'));

  router.get('/quizzes', asyncHandler(async (_req, res) => {
    const data = await training.listQuizzes();
    res.status(200).json({ message: 'Quizzes retrieved successfully', data, success: true });
  }));

  router.get('/catalog', asyncHandler(async (_req, res) => {
    const data = COURSES.map((c) => ({
      id: c.id,
      title: c.title,
      lessons: c.lessons.map((l) => ({ id: l.id, title: l.title, quizCount: l.quiz?.length ?? 0 })),
    }));
    res.status(200).json({ message: 'Catalog retrieved successfully', data, success: true });
  }));

  router.put('/courses/:courseId/lessons/:lessonId/quiz', validate({ params: z.object({ courseId: slug, lessonId: slug }), body: QuizSchema }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const body = req.validated?.body ?? req.body;
    // Validate lesson exists (catalog is the source of truth for ids).
    const course = COURSES.find((c) => c.id === params.courseId);
    if (!course) return res.status(404).json({ message: 'Unknown course', success: false });
    if (!course.lessons.some((l) => l.id === params.lessonId)) {
      return res.status(404).json({ message: 'Unknown lesson', success: false });
    }
    const data = await training.upsertQuiz(params.courseId, params.lessonId, body);
    res.status(200).json({ message: 'Quiz saved successfully', data, success: true });
  }));

  return router;
};

export default buildAdminTrainingRouter();
