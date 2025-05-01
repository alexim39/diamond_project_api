import express from 'express';
import { 
    SendSingleEmailsToProspect, deleteEmail,
    SendBulkEmailsToProspect,
    getEmailsCreatedBy
} from '../controllers/email.controller.js'
const EmailRouter = express.Router();

// Single email
EmailRouter.post('/send-emails', SendSingleEmailsToProspect);
// builk email
EmailRouter.post('/send-bulk-email', SendBulkEmailsToProspect);
// get email
EmailRouter.get('/getById/:partnerId', getEmailsCreatedBy);
// delete email
EmailRouter.delete('/delete-single/:id', deleteEmail );


export default EmailRouter;