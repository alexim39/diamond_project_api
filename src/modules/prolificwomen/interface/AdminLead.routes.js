import express from 'express';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { sendSuccess } from '../../../shared/http/sendSuccess.js';
import { validate } from '../../../shared/http/validate.js';
import { requireRole } from '../../identity-access/interface/RequireRole.js';
import { ListLeadsUseCase } from '../application/ListLeads.usecase.js';
import { MongoProlificWomanLeadRepository } from '../infrastructure/Lead.mongo.repository.js';
import { ListLeadsQuery } from './Lead.validator.js';

export const buildProlificWomanAdminLeadRouter = ({ leads, list } = {}) => {
  const repository = leads ?? new MongoProlificWomanLeadRepository();
  const listLeads = list ?? new ListLeadsUseCase({ leads: repository });
  const router = express.Router();

  router.use(requireAuth, requireRole('admin'));

  router.get(
    '/leads',
    validate({ query: ListLeadsQuery }),
    asyncHandler(async (req, res) => {
      const query = req.validated?.query ?? req.query;
      const data = await listLeads.execute({
        q: query.q ?? '',
        limit: query.limit,
        skip: query.skip,
      });
      return sendSuccess(res, {
        message: 'Leads retrieved successfully',
        data,
      });
    }),
  );

  return router;
};

export default buildProlificWomanAdminLeadRouter();
