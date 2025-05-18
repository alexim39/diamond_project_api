import express from 'express';
import { 
    CreateContactList,  getContactsCreatedBy,  importSurveyToContact,  getAllSurveyProspect, getAllMySurveyProspect, importSingleFromSurveyToContact,
    getProspectById, UpdateProspectStatus, deleteSingleFromProspect, UpdateContactList, getSurveyProspectFor, moveSingleProspectBackToSurvey
} from '../controllers/prospect.controller.js'
import { UpdateProspectCommunications, DeleteProspectCommunication} from '../controllers/communictions.controller.js'
const ProspectRouter = express.Router();

// create
ProspectRouter.post('/create', CreateContactList);
// update
ProspectRouter.put('/update', UpdateContactList);
// Get all contacts createdBy
ProspectRouter.get('/all-createdBy/:createdBy', getContactsCreatedBy);
// Get all surver prospect for
ProspectRouter.get('/for/:createdBy', getSurveyProspectFor);
// Get all surver prospect gotton by the system (Username = business)
ProspectRouter.get('/all', getAllSurveyProspect);
// Get all surver prospect gotton by the system (Username !== business)
ProspectRouter.get('/my/:username', getAllMySurveyProspect);
// import prospect for user
ProspectRouter.get('/import/:partnerId', importSurveyToContact );
// import signle prospect for user
ProspectRouter.get('/import-single/:partnerId/:prospectId', importSingleFromSurveyToContact );
// delete signle prospect for user on survey model
//ProspectRouter.get('/delete-single/:prospectId', deleteSingleFromSurvey );
// get signle prospect byid
ProspectRouter.get('/getById/:prospectId', getProspectById );
// update status
ProspectRouter.post('/updateStatus', UpdateProspectStatus);
// delete signle prospect for user on prospect model
ProspectRouter.get('/delete/:prospectId', deleteSingleFromProspect );
// update prospect communications
ProspectRouter.post('/communications', UpdateProspectCommunications);
// delete communication entry from array
ProspectRouter.delete('/communications/:prospectId/:communicationId', DeleteProspectCommunication );
// Move prospect back to survey list
ProspectRouter.get('/move-back-to-survey/:prospectId', moveSingleProspectBackToSurvey );


export default ProspectRouter;