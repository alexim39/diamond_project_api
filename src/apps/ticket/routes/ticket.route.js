import express from 'express';
import { 
    saveTicket,
} from '../controllers/ticket.controller.js'
const TicketRouter = express.Router();

// submit sms
TicketRouter.post('/submit', saveTicket);


export default TicketRouter;