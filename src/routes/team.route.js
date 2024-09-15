import express from 'express';
import { 
    saveTeam, getTeamsCreatedBy, getTeamBy, updateTeamBy, deleteTeamBy
} from '../controllers/team.controller.js'

const TeamRouter = express.Router();

// create
TeamRouter.post('/create', saveTeam);

// get teams
TeamRouter.get('/all-createdBy/:id', getTeamsCreatedBy);

// get team
TeamRouter.get('/:id', getTeamBy);

// delete team
TeamRouter.delete('/:id', deleteTeamBy);

// update team
TeamRouter.put('/', updateTeamBy);


export default TeamRouter;