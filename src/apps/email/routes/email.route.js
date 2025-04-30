import express from 'express';
import { bookingForm} from '../controllers/email.controller.js'
const EmailRouter = express.Router();

// User booking
EmailRouter.post('/submit', bookingForm);


export default EmailRouter;