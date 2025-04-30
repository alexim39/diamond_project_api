import express from 'express';
import { bookingForm} from '../controllers/ticket.controller.js'
const TicketRouter = express.Router();

// User booking
TicketRouter.post('/submit', bookingForm);


export default TicketRouter;