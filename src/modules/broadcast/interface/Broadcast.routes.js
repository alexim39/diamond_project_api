import express from 'express';
import { z } from 'zod';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { requireRole } from '../../identity-access/interface/RequireRole.js';
import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { SendBroadcastUseCase, ListBroadcastsUseCase } from '../application/Broadcast.usecases.js';
import {
  EstimateAudienceUseCase, GetCampaignUseCase, ScheduleCampaignUseCase,
} from '../application/Broadcast.campaign.js';
import { NotifyUseCase } from '../../notifications/application/NotificationsCenter.usecases.js';
import { MongoStoredNotificationStore } from '../../notifications/infrastructure/StoredNotifications.mongo.repository.js';
import { recordAudit } from '../../audit/index.js';

const SendSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(3).max(2000),
  link: z.string().trim().max(500).optional(),
  priority: z.enum(['high', 'medium']).optional().default('high'),
});

const AudienceSchema = z.object({
  mode: z.enum(['all', 'segment', 'picked']).optional().default('all'),
  segment: z.object({
    role: z.string().trim().max(40).optional(),
    active: z.boolean().optional(),
    excludeSuspended: z.boolean().optional(),
    joinedAfter: z.coerce.date().optional(),
    joinedBefore: z.coerce.date().optional(),
  }).optional(),
  ids: z.array(z.string().trim().regex(/^[a-fA-F0-9]{24}$/)).max(5001).optional(),
});

const CampaignSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(3).max(2000),
  link: z.string().trim().max(500).optional(),
  priority: z.enum(['high', 'medium']).optional().default('high'),
  subject: z.string().trim().min(3).max(120).optional(),
  smsBody: z.string().trim().min(3).max(459).optional(),
  channels: z.object({
    inApp: z.boolean().optional(),
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
  }).optional(),
  kind: z.enum(['system', 'marketing']).optional().default('system'),
  audience: AudienceSchema.optional(),
  sendAt: z.coerce.date().optional(),
  // Explicit spend acknowledgement for the platform-funded SMS channel.
  confirmSpend: z.boolean().optional(),
});

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildBroadcastRouter = (deps = {}) => {
  const notifyStore = deps.stored ?? new MongoStoredNotificationStore();
  const send = deps.send ?? new SendBroadcastUseCase({
    notify: deps.notify ?? new NotifyUseCase({ stored: notifyStore }),
  });
  const list = deps.list ?? new ListBroadcastsUseCase({});
  const estimate = deps.estimate ?? new EstimateAudienceUseCase({});
  const schedule = deps.schedule ?? new ScheduleCampaignUseCase({});
  const detail = deps.detail ?? new GetCampaignUseCase({});

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

  // v2 campaigns: audience estimate (zero sends — drives the confirm screen).
  router.post('/campaigns/estimate', validate({ body: CampaignSchema }), asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const data = await estimate.execute({
      audience: body.audience ?? { mode: 'all' },
      channels: body.channels ?? { inApp: true },
      kind: body.kind ?? 'system',
      smsBody: body.smsBody ?? `${body.title} — ${body.body}`,
    });
    res.status(200).json({ message: 'Audience estimate computed', data, success: true });
  }));

  // v2 campaigns: queue now or schedule — the minute worker fires when due.
  router.post('/campaigns', validate({ body: CampaignSchema }), asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    if (body.channels?.sms && body.confirmSpend !== true) {
      return res.status(400).json({
        message: 'SMS sends spend gateway credit — confirm the estimate first',
        success: false,
        code: 'SPEND_NOT_CONFIRMED',
      });
    }
    const data = await schedule.execute({ createdBy: req.auth?.partnerId, input: body });
    void recordAudit({
      actorId: req.auth?.partnerId, action: 'broadcast.campaign.queue',
      targetType: 'broadcast', targetId: data.id,
      detail: { channels: body.channels ?? { inApp: true }, kind: body.kind ?? 'system', sendAt: data.sendAt },
    });
    res.status(200).json({
      message: data.sendAt && new Date(data.sendAt).getTime() > Date.now()
        ? 'Campaign scheduled'
        : 'Campaign queued — sending starts within a minute',
      data,
      success: true,
    });
  }));

  router.get('/campaigns/:id', asyncHandler(async (req, res) => {
    const data = await detail.execute({ id: req.params?.id });
    res.status(200).json({ message: 'Campaign retrieved successfully', data, success: true });
  }));

  return router;
};

export default buildBroadcastRouter();
