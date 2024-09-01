import {EmailSubscriptionModel} from '../models/email-subscription.model.js';
import nodemailer from 'nodemailer';


// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: 'async.ng',
    secure: true,
    port: 465,
    auth: {
      user: 'alex.i@async.ng', // replace with your email
      pass: process.env.EMAILPASS, // replace with your password
    },
});
  
// Function to send email
const sendEmail = async (email, subject, message) => {
    try {
        await transporter.sendMail({
        //from: 'Do-not-reply@async.ng', // replace with your Gmail email
        from: 'Do-not-reply@diamondprojectonline.com', // replace with your Gmail email
        to: email,
        subject: subject,
        html: message,
        });
        console.log(`Email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending email to ${email}: ${error.message}`);
    }
};

  
// User email subscription
export const emailSubscription = async (req, res) => {
    try {

        //console.log('sent==',req.body);

        const emailSubscription = await EmailSubscriptionModel.create({
            email: req.body.email,
            userDevice: req.body.userDevice,
            username: req.body.username,
        });

        // Send email after successfully submitting the records
        const emailSubject = 'Diamond Project Email Subscription';
        const emailMessage = `
            <h1>Email Subscription</h1>
            <p>Kindly note that someone subscribed to the email subscription form on Diamond Project webiste: ${req.body.email}</p>
        `;

        const emailsToSend = ['aleximenwo@gmail.com'];

        for (const email of emailsToSend) {
            await sendEmail(email, emailSubject, emailMessage);
        }

        res.status(200).json(emailSubscription);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}