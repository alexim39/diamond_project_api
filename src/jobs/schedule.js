import cron from 'node-cron';
import { BuildTeamSnapshotsUseCase } from '../modules/analytics/application/BuildSnapshots.usecase.js';
import { MongoNetworkRepository } from '../modules/network/infrastructure/Network.mongo.repository.js';
import { MongoOrderReader } from '../modules/billing/infrastructure/Billing.mongo.repository.js';
import { MongoProspectRepository } from '../modules/crm/infrastructure/Prospect.mongo.repository.js';
import { MongoTeamSnapshotStore } from '../modules/analytics/infrastructure/TeamSnapshots.mongo.repository.js';

/**
 * Background jobs (node-cron, same as the legacy birthday job).
 * - nightly team snapshots (02:00): materialize 30-day metrics per leader.
 * Jobs never throw into the scheduler — failures are logged, not fatal.
 * `runSnapshotJob` is exported for tests and manual triggers.
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
  console.log('[jobs] scheduled: nightly team snapshots at 02:00');
}
