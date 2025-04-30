import express from 'express';
import { bookingForm} from '../controllers/sms.controller.js'
const SmsRouter = express.Router();

//
SmsRouter.post('/submit', bookingForm);


export default SmsRouter;