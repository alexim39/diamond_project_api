import express from 'express';
import { 
    confirmPayment,
    getTransactions,
    singleSMSCharge,
    bulkSMSCharge, withdrawRequest
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

// confirm payment
TransactionRouter.post('/withdraw-request', withdrawRequest);

export default TransactionRouter;