import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { GetCampaignRoiUseCase } from '../application/Marketing.usecases.js';
import { MongoMarketingRepository } from '../infrastructure/Marketing.mongo.repository.js';
import { MongoOutreachSpend } from '../../outreach/infrastructure/Outreach.store.js';

const RoiQuery = z.object({
  days: z.coerce.number().int().min(7).max(365).optional().default(30),
});

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildMarketingRouter = (deps = {}) => {
  const marketing = deps.marketing ?? new MongoMarketingRepository();
  const outreach = deps.outreach ?? new MongoOutreachSpend();
  const roi = new GetCampaignRoiUseCase({ marketing, outreach });

  const router = express.Router();
  // Session identity scopes every read — no :partnerId to tamper with.
  router.use(requireAuth);

  router.get('/campaigns/roi', validate({ query: RoiQuery }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    const data = await roi.execute({ partnerId: req.auth?.partnerId, days: q?.days });
    res.status(200).json({ message: 'Campaign ROI retrieved successfully', data, success: true });
  }));

  return router;
};

export default buildMarketingRouter();
