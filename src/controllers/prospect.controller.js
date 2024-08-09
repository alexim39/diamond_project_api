import nodemailer from 'nodemailer';
import {ProspectModel} from '../models/prospect.model.js';
import {SurveyModel} from '../models/survey.model.js';
import {PartnersModel,} from '../models/partner.model.js';


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

  
// Prospect contact contnroller
export const CreateContactList = async (req, res) => {
    try {
        const { body } = req; 

        // Create a new document using the data from the request body
         const newProspect = new ProspectModel(body);

        // Save the document to the database
        await newProspect.save();

        res.status(201).json({
            message: 'Prospect created successfully!',
            data: newProspect, // Include the saved data in the response
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}

// Route handler to fetch all contacts by createdBy
export const getContactsCreatedBy = async (req, res) => {
    try {
      const { createdBy } = req.params;

    // Step 1: Find the user and get username
    const partner = await PartnersModel.findById(createdBy);
    if (!partner) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    
    // Step 2: user found username to get user from survey collection
    const prospectObject = await ProspectModel.find({
        partnerId: partner._id
    })

    if (!prospectObject) {
        return res.status(400).json({ message: 'Prospects not found' });
    }
  
      res.status(200).json({
        message: 'Prospects retrieved successfully!',
        data: prospectObject,
      });

    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        message: 'Error retrieving Ads',
        error: error.message,
      });
    }
};

/* // Route handler to fetch all contacts by createdBy
export const getContactsCreatedBy = async (req, res) => {
    try {
      const { createdBy } = req.params;

    // Step 1: Find the user and get username
    const partner = await PartnersModel.findById(createdBy);
    if (!partner) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    
    // Step 2: user found username to get user from survey collection
    const prospectObject = await SurveyModel.find({
        username: partner.username
    })

    if (!prospectObject) {
        return res.status(400).json({ message: 'Prospects not found' });
    }
  
      res.status(200).json({
        message: 'Prospects retrieved successfully!',
        data: prospectObject,
      });

    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        message: 'Error retrieving Ads',
        error: error.message,
      });
    }
}; */

