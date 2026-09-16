import { asyncHandler } from '../../../shared/http/asyncHandler.js';
import { recordAudit } from '../../audit/index.js';

/** Admin console adapters — all routes behind requireAuth + requireRole('admin'). */
export const makeAdminController = ({ setRole, listPartners, setSuspend, platformStats }) => ({
  setRole: asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const body = req.validated?.body ?? req.body;
    const data = await setRole.execute({
      requesterId: req.auth?.partnerId,
      partnerId: params.partnerId,
      role: body.role,
    });
    void recordAudit({
      actorId: req.auth?.partnerId, action: 'role.set',
      targetType: 'partner', targetId: params.partnerId,
      detail: { to: body.role, username: data?.username ?? null },
    });
    res.status(200).json({ message: 'Role updated successfully', data, success: true });
  }),

  list: asyncHandler(async (req, res) => {
    const q = req.validated?.query ?? req.query;
    const data = await listPartners.execute({
      limit: q?.limit,
      skip: q?.skip,
      q: q?.q,
    });
    res.status(200).json({ message: 'Partners retrieved successfully', ...data, success: true });
  }),

  suspend: asyncHandler(async (req, res) => {    const params = req.validated?.params ?? req.params;
    const body = req.validated?.body ?? req.body;
    const data = await setSuspend.execute({
      requesterId: req.auth?.partnerId,
      partnerId: params.partnerId,
      suspended: body.suspended,
      reason: body.reason ?? null,
    });
    void recordAudit({
      actorId: req.auth?.partnerId,
      action: data?.suspended ? 'account.unsuspend' : 'account.suspend',
      targetType: 'partner',
      targetId: params.partnerId,
      detail: { username: data?.username ?? null, reason: body.reason ?? null },
    });
    res.status(200).json({
      message: data?.suspended ? 'Account reactivated successfully' : 'Account suspended successfully',
      data,
      success: true,
    });
  }),

  stats: asyncHandler(async (_req, res) => {
    const data = await platformStats.execute();
    res.status(200).json({ message: 'Platform stats retrieved successfully', data, success: true });
  }),
});
