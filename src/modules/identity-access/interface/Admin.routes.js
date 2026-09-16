import express from 'express';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { requireRole } from './RequireRole.js';
import { z } from 'zod';
import { ROLES } from '../domain/PartnerRole.js';
import { makeAdminController } from './Admin.controller.js';
import { ListPartnersUseCase, SetPartnerRoleUseCase, SetSuspendUseCase, PlatformStatsUseCase, ResetOnBehalfUseCase } from '../application/Admin.usecase.js';
import { RequestPasswordResetUseCase } from '../application/PasswordReset.usecase.js';
import { PasswordResetMailer } from '../infrastructure/clients/PasswordResetMailer.js';
import { MongoPartnerRepository } from '../infrastructure/Auth.mongo.repository.js';
import { MongoProgressionStore } from '../../progression/infrastructure/Progression.mongo.repository.js';
import { revokeSessions, clearRevocations } from '../infrastructure/SessionRevocation.js';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const PartnerIdParam = z.object({ partnerId: objectId });
const SetRoleSchema = z.object({
  role: z.string().trim().toLowerCase().refine((v) => ROLES.includes(v), {
    message: `Invalid role (expected one of: ${ROLES.join(', ')})`,
  }),
});
const AdminListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  skip: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().trim().max(120).optional().default(''),
  role: z.enum([...ROLES, 'all']).optional().default('all'),
  // `all` | `yes` | `no` — plain enum avoids z.coerce.boolean's
  // non-empty-string-is-true trap ('false' would coerce to true).
  suspended: z.enum(['all', 'yes', 'no']).optional().default('all'),
});
const SetSuspendSchema = z.object({
  suspended: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildAdminRouter = (deps = {}) => {
  const partners = deps.partners ?? new MongoPartnerRepository();
  const sessions = deps.sessions ?? {
    revoke: (id, opts) => revokeSessions(id, opts),
    clear: (id) => clearRevocations(id),
  };
  const controller = makeAdminController({
    setRole: new SetPartnerRoleUseCase({ partners }),
    listPartners: new ListPartnersUseCase({ partners }),
    setSuspend: new SetSuspendUseCase({ partners, sessions }),
    platformStats: new PlatformStatsUseCase({
      partners,
      progress: deps.progress ?? new MongoProgressionStore(),
    }),
    signOut: deps.signOut ?? (async ({ requesterId, partnerId }) => {
      await revokeSessions(partnerId, { reason: 'Admin force sign-out', by: requesterId });
      return { revoked: true };
    }),
    resetOnBehalf: deps.resetOnBehalf ?? new ResetOnBehalfUseCase({
      partners,
      reset: new RequestPasswordResetUseCase({
        partners,
        mailer: deps.mailer ?? new PasswordResetMailer(),
        frontendUrl: deps.frontendUrl ?? process.env.FRONTEND_URL ?? 'https://c21fg.online',
      }),
    }),
  });

  const router = express.Router();
  router.use(requireAuth, requireRole('admin'));
  router.get('/partners', validate({ query: AdminListQuery }), controller.list);
  router.patch('/partners/:partnerId/role', validate({ params: PartnerIdParam, body: SetRoleSchema }), controller.setRole);
  router.patch('/partners/:partnerId/suspend', validate({ params: PartnerIdParam, body: SetSuspendSchema }), controller.suspend);
  router.get('/stats', controller.stats);
  // Force sign-out: revokes live JWTs (sessions die on next call). Self allowed.
  router.post('/partners/:partnerId/signout', validate({ params: PartnerIdParam }), controller.signOut);
  // Reset on behalf: the reset link goes to the MEMBER's email — admins never see passwords.
  router.post('/partners/:partnerId/reset-password', validate({ params: PartnerIdParam }), controller.resetOnBehalf);
  return router;
};

export default buildAdminRouter();
