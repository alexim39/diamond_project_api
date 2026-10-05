import { ConflictException, NotFoundException, ValidationException } from '../../../shared/domain/AppError.js';
import { ProspectModel } from '../infrastructure/Prospect.models.js';
import { PartnersModel } from '../../../apps/partner/models/partner.model.js';
import { ProspectSurveyModel } from '../../../apps/survey/models/survey.model.js';

/**
 * Admin push — grant a shared-pool lead to a partner, free of charge.
 * Same pipeline copy as a paid claim (contact unlocks, 48h work clock via
 * claimedAt, pool row cleared) but with no wallet debit: claimFeePaid is 0,
 * which also keeps the push outside the paid daily-cap count
 * (`claimFeePaid: { $gt: 0 }`). Order mirrors the claim money-safety model:
 * verify pool row → resolve target partner → duplicate check (scoped to the
 * target's contacts) → atomic survey take (first push wins) → create
 * prospect → delete survey. A failed create releases the row back to
 * 'Not Moved' so the lead is never stranded.
 */
export class PushPoolLeadToPartnerUseCase {
  /** @param {{surveys, prospects, partners}} deps */
  constructor({ surveys, prospects, partners } = {}) {
    Object.assign(this, {
      surveys: surveys ?? ProspectSurveyModel,
      prospects: prospects ?? ProspectModel,
      partners: partners ?? PartnersModel,
    });
  }

  async execute({ leadId, username }) {
    if (!/^[a-fA-F0-9]{24}$/.test(String(leadId ?? ''))) throw new ValidationException('Invalid lead id');
    const target = String(username ?? '').trim();
    if (!target) throw new ValidationException('Provide a valid partner username');
    if (target.toLowerCase() === 'business') throw new ValidationException('Cannot push to business — business is the shared Buy Prospect pool. Enter a real partner username');
    const partner = await this.partners.findOne({ username: target }).select('_id username').lean().catch(() => null);
    if (!partner) throw new NotFoundException('Target partner not found');

    const survey = await this.surveys.findById(leadId).lean().catch(() => null);
    if (!survey || survey.username !== 'business') throw new NotFoundException('Lead is no longer in the pool');
    if (survey.prospectStatus === 'Moved to Contact') {
      throw new ConflictException('This lead was just claimed by someone else');
    }
    // Duplicate guard scoped to the target partner's contacts (blank
    // emails never match — families share inboxes, phone is the key).
    const ors = [];
    if (survey.email) ors.push({ prospectEmail: survey.email });
    if (survey.phoneNumber) ors.push({ prospectPhone: survey.phoneNumber });
    const dupe = ors.length > 0
      ? await this.prospects.findOne({ partnerId: partner._id, $or: ors }).lean().catch(() => null)
      : null;
    if (dupe) throw new ConflictException('This lead is already in their contacts');

    // Atomic first-push-wins take on the pool row.
    const taken = await this.surveys.findOneAndUpdate(
      { _id: leadId, prospectStatus: { $ne: 'Moved to Contact' } },
      { $set: { prospectStatus: 'Claimed' } },
      { new: true },
    ).lean().catch(() => null);
    if (!taken) throw new ConflictException('This lead was just claimed by someone else');

    try {
      const created = await this.prospects.create({
        prospectName: survey.name,
        prospectSurname: survey.surname ?? '',
        prospectEmail: survey.email ?? '',
        prospectPhone: survey.phoneNumber,
        prospectSource: 'Admin Push',
        partnerId: partner._id,
        claimedAt: new Date(),
        claimFeePaid: 0,
        poolReturns: Number(survey.claimCount) || 0,
        surverId: survey._id,
        survey: {
          ageRange: survey.ageRange,
          socialMedia: survey.socialMedia,
          employedStatus: survey.employedStatus,
          importanceOfPassiveIncome: survey.importanceOfPassiveIncome,
          onlinePurchaseSchedule: survey.onlinePurchaseSchedule,
          primaryOnlineBusinessMotivation: survey.primaryOnlineBusinessMotivation,
          comfortWithTech: survey.comfortWithTech,
          onlineBusinessTimeDedication: survey.onlineBusinessTimeDedication,
          referralCode: survey.referralCode,
          referral: survey.referral,
          country: survey.country,
          state: survey.state,
        },
      });
      await this.surveys.findByIdAndDelete(leadId).catch(() => null);
      return {
        prospectId: String(created._id ?? created.id),
        username: target,
      };
    } catch (err) {
      await this.surveys.updateOne({ _id: leadId }, { $set: { prospectStatus: 'Not Moved' } }).catch(() => null);
      throw err;
    }
  }
}
