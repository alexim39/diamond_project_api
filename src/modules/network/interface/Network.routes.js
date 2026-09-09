import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { makeNetworkController } from './Network.controller.js';
import { GetDownlineTreeUseCase, GetUplineChainUseCase } from '../application/Network.queries.js';
import { MongoNetworkRepository } from '../infrastructure/Network.mongo.repository.js';
import { MAX_DEPTH } from '../domain/Network.entity.js';

const PartnerIdParam = z.object({
  partnerId: z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id'),
});
const DepthQuery = z.object({
  depth: z.coerce.number().int().min(1).max(MAX_DEPTH).optional(),
});

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildNetworkRouter = (deps = {}) => {
  const network = deps.network ?? new MongoNetworkRepository();
  const c = makeNetworkController({
    tree: new GetDownlineTreeUseCase({ network }),
    upline: new GetUplineChainUseCase({ network }),
  });

  const router = express.Router();
  // Authenticated: nodes expose only directory-safe fields (no email/phone).
  router.use(requireAuth);
  router.get('/:partnerId/tree', validate({ params: PartnerIdParam, query: DepthQuery }), c.tree);
  router.get('/:partnerId/upline', validate({ params: PartnerIdParam }), c.upline);
  return router;
};

export default buildNetworkRouter();
