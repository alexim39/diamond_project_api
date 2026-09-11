import { catalogSummaries, courseProgress, getCourse, getLesson } from '../domain/Training.catalog.js';

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
    const course = getCourse(courseId);
    const row = await this.training.findByPartner(partnerId, courseId);
    return {
      ...course,
      ...courseProgress(course, row?.completedLessons ?? []),
      certificateAt: row?.certificateAt ?? null,
    };
  }
}

export class CompleteLessonUseCase {
  /** @param {{training, progress}} deps (progress = progression store for milestone auto-check) */
  constructor({ training, progress }) {
    Object.assign(this, { training, progress });
  }

  async execute({ partnerId, courseId, lessonId }) {
    const { course } = getLesson(courseId, lessonId); // throws on unknown ids
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
