import { ValidationException } from '../../../shared/domain/AppError.js';

/** Deposit bounds (NGN) — dust and fat-finger protection, adjustable. */
export const DEPOSIT_MIN_NGN = 100;
export const DEPOSIT_MAX_NGN = 1000000;

export const DEPOSIT_STATUSES = Object.freeze(['created', 'pending', 'success', 'failed', 'closed']);

/** Naira → kobo integer (Opay `total` is the minor unit). */
export const toKobo = (ngn) => {
  const n = Number(ngn);
  if (!Number.isFinite(n) || n <= 0) throw new ValidationException('Invalid deposit amount');
  return Math.round(n * 100);
};

/** @param {number} ngn */
export const assertDepositAmount = (ngn) => {
  const n = Number(ngn);
  if (!Number.isFinite(n) || n < DEPOSIT_MIN_NGN || n > DEPOSIT_MAX_NGN) {
    throw new ValidationException(
      `Deposit must be between ₦${DEPOSIT_MIN_NGN.toLocaleString()} and ₦${DEPOSIT_MAX_NGN.toLocaleString()}`,
    );
  }
  return n;
};

/** Unique merchant reference — timestamp + entropy (02004 retry regenerates). */
export const newDepositReference = () =>
  `DP${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
