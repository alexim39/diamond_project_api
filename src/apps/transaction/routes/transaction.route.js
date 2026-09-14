import express from 'express';
import { requireAuth } from '../../../shared/http/requireAuth.js';
import { requireRole } from '../../../modules/identity-access/interface/RequireRole.js';
import { 
    confirmPayment,
    getTransactions,
    singleSMSCharge,
    bulkSMSCharge, withdrawRequest,
    listWithdrawals, decideWithdrawal
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
// Admin queue (role-gated) — must precede nothing conflicting; kept together.
TransactionRouter.get('/withdrawals', requireAuth, requireRole('admin'), listWithdrawals);
TransactionRouter.patch('/withdrawals/:id', requireAuth, requireRole('admin'), decideWithdrawal);


export default TransactionRouter;