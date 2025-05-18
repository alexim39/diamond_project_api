import express from 'express';
import mongoose from 'mongoose';
import dotenv  from "dotenv"
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import AuthRouter from './src/apps/auth/index.js';
import PartnerRouter from './src/apps/partner/index.js';
import BookingRouter from './src/apps/booking/index.js';
import CampaignRouter from './src/apps/campaign/index.js';
import ContactRouter from './src/apps/contact/index.js';
import TransactionRouter from './src/apps/transaction/index.js';
import ProspectRouter from './src/apps/prospect/index.js';
import ProductRouter from './src/apps/product/index.js';
import SurveyRouter from './src/apps/survey/index.js';
import EmailSubscriptionRouter from './src/apps/email-subscription/index.js';
import ReservationCodeRouter from './src/apps/reservation-code/index.js';
import EmailRouter from './src/apps/email/index.js';
import SmsRouter from './src/apps/sms/index.js';
import ProfileImageRouter from './src/services/upload-profile-picture.js';
import TicketRouter from './src/apps/ticket/index.js';
import TeamsRouter from './src/apps/teams/index.js';
import SettingsRouter from './src/apps/settings/index.js';
// Import the birthday notification service
import './src/apps/partner/services/dob.notification.js';

const port = process.env.PORT || 3000;
const app = express();
app.use(express.json()); // Use json middleware
app.use(express.urlencoded({extended: false})); // Use formdata middleware
dotenv.config()
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: [
        'http://localhost:4200', 
        'http://localhost:4201', 
        'http://diamondprojectonline.com', 
        'http://partners.diamondprojectonline.com', 
        'https://diamondprojectonline.com', 
        'https://partners.diamondprojectonline.com', 
        'https://survey.diamondprojectonline.com',
        'https://shop.diamondprojectonline.com',
        'www.diamondprojectonline.com',
        'www.partners.diamondprojectonline.com',
        'https://partners.diamondprojectonline.com',
        'http://survey.diamondprojectonline.com',
        'http://shop.diamondprojectonline.com'
    ]
}));

/* Routes */
app.get('/', (req, res) => res.send('Node server is up and running'));
app.use('/auth', AuthRouter);
app.use('/partners', PartnerRouter);
app.use('/booking', BookingRouter);
app.use('/campaign', CampaignRouter);
app.use('/contact', ContactRouter);
app.use('/billing', TransactionRouter);
app.use('/prospect', ProspectRouter);
app.use('/products', ProductRouter);
app.use('/survey', SurveyRouter);
app.use('/emailSubscription', EmailSubscriptionRouter);
app.use('/reservationCode', ReservationCodeRouter);
app.use('/emails', EmailRouter);
app.use('/sms', SmsRouter);
app.use('/image', ProfileImageRouter);
app.use('/ticket', TicketRouter);
app.use('/team', TeamsRouter);
app.use('/settings', SettingsRouter);



// Convert `import.meta.url` to `__dirname` equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Serve static files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'src', 'uploads')));

/* DB connection */
mongoose.connect(`mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.buvy2cx.mongodb.net/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`)
.then(() => {
    // Application Starts Only when MongoDB is connected
    console.log('Connected to mongoDB')
    app.listen(port, () => {
        console.log(`Server is running on port: http://localhost:${port}`)
    })
}).catch((error) => {
    console.error('Error from mongoDB connection ', error)
})