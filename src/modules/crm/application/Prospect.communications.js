import { NotFoundException } from '../../../shared/domain/AppError.js';
import { createCommunicationEntity } from '../domain/Prospect.entity.js';

/** POST /v1/prospects/:id/communications — $push a validated entry. */
export class LogCommunicationUseCase {
  /** @param {{prospects}} deps */
  constructor({ prospects }) { this.prospects = prospects; }
  async execute({ prospectId, ...communication }) {
    const entry = createCommunicationEntity(communication);
    const updated = await this.prospects.pushCommunication(prospectId, entry);
    if (!updated) throw new NotFoundException('Prospect not found');
    return updated;
  }
}

/**
 * DELETE /v1/prospects/:id/communications/:communicationId.
 * Legacy re-fetched the doc (2 round-trips); new checks the returned
 * document in memory — one write, zero extra reads.
 */
export class RemoveCommunicationUseCase {
  /** @param {{prospects}} deps */
  constructor({ prospects }) { this.prospects = prospects; }
  async execute({ prospectId, communicationId }) {
    const { prospect, removed } = await this.prospects.pullCommunication(prospectId, communicationId);
    if (!prospect) throw new NotFoundException('Prospect not found');
    if (!removed) throw new NotFoundException('Communication not found within the prospect');
    return { removed: true };
  }
}
