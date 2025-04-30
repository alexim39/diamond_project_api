import express from 'express';
import { 
    checkPartnerUsername, getAllUsers,
     getPartnerByNames, getPartnerByName,
    tiktokPage, twitterPage, updateTestimonial,
    updateYoutubePage, updateInstagramPage,
    updateFacebookPage, updateLinkedinPage,
    updateProfile, updateWhatsappGroupLink, updateWhatsappChatLink,
    updateUsername, unfollowPartner, checkFollowStatus,
    changePassword, updateProfession, followPartner, getPartnersOf, getPartnerById
} from '../controllers/partner.controller.js'
const PartnerRouter = express.Router();



// get a partner
PartnerRouter.get('/check-username/:username', checkPartnerUsername);

// Update partner
PartnerRouter.put('/update-profile', updateProfile);

// Update partner
PartnerRouter.put('/update-profession', updateProfession);

// Update username
PartnerRouter.put('/update-username', updateUsername)

// Change password
PartnerRouter.put('/change-password', changePassword)

// get all partners
PartnerRouter.get('/getAllUsers', getAllUsers)

// get all partners
PartnerRouter.get('/getPartnerByNames/:name/:surname', getPartnerByNames)

// get all partners
PartnerRouter.get('/getPartnerByName/:name', getPartnerByName)

// follow
PartnerRouter.post('/follow/:searchPartnerId', followPartner);

// unfollow
PartnerRouter.post('/unfollow/:searchPartnerId', unfollowPartner);

// check follow
PartnerRouter.get('/check-follow-status/:partnerId/:searchPartnerId', checkFollowStatus);

// Update partner social media pages
PartnerRouter.put('/whatsappgrouplink', updateWhatsappGroupLink);
PartnerRouter.put('/whatsappchatlink', updateWhatsappChatLink);
PartnerRouter.put('/facebookPage', updateFacebookPage);
PartnerRouter.put('/linkedinPage', updateLinkedinPage);
PartnerRouter.put('/youtubePage', updateYoutubePage);
PartnerRouter.put('/instagramPage', updateInstagramPage);
PartnerRouter.put('/tiktokPage', tiktokPage);
PartnerRouter.put('/twitterPage', twitterPage);
// update testimonial
PartnerRouter.put('/testimonial', updateTestimonial);

// get all partnersOf
PartnerRouter.get('/getPartnersOf/:partnerId', getPartnersOf);

// get partner by id
PartnerRouter.get('/getById/:partnerId', getPartnerById);





export default PartnerRouter;