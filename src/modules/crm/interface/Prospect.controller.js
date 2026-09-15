import { asyncHandler } from '../../../shared/http/asyncHandler.js';

const pid = (req) => req.validated?.params?.prospectId ?? req.params.prospectId;

/** Interface: HTTP adapters preserving legacy envelopes (+ additive `data`/`meta`). */
export const makeProspectController = (uc) => ({
  create: asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    // Session owns the prospect: a mismatched body partnerId is tampering, not input.
    const sessionId = req.auth?.partnerId ? String(req.auth.partnerId) : null;
    if (body.partnerId && sessionId && String(body.partnerId) !== sessionId) {
      return res.status(403).json({ message: 'You can only create prospects for yourself', success: false });
    }
    const data = await uc.create.execute({ ...body, partnerId: sessionId ?? body.partnerId });
    res.status(200).json({ message: 'Contact created successfully!', success: true, data });
  }),

  update: asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const prospectId = req.validated?.params?.prospectId ?? req.params.prospectId ?? body.prospectId;
    await uc.update.execute({ prospectId, ...body });
    res.status(200).json({ message: 'Prospect has been updated successfully', success: true });
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    // Legacy shape nests fields under `status:{...}`; canonical path takes them flat.
    const prospectId = pid(req) ?? body.prospectId;
    const status = body.status && typeof body.status === 'object' ? body.status : body;
    const data = await uc.updateStatus.execute({ prospectId, status });
    res.status(200).json({ message: 'Prospect status updated successfully!', success: true, data: data.status });
  }),

  remove: asyncHandler(async (req, res) => {
    await uc.remove.execute({ prospectId: pid(req) });
    res.status(200).json({ message: 'Prospect deleted successfully!', success: true });
  }),

  getById: asyncHandler(async (req, res) => {
    const data = await uc.getById.execute({ prospectId: pid(req) });
    res.status(200).json({ message: 'Prospect retrieved successfully!', data, success: true });
  }),

  getByPartner: asyncHandler(async (req, res) => {
    const partnerId = req.validated?.params?.partnerId ?? req.params.partnerId ?? req.params.createdBy;
    const q = req.validated?.query ?? req.query;
    const { items, total } = await uc.getByPartner.execute({ partnerId, limit: q?.limit, skip: q?.skip, q: q?.q, stage: q?.stage });
    res.status(200).json({
      message: 'Prospects retrieved successfully!',
      data: items,
      success: true,
      meta: { total, limit: q?.limit ?? 50, skip: q?.skip ?? 0 },
    });
  }),

  logCommunication: asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body;
    const prospectId = pid(req) ?? body.prospectId;
    await uc.logCommunication.execute({ prospectId, ...body });
    res.status(200).json({ message: 'Prospect communication updated successfully!', success: true });
  }),

  removeCommunication: asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    await uc.removeCommunication.execute(params);
    res.status(200).json({ message: 'Communication deleted successfully!', success: true });
  }),

  notifications: asyncHandler(async (req, res) => {
    const partnerId = req.validated?.params?.partnerId ?? req.params.partnerId;
    const data = await uc.notifications.execute({ partnerId });
    res.status(200).json({ message: 'Notifications built successfully!', data, success: true });
  }),

  stuck: asyncHandler(async (req, res) => {
    const partnerId = req.validated?.params?.partnerId ?? req.params.partnerId;
    const q = req.validated?.query ?? req.query;
    const data = await uc.stuck.execute({ partnerId, days: q?.days });
    res.status(200).json({ message: 'Stuck prospects retrieved successfully!', data, success: true });
  }),

  convert: asyncHandler(async (req, res) => {
    const body = req.validated?.body ?? req.body ?? {};
    const data = await uc.convert.execute({
      prospectId: pid(req),
      code: typeof body.code === 'string' ? body.code : undefined,
      by: typeof body.by === 'string' ? body.by : undefined,
      byName: typeof body.byName === 'string' ? body.byName : undefined,
    });
    res.status(200).json({
      message: 'Reservation code recorded. Share it with the prospect to complete signup.',
      data,
      success: true,
    });
  }),

  contactListMine: asyncHandler(async (req, res) => {
    const data = await uc.contactListMine.execute({ partnerId: req.auth?.partnerId });
    res.status(200).json({ message: 'Contact list retrieved successfully', data, success: true });
  }),

  contactListSubmit: asyncHandler(async (req, res) => {
    const data = await uc.contactListSubmit.execute({ partnerId: req.auth?.partnerId });
    res.status(200).json({ message: 'Contact list submitted to your upline', data, success: true });
  }),

  contactListDownline: asyncHandler(async (req, res) => {
    const data = await uc.contactListDownline.execute({ requesterId: req.auth?.partnerId });
    res.status(200).json({ message: 'Downline contact lists retrieved successfully', data, success: true });
  }),

  contactListActivation: asyncHandler(async (req, res) => {
    const data = await uc.contactListActivation.execute({ requesterId: req.auth?.partnerId });
    res.status(200).json({ message: 'Activation board retrieved successfully', data, success: true });
  }),
});
