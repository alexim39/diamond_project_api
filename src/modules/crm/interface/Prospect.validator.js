import { z } from 'zod';
import { CONTACT_PRIORITIES, RELATIONSHIP_TAGS } from '../domain/Prospect.entity.js';

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
  // Optional: session identity owns creation; a supplied id must match it.
  partnerId: objectId.optional(),
  surverId: z.string().trim().optional(),
  survey: z.unknown().optional(),
  campaignId: objectId.optional(),
  // Contact-list enrichment (all optional — quick-add stays fast).
  relationship: z.enum(RELATIONSHIP_TAGS).optional().default('Other'),
  priority: z.enum(CONTACT_PRIORITIES).optional().default('normal'),
  bestTimeToCall: z.string().trim().max(120).optional().default(''),
  consentToContact: z.boolean().optional().default(false),
  notes: z.string().trim().max(2000).optional().default(''),
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
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
  q: z.string().trim().max(80).optional().default(''),
  stage: z.enum(['New', 'Contacted', 'Interested', 'In Negotiation', 'Converted', 'Closed']).optional(),
});

export const StuckQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const CommIdsParam = z.object({ prospectId: objectId, communicationId: objectId });
