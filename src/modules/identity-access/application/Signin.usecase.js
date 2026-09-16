import { ValidationException, UnauthorizedException, ForbiddenException } from '../../../shared/domain/AppError.js';
import { toSafePartner } from '../domain/Partner.entity.js';

/**
 * Signin — same observable behavior as legacy (generic "Wrong email or
 * password", 1-day JWT in cookie) but hashing/JWT live behind interfaces.
 */
export class SigninUseCase {
  /** @param {{partners, hasher, sessions}} deps */
  constructor({ partners, hasher, sessions }) {
    this.partners = partners;
    this.hasher = hasher;
    this.sessions = sessions;
  }

  /**
   * @param {{email,password}} input (Zod-whitelisted)
   * @returns {{token, user}} user is secrets-stripped
   */
  async execute(input) {
    const email = String(input?.email ?? '').trim().toLowerCase();
    const password = String(input?.password ?? '');
    if (!email || !password) throw new ValidationException('Email and password are required');

    const user = await this.partners.findByEmail(email);
    if (!user) throw new UnauthorizedException('Wrong email or password');
    const ok = await this.hasher.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Wrong email or password');
    if (user.suspendedAt) throw new ForbiddenException('Account suspended — contact support');

    const id = String(user._id ?? user.id);
    return { token: this.sessions.sign(id), user: toSafePartner(user) };
  }
}
