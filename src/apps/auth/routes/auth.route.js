import express from 'express';
import { signin, partnerSignout, signup, getPartner, requestPasswordReset} from '../controllers/auth.controller.js'
const AuthRouter = express.Router();


// partner login
AuthRouter.post('/signup', signup);
// partner login
AuthRouter.post('/signin', signin);
// Get partner
AuthRouter.get('/', getPartner);
// partner logout
AuthRouter.post('/signout', partnerSignout);
// partner reset password request
AuthRouter.post('/reset-password-request', requestPasswordReset );

export default AuthRouter;