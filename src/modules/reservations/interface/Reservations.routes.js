import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { ListMyReservationsUseCase, RecordReservationUseCase, ListReviewQueueUseCase, DecideReservationUseCase, DeleteReservationUseCase } from '../application/Reservations.usecases.js';
import { MongoReservationStore } from '../infrastructure/Reservations.mongo.repository.js';
import { requireRole } from '../../identity-access/interface/RequireRole.js';
import { recordAudit } from '../../audit/index.js';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const RecordSchema = z.object({
  code: z.string().trim().min(3).max(64),
  prospectId: objectId.optional(),
});
const MineQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildReservationsRouter = (deps = {}) => {
  const reservations = deps.reservations ?? new MongoReservationStore();
  const record = deps.record ?? new RecordReservationUseCase({ reservations });
  const mine = deps.mine ?? new ListMyReservationsUseCase({ reservations });
  const queue = deps.queue ?? new ListReviewQueueUseCase({ reservations });
  const decide = deps.decide ?? new DecideReservationUseCase({ reservations });
  const remove = deps.remove ?? new DeleteReservationUseCase({ reservations });

  const router = express.Router();
  // Session identity IS the referrer — no :partnerId to tamper with.
  router.use(requireAuth);

  router.post('/record', validate({ body: RecordSchema }), asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const data = await record.execute({
      referrerId: req.auth?.partnerId,
      code: body.code,
      prospectId: body.prospectId ?? null,
    });
    res.status(200).json({ message: 'Reservation code recorded and approved', data, success: true });
  }));

  router.get('/mine', validate({ query: MineQuery }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    const data = await mine.execute({ referrerId: req.auth?.partnerId, limit: q?.limit });
    res.status(200).json({ message: 'Reservation codes retrieved successfully', data, success: true });
  }));

  router.get('/queue', requireRole('admin'), validate({ query: z.object({
    status: z.string().trim().max(20).optional().default('Pending'),
    q: z.string().trim().max(64).optional().default(''),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    skip: z.coerce.number().int().min(0).optional(),
  }) }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    const data = await queue.execute({
      status: q?.status ?? 'Pending',
      limit: q?.limit,
      skip: q?.skip,
      q: q?.q ?? '',
    });
    res.status(200).json({ message: 'Review queue retrieved successfully', data, success: true });
  }));

  router.patch('/:id', requireRole('admin'), validate({
    params: z.object({ id: z.string().trim().min(1).max(64) }),
    body: z.object({ status: z.enum(['Pending', 'Approved', 'Rejected']) }),
  }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const body = req.validated?.body ?? req.body;
    const data = await decide.execute({
      reservationId: params.id,
      status: body?.status,
    });
    if (!data) {
      return res.status(409).json({ message: 'Code left its expected state — reload and retry', success: false });
    }
    void recordAudit({
      actorId: req.auth?.partnerId, action: 'reservation.decide',
      targetType: 'reservation-code', targetId: params.id,
      detail: { status: data.status, code: data.code ?? null },
    });
    res.status(200).json({ message: `Code ${data.status.toLowerCase()} successfully!`, data, success: true });
  }));

  // Hard delete — lifecycle-guarded in the usecase (Used never, Approved
  // only while unconsumed). Audited like every other admin decision.
  router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
    const data = await remove.execute({ reservationId: req.params.id });
    if (!data) {
      return res.status(404).json({ message: 'Reservation code not found', success: false });
    }
    void recordAudit({
      actorId: req.auth?.partnerId, action: 'reservation.delete',
      targetType: 'reservation-code', targetId: req.params.id,
      detail: { code: data.code ?? null, status: data.status ?? null },
    });
    res.status(200).json({ message: `Code ${data.code} deleted permanently`, data, success: true });
  }));

  return router;
};

export default buildReservationsRouter();
