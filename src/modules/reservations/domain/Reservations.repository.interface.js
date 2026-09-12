/**
 * Contracts for the reservations slice (referral-code lifecycle).
 * Session identity is the referrer — callers never supply partnerId.
 */
export class ReservationStore {
  async findByCode(code) { throw new Error('Not implemented'); }
  async record({ code, partnerId, prospectId }) { throw new Error('Not implemented'); }
  async markUsed(code, opts) { throw new Error('Not implemented'); }
  async listByPartner(partnerId, limit) { throw new Error('Not implemented'); }
}
