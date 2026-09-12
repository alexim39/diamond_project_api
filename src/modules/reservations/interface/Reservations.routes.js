import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { ListMyReservationsUseCase, RecordReservationUseCase } from '../application/Reservations.usecases.js';
import { MongoReservationStore } from '../infrastructure/Reservations.mongo.repository.js';

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

  return router;
};

export default buildReservationsRouter();
