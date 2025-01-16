import express from 'express';
import { 
    SendSingleEmailsToProspect, deleteEmail,
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

// delete email
PartnerEmailsRouter.delete('/delete-single/:id', deleteEmail );


export default PartnerEmailsRouter;