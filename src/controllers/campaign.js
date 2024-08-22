import {CampaignModel} from '../models/campaign.js';
import nodemailer from 'nodemailer';
import {PartnersModel,} from '../models/partner.model.js';
import mongoose from 'mongoose';
import {TransactionModel} from '../models/transaction.model.js';

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

// facebook campaign/ads
export const createFacebookCampaign = async (req, res) => {
  const MIN_CHARGE = 6500; // Define the Facebook minimum charge amount  

  try {
    const { body } = req;

    // Find the partner by ID  
    const partner = await PartnersModel.findById(body.createdBy);
    if (!partner) {
      return res.status(400).json({
        message: 'Partner not found',
        data: null,
      });
    }

    // Check if the partner entered sufficient amount  
    if (body.budget.budgetAmount < MIN_CHARGE) {
      return res.status(402).json({
        message: 'Insufficient amount for transaction',
        data: null,
      });
    }

    // Check if the partner has sufficient balance for the budget amount
    if (partner.balance >= body.budget.budgetAmount) {
      // Deduct the budget amount from the partner's balance  
      partner.balance -= body.budget.budgetAmount;

      // Save the updated partner balance  
      await partner.save();

      // Record the transaction  
      const transaction = new TransactionModel({
        partnerId: partner._id,
        amount: body.budget.budgetAmount,  // Use the budget amount as the charge
        status: 'Completed',
        paymentMethod: 'Facebook Ads',
        transactionType: 'Debit',
        reference: Math.floor(100000000 + Math.random() * 900000000).toString() // Generate a random 9-digit number as a string
      });

      await transaction.save();

      // Create a new Ad document using the data from the request body
      const newAd = new CampaignModel(body);

      // Save the Ad document to the database
      await newAd.save();

      res.status(201).json({
        message: 'Ad campaign created successfully!',
        data: newAd,
        transaction: transaction
      });

    } else {
      return res.status(401).json({
        message: 'Insufficient balance for transaction',
        data: null,
      });
    }

  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: error.message
    });
  }
}


// youtube campaign
export const createYoutubeCampaign = async (req, res) => {
  const MIN_CHARGE = 18000; // Define the Youtube minimum charge amount  

    try {

      const { body } = req; 

      // Find the partner by ID  
      const partner = await PartnersModel.findById(body.createdBy);
      if (!partner) {
        return res.status(400).json({
          message: 'Partner not found',
          data: null,
        });
      }

      // Check if the partner entered sufficient amount  
      if (body.budget.budgetAmount < MIN_CHARGE) {
        return res.status(402).json({
          message: 'Insufficient amount for transaction',
          data: null,
        });
      }

      // Check if the partner has sufficient balance for the budget amount
      if (partner.balance >= body.budget.budgetAmount) {
        // Deduct the budget amount from the partner's balance  
        partner.balance -= body.budget.budgetAmount;

        // Save the updated partner balance  
        await partner.save();

        // Record the transaction  
        const transaction = new TransactionModel({
          partnerId: partner._id,
          amount: body.budget.budgetAmount,  // Use the budget amount as the charge
          status: 'Completed',
          paymentMethod: 'Youtube Ads',
          transactionType: 'Debit',
          reference: Math.floor(100000000 + Math.random() * 900000000).toString() // Generate a random 9-digit number as a string
        });

        await transaction.save();

        // Create a new Ad document using the data from the request body
         const newAd = new CampaignModel(body);

        // Save the Ad document to the database
        await newAd.save();

        res.status(201).json({
            message: 'Ad campaign created successfully!',
            data: newAd, // Include the saved Ad data in the response
            transaction: transaction
        });

      } else {
        return res.status(401).json({
          message: 'Insufficient balance for transaction',
          data: null,
        });
      }

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}

// linkedin campaign
export const createLinkedinCampaign = async (req, res) => {
  const MIN_CHARGE = 10500; // Define the LinkedIn minimum charge amount  

    try {

      const { body } = req; 

        // Find the partner by ID  
      const partner = await PartnersModel.findById(body.createdBy);
      if (!partner) {
        return res.status(400).json({
          message: 'Partner not found',
          data: null,
        });
      }

      // Check if the partner entered sufficient amount  
      if (body.budget.budgetAmount < MIN_CHARGE) {
        return res.status(402).json({
          message: 'Insufficient amount for transaction',
          data: null,
        });
      }

      // Check if the partner has sufficient balance for the budget amount
      if (partner.balance >= body.budget.budgetAmount) {
      // Deduct the budget amount from the partner's balance  
      partner.balance -= body.budget.budgetAmount;

      // Save the updated partner balance  
      await partner.save();

      // Record the transaction  
      const transaction = new TransactionModel({
        partnerId: partner._id,
        amount: body.budget.budgetAmount,  // Use the budget amount as the charge
        status: 'Completed',
        paymentMethod: 'Youtube Ads',
        transactionType: 'Debit',
        reference: Math.floor(100000000 + Math.random() * 900000000).toString() // Generate a random 9-digit number as a string
      });

      await transaction.save();

      // Create a new Ad document using the data from the request body
        const newAd = new CampaignModel(body);

      // Save the Ad document to the database
      await newAd.save();

      res.status(201).json({
          message: 'Ad campaign created successfully!',
          data: newAd, // Include the saved Ad data in the response
          transaction: transaction
      });

      } else {
        return res.status(401).json({
          message: 'Insufficient balance for transaction',
          data: null,
        });
      }

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

// Get a single campaign  
export const getCampaign = async (req, res) => {  
  try {  
    const { id } = req.params; // Assuming id is passed as a route parameter  

    // Find the campaign where id matches the provided ID  
    const campaign = await CampaignModel.findById(id);  

    if (!campaign) {  
      return res.status(404).json({  
        message: 'Campaign not found',  
      });  
    }  

    res.status(200).json({  
      message: 'Campaign retrieved successfully!',  
      data: campaign,  
    });  
  } catch (error) {  
    console.error(error.message);  
    res.status(500).json({  
      message: 'Error retrieving the campaign',  
      error: error.message,  
    });  
  }  
};
