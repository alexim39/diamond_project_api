/**
 * Index hardening for v1 slice queries — applied at boot via
 * `ensureIndexes()` (idempotent `createIndex`, safe to re-run).
 *
 * Audit (2026-09): legacy schemas index almost nothing. The gaps below
 * were found by mapping every slice aggregation to its query shape:
 * - partners.partnerOf: NO index — every network traversal, recruit count
 *   and ancestor walk collection-scans. Highest value, added first.
 * - prospects: NO indexes — pipeline, funnel, stuck and conversion counts.
 * - carts: NO indexes — all personal/team volume windows + activation.
 * - commissions: earnerId+status+createdAt exists; releasedAt leg missing.
 * - goals: partnerId exists; list sorts by endDate (new leg).
 * Read-state TTL + request/report indexes already exist — untouched.
 */
export const INDEXES = [
  { collection: 'partners', keys: { partnerOf: 1 }, options: {} },
  { collection: 'partners', keys: { partnerOf: 1, createdAt: -1 }, options: {} },
  { collection: 'prospects', keys: { partnerId: 1, createdAt: -1 }, options: {} },
  { collection: 'prospects', keys: { partnerId: 1, 'status.stage': 1 }, options: {} },
  { collection: 'prospects', keys: { partnerId: 1, updatedAt: -1 }, options: {} },
  { collection: 'prospects', keys: { partnerId: 1, prospectSource: 1, createdAt: -1 }, options: {} },
  { collection: 'prospects', keys: { partnerId: 1, campaignId: 1, createdAt: -1 }, options: {} },
  { collection: 'carts', keys: { partner: 1, orderStatus: 1, createdAt: -1 }, options: {} },
  { collection: 'commissions', keys: { earnerId: 1, status: 1, releasedAt: -1 }, options: {} },
  { collection: 'goals', keys: { partnerId: 1, endDate: 1 }, options: {} },
  { collection: 'messages', keys: { recipientId: 1, createdAt: -1 }, options: {} },
  { collection: 'messages', keys: { senderId: 1, createdAt: -1 }, options: {} },
  { collection: 'communityposts', keys: { mentions: 1, createdAt: -1 }, options: {} },
  { collection: 'communitycomments', keys: { mentions: 1, createdAt: -1 }, options: {} },
  { collection: 'events', keys: { startsAt: 1 }, options: {} },
  { collection: 'events', keys: { authorId: 1, startsAt: -1 }, options: {} },
  { collection: 'eventrsvps', keys: { eventId: 1 }, options: {} },
];

/**
 * @param {import('mongoose').Mongoose} mongoose connected instance
 * @returns {{created: string[], failed: Array<{index: string, error: string}>}}
 */
export async function ensureIndexes(mongoose, { collections = INDEXES } = {}) {
  const created = [];
  const failed = [];
  const db = mongoose.connection?.db;
  if (!db) throw new Error('ensureIndexes requires a connected mongoose instance');
  for (const { collection, keys, options } of collections) {
    const name = `${collection}:${JSON.stringify(keys)}`;
    try {
      await db.collection(collection).createIndex(keys, options);
      created.push(name);
    } catch (error) {
      failed.push({ index: name, error: error?.message ?? String(error) });
    }
  }
  return { created, failed };
}
