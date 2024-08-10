import express from 'express';
import { 
    CreateContactList,
    getContactsCreatedBy,
    importSurveyToProspect,
    getSurveyProspect,
    importSingleFromSurveyToContact,
    deleteSingleFromSurvey
} from '../controllers/prospect.controller.js'

const prospectRouter = express.Router();



// confirm payment
prospectRouter.post('/create', CreateContactList);

// Get all contacts createdBy
prospectRouter.get('/all-createdBy/:createdBy', getContactsCreatedBy);

// Get all surver prospect for
prospectRouter.get('/for/:createdBy', getSurveyProspect);

// import prospect for user
prospectRouter.get('/import/:partnerId', importSurveyToProspect );

// import signle prospect for user
prospectRouter.get('/import-single/:partnerId/:prospectId', importSingleFromSurveyToContact );

// delete signle prospect for user
prospectRouter.get('/delete-single/:prospectId', deleteSingleFromSurvey );

export default prospectRouter;