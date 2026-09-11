import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import {
  CancelEventUseCase, CreateEventUseCase, GetEventUseCase, ListMyEventsUseCase,
  ListUpcomingUseCase, RsvpUseCase,
} from '../application/Events.usecases.js';
import { MongoEventStore } from '../infrastructure/Events.mongo.repository.js';
import { MongoNetworkRepository } from '../../network/infrastructure/Network.mongo.repository.js';
import { MongoProgressionStore } from '../../progression/infrastructure/Progression.mongo.repository.js';
import { AUDIENCE_SCOPES, RSVP_STATUSES } from '../domain/Event.entity.js';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const EventSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(1).max(2000),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  location: z.string().trim().max(200).optional().default(''),
  scope: z.enum(AUDIENCE_SCOPES),
}).refine(
  (e) => e.endsAt === undefined || new Date(e.endsAt) > new Date(e.startsAt),
  { message: 'Event end must be after its start', path: ['endsAt'] },
);

const RsvpSchema = z.object({ status: z.enum(RSVP_STATUSES) });
const LimitQuery = z.object({ limit: z.coerce.number().int().min(1).max(50).optional() });
const EventIdParam = z.object({ eventId: objectId });

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildEventsRouter = (deps = {}) => {
  const events = deps.events ?? new MongoEventStore();
  const network = deps.network ?? new MongoNetworkRepository();
  const progress = deps.progress ?? new MongoProgressionStore();

  const create = new CreateEventUseCase({ events });
  const upcoming = new ListUpcomingUseCase({ events, network, progress });
  const mine = new ListMyEventsUseCase({ events });
  const detail = new GetEventUseCase({ events, network, progress });
  const rsvp = new RsvpUseCase({ events, network, progress });
  const cancel = new CancelEventUseCase({ events });

  const router = express.Router();
  router.use(requireAuth);

  router.get('/upcoming', validate({ query: LimitQuery }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    const data = await upcoming.execute({ viewerId: req.auth?.partnerId, limit: q?.limit });
    res.status(200).json({ message: 'Upcoming events retrieved successfully', data, success: true });
  }));

  router.get('/mine', asyncHandler(async (req, res) => {
    const data = await mine.execute({ authorId: req.auth?.partnerId });
    res.status(200).json({ message: 'My events retrieved successfully', data, success: true });
  }));

  router.post('/', validate({ body: EventSchema }), asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const data = await create.execute({ authorId: req.auth?.partnerId, ...body });
    res.status(200).json({ message: 'Event created successfully', data, success: true });
  }));

  router.get('/:eventId', validate({ params: EventIdParam }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const data = await detail.execute({ partnerId: req.auth?.partnerId, eventId: params.eventId });
    res.status(200).json({ message: 'Event retrieved successfully', data, success: true });
  }));

  router.post('/:eventId/rsvp', validate({ params: EventIdParam, body: RsvpSchema }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const body = req.validated?.body ?? req.body;
    const data = await rsvp.execute({ partnerId: req.auth?.partnerId, eventId: params.eventId, status: body?.status });
    res.status(200).json({ message: 'RSVP saved successfully', data, success: true });
  }));

  router.post('/:eventId/cancel', validate({ params: EventIdParam }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const data = await cancel.execute({ partnerId: req.auth?.partnerId, eventId: params.eventId });
    res.status(200).json({ message: 'Event cancelled successfully', data, success: true });
  }));

  return router;
};

export default buildEventsRouter();
