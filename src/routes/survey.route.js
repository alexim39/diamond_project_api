import express from 'express';
import { 
    ProspectSurveyForm,
    PartnerSurveyForm
} from '../controllers/survey.controller.js'

const userSurveyRouter = express.Router();

// prospet user survey
userSurveyRouter.post('/submit', ProspectSurveyForm);
// partner user survey
userSurveyRouter.post('/partners', PartnerSurveyForm);


export default userSurveyRouter;