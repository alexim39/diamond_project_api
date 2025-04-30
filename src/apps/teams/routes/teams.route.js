import express from 'express';
import { bookingForm} from '../controllers/team.controller.js'
const TeamsRouter = express.Router();

// User booking
TeamsRouter.post('/submit', bookingForm);


export default TeamsRouter;