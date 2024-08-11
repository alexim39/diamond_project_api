import express from 'express';
import { 
    submitReservationCode
} from '../controllers/reservation-code.controller.js'

const reservationCodeRouter = express.Router();

// submit code
reservationCodeRouter.post('/submit', submitReservationCode);


export default reservationCodeRouter;