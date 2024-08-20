import {ParterEmailsModel} from '../models/emails.model.js';
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


 
// send email to prospect
export const SendSingleEmailsToProspect = async (req, res) => {
    try {
  
        //console.log('sent==',req.body);
  
        const saveEmail = await ParterEmailsModel.create({
            emailSubject: req.body.emailSubject,
            emailBody: req.body.emailBody,
            partnerId: req.body.partner._id,
            prospects: req.body.prospect.prospectEmail,
           
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

// send bulck email to prospectgetEmailsCreatedBy
export const SendBulkEmailsToProspect = async (req, res) => {

    // Function to format email data into a string array
    function formatEmailData(emailData) {
        // Handle different input formats (string or array)
        if (typeof emailData === 'string') {
        return emailData.split(',').map(email => email.trim());
        } else if (Array.isArray(emailData)) {
        return emailData.map(email => email.trim());
        } else {
        throw new Error('Invalid email data format');
        }
    }

    try {
  
       const {emailSubject, prospects, emailBody, partnerId } = req.body;

        // Step 1: Find the user
        const partner = await PartnersModel.findById(partnerId);
        if (!partner) {
        return res.status(404).json({ message: 'User not found' });
        }

        // formated emails
        const formattedEmails = formatEmailData(prospects);

        for (const email of formattedEmails) {
            await sendEmail(email, emailSubject, emailBody);
        }

        
        const saveEmail = await ParterEmailsModel.create({
            emailSubject,
            emailBody,
            partnerId,
            prospects: formattedEmails
        });

        res.status(200).json({
            message: 'Prospects retrieved successfully!',
            data: saveEmail,
        });
    

  
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}


// get bulck email by partner
export const getEmailsCreatedBy = async (req, res) => {
    try {  
        const { partnerId } = req.params;  
  
        // Step 1: Find the partner and get partner details  
        const partner = await PartnersModel.findById(partnerId);  
        if (!partner) {  
            return res.status(404).json({ message: 'User not found' });  
        }  
      
        // Step 2: Find email objects for the partner  
        const emailObject = await ParterEmailsModel.find({  
            partnerId: partner._id  
        });  
  
        if (!emailObject || emailObject.length === 0) {  
            return res.status(400).json({ message: 'SMS not found' });  
        } 

        res.status(200).json({  
            message: 'Emails retrieved successfully!',  
            data: emailObject  
        });

    } catch (error) {  
        console.error(error.message);  
        res.status(500).json({  
            message: 'Error retrieving SMS and transactions',  
            error: error.message,  
        });  
    }  
}