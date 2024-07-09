import {PartnersModel} from '../models/partner.model.js';
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

 // check if a partner exist
export const checkPartnerUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const returnedObject = await PartnersModel.findOne({ username: username });

        if (returnedObject) {
            res.status(200).json(returnedObject);
        } else {
            res.status(404).json({
                message: "No record found for the provided username."
            });
        }

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        });
    }
}