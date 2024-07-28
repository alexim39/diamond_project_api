import express from 'express';
import { checkPartnerUsername, partnerSignup, partnerSignin, getPartner, partnerSignout, updateProfile, updateUsername, changePassword } from '../controllers/partner.controller.js'

const partnerRouter = express.Router();


// get a partner
partnerRouter.get('/check-username/:username', checkPartnerUsername);

// partner registration
partnerRouter.post('/signup', partnerSignup);

// partner login
partnerRouter.post('/signin', partnerSignin);

// Get partner
partnerRouter.get('/partner', getPartner);

// partner logout
partnerRouter.post('/signout', partnerSignout);

// Update partner
partnerRouter.put('/update-profile', updateProfile);

// Update username
partnerRouter.put('/update-username', updateUsername)

// Change password
partnerRouter.put('/change-password', changePassword)

export default partnerRouter;