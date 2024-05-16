import {UserBooking} from '../models/booking.model.js';
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
export const bookingForm = async (req, res) => {
    try {

        //console.log('sent==',req.body);

        const userBooking = await UserBooking.create({
            reason: req.body.reason,
            description: req.body.description,
            referralCode: req.body.referralCode,
            consultDate: req.body.consultDate,
            consultTime: req.body.consultTime,
            contactMethod: req.body.contactMethod,
            referral: req.body.referral,
            phone: req.body.phone,
            email: req.body.email,
            name: req.body.name,
            surname: req.body.surname,
        });

        // Send email after successfully submitting the records
        const emailSubject = 'One-on-One Booking Submission';
        const emailMessage = `
            <h1>Booking Submission</h1>
            <p>A prospect named ${req.body.name} ${req.body.surname} with phone number ${req.body.phone} just booked for a one-on-one session on www.diamondprojectonline.com.</p>
            <p>You may have to book the date which is ${req.body.consultDate} by ${req.body.consultTime} for fellow up on prospect through ${req.body.contactMethod}.</p>

            <br>
            <h1>Complete Prospect Response</h1>
            <p>Name: ${req.body.name}</p>
            <p>Surname: ${req.body.surname}</p>
            <p>Email address: ${req.body.email}</p>
            <p>Phone number: ${req.body.phone}</p>
            <p>Reason of booking: ${req.body.reason}</p>
            <p>Description/Comment: ${req.body.description}</p>
            <p>Referred by: ${req.body.referralCode}</p>
            <p>Referred through: ${req.body.referral}</p>
            <p>consultation Date: ${req.body.consultDate} </p>
            <p>consultation Time: ${req.body.consultTime}</p>
            <p>Contact Method: ${req.body.contactMethod}</p>
        `;

        const emailsToSend = ['aleximenwo@gmail.com', 'adeyemitopesanya@gmail.com'];

        for (const email of emailsToSend) {
            await sendEmail(email, emailSubject, emailMessage);
        }

        res.status(200).json(userBooking);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}