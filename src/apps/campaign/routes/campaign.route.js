import express from 'express';
import { 
    createFacebookCampaign,
    getCampaignsCreatedBy,
    recordVisits,
    createYoutubeCampaign,
    createLinkedinCampaign,
    getCampaign
} from '../controllers/campaign.controller.js'
const CampaignRouter = express.Router();

// create facebook campaign
CampaignRouter.post('/facebook', createFacebookCampaign);

// create youtbue campaign
CampaignRouter.post('/youtube', createYoutubeCampaign);

// create linkedin campaign
CampaignRouter.post('/linkedin', createLinkedinCampaign);

// Get all campaigns createdBy
CampaignRouter.get('/all-createdBy/:createdBy', getCampaignsCreatedBy);

// Get a camapaign
CampaignRouter.get('/:id', getCampaign);

// record visit
CampaignRouter.post('/visits', recordVisits);


export default CampaignRouter;