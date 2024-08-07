import {CampaignModel} from '../models/campaign.js';
import nodemailer from 'nodemailer';
import {PartnersModel,} from '../models/partner.model.js';
import mongoose from 'mongoose';

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

  
// facebook campaign
export const createFacebookCampaign = async (req, res) => {
    try {

        const { body } = req; 

        // Create a new Ad document using the data from the request body
         const newAd = new CampaignModel(body);

        // Save the Ad document to the database
        await newAd.save();

        res.status(201).json({
            message: 'Ad campaign created successfully!',
            data: newAd, // Include the saved Ad data in the response
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}

// youtube campaign
export const createYoutubeCampaign = async (req, res) => {
    try {

        const { body } = req; 

        //console.log(body); return;

        // Create a new Ad document using the data from the request body
         const newAd = new CampaignModel(body);

        // Save the Ad document to the database
        await newAd.save();

        res.status(201).json({
            message: 'Ad campaign created successfully!',
            data: newAd, // Include the saved Ad data in the response
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}

// linkedin campaign
export const createLinkedinCampaign = async (req, res) => {
    try {

        const { body } = req; 

        //console.log(body); return;

        // Create a new Ad document using the data from the request body
         const newAd = new CampaignModel(body);

        // Save the Ad document to the database
        await newAd.save();

        res.status(201).json({
            message: 'Ad campaign created successfully!',
            data: newAd, // Include the saved Ad data in the response
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}

// Route handler to fetch all Ads by createdBy
export const getCampaignsCreatedBy = async (req, res) => {
    try {
      const { createdBy } = req.params; // Assuming createdBy is passed as a query parameter
  
      // Find Ads where createdBy matches the provided ID
      const ads = await CampaignModel.find({ createdBy });
  
      res.status(200).json({
        message: 'Ads retrieved successfully!',
        data: ads,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        message: 'Error retrieving Ads',
        error: error.message,
      });
    }
};



// Record visits
export const recordVisits = async (req, res) => {
  try {
    const { username, channel } = req.body;

    if (!username || !channel) {
      return res.status(400).json({ message: 'Username and channel are required' });
    }

    // Step 1: Find the partner's ObjectId by username
    const partner = await PartnersModel.findOne({ username: username });
    if (!partner) {
      return res.status(401).json({ message: 'No partner found' });
    }

    // Step 2: Check if the channel is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(channel)) {
      // If channel is not a valid ObjectId, increment visits in the PartnersModel
      partner.visits = (partner.visits || 0) + 1;
      await partner.save();
      return res.status(200).json({
        message: 'Partner visit updated due to invalid channel',
        data: partner,
      });
    }

    // Step 3: Check if the channel exists in the CampaignModel
    const campaign = await CampaignModel.findOne({ _id: channel, createdBy: partner._id });

    if (campaign) {
      // If campaign exists, increment visits in the CampaignModel
      campaign.visits = (campaign.visits || 0) + 1;
      await campaign.save();
      return res.status(200).json({
        message: 'Campaign visit updated',
        data: campaign,
      });
    } else {
      // If campaign does not exist, increment visits in the PartnersModel
      partner.visits = (partner.visits || 0) + 1;
      await partner.save();
      return res.status(200).json({
        message: 'Partner visit updated',
        data: partner,
      });
    }

  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: error.message
    });
  }
}
