/**
 * Contracts for the notifications slice.
 * The feed DERIVES everything from source aggregates (prospects, ledger) —
 * no event bus, no cross-slice writes. Only read-state is stored.
 */
export class NotificationStore {
  /** @param {string} partnerId @returns {Promise<Set<string>>} read item ids */
  async readIds(partnerId) { throw new Error('Not implemented'); }
  /** @param {string} partnerId @param {string[]} ids */
  async markRead(partnerId, ids) { throw new Error('Not implemented'); }
}
