import crypto from 'crypto';
import { ConflictException, NotFoundException } from '../../../shared/domain/AppError.js';

const codeGenerator = () => `DP-${crypto.randomInt(0, 36 ** 6).toString(36).toUpperCase().padStart(6, '0')}`;

/**
 * Convert prospect → partner enrollment (Phase A).
 * Issues an Approved reservation code owned by the prospect's upline and
 * stamps the prospect Converted. The prospect then signs up with that code
 * via POST /v1/auth/signup, which links `partnerOf` automatically.
 * Idempotent-safe: already-converted prospects get 409, never a second code.
 */
export class ConvertProspectToPartnerUseCase {
  /** @param {{prospects, reservations, generateCode?}} deps */
  constructor({ prospects, reservations, generateCode = codeGenerator }) {
    this.prospects = prospects;
    this.reservations = reservations;
    this.generateCode = generateCode;
  }

  async execute({ prospectId }) {
    const prospect = await this.prospects.findById(prospectId);
    if (!prospect) throw new NotFoundException('Prospect not found');
    if (prospect.status?.stage === 'Converted') {
      throw new ConflictException('Prospect has already been converted');
    }

    let code = this.generateCode();
    for (let attempts = 0; await this.reservations.existsByCode(code); attempts++) {
      if (attempts >= 5) throw new ConflictException('Could not generate a unique enrollment code, try again');
      code = this.generateCode();
    }

    const enrollment = await this.reservations.createApproved({
      code,
      partnerId: prospect.partnerId,
      prospectId: prospect.id ?? prospectId,
    });

    const updated = await this.prospects.updateStatus(prospectId, {
      name: 'Converted',
      stage: 'Converted',
    });

    return { code: enrollment.code, prospect: updated };
  }
}
