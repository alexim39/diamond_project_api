import {ParterEmailsModel} from '../models/emails.model.js';
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


 
// send email to prospect
export const SendEmailsToProspect = async (req, res) => {
    try {
  
        //console.log('sent==',req.body);
  
        const saveEmail = await ParterEmailsModel.create({
            emailSubject: req.body.emailSubject,
            emailBody: req.body.emailBody,
            partnerId: req.body.partner._id,
            prospectId: req.body.prospect._id,
           
        });
  
        // Send email after successfully submitting the records
        const emailSubject = req.body.emailSubject;
        const emailMessage = req.body.emailBody;
  
        const emailsToSend = [`${req.body.prospect.prospectEmail}`];
  
        for (const email of emailsToSend) {
            await sendEmail(email, emailSubject, emailMessage);
        }
  
        res.status(200).json(saveEmail);
  
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
  }