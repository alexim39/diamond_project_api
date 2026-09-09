import { asyncHandler } from '../../../shared/http/asyncHandler.js';

const isProd = () => process.env.NODE_ENV === 'production';

/**
 * Legacy set `secure:true; SameSite=None` unconditionally, which browsers
 * REJECT over plain http://localhost — one cause of the localhost:4200
 * signin pain. New behavior: strict in prod, localhost-friendly in dev.
 */
export const sessionCookieFlags = () => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: isProd() ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
});

export const makeAuthController = ({
  signup,
  signin,
  getCurrentPartner,
  requestPasswordReset,
  resetPassword,
}) => ({
  signup: asyncHandler(async (req, res) => {
    const userObject = await signup.execute(req.validated?.body ?? req.body);
    res.status(200).json({ userObject, message: 'Registration successful', success: true });
  }),

  signin: asyncHandler(async (req, res) => {
    const { token, user } = await signin.execute(req.validated?.body ?? req.body);
    res.cookie('jwt', token, sessionCookieFlags());
    // Legacy shape preserved; `data` is additive for new clients.
    res.status(200).json({ message: 'Login successful', success: true, data: { user } });
  }),

  signout: asyncHandler(async (_req, res) => {
    res.cookie('jwt', '', { ...sessionCookieFlags(), maxAge: 0 });
    res.status(200).json({ message: 'Logged out successfully', success: true });
  }),

  me: asyncHandler(async (req, res) => {
    const data = await getCurrentPartner.execute({ partnerId: req.auth?.partnerId });
    res.status(200).json({ data, message: 'User authenticated', success: true });
  }),

  requestPasswordReset: asyncHandler(async (req, res) => {
    await requestPasswordReset.execute(req.validated?.body ?? req.body);
    // Generic message either way — anti-enumeration (legacy 404'd unknown emails).
    res.status(200).json({ message: 'If an account exists for that email, a reset link was sent.', success: true });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const result = await resetPassword.execute(req.validated?.body ?? req.body);
    res.status(200).json({ ...result, success: true });
  }),
});
