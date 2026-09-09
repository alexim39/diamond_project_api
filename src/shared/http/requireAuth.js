import jwt from 'jsonwebtoken';
import { UnauthorizedException } from '../domain/AppError.js';

/**
 * Decoupled auth middleware (Infrastructure/Interface boundary).
 * Verifies the `jwt` cookie and injects `req.auth = { partnerId }`.
 * Use-cases receive a plain `partnerId` string — they never
 * touch cookies, headers, or `jsonwebtoken`.
 *
 * For the ticket slice this is OPTIONAL (legacy clients send
 * `partnerId` in the body). New clients should send the cookie
 * and may omit `partnerId` — the controller prefers auth.
 */
export const requireAuth = (req, _res, next) => {
  try {
    const token = req.cookies?.jwt;
    if (!token) throw new UnauthorizedException('No authentication token provided');
    const claims = jwt.verify(token, process.env.JWTTOKENSECRET);
    if (!claims?.id) throw new UnauthorizedException('User unauthenticated');
    req.auth = { partnerId: String(claims.id) };
    next();
  } catch (err) {
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
      return next(new UnauthorizedException('Invalid or expired token'));
    }
    return next(err);
  }
};

/** Same as requireAuth but never rejects — attaches req.auth when possible. */
export const optionalAuth = (req, _res, next) => {
  try {
    const token = req.cookies?.jwt;
    if (!token) return next();
    const claims = jwt.verify(token, process.env.JWTTOKENSECRET);
    if (claims?.id) req.auth = { partnerId: String(claims.id) };
    return next();
  } catch {
    return next(); // ignore bad/expired token on optional path
  }
};
