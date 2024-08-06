import express from 'express';
import { 
    confirmPayment,
    getTransactions
} from '../controllers/transaction.controller.js'

const TransactionRouter = express.Router();



// confirm payment
TransactionRouter.post('/confirm-payment', confirmPayment);

// get transactions
TransactionRouter.get('/transaction/:partnerId', getTransactions);

export default TransactionRouter;