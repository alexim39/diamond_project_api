import {ContactModel, PreapproachDownloadModel} from '../models/contact.model.js';
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

  
// User contact contnroller
export const ContactController = async (req, res) => {
    try {

        //console.log('sent==',req.body);

        const contactObject = await ContactModel.create({
            name: req.body.name,
            surname: req.body.surname,
            email: req.body.email,
            subject: req.body.subject,
            message: req.body.message,
        });

        // Send email after successfully submitting the records
        const emailSubject = 'Diamond Project Contact Form';
        const emailMessage = `
            <h1>Contact Form</h1>
            <p>Kindly note that ${req.body.name} ${req.body.surname} filled the contact form on Diamond Project webiste.</p>

            <br>
            <h1>Complete Prospect Response</h1>
            <p>Name: ${req.body.name}</p>
            <p>Surname: ${req.body.surname}</p>
            <p>Email address: ${req.body.email}</p>
            <p>Subject: ${req.body.subject}</p>
            <p>Messsage: ${req.body.message}</p>
        `;

        const emailsToSend = ['aleximenwo@gmail.com'];

        for (const email of emailsToSend) {
            await sendEmail(email, emailSubject, emailMessage);
        }

        res.status(200).json(contactObject);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}



// User download contnroller
export const DownloadPreapproachController = async (req, res) => {
    try {

        //console.log('sent==',req.body);

        const downloadObject = await PreapproachDownloadModel.create({
            name: req.body.name,
            surname: req.body.surname,
            email: req.body.email,
            phone: req.body.phone,
        });

        // Send email after successfully submitting the records
        const emailSubject = 'Diamond Project Pre-Approach Download';
        const emailMessage = `
            <h1>Pre-Approach Download Form</h1>
            <p>Kindly note that ${req.body.name} ${req.body.surname} downloaded the pre-approach file on Diamond Project webiste.</p>

            <br>
            <h1>Complete Prospect Response</h1>
            <p>Name: ${req.body.name}</p>
            <p>Surname: ${req.body.surname}</p>
            <p>Email address: ${req.body.email}</p>
            <p>Phone: ${req.body.phone}</p>
        `;

        const emailsToSend = ['aleximenwo@gmail.com'];

        for (const email of emailsToSend) {
            await sendEmail(email, emailSubject, emailMessage);
        }

        res.status(200).json(downloadObject);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}