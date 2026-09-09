import { asyncHandler } from '../../../shared/http/asyncHandler.js';

/** Admin console adapters — all routes behind requireAuth + requireRole('admin'). */
export const makeAdminController = ({ setRole, listPartners }) => ({
  setRole: asyncHandler(async (req, res) => {
    const params = req.validated?.params ?? req.params;
    const body = req.validated?.body ?? req.body;
    const data = await setRole.execute({
      requesterId: req.auth?.partnerId,
      partnerId: params.partnerId,
      role: body.role,
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
});
