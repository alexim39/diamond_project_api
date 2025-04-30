import express from 'express';
import { bookingForm} from '../controllers/campaign.controller.js'
const CampaignRouter = express.Router();

//
CampaignRouter.post('/submit', bookingForm);


export default CampaignRouter;