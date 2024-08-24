import express from 'express';
import { 
    saveTeam,
} from '../controllers/team.controller.js'

const TeamRouter = express.Router();

// create
TeamRouter.post('/create', saveTeam);

// get sms
//TicketRouter.get('/getById/:partnerId', getSMSCreatedBy);


export default TeamRouter;