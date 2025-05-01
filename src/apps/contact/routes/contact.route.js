import express from 'express';
import { ContactController, DownloadPreapproachController } from '../controllers/contact.controller.js'
const ContactRouter = express.Router();

// User contact
ContactRouter.post('/submit', ContactController);
// Download pre-approach
ContactRouter.post('/pre-approach', DownloadPreapproachController);


export default ContactRouter;