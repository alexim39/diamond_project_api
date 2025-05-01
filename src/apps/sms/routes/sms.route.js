import express from 'express';
import { 
    saveSMSDetails, deleteSMS,
    getSMSCreatedBy
} from '../controllers/sms.controller.js'
const SmsRouter = express.Router();

// save sms
SmsRouter.post('/save-sms', saveSMSDetails);
// get sms
SmsRouter.get('/getById/:partnerId', getSMSCreatedBy);
// delete sms
SmsRouter.delete('/delete-single/:id', deleteSMS );


export default SmsRouter;