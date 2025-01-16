import express from 'express';
import { 
    saveSMSDetails, deleteSMS,
    getSMSCreatedBy
} from '../controllers/sms.controller.js'

const PartnerSMSRouter = express.Router();

// save sms
PartnerSMSRouter.post('/save-sms', saveSMSDetails);

// get sms
PartnerSMSRouter.get('/getById/:partnerId', getSMSCreatedBy);

// delete sms
PartnerSMSRouter.delete('/delete-single/:id', deleteSMS );


export default PartnerSMSRouter;