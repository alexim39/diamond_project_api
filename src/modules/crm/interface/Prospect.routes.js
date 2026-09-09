import express from 'express';
import { validate } from '../../../shared/http/validate.js';
import {
  ProspectIdParam, PartnerIdParam, CreateProspectSchema, UpdateProspectSchema,
  UpdateStatusSchema, LogCommunicationSchema, PaginationQuery, CommIdsParam,
} from './Prospect.validator.js';
import { makeProspectController } from './Prospect.controller.js';
import {
  CreateProspectUseCase, UpdateProspectUseCase, UpdateProspectStatusUseCase, DeleteProspectUseCase,
} from '../application/Prospect.commands.js';
import { LogCommunicationUseCase, RemoveCommunicationUseCase } from '../application/Prospect.communications.js';
import {
  GetProspectByIdUseCase, GetProspectsByPartnerUseCase, GetProspectNotificationsUseCase,
} from '../application/Prospect.queries.js';
import { MongoProspectRepository, MongoPartnerLookup } from '../infrastructure/Prospect.mongo.repository.js';

/**
 * Manual wiring — explicit for onboarding; pass fakes in tests.
 * Canonical REST paths + legacy aliases so clients can switch base URL
 * (`/prospect` → `/v1/prospects`) without changing paths.
 *
 * Survey-coupled legacy routes are INTENTIONALLY absent here
 * (/for/*, /all, /my/*, /import/*, /move-back-to-survey/*) — they read/write
 * the Survey collection and move in the `insight` slice.
 */
export const buildProspectRouter = (deps = {}) => {
  const prospects = deps.prospects ?? new MongoProspectRepository();
  const partners = deps.partners ?? new MongoPartnerLookup();

  const c = makeProspectController({
    create: new CreateProspectUseCase({ prospects }),
    update: new UpdateProspectUseCase({ prospects }),
    updateStatus: new UpdateProspectStatusUseCase({ prospects }),
    remove: new DeleteProspectUseCase({ prospects }),
    getById: new GetProspectByIdUseCase({ prospects }),
    getByPartner: new GetProspectsByPartnerUseCase({ prospects, partners }),
    logCommunication: new LogCommunicationUseCase({ prospects }),
    removeCommunication: new RemoveCommunicationUseCase({ prospects }),
    notifications: new GetProspectNotificationsUseCase({ prospects }),
  });

  const router = express.Router();

  router.post('/', validate({ body: CreateProspectSchema }), c.create);
  router.post('/create', validate({ body: CreateProspectSchema }), c.create);

  // NOTE: static single-segment aliases MUST precede `/:prospectId` or Express swallows them as ids.
  router.put('/update', validate({ body: UpdateProspectSchema }), c.update);
  router.put('/:prospectId', validate({ params: ProspectIdParam, body: UpdateProspectSchema }), c.update);

  router.get('/by-partner/:partnerId', validate({ params: PartnerIdParam, query: PaginationQuery }), c.getByPartner);
  router.get('/all-createdBy/:createdBy', validate({ query: PaginationQuery }), c.getByPartner);

  router.get('/notifications/:partnerId', validate({ params: PartnerIdParam }), c.notifications);

  router.get('/:prospectId', validate({ params: ProspectIdParam }), c.getById);
  router.get('/getById/:prospectId', validate({ params: ProspectIdParam }), c.getById);

  router.post('/:prospectId/status', validate({ params: ProspectIdParam, body: UpdateStatusSchema }), c.updateStatus);
  router.post('/updateStatus', validate({ body: UpdateStatusSchema }), c.updateStatus);

  router.post('/:prospectId/communications', validate({ params: ProspectIdParam, body: LogCommunicationSchema }), c.logCommunication);
  router.post('/communications', validate({ body: LogCommunicationSchema }), c.logCommunication);
  router.delete('/:prospectId/communications/:communicationId', validate({ params: CommIdsParam }), c.removeCommunication);
  router.delete('/communications/:prospectId/:communicationId', validate({ params: CommIdsParam }), c.removeCommunication);

  router.delete('/:prospectId', validate({ params: ProspectIdParam }), c.remove);
  router.get('/delete/:prospectId', validate({ params: ProspectIdParam }), c.remove); // legacy GET-as-delete alias

  return router;
};

export default buildProspectRouter();
