/**
 * Campaign ROI math — pure, unit-testable without Mongo.
 *
 * Attribution is honest by construction: rows stamped with a campaignId
 * count as `exact`; everything else falls back to the flight-window
 * heuristic (`estimated`) and says so on the row.
 */

const r2 = (v) => Math.round(v * 100) / 100;

/**
 * Overlap of a campaign's flight with the trailing window.
 * @returns {{start: Date, end: Date} | null} null when there is no overlap.
 */
export const flightWindow = (campaign, now, days) => {
  const t = new Date(now).getTime();
  const flightStart = new Date(
    campaign.adDuration?.campaignStartDate ?? campaign.createdAt ?? t,
  ).getTime();
  const flightEnd = campaign.adDuration?.noEndDate
    ? t
    : new Date(campaign.adDuration?.campaignEndDate ?? t).getTime();
  const start = new Date(Math.max(flightStart, t - days * 86400000));
  const end = new Date(Math.min(flightEnd, t));
  if (!(end > start)) return null;
  return { start, end };
};

/**
 * @param {object} campaign legacy campaign doc (lean)
 * @param {{prospects: number, conversions: number}} counts
 * @param {'exact' | 'estimated'} attribution
 * @param {{outreachSpend?: number}} extra additive sms spend for the window
 */
export const buildCampaignRoi = (campaign, { prospects, conversions }, attribution, extra = {}) => {
  const budget = Number(campaign.budget?.budgetAmount ?? 0);
  const outreachSpend = Math.round(Number(extra.outreachSpend ?? 0) * 100) / 100;
  const rate = prospects > 0 ? (conversions / prospects) * 100 : null;
  return {
    id: String(campaign._id ?? campaign.id),
    name: campaign.campaignName ?? 'Untitled campaign',
    visits: campaign.visits ?? 0,
    budget: r2(budget),
    outreachSpend,
    windowProspects: prospects,
    windowConversions: conversions,
    conversionRate: rate === null ? null : r2(rate),
    costPerProspect: prospects > 0 && budget > 0 ? r2(budget / prospects) : null,
    costPerConversion: conversions > 0 && budget > 0 ? r2(budget / conversions) : null,
    attribution,
  };
};
