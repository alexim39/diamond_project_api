import { catalogSummaries, courseProgress, getCourse, getCourseWithQuiz, getLesson, getLessonWithQuiz } from '../domain/Training.catalog.js';
import { collectDownlineIds } from '../../network/infrastructure/Network.mongo.repository.js';

export const WATCH_REQUIRED_PERCENT = 90;

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
    const watch = typeof this.training.getWatch === 'function'
      ? await this.training.getWatch(partnerId, courseId).catch(() => ({}))
      : {};
    return {
      ...course,
      ...courseProgress(course, row?.completedLessons ?? []),
      certificateAt: row?.certificateAt ?? null,
      watch,
    };
  }
}

export class RecordWatchUseCase {
  /** @param {{training}} deps */
  constructor({ training }) {
    this.training = training;
  }

  async execute({ partnerId, courseId, lessonId, percent, seconds }) {
    const { lesson } = await getLesson(courseId, lessonId); // throws on unknown ids
    if (!lesson.videoUrl) {
      throw new (await import('../../../shared/domain/AppError.js')).ValidationException('Lesson has no video');
    }
    return this.training.recordWatch(partnerId, courseId, lessonId, percent, seconds);
  }
}

export class CompleteLessonUseCase {
  /** @param {{training, progress, recognition, network}} deps (recognition/network optional — auto-posts certificates) */
  constructor({ training, progress, recognition, network }) {
    Object.assign(this, { training, progress, recognition, network });
  }

  async execute({ partnerId, courseId, lessonId, answers }) {
    const { course, lesson } = await getLessonWithQuiz(courseId, lessonId, this.training); // throws on unknown ids
    // Video gate (server-enforced): video lessons need >=90% watched before completion.
    if (lesson.videoUrl) {
      const watch = typeof this.training.getWatch === 'function'
        ? await this.training.getWatch(partnerId, courseId).catch(() => ({}))
        : {};
      const pct = watch?.[lessonId]?.percent ?? 0;
      if (pct < WATCH_REQUIRED_PERCENT) {
        throw new (await import('../../../shared/domain/AppError.js')).ValidationException(
          `Watch the video before completing (${Math.round(pct)}% of ${WATCH_REQUIRED_PERCENT}% watched)`,
        );
      }
    }
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

/**
 * Downline training compliance — per-member course progress across the
 * requester's bounded downline. Read-only rollup over existing progress
 * rows; members with no rows count as not started.
 */
export class TeamComplianceUseCase {
  /** @param {{training, network}} deps */
  constructor({ training, network }) {
    Object.assign(this, { training, network });
  }

  async execute({ requesterId, limit = 200 }) {
    const cap = Math.min(Math.max(Number(limit) || 200, 1), 500);
    const { ids, depths, capped, total } = await collectDownlineIds(this.network, requesterId, { maxDepth: 10, cap });
    if (ids.length === 0) {
      return { members: [], total: 0, capped, summary: { notStarted: 0, inProgress: 0, fullyCertified: 0 } };
    }
    const [rows, nodes] = await Promise.all([
      this.training.listForPartners
        ? this.training.listForPartners(ids)
        : Promise.all(ids.map((id) => this.training.listByPartner(id).catch(() => []))).then((r) => r.flat()),
      this.network.findNodesByIds ? this.network.findNodesByIds(ids, cap) : [],
    ]);
    const labels = Object.fromEntries((nodes ?? []).map((nd) => [String(nd.id), {
      username: nd.username,
      name: [nd.name, nd.surname].filter(Boolean).join(' ') || nd.username,
    }]));
    const byPartner = new Map();
    for (const r of rows ?? []) {
      const pid = String(r.partnerId);
      if (!byPartner.has(pid)) byPartner.set(pid, []);
      byPartner.get(pid).push(r);
    }
    const catalog = catalogSummaries();
    const members = ids.map((id) => {
      const pid = String(id);
      const prow = byPartner.get(pid) ?? [];
      const byCourse = Object.fromEntries(prow.map((r) => [r.courseId, r]));
      const courses = catalog.map((c) => {
        const course = getCourse(c.id);
        const p = courseProgress(course, byCourse[c.id]?.completedLessons ?? []);
        return { courseId: c.id, title: c.title, done: p.done, total: p.total, percent: p.percent, certified: p.certified };
      });
      const certifiedCount = courses.filter((c) => c.certified).length;
      const overallPercent = courses.length > 0
        ? Math.round(courses.reduce((s, c) => s + c.percent, 0) / courses.length)
        : 0;
      return {
        partnerId: pid,
        depth: depths[pid] ?? null,
        member: labels[pid] ?? null,
        courses,
        overallPercent,
        certifiedCount,
      };
    });
    const summary = {
      notStarted: members.filter((m) => m.overallPercent === 0).length,
      inProgress: members.filter((m) => m.overallPercent > 0 && m.certifiedCount < courses0(catalog)).length,
      fullyCertified: members.filter((m) => m.certifiedCount === courses0(catalog) && catalog.length > 0).length,
    };
    return { members, total, capped, summary };
  }
}

const courses0 = (catalog) => catalog.length;
