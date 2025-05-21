import express from 'express';
import { 
    UpdateNotification, GetNotifications, MarkAsReadNotifications
} from '../controllers/setings.controller.js'
const SettingsRouter = express.Router();

// submit sms
SettingsRouter.put('/notification', UpdateNotification);

// get partner notifications by id
SettingsRouter.get('/notification/getById/:partnerId', GetNotifications);

// Delete partner notification by id
SettingsRouter.get('/notification/delete/:prospectId/:notificationId', MarkAsReadNotifications);


export default SettingsRouter;