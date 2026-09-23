import express from 'express';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { rateLimit } from '../../../shared/http/rateLimit.js';
import { requireRole } from '../../../modules/identity-access/interface/RequireRole.js';
import { 
    createCampaign,
    createFacebookCampaign,
    getCampaignsCreatedBy,
    listCampaignsForAdmin,
    recordVisits,
    createYoutubeCampaign,
    createLinkedinCampaign,
    getCampaign,
    updateCampaignStatus
} from '../controllers/campaign.controller.js'
const CampaignRouter = express.Router();

// unified creation (one wizard, per-channel minimums enforced inside)
// — session-owned: wallet + record always hit the caller's account.
CampaignRouter.post('/', requireAuth, createCampaign);

// create facebook campaign
CampaignRouter.post('/facebook', requireAuth, createFacebookCampaign);

// create youtbue campaign
CampaignRouter.post('/youtube', requireAuth, createYoutubeCampaign);

// create linkedin campaign
CampaignRouter.post('/linkedin', requireAuth, createLinkedinCampaign);

// Get all campaigns createdBy — owner, upline or admin.
CampaignRouter.get('/all-createdBy/:createdBy', requireAuth, getCampaignsCreatedBy);

// Admin queue (role-gated) — must precede /:id so 'queue' isn't read as an id.
CampaignRouter.get('/queue', requireAuth, requireRole('admin'), listCampaignsForAdmin);
CampaignRouter.patch('/:id/status', requireAuth, requireRole('admin'), updateCampaignStatus);

// Get a camapaign — owner, upline or admin.
CampaignRouter.get('/:id', requireAuth, getCampaign);

// record visit — PUBLIC (the :4201 site records anonymous page visits).
// Generous per-IP budget: every genuine page view fires exactly one call.
CampaignRouter.post('/visits', rateLimit({ name: 'campaign-visits', windowMs: 60000, max: 120 }), recordVisits);


export default CampaignRouter;
