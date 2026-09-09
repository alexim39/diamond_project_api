import { TicketMongooseModel } from './Ticket.schema.js';
import { TicketMapper } from './Ticket.mapper.js';

/**
 * Infrastructure: Mongo implementation of `TicketRepository`.
 * Uses `.lean()` on reads; writes go through the mapper so
 * callers never see Mongoose internals.
 */
export class MongoTicketRepository {
  /** @param {any} entity domain entity @returns {Promise<any>} domain object */
  async save(entity) {
    const created = await TicketMongooseModel.create(TicketMapper.toPersistence(entity));
    return TicketMapper.toDomain(created);
  }
}
