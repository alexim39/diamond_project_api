import express from 'express';
import { bookingForm} from '../controllers/reservation-code.controller.js'
const ReservationCodeRouter = express.Router();

// User booking
ReservationCodeRouter.post('/submit', bookingForm);


export default ReservationCodeRouter;