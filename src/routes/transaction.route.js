import express from 'express';
import { 
    confirmPayment,
    getTransactions,
    singleSMSCharge,
    bulkSMSCharge
} from '../controllers/transaction.controller.js'

const TransactionRouter = express.Router();

// confirm payment
TransactionRouter.post('/confirm-payment', confirmPayment);

// get transactions
TransactionRouter.get('/transaction/:partnerId', getTransactions);

// single sms charger
TransactionRouter.get('/single-sms-charge/:partnerId', singleSMSCharge);

// bulk sms charger
TransactionRouter.post('/bulk-sms-charge', bulkSMSCharge);

export default TransactionRouter;