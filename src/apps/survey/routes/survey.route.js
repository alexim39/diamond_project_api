import express from 'express';
import { bookingForm} from '../controllers/survey.controller.js'
const SurveyRouter = express.Router();

// User booking
SurveyRouter.post('/submit', bookingForm);


export default SurveyRouter;