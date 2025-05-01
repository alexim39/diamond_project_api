import express from 'express';
import { 
    ProspectSurveyForm,
    PartnerSurveyForm
} from '../controllers/survey.controller.js'
const SurveyRouter = express.Router();

// prospet user survey
SurveyRouter.post('/submit', ProspectSurveyForm);
// partner user survey
SurveyRouter.post('/partners', PartnerSurveyForm);


export default SurveyRouter;