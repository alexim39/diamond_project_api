import express from 'express';
import { checkPartnerUsername } from '../controllers/partner.controller.js'

const partnerRouter = express.Router();





/* // Get all courses
coursesRouter.get('/', getCourses)
// Get a course
//coursesRouter.get('/:id', getCourse) */

// get a partner
partnerRouter.get('/check-username/:username', checkPartnerUsername);

/* // Post a course
coursesRouter.post('/', postCourse)
// Update a course
coursesRouter.put('/:id', updateCourse)
// Delete a course
coursesRouter.delete('/:id', deleteCourse) */



export default partnerRouter;