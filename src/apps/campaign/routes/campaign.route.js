import express from 'express';
import { requireAuth } from '../../../shared/http/requireAuth.js';
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
CampaignRouter.post('/', createCampaign);

// create facebook campaign
CampaignRouter.post('/facebook', createFacebookCampaign);

// create youtbue campaign
CampaignRouter.post('/youtube', createYoutubeCampaign);

// create linkedin campaign
CampaignRouter.post('/linkedin', createLinkedinCampaign);

// Get all campaigns createdBy
CampaignRouter.get('/all-createdBy/:createdBy', getCampaignsCreatedBy);

// Admin queue (role-gated) — must precede /:id so 'queue' isn't read as an id.
CampaignRouter.get('/queue', requireAuth, requireRole('admin'), listCampaignsForAdmin);
CampaignRouter.patch('/:id/status', requireAuth, requireRole('admin'), updateCampaignStatus);

// Get a camapaign
CampaignRouter.get('/:id', getCampaign);

// record visit
CampaignRouter.post('/visits', recordVisits);


export default CampaignRouter;