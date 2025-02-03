import express from 'express';
import { 
    saveTeam, getTeamsCreatedBy, getTeamBy, updateTeamBy, deleteTeamBy, addTeamMember, deleteTeamMember, getTeamsByCreatorOrPartner
} from '../controllers/team.controller.js'

const TeamRouter = express.Router();

// create
TeamRouter.post('/create', saveTeam);

// get teams created by partner
TeamRouter.get('/all-createdBy/:partnerId', getTeamsCreatedBy);

// get teams created by partner or a member of the team
TeamRouter.get('/all-createdByOrMember/:partnerId', getTeamsByCreatorOrPartner);

// get team
TeamRouter.get('/:id', getTeamBy);

// delete team
TeamRouter.delete('/:id', deleteTeamBy);

// update team
TeamRouter.put('/', updateTeamBy);

// add member
TeamRouter.post('/add-member', addTeamMember);

// delete team member
TeamRouter.delete('/remove-member/:teamId/:memberId', deleteTeamMember);

export default TeamRouter;