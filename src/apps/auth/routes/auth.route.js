import express from 'express';
import { partnerSignin, partnerSignout, partnerSignup, getPartner, requestPasswordReset} from '../controllers/auth.controller.js'
const AuthRouter = express.Router();


// partner login
AuthRouter.post('/signup', partnerSignup);
// partner login
AuthRouter.post('/signin', partnerSignin);
// Get partner
AuthRouter.get('/', getPartner);
// partner logout
AuthRouter.post('/signout', partnerSignout);
// partner reset password request
AuthRouter.post('/reset-password-request', requestPasswordReset );

export default AuthRouter;