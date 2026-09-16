import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { ListReviewQueueUseCase, DeleteReservationUseCase } from './Reservations.usecases.js';

// The usecase labels via real models directly; without a connection those
// buffer — fail fast into the built-in catch fallbacks instead of hanging.
mongoose.set('bufferTimeoutMS', 50);

const row = (over = {}) => ({
  id: 'r1', code: 'NV000001', status: 'Pending', partnerId: 'u1', prospectId: null,
  createdAt: new Date().toISOString(), ...over,
});

const fakeReservations = (rows = [], heldCodes = new Set()) => ({
  lastList: null,
  async listByStatus(status, limit, skip, q) {
    this.lastList = { status, limit, skip, q };
    return { items: rows, total: rows.length };
  },
  async statusSummary() {
    return { Pending: 1, Approved: 0, Rejected: 0, Used: 0 };
  },
  async findById(id) {
    return rows.find((r) => r.id === id) ?? null;
  },
  async hardDelete(id) {
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) return null;
    const [gone] = rows.splice(i, 1);
    return { id: gone.id, code: gone.code, status: gone.status };
  },
  heldCodes,
});

describe('ListReviewQueueUseCase', () => {
  it('passes search text and returns summary beside rows', async () => {
    const uc = new ListReviewQueueUseCase({ reservations: fakeReservations([row()]) });
    const res = await uc.execute({ status: 'All', limit: 25, skip: 0, q: 'NV00' });
    assert.equal(res.total, 1);
    assert.equal(res.items[0].issuer, null); // no partner label without PartnersModel
    assert.deepEqual(res.summary, { Pending: 1, Approved: 0, Rejected: 0, Used: 0 });
  });

  it('rejects unknown status filters', async () => {
    const uc = new ListReviewQueueUseCase({ reservations: fakeReservations([]) });
    await assert.rejects(uc.execute({ status: 'nope' }), /Invalid status filter/);
  });
});

describe('DeleteReservationUseCase', () => {
  it('deletes pending and rejected codes', async () => {
    const uc = new DeleteReservationUseCase({
      reservations: fakeReservations([row({ id: 'a' }), row({ id: 'b', status: 'Rejected' })]),
    });
    assert.equal((await uc.execute({ reservationId: 'a' })).code, 'NV000001');
    assert.equal((await uc.execute({ reservationId: 'b' })).status, 'Rejected');
  });

  it('refuses used codes and unknown ids', async () => {
    const uc = new DeleteReservationUseCase({
      reservations: fakeReservations([row({ id: 'u', status: 'Used' })]),
    });
    await assert.rejects(uc.execute({ reservationId: 'u' }), /history/);
    await assert.rejects(uc.execute({ reservationId: 'ghost' }), /not found/i);
  });
});
