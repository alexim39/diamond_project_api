import {ParterSMSModel} from '../models/sms.model.js';
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


// save sms detail  
export const saveSMSDetails = async (req, res) => {  
    try {  

        //console.log(req.body)

        // Validate incoming request data  
        const { smsBody, transactionId, partner, prospect, status } = req.body;  

        // Build SMS details object  
        const smsDetails = {  
            smsBody,  
            transactionId,
            partnerId: partner._id,  
            prospectId: prospect ? prospect._id : null, // Set prospectId to null if prospect is not provided  
            status  
        };  

        // Create and save SMS entry  
        const saveSMS = await ParterSMSModel.create(smsDetails);  

        // Return response  
        res.status(200).json(saveSMS);  
    } catch (error) {  
        console.error(error.message);  
        res.status(500).json({  
            message: error.message  
        });  
    }  
}