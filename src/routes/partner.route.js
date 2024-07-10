import express from 'express';
import { checkPartnerUsername, partnerSignup, partnerSignin, getPartner, partnerSignout } from '../controllers/partner.controller.js'

const partnerRouter = express.Router();


// get a partner
partnerRouter.get('/check-username/:username', checkPartnerUsername);

// partner registration
partnerRouter.post('/signup', partnerSignup);

// partner login
partnerRouter.post('/signin', partnerSignin);

// Get partner
//partnerRouter.get('/user', getPartner);

// partner logout
partnerRouter.post('/signout', partnerSignout);



export default partnerRouter;