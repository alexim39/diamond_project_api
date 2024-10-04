import express from 'express';
import { 
    submitReservationCode, activateNewPartnerCode
} from '../controllers/reservation-code.controller.js'

const reservationCodeRouter = express.Router();

// submit code from prospect contact
reservationCodeRouter.post('/submit', submitReservationCode);

// submit new partner code
reservationCodeRouter.post('/new-partner', activateNewPartnerCode);


export default reservationCodeRouter;