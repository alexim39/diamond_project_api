import express from 'express';
import { validate } from '../../../shared/http/validate.js';
import { optionalAuth } from '../../../shared/http/requireAuth.js';
import { SubmitTicketSchema } from './Ticket.validator.js';
import { makeSubmitTicketController } from './Ticket.controller.js';
import { SubmitTicketUseCase } from '../application/SubmitTicket.usecase.js';
import { MongoTicketRepository } from '../infrastructure/Ticket.mongo.repository.js';
import { TicketMailer } from '../infrastructure/clients/TicketMailer.js';

/**
 * Manual wiring (no DI container on purpose — explicit for onboarding).
 * Exported factory allows tests to inject fakes.
 */
export const buildTicketRouter = ({ ticketRepo, mailer } = {}) => {
  const repo = ticketRepo ?? new MongoTicketRepository();
  const mail = mailer ?? new TicketMailer();
  const submitTicket = new SubmitTicketUseCase({ ticketRepo: repo, mailer: mail });
  const handler = makeSubmitTicketController(submitTicket);

  const router = express.Router();
  // Canonical REST path when mounted at /v1/tickets
  router.post('/', optionalAuth, validate({ body: SubmitTicketSchema }), handler);
  // Legacy alias — lets frontend switch base URL without changing path
  router.post('/submit', optionalAuth, validate({ body: SubmitTicketSchema }), handler);
  return router;
};

export default buildTicketRouter();
