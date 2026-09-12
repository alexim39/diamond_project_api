import { createRecordEntity } from '../domain/Reservation.entity.js';

/** POST /v1/reservations/record — upline links a code (→ Approved, ready to use). */
export class RecordReservationUseCase {
  /** @param {{reservations}} deps */
  constructor({ reservations }) {
    this.reservations = reservations;
  }

  async execute({ referrerId, code, prospectId = null }) {
    const entity = createRecordEntity({ code, prospectId });
    return this.reservations.record({ ...entity, partnerId: referrerId });
  }
}

/** GET /v1/reservations/mine — codes this partner recorded. */
export class ListMyReservationsUseCase {
  /** @param {{reservations}} deps */
  constructor({ reservations }) {
    this.reservations = reservations;
  }

  async execute({ referrerId, limit = 50 }) {
    const items = await this.reservations.listByPartner(referrerId, limit);
    return {
      items: items.map((r) => ({
        id: String(r.id),
        code: r.code,
        status: r.status,
        prospectId: r.prospectId ?? null,
        createdAt: r.createdAt ?? null,
      })),
      total: items.length,
    };
  }
}
