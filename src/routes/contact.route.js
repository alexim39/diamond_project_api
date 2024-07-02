import express from 'express';
import { ContactController, DownloadPreapproachController } from '../controllers/contact.controller.js'


const contactRouter = express.Router();

// User contact
contactRouter.post('/submit', ContactController);

// Download pre-approach
contactRouter.post('/pre-approach', DownloadPreapproachController);


export default contactRouter;