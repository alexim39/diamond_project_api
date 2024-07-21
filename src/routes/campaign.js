import express from 'express';
import { 
    createFacebookCampaign,
    getCampaignsCreatedBy
} from '../controllers/campaign.js'

const campaignRouter = express.Router();

// create facebook campaign
campaignRouter.post('/facebook', createFacebookCampaign);

// Get all campaigns createdBy
campaignRouter.get('/all-createdBy/:createdBy', getCampaignsCreatedBy);

export default campaignRouter;