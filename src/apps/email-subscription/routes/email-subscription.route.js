import express from 'express';
import { bookingForm} from '../controllers/email-subscription.controller.js'
const EmailSubscriptionRouter = express.Router();

//
EmailSubscriptionRouter.post('/submit', bookingForm);


export default EmailSubscriptionRouter;