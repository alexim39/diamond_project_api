import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import {
  ExportCommissionsUseCase, ExportPipelineUseCase, ExportReportsUseCase, ExportTeamUseCase,
} from '../application/Exports.usecases.js';
import { MongoProspectRepository } from '../../crm/infrastructure/Prospect.mongo.repository.js';
import { MongoCommissionLedger } from '../../billing/infrastructure/Billing.mongo.repository.js';
import { MongoNetworkRepository } from '../../network/infrastructure/Network.mongo.repository.js';
import { MongoReportStore } from '../../reports/infrastructure/Reports.mongo.repository.js';

const LimitQuery = z.object({
  limit: z.coerce.number().int().min(1).max(5000).optional(),
});
const ReportsQuery = LimitQuery.extend({
  scope: z.enum(['mine', 'team']).optional().default('mine'),
});

/** UTF-8 BOM so Excel opens the file correctly. */
const sendCsv = (res, { filename, csv }) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(`\uFEFF${csv}`);
};

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildExportsRouter = (deps = {}) => {
  const prospects = deps.prospects ?? new MongoProspectRepository();
  const ledger = deps.ledger ?? new MongoCommissionLedger();
  const network = deps.network ?? new MongoNetworkRepository();
  const reports = deps.reports ?? new MongoReportStore();

  const team = new ExportTeamUseCase({ network });
  const pipeline = new ExportPipelineUseCase({ prospects });
  const commissions = new ExportCommissionsUseCase({ ledger });
  const periodReports = new ExportReportsUseCase({ reports, network });

  const router = express.Router();
  // Session identity scopes every export — no :partnerId to tamper with.
  router.use(requireAuth);

  router.get('/team.csv', asyncHandler(async (req, res) => {
    sendCsv(res, await team.execute({ partnerId: req.auth?.partnerId }));
  }));

  router.get('/pipeline.csv', validate({ query: LimitQuery }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    sendCsv(res, await pipeline.execute({ partnerId: req.auth?.partnerId, limit: q?.limit }));
  }));

  router.get('/commissions.csv', validate({ query: LimitQuery }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    sendCsv(res, await commissions.execute({ partnerId: req.auth?.partnerId, limit: q?.limit }));
  }));

  router.get('/reports.csv', validate({ query: ReportsQuery }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    sendCsv(res, await periodReports.execute({ partnerId: req.auth?.partnerId, scope: q?.scope }));
  }));

  return router;
};

export default buildExportsRouter();
