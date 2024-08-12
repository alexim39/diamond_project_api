import express from 'express';
import { 
    confirmPayment,
    getTransactions,
    chargePartner
} from '../controllers/transaction.controller.js'

const TransactionRouter = express.Router();



// confirm payment
TransactionRouter.post('/confirm-payment', confirmPayment);

// get transactions
TransactionRouter.get('/transaction/:partnerId', getTransactions);

// single sms charger
TransactionRouter.get('/single-sms-charge/:partnerId', chargePartner);

export default TransactionRouter;