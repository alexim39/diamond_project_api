import {UserSurvey} from '../models/survey.model.js';
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
        from: 'Do-not-reply@async.ng', // replace with your Gmail email
        to: email,
        subject: subject,
        html: message,
        });
        console.log(`Email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending email to ${email}: ${error.message}`);
    }
};

  
// User survey form
export const surveyForm = async (req, res) => {
    try {

        const userSurvey = await UserSurvey.create({
            doYouFeelNeedForChange: req.body.doYouFeelNeedForChange,
            employedStatus: req.body.employedStatus,
            interestedInEarningAdditionaIcome: req.body.interestedInEarningAdditionaIcome,
            doYouBelieveInTraining: req.body.doYouBelieveInTraining,
            areYouOpenToBeCoached: req.body.areYouOpenToBeCoached,
            ifSessionIsSet: req.body.ifSessionIsSet,
            phoneNumber: req.body.phoneNumber,
            email: req.body.email,
            name: req.body.name,
            surname: req.body.surname,
        });

        // Send email after successfully submitting the records
        const emailSubject = 'Survey Submission Confirmation';
        const emailMessage = `
            <h1>Survey Submission</h1>
            <br>
            <p>A prospect named ${req.body.name} ${req.body.surname} with phone number ${req.body.phoneNumber} just submitted the survey form from www.diamondprojectonline.com.</p>
            <br>
            <h4>You may have to fellow up on user through the Whatsapp link or by phone call.</h4>
        `;

        const emailsToSend = ['aleximenwo@gmail.com', 'adeyemitopesanya@gmail.com'];

        for (const email of emailsToSend) {
            await sendEmail(email, emailSubject, emailMessage);
        }

        res.status(200).json(userSurvey);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}