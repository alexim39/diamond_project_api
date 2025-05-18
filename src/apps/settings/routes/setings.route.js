import express from 'express';
import { 
    UpdateNotification,
} from '../controllers/setings.controller.js'
const SettingsRouter = express.Router();

// submit sms
SettingsRouter.put('/notification', UpdateNotification);


export default SettingsRouter;