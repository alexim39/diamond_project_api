import express from 'express';
import { 
    saveSMSDetails,
    getSMSCreatedBy
} from '../controllers/sms.controller.js'

const PartnerSMSRouter = express.Router();

// save sms
PartnerSMSRouter.post('/save-sms', saveSMSDetails);

// get sms
PartnerSMSRouter.get('/getById/:partnerId', getSMSCreatedBy);


export default PartnerSMSRouter;