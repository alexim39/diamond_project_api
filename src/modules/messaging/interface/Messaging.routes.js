import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import {
  GetThreadUseCase, ListContactsUseCase, ListInboxUseCase, ListSentUseCase,
  MarkReadUseCase, SendAnnouncementUseCase, SendDirectUseCase, UnreadCountUseCase,
} from '../application/Messaging.usecases.js';
import { MongoMessageStore } from '../infrastructure/Messaging.mongo.repository.js';
import { MongoNetworkRepository } from '../../network/infrastructure/Network.mongo.repository.js';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const DirectSchema = z.object({
  to: objectId,
  body: z.string().trim().min(1).max(2000),
});

const AnnounceSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(1).max(2000),
  scope: z.enum(['direct', 'all']),
});

const LimitQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).optional() });
const CounterpartParam = z.object({ counterpartId: objectId });
const MessageIdParam = z.object({ messageId: objectId });

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildMessagingRouter = (deps = {}) => {
  const messages = deps.messages ?? new MongoMessageStore();
  const network = deps.network ?? new MongoNetworkRepository();

  const direct = new SendDirectUseCase({ messages, network });
  const announce = new SendAnnouncementUseCase({ messages, network });
  const inbox = new ListInboxUseCase({ messages });
  const sent = new ListSentUseCase({ messages });
  const thread = new GetThreadUseCase({ messages, network });
  const read = new MarkReadUseCase({ messages });
  const unread = new UnreadCountUseCase({ messages });
  const contacts = new ListContactsUseCase({ network });

  const router = express.Router();
  // Session identity is sender/recipient — no ids to tamper with except
  // validated counterpart/message ids (relationship-checked in use cases).
  router.use(requireAuth);

  router.post('/', validate({ body: DirectSchema }), asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const data = await direct.execute({ senderId: req.auth?.partnerId, ...body });
    res.status(200).json({ message: 'Message sent successfully', data, success: true });
  }));

  router.post('/announcements', validate({ body: AnnounceSchema }), asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const data = await announce.execute({ senderId: req.auth?.partnerId, ...body });
    res.status(200).json({ message: 'Announcement sent successfully', data, success: true });
  }));

  router.get('/inbox', validate({ query: LimitQuery }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    const data = await inbox.execute({ partnerId: req.auth?.partnerId, limit: q?.limit });
    res.status(200).json({ message: 'Inbox retrieved successfully', data, success: true });
  }));

  router.get('/sent', validate({ query: LimitQuery }), asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    const data = await sent.execute({ partnerId: req.auth?.partnerId, limit: q?.limit });
    res.status(200).json({ message: 'Sent messages retrieved successfully', data, success: true });
  }));

  router.get('/thread/:counterpartId', validate({ params: CounterpartParam, query: LimitQuery }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const q = req.validated?.query ?? req.query;
    const data = await thread.execute({ partnerId: req.auth?.partnerId, counterpartId: params.counterpartId, limit: q?.limit });
    res.status(200).json({ message: 'Thread retrieved successfully', data, success: true });
  }));

  router.post('/:messageId/read', validate({ params: MessageIdParam }), asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const data = await read.execute({ partnerId: req.auth?.partnerId, messageId: params.messageId });
    res.status(200).json({ message: 'Message marked as read', data, success: true });
  }));

  router.get('/unread-count', asyncHandler(async (req, res) => {
    const data = await unread.execute({ partnerId: req.auth?.partnerId });
    res.status(200).json({ message: 'Unread count retrieved successfully', data, success: true });
  }));

  router.get('/contacts', asyncHandler(async (req, res) => {
    const data = await contacts.execute({ partnerId: req.auth?.partnerId });
    res.status(200).json({ message: 'Contacts retrieved successfully', data, success: true });
  }));

  return router;
};

export default buildMessagingRouter();
