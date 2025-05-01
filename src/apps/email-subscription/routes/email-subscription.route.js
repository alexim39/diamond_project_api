import express from 'express';
import { 
    emailSubscription, deleteSingleEmailFromEmailList
} from '../controllers/email-subscription.controller.js'
const EmailSubscriptionRouter = express.Router();

// User email subscription
EmailSubscriptionRouter.post('/subscribe', emailSubscription);
// delete signle prospect email from email list
EmailSubscriptionRouter.get('/delete-email/:emailId', deleteSingleEmailFromEmailList );


export default EmailSubscriptionRouter;