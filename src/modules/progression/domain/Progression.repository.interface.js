/**
 * Contracts for the progression slice. Levels DERIVE from signals +
 * milestones on every read; only milestones (with audit events) persist.
 */
export class ProgressionStore {
  async findByPartner(partnerId) { throw new Error('Not implemented'); }
  async upsertMilestones(partnerId, patch, event) { throw new Error('Not implemented'); }
  async setLevel(partnerId, level) { throw new Error('Not implemented'); }
  async levelsFor(partnerIds) { throw new Error('Not implemented'); }
  async requestNomination(partnerId, note) { throw new Error('Not implemented'); }
  async decideNomination(partnerId, approved, decidedBy) { throw new Error('Not implemented'); }
}
