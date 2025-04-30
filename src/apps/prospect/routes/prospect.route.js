import express from 'express';
import { bookingForm} from '../controllers/prospect.controller.js'
const ProspectRouter = express.Router();

// User booking
ProspectRouter.post('/submit', bookingForm);


export default ProspectRouter;