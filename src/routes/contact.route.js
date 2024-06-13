import express from 'express';
import { 
    ContactController
} from '../controllers/contact.controller.js'

const contactRouter = express.Router();

// User contact
contactRouter.post('/submit', ContactController);


export default contactRouter;