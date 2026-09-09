import { NotFoundException, UnauthorizedException } from '../../../shared/domain/AppError.js';
import { toSafePartner } from '../domain/Partner.entity.js';

/** Powers `GET /v1/auth/me` (legacy `GET /auth`). */
export class GetCurrentPartnerUseCase {
  /** @param {{partners}} deps */
  constructor({ partners }) {
    this.partners = partners;
  }

  async execute({ partnerId }) {
    if (!partnerId) throw new UnauthorizedException('User unauthenticated');
    const user = await this.partners.findById(partnerId);
    if (!user) throw new NotFoundException('User not found');
    return toSafePartner(user);
  }
}
