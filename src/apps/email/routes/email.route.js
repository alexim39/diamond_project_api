import express from 'express';
import { 
    SendSingleEmailsToProspect, deleteEmail,
    SendEmailsToProspect,
    getEmailsCreatedBy
} from '../controllers/email.controller.js'
const EmailRouter = express.Router();

// Single email
EmailRouter.post('/send-emails', SendSingleEmailsToProspect);
// builk email
EmailRouter.post('/send-email', SendEmailsToProspect);
// get email
EmailRouter.get('/getById/:partnerId', getEmailsCreatedBy);
// delete email
EmailRouter.delete('/delete-single/:id', deleteEmail );


export default EmailRouter;