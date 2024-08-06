import express from 'express';
import { 
    createFacebookCampaign,
    getCampaignsCreatedBy,
    recordVisits,
    createYoutubeCampaign
} from '../controllers/campaign.js'

const campaignRouter = express.Router();

// create facebook campaign
campaignRouter.post('/facebook', createFacebookCampaign);

// create youtbue campaign
campaignRouter.post('/youtube', createYoutubeCampaign);

// Get all campaigns createdBy
campaignRouter.get('/all-createdBy/:createdBy', getCampaignsCreatedBy);

// record visit
campaignRouter.post('/visits', recordVisits);

export default campaignRouter;