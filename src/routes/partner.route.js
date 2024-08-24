import express from 'express';
import { 
    checkPartnerUsername, getAllUsers, getPartnerByName,
    partnerSignup, 
    partnerSignin, 
    getPartner, 
    partnerSignout, 
    updateProfile, 
    updateUsername, unfollowPartner, checkFollowStatus,
    changePassword, updateProfession, followPartner
} from '../controllers/partner.controller.js'

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

// Update partner
partnerRouter.put('/update-profession', updateProfession);

// Update username
partnerRouter.put('/update-username', updateUsername)

// Change password
partnerRouter.put('/change-password', changePassword)

// get all partners
partnerRouter.get('/getAllUsers', getAllUsers)

// get all partners
partnerRouter.get('/getPartnerByName/:name/:surname', getPartnerByName)

// follow
partnerRouter.post('/follow/:searchPartnerId', followPartner);

// unfollow
partnerRouter.post('/unfollow/:searchPartnerId', unfollowPartner);

// check follow
partnerRouter.get('/check-follow-status/:partnerId/:searchPartnerId', checkFollowStatus);

export default partnerRouter;