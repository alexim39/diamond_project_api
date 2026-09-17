import { ForbiddenException, NotFoundException, ValidationException } from '../../../shared/domain/AppError.js';
import { normalizeState, sameState, scoreLead, DAILY_CLAIM_LIMIT } from '../domain/LeadPool.js';
import { ProspectSurveyModel } from '../../../apps/survey/models/survey.model.js';
import { ProspectModel } from '../infrastructure/Prospect.models.js';
import { PartnersModel } from '../../../apps/partner/models/partner.model.js';

const AVG = (ratings) => {
  const list = (ratings ?? []).map((r) => Number(r?.score)).filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
  if (!list.length) return null;
  return list.reduce((a, b) => a + b, 0) / list.length;
};

const dayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * GET /v1/prospects/pool — geo-fenced, scored lead shelf + header KPIs.
 * Members see only their normalized state (state is mandatory — the
 * frontend gates on the `requiresState` response); admins see everything
 * with an optional state filter. Scoring happens over a bounded window
 * (500 newest eligibles) so the sort stays cheap as the pool grows.
 */
export class GetPoolUseCase {
  /** @param {{surveys, prospects, partners, window?}} deps */
  constructor({ surveys, prospects, partners, window = 500 } = {}) {
    Object.assign(this, {
      surveys: surveys ?? ProspectSurveyModel,
      prospects: prospects ?? ProspectModel,
      partners: partners ?? PartnersModel,
      window: Math.min(Math.max(Number(window) || 500, 50), 2000),
    });
  }

  async execute({ partnerId, isAdmin = false, state = null, limit = 25, skip = 0, q = null } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const sk = Math.max(Number(skip) || 0, 0);
    const me = await this.partners.findById(partnerId).select('address').lean().catch(() => null);
    if (!me) throw new NotFoundException('Partner not found');
    const myState = normalizeState(me?.address?.state);
    if (!isAdmin && !myState) {
      return { requiresState: true, items: [], total: 0, meta: null };
    }
    const wanted = isAdmin && state ? normalizeState(state) : myState;
    const filter = { username: 'business', prospectStatus: { $ne: 'Moved to Contact' } };
    if (wanted) filter.stateNorm = wanted;
    const needle = String(q ?? '').trim().slice(0, 60);
    if (needle) {
      const rx = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { surname: rx }, { phoneNumber: rx }];
    }
    const rows = await this.surveys
      .find(filter).sort({ createdAt: -1 }).limit(this.window).lean().catch(() => []);
    const scored = (rows ?? [])
      .filter((r) => !wanted || sameState(r.stateNorm || r.state, wanted))
      .map((r) => {
        const s = scoreLead(r, { avgRating: AVG(r.ratings), returnCount: r.claimCount });
        return { row: r, ...s };
      })
      .sort((a, b) => b.score - a.score || new Date(b.row.createdAt) - new Date(a.row.createdAt));
    const total = scored.length;
    const page = scored.slice(sk, sk + lim);
    // Header KPIs ride along so the page renders in one round trip.
    const today = dayStart();
    const [claimedToday, activeClaims] = await Promise.all([
      this.prospects.countDocuments({ partnerId, claimedAt: { $gte: today }, claimFeePaid: { $gt: 0 } }).catch(() => 0),
      this.prospects.find({ partnerId, claimedAt: { $ne: null } }).select('prospectName prospectSurname claimedAt status').lean().catch(() => []),
    ]);
    const now = Date.now();
    const deadlines = (activeClaims ?? [])
      .map((c) => new Date(c.claimedAt).getTime() + 48 * 3600000 - now)
      .filter((ms) => ms > 0);
    return {
      requiresState: false,
      partnerState: myState || null,
      items: page.map(({ row, badges, reasons }) => ({
        id: String(row._id),
        name: row.name ?? '',
        surname: row.surname ?? '',
        phoneNumber: row.phoneNumber ?? '',
        email: row.email ?? '',
        state: row.state ?? '',
        source: 'Survey',
        createdAt: row.createdAt,
        badges,
        reasons,
        ageRange: row.ageRange ?? '',
        socialMedia: row.socialMedia ?? [],
        employedStatus: row.employedStatus ?? '',
        importanceOfPassiveIncome: row.importanceOfPassiveIncome ?? '',
        onlinePurchaseSchedule: row.onlinePurchaseSchedule ?? '',
        primaryOnlineBusinessMotivation: row.primaryOnlineBusinessMotivation ?? '',
        comfortWithTech: row.comfortWithTech ?? '',
        onlineBusinessTimeDedication: row.onlineBusinessTimeDedication ?? '',
        referral: row.referral ?? row.referralCode ?? '',
        country: row.country ?? '',
      })),
      total,
      meta: {
        available: total,
        claimedToday,
        dailyLimit: DAILY_CLAIM_LIMIT,
        activeClaims: (activeClaims ?? []).length,
        nearestDeadlineMs: deadlines.length ? Math.min(...deadlines) : null,
      },
    };
  }
}

/** POST /v1/prospects/:id/rate — 1–5 star quality vote (own rows only). */
export class RateLeadUseCase {
  /** @param {{prospects}} deps */
  constructor({ prospects } = {}) {
    this.prospects = prospects ?? ProspectModel;
  }

  async execute({ partnerId, prospectId, score, note = '' }) {
    const n = Number(score);
    if (!Number.isFinite(n) || n < 1 || n > 5) throw new ValidationException('Rating must be 1–5 stars');
    const cleanNote = String(note ?? '').trim().slice(0, 500);
    const doc = await this.prospects.findOneAndUpdate(
      { _id: prospectId, partnerId },
      { $set: { rating: { score: Math.round(n), ...(cleanNote ? { note: cleanNote } : {}), at: new Date() } } },
      { new: true },
    ).lean().catch(() => null);
    if (!doc) throw new NotFoundException('Prospect not found');
    return { rated: true, score: Math.round(n) };
  }
}

const csvText = (v, max) => String(v ?? '').trim().slice(0, max);

/** POST /v1/admin/leads/import — bulk pool seeding (admin, validated, capped). */
export class ImportLeadsUseCase {
  /** @param {{surveys, maxBatch?}} deps */
  constructor({ surveys, maxBatch = 500 } = {}) {
    Object.assign(this, {
      surveys: surveys ?? ProspectSurveyModel,
      maxBatch: Math.min(Math.max(Number(maxBatch) || 500, 1), 2000),
    });
  }

  async execute({ rows }) {
    if (!Array.isArray(rows) || rows.length === 0) throw new ValidationException('Provide at least one lead row');
    if (rows.length > this.maxBatch) throw new ValidationException(`At most ${this.maxBatch} rows per import`);
    const docs = [];
    const failed = [];
    rows.forEach((r, i) => {
      const name = csvText(r?.name, 120);
      const surname = csvText(r?.surname, 120);
      const phone = String(r?.phone ?? r?.phoneNumber ?? '').replace(/\D/g, '');
      const state = csvText(r?.state, 80);
      if (!name || !surname || phone.length < 7) {
        failed.push({ index: i, error: 'Row needs a first name, surname and a valid phone number' });
        return;
      }
      docs.push({
        name,
        surname: csvText(r?.surname, 120),        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(r?.email ?? '').trim()) ? String(r.email).trim().toLowerCase() : '',
        phoneNumber: phone,
        ageRange: csvText(r?.ageRange, 40) || 'Not provided',
        socialMedia: Array.isArray(r?.socialMedia) && r.socialMedia.length > 0 ? r.socialMedia.map((s) => csvText(s, 40)) : ['Not provided'],
        employedStatus: csvText(r?.employedStatus, 80) || 'Not provided',
        importanceOfPassiveIncome: csvText(r?.importanceOfPassiveIncome, 80) || 'Not provided',
        onlinePurchaseSchedule: csvText(r?.onlinePurchaseSchedule, 80) || 'Not provided',
        primaryOnlineBusinessMotivation: csvText(r?.primaryOnlineBusinessMotivation, 120) || 'Not provided',
        comfortWithTech: csvText(r?.comfortWithTech, 80) || 'Not provided',
        onlineBusinessTimeDedication: csvText(r?.onlineBusinessTimeDedication, 80) || 'Not provided',
        referralCode: csvText(r?.referralCode, 64),
        referral: csvText(r?.referral, 120),
        country: csvText(r?.country, 80) || 'Nigeria',
        state,
        stateNorm: normalizeState(state),
        username: 'business',
        prospectStatus: 'Not Moved',
      });
    });
    let inserted = 0;
    if (docs.length > 0) {
      const made = await this.surveys.insertMany(docs, { ordered: false }).catch((err) => err?.insertedDocs ?? []);
      inserted = Array.isArray(made) ? made.length : docs.length;
    }
    return { inserted, failed, total: rows.length };
  }
}
