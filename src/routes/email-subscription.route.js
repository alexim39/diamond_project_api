import express from 'express';
import { 
    emailSubscription
} from '../controllers/email-subscription.controller.js'

const emailSubscriptionRouter = express.Router();

// User email subscription
emailSubscriptionRouter.post('/subscribe', emailSubscription);


export default emailSubscriptionRouter;