import express from 'express';
import { 
    createFacebookCampaign
} from '../controllers/campaign.js'

const campaignRouter = express.Router();

// create facebook campaign
campaignRouter.post('/facebook', createFacebookCampaign);


export default campaignRouter;