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
            referralCode: req.body.referralCode,
            referral: req.body.referral,
        });

        // Send email after successfully submitting the records
        const emailSubject = 'Survey Submission Confirmation';
        const emailMessage = `
            <h1>Survey Submission</h1>
            <p>A prospect named ${req.body.name} ${req.body.surname} with phone number ${req.body.phoneNumber} just submitted the survey form from www.diamondprojectonline.com.</p>
            <p>You may have to fellow up on user through the Whatsapp link or by phone call.</p>

            <br>
            <h1>Complete Prospect Response</h1>
            <p>Name: ${req.body.name}</p>
            <p>Surname: ${req.body.surname}</p>
            <p>Email address: ${req.body.email}</p>
            <p>Phone number: ${req.body.phoneNumber}</p>
            <p>Do you feel like you could be doing more: ${req.body.readoYouFeelNeedForChangeson}</p>
            <p>What's your work situation: ${req.body.employedStatus}</p>
            <p>Referred by: ${req.body.referralCode}</p>
            <p>Referred through: ${req.body.referral}</p>
            <p>Looking to make some extra cash?: ${req.body.interestedInEarningAdditionaIcome} </p>
            <p>Can more skills help you reach your goals?: ${req.body.doYouBelieveInTraining}</p>
            <p>Are you open to being coached?: ${req.body.areYouOpenToBeCoached}</p>
            <p>Would you be interested in a session to unlock your potential: ${req.body.ifSessionIsSet}</p>
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