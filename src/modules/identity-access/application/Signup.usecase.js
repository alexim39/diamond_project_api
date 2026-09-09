import { AppError, ValidationException } from '../../../shared/domain/AppError.js';
import { createSignupEntity, baseUsernameFor, toSafePartner } from '../domain/Partner.entity.js';

/**
 * Signup — transactional: code validation + uniqueness checks + partner
 * creation happen inside ONE Mongo session. Legacy did these as separate
 * queries, so a crash between code-check and save could double-spend a code.
 */
export class SignupUseCase {
  /** @param {{partners, reservations, hasher, tx}} deps */
  constructor({ partners, reservations, hasher, tx }) {
    this.partners = partners;
    this.reservations = reservations;
    this.hasher = hasher;
    this.tx = tx;
  }

  async execute(input) {
    const entity = createSignupEntity(input);

    return this.tx.runInTransaction(async (session) => {
      const reservation = await this.reservations.findByCode(entity.reservationCode, { session });
      if (!reservation) {
        throw new ValidationException('The reservation code is invalid or does not exist');
      }
      if (reservation.status === 'Pending') {
        throw new AppError('Reservation code is pending approval', 402, 'RESERVATION_PENDING');
      }
      if (await this.partners.existsByReservationCode(entity.reservationCode, { session })) {
        throw new AppError('This reservation code has already been used', 401, 'CODE_ALREADY_USED');
      }

      let partnerOf = null;
      if (reservation.status === 'Approved' && reservation.partnerId) {
        const upline = await this.partners.findById(reservation.partnerId, { session });
        if (!upline) throw new AppError('Upline partner not found', 404, 'NOT_FOUND');
        partnerOf = reservation.partnerId;
      }

      // Unique username: base, base1, base2... (legacy rule, now race-safe in tx)
      const base = baseUsernameFor(entity.name, entity.surname);
      let username = base;
      for (let counter = 1; await this.partners.existsByUsername(username, { session }); counter++) {
        username = `${base}${counter}`;
      }

      const saved = await this.partners.create(
        {
          name: entity.name,
          surname: entity.surname,
          email: entity.email,
          password: await this.hasher.hash(entity.password),
          tnc: entity.tnc,
          reservationCode: entity.reservationCode,
          phone: entity.phone,
          username,
          ...(partnerOf ? { partnerOf } : {}),
        },
        { session },
      );
      return toSafePartner(saved);
    });
  }
}
