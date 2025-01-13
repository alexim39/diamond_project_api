import express from 'express';
import { 
    CreateContactList,  getContactsCreatedBy,  importSurveyToProspect,  getSurveyProspect, importSingleFromSurveyToContact,  deleteSingleFromSurvey,
    getProspectById, updateProspectStatus, updateProspectRemark, deleteSingleFromProspect, UpdateContactList,
} from '../controllers/prospect.controller.js'

const prospectRouter = express.Router();



// create
prospectRouter.post('/create', CreateContactList);

// update
prospectRouter.put('/update', UpdateContactList);

// Get all contacts createdBy
prospectRouter.get('/all-createdBy/:createdBy', getContactsCreatedBy);

// Get all surver prospect for
prospectRouter.get('/for/:createdBy', getSurveyProspect);

// import prospect for user
prospectRouter.get('/import/:partnerId', importSurveyToProspect );

// import signle prospect for user
prospectRouter.get('/import-single/:partnerId/:prospectId', importSingleFromSurveyToContact );

// delete signle prospect for user on survey model
prospectRouter.get('/delete-single/:prospectId', deleteSingleFromSurvey );

// get signle prospect byid
prospectRouter.get('/getById/:prospectId', getProspectById );

// update status
prospectRouter.post('/updateStatus', updateProspectStatus);

// update status
prospectRouter.post('/updateRemark', updateProspectRemark);

// delete signle prospect for user on prospect model
prospectRouter.get('/delete/:prospectId', deleteSingleFromProspect );




export default prospectRouter;