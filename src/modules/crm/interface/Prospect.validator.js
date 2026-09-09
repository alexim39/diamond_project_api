import { z } from 'zod';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');
const email = z.string().trim().toLowerCase().email().max(254);

export const ProspectIdParam = z.object({ prospectId: objectId });
export const PartnerIdParam = z.object({ partnerId: objectId });

export const CreateProspectSchema = z.object({
  prospectName: z.string().trim().min(2).max(80),
  prospectSurname: z.string().trim().max(80).optional().default(''),
  prospectPhone: z.string().trim().min(7).max(20),
  prospectEmail: email.optional().or(z.literal('')),
  prospectSource: z.string().trim().min(2).max(120),
  partnerId: objectId,
  surverId: z.string().trim().optional(),
  survey: z.unknown().optional(),
});

export const UpdateProspectSchema = z.object({
  prospectName: z.string().trim().min(2).max(80).optional(),
  prospectSurname: z.string().trim().max(80).optional(),
  prospectPhone: z.string().trim().min(7).max(20).optional(),
  prospectEmail: email.optional().or(z.literal('')),
  // NOTE: legacy read `body._prospectSourceid` (always undefined and wiped
  // the field). Correct key is `prospectSource`; the old key is ignored.
  prospectSource: z.string().trim().min(2).max(120).optional(),
});

export const UpdateStatusSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  note: z.string().max(2000).optional(),
  paydayDate: z.coerce.date().optional(),
  expectedDecisionDate: z.coerce.date().optional(),
  onboardingDate: z.coerce.date().optional(),
  status: z.enum(['Open', 'Closed']).optional(),
  // Canonical pipeline stage (Phase A). Legacy free-text `name` still accepted.
  stage: z.enum(['New', 'Contacted', 'Interested', 'In Negotiation', 'Converted', 'Closed']).optional(),
});

export const LogCommunicationSchema = z.object({
  type: z.enum(['call', 'email', 'text', 'zoom', 'whatsapp']),
  interestLevel: z.enum(['hot', 'warm', 'cold']),
  date: z.coerce.date().optional(),
  duration: z.coerce.number().int().min(0).max(100000).optional().default(0),
  description: z.string().trim().min(3).max(5000),
  followUpAction: z.string().max(500).optional(),
  topicsDiscussed: z.union([z.array(z.string()), z.string()]).optional(),
  documentsShared: z.array(z.string()).optional(),
  status: z.enum(['Open', 'Closed']).optional(),
});

export const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  skip: z.coerce.number().int().min(0).optional().default(0),
});

export const CommIdsParam = z.object({ prospectId: objectId, communicationId: objectId });
