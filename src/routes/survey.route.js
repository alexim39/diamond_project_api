import express from 'express';
import { 
    surveyForm
} from '../controllers/survey.controller.js'

const userSurveyRouter = express.Router();

// User survey
userSurveyRouter.post('/submit', surveyForm);


export default userSurveyRouter;