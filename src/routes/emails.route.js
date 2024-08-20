import express from 'express';
import { 
    SendEmailsToProspect
} from '../controllers/emails.controller.js'

const PartnerEmailsRouter = express.Router();

// Single email
PartnerEmailsRouter.post('/send-emails', SendEmailsToProspect);


export default PartnerEmailsRouter;