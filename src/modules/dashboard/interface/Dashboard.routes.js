import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { GetOverviewUseCase } from '../application/Dashboard.usecases.js';
import { MongoProspectRepository } from '../../crm/infrastructure/Prospect.mongo.repository.js';
import { MongoOrderReader, MongoCommissionLedger } from '../../billing/infrastructure/Billing.mongo.repository.js';
import { MongoNetworkRepository } from '../../network/infrastructure/Network.mongo.repository.js';
import { MongoGoalStore } from '../../goals/infrastructure/Goals.mongo.repository.js';
import { MongoNotificationStore } from '../../notifications/infrastructure/Notifications.mongo.repository.js';
import { GetNotificationFeedUseCase } from '../../notifications/application/Notifications.usecases.js';
import { ListGoalsUseCase } from '../../goals/application/Goals.usecases.js';
import { GetActionsUseCase, GetFunnelUseCase, GetTeamUseCase } from '../../analytics/application/Analytics.usecases.js';

const OverviewQuery = z.object({
  days: z.coerce.number().int().min(7).max(365).optional().default(30),
});

/** Manual wiring — same composition graph as the analytics slice. */
export const buildDashboardRouter = (deps = {}) => {
  const prospects = deps.prospects ?? new MongoProspectRepository();
  const orders = deps.orders ?? new MongoOrderReader();
  const network = deps.network ?? new MongoNetworkRepository();
  const ledger = deps.ledger ?? new MongoCommissionLedger();
  const reads = deps.reads ?? new MongoNotificationStore();
  const goalStore = deps.goalStore ?? new MongoGoalStore();

  const feed = deps.feed ?? new GetNotificationFeedUseCase({ prospects, ledger, reads });
  const goals = deps.goals ?? new ListGoalsUseCase({ goals: goalStore, orders, prospects, network });
  const actions = deps.actions ?? new GetActionsUseCase({ feed, goals, prospects });
  const funnel = deps.funnel ?? new GetFunnelUseCase({ prospects });
  const team = deps.team ?? new GetTeamUseCase({
    orders, network, prospects, goalProgress: (pid) => goals.execute({ partnerId: pid }),
  });
  const overview = new GetOverviewUseCase({ actions, funnel, team, goals, feed });

  const router = express.Router();
  router.use(requireAuth);

  router.get('/overview', validate({ query: OverviewQuery }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    const data = await overview.execute({ partnerId: req.auth?.partnerId, days: q?.days });
    res.status(200).json({ message: 'Dashboard overview retrieved successfully', data, success: true });
  }));

  return router;
};

export default buildDashboardRouter();
