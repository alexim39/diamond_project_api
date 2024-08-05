import express from 'express';
import { 
    createFacebookCampaign,
    getCampaignsCreatedBy,
    recordVisits
} from '../controllers/campaign.js'

const campaignRouter = express.Router();

// create facebook campaign
campaignRouter.post('/facebook', createFacebookCampaign);

// Get all campaigns createdBy
campaignRouter.get('/all-createdBy/:createdBy', getCampaignsCreatedBy);

// record visit
campaignRouter.post('/visits', recordVisits);

export default campaignRouter;