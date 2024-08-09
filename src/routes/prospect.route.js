import express from 'express';
import { 
    CreateContactList,
    getContactsCreatedBy
} from '../controllers/prospect.controller.js'

const prospectRouter = express.Router();



// confirm payment
prospectRouter.post('/create', CreateContactList);

// Get all contacts createdBy
prospectRouter.get('/all-createdBy/:createdBy', getContactsCreatedBy);

export default prospectRouter;