import express from 'express';
import { 
    UpdateNotification, getNotifications
} from '../controllers/setings.controller.js'
const SettingsRouter = express.Router();

// submit sms
SettingsRouter.put('/notification', UpdateNotification);

// get partner notifications by id
SettingsRouter.get('/notification/getById/:partnerId', getNotifications);


export default SettingsRouter;