import express from 'express';
import { 
    createFacebookCampaign,
    getCampaignsCreatedBy,
    recordVisits,
    createYoutubeCampaign,
    createLinkedinCampaign,
    getCampaign
} from '../controllers/campaign.js'

const campaignRouter = express.Router();

// create facebook campaign
campaignRouter.post('/facebook', createFacebookCampaign);

// create youtbue campaign
campaignRouter.post('/youtube', createYoutubeCampaign);

// create linkedin campaign
campaignRouter.post('/linkedin', createLinkedinCampaign);

// Get all campaigns createdBy
campaignRouter.get('/all-createdBy/:createdBy', getCampaignsCreatedBy);

// Get a camapaign
campaignRouter.get('/:id', getCampaign);

// record visit
campaignRouter.post('/visits', recordVisits);

export default campaignRouter;