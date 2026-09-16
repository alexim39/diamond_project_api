import { NotFoundException, ConflictException } from '../../../shared/domain/AppError.js';

export const TICKET_STATUSES = Object.freeze(['open', 'in-progress', 'resolved', 'closed']);

/** GET (admin) — inbox listing passthrough with bounded paging. */
export class ListTicketsUseCase {
  /** @param {{tickets}} deps */
  constructor({ tickets }) {
    this.tickets = tickets;
  }

  async execute({ status = null, q = '', limit = 25, skip = 0 } = {}) {
    if (status && !TICKET_STATUSES.includes(status)) {
      const { ValidationException } = await import('../../../shared/domain/AppError.js');
      throw new ValidationException(`Unknown ticket status (expected one of: ${TICKET_STATUSES.join(', ')})`);
    }
    return this.tickets.list({ status, q, limit, skip });
  }
}

/**
 * PATCH (admin) — assign / move / resolve a ticket.
 * `closed` is terminal unless `reopen: true`; resolving stamps
 * `resolvedAt` and clears nothing else. Returns the updated ticket.
 */
export class DecideTicketUseCase {
  /** @param {{tickets}} deps */
  constructor({ tickets }) {
    this.tickets = tickets;
  }

  async execute({ ticketId, status = null, assigneeId = null, note = null, reopen = false }) {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    const patch = {};
    if (assigneeId !== null && assigneeId !== undefined) {
      patch.assigneeId = String(assigneeId);
    }
    if (status !== null && status !== undefined) {
      if (!TICKET_STATUSES.includes(status)) {
        const { ValidationException } = await import('../../../shared/domain/AppError.js');
        throw new ValidationException(`Unknown ticket status (expected one of: ${TICKET_STATUSES.join(', ')})`);
      }
      const current = ticket.status ?? 'open';
      if (current === 'closed' && status !== 'closed' && !reopen) {
        throw new ConflictException('Ticket is closed — reopen it explicitly to move it again');
      }
      patch.status = status;
      if ((status === 'resolved' || status === 'closed') && !ticket.resolvedAt) {
        patch.resolvedAt = new Date();
      }
    }
    if (note !== null && note !== undefined) {
      patch.resolutionNote = String(note).slice(0, 2000);
    }
    if (Object.keys(patch).length === 0) {
      const { ValidationException } = await import('../../../shared/domain/AppError.js');
      throw new ValidationException('Nothing to update — pass status, assigneeId or note');
    }
    const updated = await this.tickets.updateDecision(ticketId, patch);
    return { previous: ticket, ticket: updated };
  }
}
