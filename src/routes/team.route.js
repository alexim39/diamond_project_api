import express from 'express';
import { 
    saveTeam, getTeamsCreatedBy
} from '../controllers/team.controller.js'

const TeamRouter = express.Router();

// create
TeamRouter.post('/create', saveTeam);

// get teams
TeamRouter.get('/all-createdBy/:id', getTeamsCreatedBy);


export default TeamRouter;