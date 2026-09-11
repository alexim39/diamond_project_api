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
// Strangler Fig: DDD slices (new) mounted alongside legacy routers
import TicketV1Router from './src/modules/support-ticketing/index.js';
import AuthV1Router, { AdminRouter } from './src/modules/identity-access/index.js';
import NetworkRouter from './src/modules/network/index.js';
import BillingRouter from './src/modules/billing/index.js';
import NotificationsRouter from './src/modules/notifications/index.js';
import GoalsRouter from './src/modules/goals/index.js';
import AnalyticsRouter from './src/modules/analytics/index.js';
import DashboardRouter from './src/modules/dashboard/index.js';
import ReportsRouter from './src/modules/reports/index.js';
import ExportsRouter from './src/modules/exports/index.js';
import MessagingRouter from './src/modules/messaging/index.js';
import ProgressionRouter from './src/modules/progression/index.js';
import TrainingRouter from './src/modules/training/index.js';
import CommunityRouter from './src/modules/community/index.js';
import MarketingRouter from './src/modules/marketing/index.js';
import ProspectV1Router from './src/modules/crm/index.js';
import { errorMiddleware } from './src/shared/http/errorMiddleware.js';
import { ensureIndexes } from './src/shared/mongo/indexes.js';
import { scheduleJobs } from './src/jobs/schedule.js';

const port = process.env.PORT || 8080;
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
/* DDD v1 (new, strangler) — same data, validated boundary */
app.use('/v1/tickets', TicketV1Router);
app.use('/v1/auth', AuthV1Router);
app.use('/v1/prospects', ProspectV1Router);
app.use('/v1/admin', AdminRouter);
app.use('/v1/network', NetworkRouter);
app.use('/v1/billing', BillingRouter);
app.use('/v1/notifications', NotificationsRouter);
app.use('/v1/goals', GoalsRouter);
app.use('/v1/analytics', AnalyticsRouter);
app.use('/v1/dashboard', DashboardRouter);
app.use('/v1/reports', ReportsRouter);
app.use('/v1/exports', ExportsRouter);
app.use('/v1/messages', MessagingRouter);
app.use('/v1/progression', ProgressionRouter);
app.use('/v1/training', TrainingRouter);
app.use('/v1/community', CommunityRouter);
app.use('/v1/marketing', MarketingRouter);



// Convert `import.meta.url` to `__dirname` equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Serve static files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'src', 'uploads')));

/* Central domain-error map for v1 slices (legacy routes keep their own try/catch) */
app.use(errorMiddleware);

/* DB connection */
mongoose.connect(`mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.buvy2cx.mongodb.net/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`)
.then(() => {
    // Application Starts Only when MongoDB is connected
    console.log('Connected to mongoDB')
    ensureIndexes(mongoose).then(
      ({ created, failed }) => {
        console.log(`Indexes ensured: ${created.length} (failed: ${failed.length})`);
        for (const f of failed) console.warn(`Index failed: ${f.index} — ${f.error}`);
      },
      (error) => console.warn('Index ensure skipped:', error?.message ?? error),
    );
    scheduleJobs();
    app.listen(port, () => {
        console.log(`Server is running on port: http://localhost:${port}`)
    })
}).catch((error) => {
    console.error('Error from mongoDB connection ', error)
})