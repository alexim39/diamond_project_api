import express from 'express';
import { signin, partnerSignout, getPartner, requestPasswordReset} from '../controllers/auth.controller.js'
const AuthRouter = express.Router();


// signup retired — POST /v1/auth/signup is the only signup path (transactional consume + upline link).
// partner login
AuthRouter.post('/signin', signin);
// Get partner
AuthRouter.get('/', getPartner);
// partner logout
AuthRouter.post('/signout', partnerSignout);
// partner reset password request
AuthRouter.post('/reset-password-request', requestPasswordReset );

export default AuthRouter;