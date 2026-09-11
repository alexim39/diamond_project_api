import { buildCampaignRoi, flightWindow } from '../domain/Marketing.roi.js';

const clampDays = (days) => Math.min(Math.max(Number(days) || 30, 7), 365);

/** Per-campaign ROI: visits + spend + attributed prospects/conversions. */
export class GetCampaignRoiUseCase {
  /** @param {{marketing}} deps */
  constructor({ marketing }) {
    this.marketing = marketing;
  }

  async execute({ partnerId, days = 30, now = new Date() }) {
    const d = clampDays(days);
    const t = new Date(now);
    const campaigns = await this.marketing.listCampaigns(partnerId);
    const rows = await Promise.all(campaigns.map(async (c) => {
      const window = flightWindow(c, t, d);
      if (!window) return buildCampaignRoi(c, { prospects: 0, conversions: 0 }, 'estimated');
      const exact = await this.marketing.countExactWindow(partnerId, String(c._id), window.start, window.end);
      if (exact.prospects > 0) return buildCampaignRoi(c, exact, 'exact');
      const link = await this.marketing.countLinkWindow(partnerId, window.start, window.end);
      return buildCampaignRoi(c, link, 'estimated');
    }));
    const totals = rows.reduce(
      (s, r) => ({
        visits: s.visits + r.visits,
        budget: s.budget + r.budget,
        prospects: s.prospects + r.windowProspects,
        conversions: s.conversions + r.windowConversions,
      }),
      { visits: 0, budget: 0, prospects: 0, conversions: 0 },
    );
    const rate = totals.prospects > 0 ? (totals.conversions / totals.prospects) * 100 : null;
    return {
      days: d,
      campaigns: rows,
      totals: {
        ...totals,
        budget: Math.round(totals.budget * 100) / 100,
        conversionRate: rate === null ? null : Math.round(rate * 100) / 100,
        costPerProspect: totals.prospects > 0 && totals.budget > 0
          ? Math.round((totals.budget / totals.prospects) * 100) / 100
          : null,
        costPerConversion: totals.conversions > 0 && totals.budget > 0
          ? Math.round((totals.budget / totals.conversions) * 100) / 100
          : null,
      },
    };
  }
}
