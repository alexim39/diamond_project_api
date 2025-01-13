import express from 'express';
import { 
    emailSubscription, deleteSingleEmailFromEmailList
} from '../controllers/email-subscription.controller.js'

const emailSubscriptionRouter = express.Router();

// User email subscription
emailSubscriptionRouter.post('/subscribe', emailSubscription);

// delete signle prospect email from email list
emailSubscriptionRouter.get('/delete-email/:emailId', deleteSingleEmailFromEmailList );


export default emailSubscriptionRouter;