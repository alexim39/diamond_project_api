import express from 'express';
import { 
    saveTeam, getTeamsCreatedBy, getTeamBy, updateTeamBy, deleteTeamBy, addTeamMember, deleteTeamMember, getTeamsByCreatorOrPartner
} from '../controllers/team.controller.js'
const TeamsRouter = express.Router();

// create
TeamsRouter.post('/create', saveTeam);
// get teams created by partner
TeamsRouter.get('/all-createdBy/:partnerId', getTeamsCreatedBy);
// get teams created by partner or a member of the team
TeamsRouter.get('/all-createdByOrMember/:partnerId', getTeamsByCreatorOrPartner);
// get team
TeamsRouter.get('/:id', getTeamBy);
// delete team
TeamsRouter.delete('/:id', deleteTeamBy);
// update team
TeamsRouter.put('/', updateTeamBy);
// add member
TeamsRouter.post('/add-member', addTeamMember);
// delete team member
TeamsRouter.delete('/remove-member/:teamId/:memberId', deleteTeamMember);


export default TeamsRouter;