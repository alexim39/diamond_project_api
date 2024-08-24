import express from 'express';
import mongoose from 'mongoose';
import dotenv  from "dotenv"
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import userSurveyRouter from './src/routes/survey.route.js';
import userBoookingRouter from './src/routes/booking.route.js';
import emailSubscriptionRouter from './src/routes/email-subscription.route.js';
import contactRouter from './src/routes/contact.route.js';
import partnerRouter from './src/routes/partner.route.js';
import campaignRouter from './src/routes/campaign.js';
import productsRouter from './src/routes/product.route.js';
import TransactionRouter from './src/routes/transaction.route.js';
import prospectRouter from './src/routes/prospect.route.js';
import reservationCodeRouter from './src/routes/reservation-code.route.js';
import PartnerEmailsRouter from './src/routes/emails.route.js';
import PartnerSMSRouter from './src/routes/sms.route.js';
import ProfilePictureRouter from './src/routes/upload-profile-picture.js';
import TicketRouter from './src/routes/ticket.route.js';
import TeamRouter from './src/routes/team.route.js';


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
        'http://diamondprojectonline.com', 
        'https://diamondprojectonline.com', 
        'www.diamondprojectonline.com',
    ]
}));



/* Routes */
app.get('/', (req, res) => res.send('Node server is up and running'));
app.use('/survey', userSurveyRouter);
app.use('/booking', userBoookingRouter);
app.use('/emailSubscription', emailSubscriptionRouter);
app.use('/contact', contactRouter);
app.use('/partners', partnerRouter);
app.use('/campaign', campaignRouter);
app.use('/products', productsRouter);
app.use('/billing', TransactionRouter);
app.use('/prospect', prospectRouter);
app.use('/emails', PartnerEmailsRouter);
app.use('/reservationCode', reservationCodeRouter);
app.use('/sms', PartnerSMSRouter);
app.use('/upload-profile-picture', ProfilePictureRouter);
app.use('/ticket', TicketRouter);
app.use('/team', TeamRouter);

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