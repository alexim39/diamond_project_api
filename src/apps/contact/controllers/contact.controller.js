import {ContactModel, PreapproachDownloadModel} from '../models/contact.model.js';
import { PartnersModel } from '../../partner/models/partner.model.js';
import { sendEmail } from "../../../services/emailService.js";

  
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

        const emailsToSend = [partner.email, 'ago.fnc@gmail.com'];

        for (const email of emailsToSend) {
            await sendEmail(email, emailSubject, emailMessage);
        }

        res.status(200).json({contactObject, message: 'Contact form submitted successfully', success: true});

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            error: error.message,
            message: 'Contact form submission failed',
            success: false
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
            userDevice: req.body.userDevice,
            username: req.body.username,
        });

         // Find the user by username  
         const partner = await PartnersModel.findOne({ username: req.body.username });  
        
         if (!partner) {  
             return res.status(404).json({ 
                message: 'User not found',
                success: false
            });  
         }  

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

        res.status(200).json({downloadObject, message: 'Pre-approach download form submitted successfully', success: true});

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            error: error.message,
            message: 'Pre-approach download form submission failed',
            success: false
        })
    }
}