import { AppError, ValidationException } from '../../../shared/domain/AppError.js';
import { createSignupEntity, baseUsernameFor, toSafePartner } from '../domain/Partner.entity.js';
import { domainEvents } from '../../../shared/events/DomainEvents.js';
import { RESERVATION_EVENTS, consumedPayload } from '../../reservations/domain/ReservationEvents.js';

/**
 * Signup — transactional: code validation + uniqueness checks + partner
 * creation happen inside ONE Mongo session. Legacy did these as separate
 * queries, so a crash between code-check and save could double-spend a code.
 */
export class SignupUseCase {
  /** @param {{partners, reservations, hasher, tx, events?}} deps (events optional — activation fan-out) */
  constructor({ partners, reservations, hasher, tx, events = null }) {
    this.partners = partners;
    this.reservations = reservations;
    this.hasher = hasher;
    this.tx = tx;
    this.events = events ?? domainEvents;
  }

  async execute(input) {
    const entity = createSignupEntity(input);

    let activation = null;
    const saved = await this.tx.runInTransaction(async (session) => {
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
      // Close the lifecycle in the same tx: Approved → Used, so the code
      // can never be re-read as "ready" after it is consumed.
      await this.reservations.markUsed(entity.reservationCode, { session });
      // Hand the activation loop everything it needs (upline, prospect,
      // display name) — emitted AFTER commit, best-effort, never fails signup.
      activation = {
        code: entity.reservationCode,
        uplineId: partnerOf,
        prospectId: reservation.prospectId ?? null,
        memberName: [entity.name, entity.surname].filter(Boolean).join(' '),
      };
      return toSafePartner(saved);
    });

    if (activation) {
      await this.events.emit(
        RESERVATION_EVENTS.CONSUMED,
        consumedPayload({ ...activation, partnerId: saved.id ?? saved._id }),
      ).catch(() => null);
    }
    return saved;
  }
}
