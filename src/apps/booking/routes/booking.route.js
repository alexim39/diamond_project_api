import express from 'express';
import { 
    bookingForm, getBookingsForPartner, deleteBooking, UpdateBooking, getPartnerEmailList
} from '../controllers/booking.controller.js'
const BookingRouter = express.Router();

// User booking
BookingRouter.post('/submit', bookingForm);
// Get all surver prospect for
BookingRouter.get('/for/:createdBy', getBookingsForPartner);
// delete booking
BookingRouter.delete('/delete/:id', deleteBooking );
// update
BookingRouter.put('/update', UpdateBooking);
// Get all surver prospect for
BookingRouter.get('/email-list/:createdBy', getPartnerEmailList);


export default BookingRouter;