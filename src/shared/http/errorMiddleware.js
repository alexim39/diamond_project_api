import { AppError } from '../domain/AppError.js';

/**
 * Global error middleware — MUST be registered after all routes.
 * Maps domain exceptions to HTTP codes, hides internals on 500.
 */
// eslint-disable-next-line no-unused-vars
export const errorMiddleware = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      success: false,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }

  // Mongoose validation / cast errors from any not-yet-migrated path
  if (err?.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Invalid request data',
      success: false,
      code: 'VALIDATION_ERROR',
      details: err.message,
    });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({
      message: `Invalid ${err.path}: ${err.value}`,
      success: false,
      code: 'VALIDATION_ERROR',
    });
  }
  if (err?.code === 11000) {
    return res.status(409).json({
      message: 'Duplicate value',
      success: false,
      code: 'CONFLICT',
    });
  }

  console.error('[unhandled]', err);
  return res.status(500).json({
    message: 'Internal server error',
    success: false,
    code: 'INTERNAL_ERROR',
  });
};
