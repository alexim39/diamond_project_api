import express from 'express';
import { validate } from '../../../shared/http/validate.js';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { SignupSchema, SigninSchema, ResetRequestSchema, ResetConfirmSchema } from './Auth.validator.js';
import { makeAuthController } from './Auth.controller.js';
import { SignupUseCase } from '../application/Signup.usecase.js';
import { SigninUseCase } from '../application/Signin.usecase.js';
import { GetCurrentPartnerUseCase } from '../application/GetCurrentPartner.usecase.js';
import { RequestPasswordResetUseCase, ResetPasswordUseCase } from '../application/PasswordReset.usecase.js';
import { MongoPartnerRepository, MongoReservationRepository } from '../infrastructure/Auth.mongo.repository.js';
import { BcryptPasswordHasher, JwtSessionIssuer } from '../infrastructure/Auth.crypto.js';
import { PasswordResetMailer } from '../infrastructure/clients/PasswordResetMailer.js';
import { runInTransaction } from '../infrastructure/Auth.models.js';

/** Manual wiring — explicit for onboarding; pass fakes in tests. */
export const buildAuthRouter = (deps = {}) => {
  const partners = deps.partners ?? new MongoPartnerRepository();
  const reservations = deps.reservations ?? new MongoReservationRepository();
  const hasher = deps.hasher ?? new BcryptPasswordHasher();
  const sessions = deps.sessions ?? new JwtSessionIssuer();
  const tx = deps.tx ?? { runInTransaction };
  const mailer = deps.mailer ?? new PasswordResetMailer();
  const frontendUrl = deps.frontendUrl ?? process.env.FRONTEND_URL ?? 'https://c21fg.online';

  const controller = makeAuthController({
    signup: new SignupUseCase({ partners, reservations, hasher, tx }),
    signin: new SigninUseCase({ partners, hasher, sessions }),
    getCurrentPartner: new GetCurrentPartnerUseCase({ partners }),
    requestPasswordReset: new RequestPasswordResetUseCase({ partners, mailer, frontendUrl }),
    resetPassword: new ResetPasswordUseCase({ partners, hasher }),
  });

  const router = express.Router();
  router.post('/signup', validate({ body: SignupSchema }), controller.signup);
  router.post('/signin', validate({ body: SigninSchema }), controller.signin);
  router.post('/signout', controller.signout);
  router.get('/me', requireAuth, controller.me);
  router.get('/', requireAuth, controller.me); // legacy alias for GET /auth
  router.post('/reset-password-request', validate({ body: ResetRequestSchema }), controller.requestPasswordReset);
  router.post('/reset-password', validate({ body: ResetConfirmSchema }), controller.resetPassword);
  return router;
};

export default buildAuthRouter();
