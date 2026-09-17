import { ConflictException, ForbiddenException, NotFoundException } from '../../../shared/domain/AppError.js';
import { ProspectSurveyModel } from '../../../apps/survey/models/survey.model.js';

/**
 * Buy Prospect return window — a partner may send a pool-claimed lead back
 * within 7 days of pickup. Only pool-origin rows (surverId present) can
 * return; personal contacts can never be dumped into the public pool.
 * Pre-tracking claims (no claimedAt) are releasable — the window couldn't
 * be observed, and stale hoarded leads re-entering helps fairness.
 * Release rebuilds the pool row from the prospect (the claim path deletes
 * the survey) and removes the prospect row.
 */
export const RELEASE_WINDOW_DAYS = Number(process.env.LEAD_RELEASE_DAYS ?? 7) || 7;

const required = (v, fallback = 'Not provided') => {
  const s = String(v ?? '').trim();
  return s || fallback;
};

export class ReleaseProspectToPoolUseCase {
  /** @param {{prospects, surveys}} deps */
  constructor({ prospects, surveys } = {}) {
    Object.assign(this, {
      prospects,
      surveys: surveys ?? ProspectSurveyModel,
    });
    if (!this.prospects) throw new Error('ReleaseProspectToPoolUseCase requires prospects');
  }

  async execute({ partnerId, prospectId }) {
    const p = await this.prospects.findById(prospectId);
    if (!p) throw new NotFoundException('Prospect not found');
    if (String(p.partnerId) !== String(partnerId)) {
      throw new ForbiddenException('You can only return your own leads');
    }
    if (!p.surverId && !p.survey) {
      throw new ConflictException('Only Buy Prospect leads can be returned to the pool');
    }
    if (p.claimedAt) {
      const ageMs = Date.now() - new Date(p.claimedAt).getTime();
      if (ageMs > RELEASE_WINDOW_DAYS * 86400000) {
        throw new ConflictException(`Return window closed (${RELEASE_WINDOW_DAYS} days from pickup)`);
      }
    }
    const snap = p.survey ?? {};
    const phone = String(p.prospectPhone ?? '').trim();
    // Pool rows require a phone — never restore junk digits.
    if (!phone) throw new ConflictException('Cannot return a lead without a phone number');
    const restored = await this.surveys.create({
      name: required(p.prospectName),
      surname: p.prospectSurname ?? '',
      email: p.prospectEmail ?? '',
      phoneNumber: phone,
      ageRange: required(snap.ageRange),
      socialMedia: Array.isArray(snap.socialMedia) && snap.socialMedia.length > 0 ? snap.socialMedia : ['Not provided'],
      employedStatus: required(snap.employedStatus),
      importanceOfPassiveIncome: required(snap.importanceOfPassiveIncome),
      onlinePurchaseSchedule: required(snap.onlinePurchaseSchedule),
      primaryOnlineBusinessMotivation: required(snap.primaryOnlineBusinessMotivation),
      comfortWithTech: required(snap.comfortWithTech),
      onlineBusinessTimeDedication: required(snap.onlineBusinessTimeDedication),
      referralCode: snap.referralCode ?? '',
      referral: snap.referral ?? '',
      country: snap.country ?? 'Nigeria',
      state: snap.state ?? '',
      username: 'business',
      prospectStatus: 'Not Moved',
    });
    await this.prospects.deleteById(prospectId);
    return { released: true, surveyId: String(restored._id ?? restored.id) };
  }
}
