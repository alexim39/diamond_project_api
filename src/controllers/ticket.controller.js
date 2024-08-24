import {TicketModel} from '../models/ticket.model.js';
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

// Save ticket details  
export const saveTicket = async (req, res) => {  
    try {  
        const ticketData = req.body; // Get the ticket data from the request body  
        const newTicket = new TicketModel(ticketData); // Create a new ticket instance  
        await newTicket.save(); // Save the ticket to the database  



        // Send email after successfully submitting the records
        const emailSubject = 'Diamond Project Ticket Submission';
        const emailMessage = `
            <h1>Ticket Submission</h1>
            <p>Kindly note that someone submitted a ticket.</p>
             <br>
            <h1>Complete Ticet Details</h1>
            <p>Subject: ${req.body.subject}</p>
            <p>Description: ${req.body.description}</p>
            <p>Date of submission: ${req.body.date}</p>
            <p>Category: ${req.body.category}</p>
            <p>Priority: ${req.body.priority}</p>
            <p>Comment: ${req.body.comment}</p>
        `;

        const emailsToSend = ['aleximenwo@gmail.com'];

        for (const email of emailsToSend) {
            await sendEmail(email, emailSubject, emailMessage);
        }

        res.status(201).json({ message: 'Ticket submitted successfully!', ticket: newTicket });  
    } catch (error) {  
        console.error('Error submitting ticket:', error);  
        res.status(500).json({ message: 'There was an error submitting your ticket.', error });  
    }  
};
