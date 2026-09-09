import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(254);

export const SignupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  surname: z.string().trim().min(2).max(80),
  email,
  password: z.string().min(6).max(128), // sole intentional tightening (legacy had no floor)
  phone: z.string().trim().min(7).max(20),
  reservationCode: z.string().trim().min(3).max(64),
  tnc: z.boolean().optional().default(false),
});

export const SigninSchema = z.object({
  email,
  password: z.string().min(1).max(128), // no strength leak on login path
});

export const ResetRequestSchema = z.object({ email });

export const ResetConfirmSchema = z.object({
  token: z.string().min(10).max(2048),
  newPassword: z.string().min(6).max(128),
});
