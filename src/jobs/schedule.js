import cron from 'node-cron';
import { BuildTeamSnapshotsUseCase } from '../modules/analytics/application/BuildSnapshots.usecase.js';
import { MongoNetworkRepository } from '../modules/network/infrastructure/Network.mongo.repository.js';
import { MongoOrderReader } from '../modules/billing/infrastructure/Billing.mongo.repository.js';
import { MongoProspectRepository } from '../modules/crm/infrastructure/Prospect.mongo.repository.js';
import { MongoTeamSnapshotStore } from '../modules/analytics/infrastructure/TeamSnapshots.mongo.repository.js';
// Local bindings for the scheduled callbacks — re-exports below do NOT
// create module-scope names (that was the weekly-review/outreach cron crash).
import { runBirthdayJob } from './birthday.js';
import { runDailyBriefJob } from './daily-brief.js';
import { runWeeklyReviewJob } from './weekly-review.js';
import { runDigestJob } from './digest.js';
import { runOutreachDueJob } from './outreach-due.js';
import { runBroadcastDueJob } from './broadcast-due.js';
import { runLeadPoolDueJob } from './leadpool-due.js';

/**
 * Background jobs — the single scheduling mechanism (the legacy birthday
 * side-effect import is retired; everything registers here).
 * - nightly team snapshots (02:00): materialize 30-day metrics per leader.
 * - daily priorities brief (06:30 server-local): ≤3 + 1 momentum per partner.
 * - weekly review request (Monday 07:00 server-local): one keyed prompt.
 * - birthday greetings (08:00): $expr-matched celebrants only.
 * - email digests (19:00 server-local): daily cadence + weekly on Mondays.
 * - scheduled outreach (every minute): fire due bulk-SMS outbox rows.
 * - scheduled broadcasts (every minute): fire due multi-channel campaigns.
 * - lead-pool sweep (every 15 minutes): warn + auto-return idle claims.
 * Jobs never throw into the scheduler — failures are logged, not fatal.
 * `runSnapshotJob` / `runBirthdayJob` / `runDailyBriefJob` /
 * `runWeeklyReviewJob` / `runDigestJob` / `runOutreachDueJob` /
 * `runBroadcastDueJob` / `runLeadPoolDueJob` are exported for tests and triggers.
 */
export const buildSnapshotJob = (deps = {}) => new BuildTeamSnapshotsUseCase({
  network: deps.network ?? new MongoNetworkRepository(),
  orders: deps.orders ?? new MongoOrderReader(),
  prospects: deps.prospects ?? new MongoProspectRepository(),
  snapshots: deps.snapshots ?? new MongoTeamSnapshotStore(),
});

export async function runSnapshotJob(deps = {}) {
  const started = Date.now();
  try {
    const result = await buildSnapshotJob(deps).execute({});
    console.log(`[jobs] snapshots: ${result.done}/${result.leaders} leaders in ${Date.now() - started}ms (${result.failed.length} failed)`);
    return result;
  } catch (error) {
    console.error('[jobs] snapshots crashed:', error?.message ?? error);
    return { leaders: 0, done: 0, failed: [{ error: error?.message ?? String(error) }] };
  }
}

export function scheduleJobs() {
  cron.schedule('0 2 * * *', () => runSnapshotJob());
  cron.schedule('30 6 * * *', () => runDailyBriefJob());
  cron.schedule('0 7 * * 1', () => runWeeklyReviewJob());
  cron.schedule('0 8 * * *', () => runBirthdayJob());
  cron.schedule('0 19 * * *', () => runDigestJob());
  cron.schedule('* * * * *', () => runOutreachDueJob());
  cron.schedule('* * * * *', () => runBroadcastDueJob());
  cron.schedule('*/15 * * * *', () => runLeadPoolDueJob());
  console.log('[jobs] scheduled: nightly team snapshots at 02:00, daily brief at 06:30, weekly review Mondays at 07:00, birthdays at 08:00, digests at 19:00, outreach + broadcasts due every minute, lead-pool sweep every 15 minutes');
}

export { runBirthdayJob } from './birthday.js';
export { runDailyBriefJob } from './daily-brief.js';
export { runWeeklyReviewJob } from './weekly-review.js';
export { runDigestJob } from './digest.js';
export { runOutreachDueJob } from './outreach-due.js';
export { runBroadcastDueJob } from './broadcast-due.js';
export { runLeadPoolDueJob } from './leadpool-due.js';
