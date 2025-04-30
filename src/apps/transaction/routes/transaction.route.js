import express from 'express';
import { bookingForm} from '../controllers/transaction.controller.js'
const TransactionRouter = express.Router();

// User booking
TransactionRouter.post('/submit', bookingForm);


export default TransactionRouter;