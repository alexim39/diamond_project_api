import express from 'express';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { requireRole } from './RequireRole.js';
import { z } from 'zod';
import { makeAdminController } from './Admin.controller.js';
import { ListPartnersUseCase, SetPartnerRoleUseCase } from '../application/Admin.usecase.js';
import { MongoPartnerRepository } from '../infrastructure/Auth.mongo.repository.js';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const PartnerIdParam = z.object({ partnerId: objectId });
const SetRoleSchema = z.object({
  role: z.string().trim().toLowerCase().refine((v) => ['user', 'leader', 'admin'].includes(v), {
    message: 'Invalid role (expected one of: user, leader, admin)',
  }),
});
const AdminListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  skip: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().trim().max(120).optional().default(''),
});

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildAdminRouter = (deps = {}) => {
  const partners = deps.partners ?? new MongoPartnerRepository();
  const controller = makeAdminController({
    setRole: new SetPartnerRoleUseCase({ partners }),
    listPartners: new ListPartnersUseCase({ partners }),
  });

  const router = express.Router();
  router.use(requireAuth, requireRole('admin'));
  router.get('/partners', validate({ query: AdminListQuery }), controller.list);
  router.patch('/partners/:partnerId/role', validate({ params: PartnerIdParam, body: SetRoleSchema }), controller.setRole);
  return router;
};

export default buildAdminRouter();
