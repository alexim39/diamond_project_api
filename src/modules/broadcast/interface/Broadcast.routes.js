import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { requireRole } from '../../identity-access/interface/RequireRole.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { SendBroadcastUseCase, ListBroadcastsUseCase } from '../application/Broadcast.usecases.js';
import { NotifyUseCase } from '../../notifications/application/NotificationsCenter.usecases.js';
import { MongoStoredNotificationStore } from '../../notifications/infrastructure/StoredNotifications.mongo.repository.js';
import { recordAudit } from '../../audit/index.js';

const SendSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(3).max(2000),
  link: z.string().trim().max(500).optional(),
  priority: z.enum(['high', 'medium']).optional().default('high'),
});

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildBroadcastRouter = (deps = {}) => {
  const notifyStore = deps.stored ?? new MongoStoredNotificationStore();
  const send = deps.send ?? new SendBroadcastUseCase({
    notify: deps.notify ?? new NotifyUseCase({ stored: notifyStore }),
  });
  const list = deps.list ?? new ListBroadcastsUseCase({});

  const router = express.Router();
  router.use(requireAuth, requireRole('admin'));

  router.post('/', validate({ body: SendSchema }), asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const data = await send.execute({
      createdBy: req.auth?.partnerId,
      title: body.title,
      body: body.body,
      link: body.link ?? null,
      priority: body.priority ?? 'high',
    });
    void recordAudit({
      actorId: req.auth?.partnerId, action: 'broadcast.send',
      targetType: 'broadcast', targetId: data.id,
      detail: { delivered: data.delivered, capped: data.capped },
    });
    res.status(200).json({ message: `Broadcast sent to ${data.delivered} members${data.capped ? ' (capped)' : ''}`, data, success: true });
  }));

  router.get('/', asyncHandler(async (req, res) => {
    const data = await list.execute({ limit: req.query?.limit, skip: req.query?.skip });
    res.status(200).json({ message: 'Broadcasts retrieved successfully', data, success: true });
  }));

  return router;
};

export default buildBroadcastRouter();
