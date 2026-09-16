import { ValidationException } from '../../../shared/domain/AppError.js';
import { lenientRole } from './PartnerRole.js';

const text = (value, field, { min = 2, max = 80 } = {}) => {
  const v = String(value ?? '').trim();
  if (v.length < min || v.length > max) throw new ValidationException(`Invalid ${field}`);
  return v;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Value Object: Email — normalized lowercase, never raw user input downstream.
 */
export const Email = {
  create(value) {
    const v = String(value ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(v) || v.length > 254) throw new ValidationException('Invalid email');
    return v;
  },
};

/**
 * Value Object: PlainPassword — strength floor enforced ONCE here
 * (legacy had none; min 6 is the single intentional tightening of this slice).
 */
export const PlainPassword = {
  create(value) {
    const v = String(value ?? '');
    if (v.length < 6 || v.length > 128) {
      throw new ValidationException('Password must be between 6 and 128 characters');
    }
    return v;
  },
};

/**
 * Domain Entity factory for signup — pure, no Express/Mongoose/bcrypt.
 * Hashing happens in infrastructure (`BcryptPasswordHasher`); the entity
 * only carries validated plain values plus derived username base.
 *
 * @param {{name,surname,email,phone,password,reservationCode,tnc}} input (Zod-whitelisted)
 */
export const createSignupEntity = (input) => ({
  name: text(input.name, 'name'),
  surname: text(input.surname, 'surname'),
  email: Email.create(input.email),
  phone: text(input.phone, 'phone', { min: 7, max: 20 }),
  password: PlainPassword.create(input.password),
  reservationCode: text(input.reservationCode, 'reservation code', { min: 3, max: 64 }),
  tnc: input.tnc ?? false,
});

/** Username rule preserved from legacy: first-initial + surname, lowercased. */
export const baseUsernameFor = (name, surname) =>
  (name.charAt(0) + surname).toLowerCase().replace(/[^a-z0-9]/g, '');

/** Strip secrets before anything leaves the Application layer. */
export const toSafePartner = (doc) => {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete o.password;
  delete o.resetPasswordToken;
  delete o.resetPasswordExpires;
  if (o._id) o.id = String(o._id);
  // Canonical role casing (absorbs legacy 'User'/'admin' free-text).
  o.role = lenientRole(o.role);
  // Suspension flag for admin tooling (timestamps stay for audit detail).
  o.suspended = !!o.suspendedAt;
  return o;
};
