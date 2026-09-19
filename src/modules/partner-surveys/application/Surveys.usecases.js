import { NotFoundException, ValidationException } from '../../../shared/domain/AppError.js';
import { PartnerSurveyModel } from '../../../apps/survey/models/survey.model.js';

const top = (vals, n = 5) => {
  const counts = new Map();
  for (const v of vals) {
    const k = String(v ?? '').trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, count]) => ({ label, count }));
};

const shape = (d) => ({
  id: String(d._id),
  name: d.name ?? '',
  gender: d.gender ?? '',
  phoneNumber: d.phoneNumber ?? '',
  reservationCode: d.reservationCode ?? '',
  difficulty: d.difficulty ?? '',
  challenges: d.challenges ?? [],
  strategies: d.strategies ?? [],
  targetAudience: d.targetAudience ?? [],
  recruitmentTool: d.recruitmentTool ?? '',
  misconception: d.misconception ?? '',
  businessMotivation: d.businessMotivation ?? '',
  recruitmentAttempt: d.recruitmentAttempt ?? '',
  trainingSupport: d.trainingSupport ?? '',
  comfortWithTech: d.comfortWithTech ?? '',
  businessTimeDedication: d.businessTimeDedication ?? '',
  interestedInTraining: d.interestedInTraining ?? '',
  createdAt: d.createdAt ?? null,
});

/**
 * GET /v1/admin/partner-surveys — partner-survey inbox + analytics.
 * Source: public :4202 survey (PartnerSurveyModel). One round trip returns
 * rows + summary so the admin page renders KPIs without extra calls.
 * Summary is built for product analytics: pain points (challenges,
 * difficulty), leverage (strategies, tools, audiences) and training demand.
 */
export class ListPartnerSurveysUseCase {
  constructor({ surveys } = {}) {
    this.surveys = surveys ?? PartnerSurveyModel;
  }

  async execute({ q = null, limit = 25, skip = 0 } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const sk = Math.max(Number(skip) || 0, 0);
    const filter = {};
    const needle = String(q ?? '').trim().slice(0, 80);
    if (needle) {
      const rx = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { phoneNumber: rx }, { reservationCode: rx }];
    }
    const [rows, total, all] = await Promise.all([
      this.surveys.find(filter).sort({ createdAt: -1 }).skip(sk).limit(lim).lean().catch(() => []),
      this.surveys.countDocuments(filter).catch(() => 0),
      this.surveys.find({}).select('difficulty challenges strategies targetAudience recruitmentTool trainingSupport interestedInTraining createdAt').lean().catch(() => []),
    ]);
    const list = all ?? [];
    return {
      items: (rows ?? []).map(shape),
      total,
      summary: {
        total: list.length,
        new7d: list.filter((d) => d.createdAt && new Date(d.createdAt).getTime() > Date.now() - 7 * 86400000).length,
        topChallenges: top(list.flatMap((d) => d.challenges ?? [])),
        topStrategies: top(list.flatMap((d) => d.strategies ?? [])),
        topAudiences: top(list.flatMap((d) => d.targetAudience ?? [])),
        byDifficulty: top(list.map((d) => d.difficulty), 10),
        byTool: top(list.map((d) => d.recruitmentTool), 10),
        trainingDemand: top(list.map((d) => d.trainingSupport), 10),
        wantsTraining: list.filter((d) => /yes/i.test(String(d.interestedInTraining ?? ''))).length,
      },
    };
  }
}

/**
 * GET /v1/admin/partner-surveys/:id — full row for inspection.
 */
export class GetPartnerSurveyUseCase {
  constructor({ surveys } = {}) {
    this.surveys = surveys ?? PartnerSurveyModel;
  }

  async execute({ id }) {
    if (!/^[a-fA-F0-9]{24}$/.test(String(id ?? ''))) throw new ValidationException('Invalid id');
    const doc = await this.surveys.findById(id).lean().catch(() => null);
    if (!doc) throw new NotFoundException('Survey not found');
    return shape(doc);
  }
}

/**
 * DELETE /v1/admin/partner-surveys/:id — hard delete one row.
 * Survey rows are pre-relationship data; deleting removes the row only.
 */
export class DeletePartnerSurveyUseCase {
  constructor({ surveys } = {}) {
    this.surveys = surveys ?? PartnerSurveyModel;
  }

  async execute({ id }) {
    if (!/^[a-fA-F0-9]{24}$/.test(String(id ?? ''))) throw new ValidationException('Invalid id');
    const doc = await this.surveys.findById(id).lean().catch(() => null);
    if (!doc) throw new NotFoundException('Survey not found');
    await this.surveys.deleteOne({ _id: id }).catch(() => null);
    return { id: String(id), name: doc.name ?? '' };
  }
}
