import express from 'express';
import { 
    SendSingleEmailsToProspect,
    SendBulkEmailsToProspect,
    getEmailsCreatedBy
} from '../controllers/emails.controller.js'

const PartnerEmailsRouter = express.Router();

// Single email
PartnerEmailsRouter.post('/send-emails', SendSingleEmailsToProspect);

// builk email
PartnerEmailsRouter.post('/send-bulk-email', SendBulkEmailsToProspect);

// get email
PartnerEmailsRouter.get('/getById/:partnerId', getEmailsCreatedBy);


export default PartnerEmailsRouter;