import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import {
  DecideNominationUseCase, GetMyProgressionUseCase, RequestNominationUseCase,
  TeamDistributionUseCase, UpdateMilestonesUseCase,
} from '../application/Progression.usecases.js';
import { MongoProgressionStore } from '../infrastructure/Progression.mongo.repository.js';
import { MongoNetworkRepository } from '../../network/infrastructure/Network.mongo.repository.js';
import { MongoOrderReader } from '../../billing/infrastructure/Billing.mongo.repository.js';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');
const stamp = z.object({ done: z.boolean() }).passthrough();

const MilestonesSchema = z.object({
  ipo: stamp.optional(),
  qsg: stamp.optional(),
  smo: stamp.optional(),
  accounts: z.union([z.object({ count: z.number().int() }).passthrough(), z.number().int()]).optional(),
  fullTime: stamp.optional(),
  office: stamp.optional(),
  officeAddress: z.string().max(200).optional(),
  g8Request: z.union([z.object({ status: z.enum(['none', 'submitted', 'approved']) }).passthrough(), z.enum(['none', 'submitted', 'approved'])]).optional(),
  onboardingSession: stamp.optional(),
  qualifiedConfirmed: stamp.optional(),
  appointment: stamp.optional(),
}).refine((b) => Object.keys(b).length > 0, { message: 'Nothing to update' });

const NominationSchema = z.object({ note: z.string().trim().max(500).optional().default('') });
const DecisionSchema = z.object({ partnerId: objectId, approved: z.boolean() });

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildProgressionRouter = (deps = {}) => {
  const progress = deps.progress ?? new MongoProgressionStore();
  const network = deps.network ?? new MongoNetworkRepository();
  const orders = deps.orders ?? new MongoOrderReader();

  const mine = deps.mine ?? new GetMyProgressionUseCase({ progress, network, orders });
  const update = new UpdateMilestonesUseCase({ progress });
  const nominate = new RequestNominationUseCase({ progress, network, orders, mine });
  const decide = new DecideNominationUseCase({ progress, network, orders, mine });
  const team = new TeamDistributionUseCase({ progress, network });

  const router = express.Router();
  router.use(requireAuth);

  router.get('/mine', asyncHandler(async (req, res) => {
    const data = await mine.execute({ partnerId: req.auth?.partnerId });
    res.status(200).json({ message: 'Progression retrieved successfully', data, success: true });
  }));

  router.put('/mine/milestones', validate({ body: MilestonesSchema }), asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const data = await update.execute({ partnerId: req.auth?.partnerId, patch: body });
    res.status(200).json({ message: 'Milestones updated successfully', data, success: true });
  }));

  router.post('/mine/nomination', validate({ body: NominationSchema }), asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const data = await nominate.execute({ partnerId: req.auth?.partnerId, note: body?.note });
    res.status(200).json({ message: 'Nomination requested successfully', data, success: true });
  }));

  router.post('/nominations/decision', validate({ body: DecisionSchema }), asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const data = await decide.execute({ approverId: req.auth?.partnerId, partnerId: body.partnerId, approved: body.approved });
    res.status(200).json({ message: 'Nomination decided successfully', data, success: true });
  }));

  router.get('/team/distribution', asyncHandler(async (req, res) => {
    const data = await team.execute({ partnerId: req.auth?.partnerId });
    res.status(200).json({ message: 'Team distribution retrieved successfully', data, success: true });
  }));

  return router;
};

export default buildProgressionRouter();
