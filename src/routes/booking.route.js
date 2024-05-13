import express from 'express';
import { 
    bookingForm
} from '../controllers/booking.controller.js'

const userBookingRouter = express.Router();

// User booking
userBookingRouter.post('/submit', bookingForm);


export default userBookingRouter;