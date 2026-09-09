import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import {
  GetNotificationFeedUseCase, MarkNotificationsReadUseCase,
} from '../application/Notifications.usecases.js';
import { MongoNotificationStore } from '../infrastructure/Notifications.mongo.repository.js';
import { MongoProspectRepository } from '../../crm/infrastructure/Prospect.mongo.repository.js';
import { MongoCommissionLedger } from '../../billing/infrastructure/Billing.mongo.repository.js';

const FeedQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});
const MarkReadSchema = z.object({
  ids: z.array(z.string().trim().min(1).max(300)).min(1).max(200),
});

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildNotificationsRouter = (deps = {}) => {
  const prospects = deps.prospects ?? new MongoProspectRepository();
  const ledger = deps.ledger ?? new MongoCommissionLedger();
  const reads = deps.reads ?? new MongoNotificationStore();

  const feed = new GetNotificationFeedUseCase({ prospects, ledger, reads });
  const markRead = new MarkNotificationsReadUseCase({ reads });

  const router = express.Router();
  // Session identity only — partners see exactly their own feed.
  router.use(requireAuth);

  router.get('/mine', validate({ query: FeedQuery }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    const data = await feed.execute({ partnerId: req.auth?.partnerId, limit: q?.limit });
    res.status(200).json({ message: 'Notifications retrieved successfully', data, success: true });
  }));

  router.post('/read', validate({ body: MarkReadSchema }), asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const data = await markRead.execute({ partnerId: req.auth?.partnerId, ids: body.ids });
    res.status(200).json({ message: 'Notifications marked as read', data, success: true });
  }));

  return router;
};

export default buildNotificationsRouter();
