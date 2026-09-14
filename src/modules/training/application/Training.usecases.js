import { catalogSummaries, courseProgress, getCourse, getCourseWithQuiz, getLesson, getLessonWithQuiz } from '../domain/Training.catalog.js';

/** Online IPO / QSG / SMO / Leadership — completion feeds the ladder. */
export class ListCoursesUseCase {
  /** @param {{training}} deps */
  constructor({ training }) {
    this.training = training;
  }

  async execute({ partnerId }) {
    const rows = await this.training.listByPartner(partnerId);
    const byCourse = Object.fromEntries(rows.map((r) => [r.courseId, r]));
    return catalogSummaries().map((c) => {
      const course = getCourse(c.id);
      const progress = courseProgress(course, byCourse[c.id]?.completedLessons ?? []);
      return {
        ...c,
        ...progress,
        certificateAt: byCourse[c.id]?.certificateAt ?? null,
      };
    });
  }
}

export class GetCourseUseCase {
  /** @param {{training}} deps */
  constructor({ training }) {
    this.training = training;
  }

  async execute({ partnerId, courseId }) {
    const course = await getCourseWithQuiz(courseId, this.training);
    const row = await this.training.findByPartner(partnerId, courseId);
    return {
      ...course,
      ...courseProgress(course, row?.completedLessons ?? []),
      certificateAt: row?.certificateAt ?? null,
    };
  }
}

export class CompleteLessonUseCase {
  /** @param {{training, progress, recognition, network}} deps (recognition/network optional — auto-posts certificates) */
  constructor({ training, progress, recognition, network }) {
    Object.assign(this, { training, progress, recognition, network });
  }

  async execute({ partnerId, courseId, lessonId, answers }) {
    const { course, lesson } = await getLessonWithQuiz(courseId, lessonId, this.training); // throws on unknown ids
    // Quiz gate: when a lesson carries questions, all answers must match.
    // Passing length check + every index correct prevents click-through certs.
    const quiz = lesson.quiz ?? [];
    if (quiz.length > 0) {
      if (!Array.isArray(answers) || answers.length !== quiz.length) {
        throw new (await import('../../../shared/domain/AppError.js')).ValidationException('Answer every quiz question');
      }
      const wrong = quiz.some((q, i) => Number(answers[i]) !== q.answer);
      if (wrong) throw new (await import('../../../shared/domain/AppError.js')).ValidationException('One or more answers are incorrect — try again');
    }
    const existing = await this.training.findByPartner(partnerId, courseId);
    const alreadyCertified = !!existing?.certificateAt;
    const next = courseProgress(course, [...(existing?.completedLessons ?? []), lessonId]);
    const row = await this.training.completeLesson(partnerId, courseId, lessonId, next.certified);
    const newlyCertified = next.certified && !alreadyCertified;

    // Ladder tie-in: a fresh certificate checks its progression milestone.
    let milestoneChecked = null;
    if (newlyCertified && course.milestone && this.progress) {
      await this.progress.upsertMilestones(
        partnerId,
        { [course.milestone]: { done: true, at: new Date() } },
        { at: new Date(), by: partnerId, key: `${course.milestone} (via ${courseId} certificate)` },
      );
      milestoneChecked = course.milestone;
    }

    // Community recognition — best-effort, never fails the request.
    if (newlyCertified && this.recognition) {
      try {
        const node = await this.network?.findNode(partnerId);
        const name = node
          ? [node.name, node.surname].filter(Boolean).join(' ') || node.username
          : 'A partner';
        await this.recognition.certificate(partnerId, courseId, course.title, name);
      } catch { /* celebratory, not critical */ }
    }
    return {
      progress: next,
      certificateAt: row?.certificateAt ?? null,
      certified: newlyCertified,
      milestoneChecked,
    };
  }
}

export class MyCertificatesUseCase {
  /** @param {{training}} deps */
  constructor({ training }) {
    this.training = training;
  }

  async execute({ partnerId }) {
    const rows = await this.training.listByPartner(partnerId);
    return rows
      .filter((r) => r.certificateAt)
      .map((r) => {
        const course = getCourse(r.courseId);
        return { courseId: r.courseId, title: course.title, at: r.certificateAt };
      });
  }
}
