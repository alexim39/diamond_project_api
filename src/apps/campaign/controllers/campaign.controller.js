import {CampaignModel} from './../models/campaign.model.js';
import { PartnersModel } from './../../partner/models/partner.model.js';
import mongoose from 'mongoose';
import {TransactionModel} from '../../transaction/models/transaction.model.js';


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
        success: false,
      });
    }

    // Check if the partner entered sufficient amount  
    if (body.budget.budgetAmount < MIN_CHARGE) {
      return res.status(402).json({
        message: 'Insufficient amount for transaction',
        success: false,
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

      res.status(200).json({
        message: 'Ad campaign created successfully!',
        data: newAd,
        transaction: transaction,
        success: true,
      });

    } else {
      return res.status(401).json({
        message: 'Insufficient balance for transaction',
        success: false,
      });
    }

  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: 'Error creating Facebook campaign',
      success: false,
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
          success: false,
        });
      }

      // Check if the partner entered sufficient amount  
      if (body.budget.budgetAmount < MIN_CHARGE) {
        return res.status(402).json({
          message: 'Insufficient amount for transaction',
          success: false,
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

        res.status(200).json({
            message: 'Ad campaign created successfully!',
            data: newAd, // Include the saved Ad data in the response
            transaction: transaction,
            success: true,
        });

      } else {
        return res.status(401).json({
          message: 'Insufficient balance for transaction',
          success: false,
        });
      }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating Youtube campaign',
            error: error.message
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
          success: false,
        });
      }

      // Check if the partner entered sufficient amount  
      if (body.budget.budgetAmount < MIN_CHARGE) {
        return res.status(400).json({
          message: 'Insufficient amount for transaction',
          success: false,
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

      res.status(200).json({
          message: 'Ad campaign created successfully!',
          data: newAd, // Include the saved Ad data in the response
          transaction: transaction,
          success: false,
      });

      } else {
        return res.status(401).json({
          message: 'Insufficient balance for transaction',
          success: false,
        });
      }

    } catch (error) {
        res.status(500).json({
            errpr: error.message,
            success: false,
            message: 'Error creating LinkedIn campaign'
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
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        message: 'Error retrieving Ads',
        error: error.message,
        success: false,
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
      return res.status(401).json({ 
        message: 'No partner found',
        success: false,
    });
    }

    // Step 2: Check if the channel is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(channel)) {
      // If channel is not a valid ObjectId, increment visits in the PartnersModel
      partner.visits = (partner.visits || 0) + 1;
      await partner.save();
      return res.status(200).json({
        message: 'Partner visit updated due to invalid channel',
        data: partner,
        success: true,
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
        success: true,
      });
    } else {
      // If campaign does not exist, increment visits in the PartnersModel
      partner.visits = (partner.visits || 0) + 1;
      await partner.save();
      return res.status(200).json({
        message: 'Partner visit updated',
        data: partner,
        success: true,
      });
    }

  } catch (error) {
    return res.status(500).json({
        error: error.message,
        message: 'Error recording visits',
        success: false,
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
      return res.status(400).json({  
        message: 'Campaign not found',  
        success: false,
      });  
    }  

    res.status(200).json({  
      message: 'Campaign retrieved successfully!',  
      data: campaign,  
      success: true,
    });  
  } catch (error) {  
    res.status(500).json({  
      message: 'Error retrieving the campaign',  
      error: error.message,  
      success: false,
    });  
  }  
};
