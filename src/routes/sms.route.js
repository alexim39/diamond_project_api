import express from 'express';
import { 
    saveSMSDetails
} from '../controllers/sms.controller.js'

const PartnerSMSRouter = express.Router();

// save sms
PartnerSMSRouter.post('/save-sms', saveSMSDetails);


export default PartnerSMSRouter;