import express from 'express';
import { 
    CreateContactList,
} from '../controllers/prospect.controller.js'

const prospectRouter = express.Router();



// confirm payment
prospectRouter.post('/create', CreateContactList);

// get transactions
//TransactionRouter.get('/transaction/:partnerId', getTransactions);

export default prospectRouter;