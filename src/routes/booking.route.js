import express from 'express';
import { 
    bookingForm, getBookingsForPartner, deleteBooking, UpdateBooking
} from '../controllers/booking.controller.js'

const userBookingRouter = express.Router();

// User booking
userBookingRouter.post('/submit', bookingForm);

// Get all surver prospect for
userBookingRouter.get('/for/:createdBy', getBookingsForPartner);

// delete booking
userBookingRouter.delete('/delete/:id', deleteBooking );

// update
userBookingRouter.put('/update', UpdateBooking);


export default userBookingRouter;