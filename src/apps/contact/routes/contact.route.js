import express from 'express';
import { bookingForm} from '../controllers/contact.controller.js'
const ContactRouter = express.Router();

//
ContactRouter.post('/submit', bookingForm);


export default ContactRouter;