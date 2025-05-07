import { TransactionModel } from "../models/transaction.model.js";
import axios from "axios";
import { PartnersModel } from '../../partner/models/partner.model.js';
import { sendEmail } from "../../../services/emailService.js";
import { ownerEmailTemplate } from '../services/email/withdrawal/ownerTemplate.js';
import { userWithdrawalEmailTemplate } from '../services/email/withdrawal/userTemplate.js';

// confirm payment
export const confirmPayment = async (req, res) => {
  const { reference, partnerId } = req.body;
  const paymentMethod = "Paystack";

  // Step 1: Verify the transaction with Paystack
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACKTOKEN}`, // Replace with your Paystack secret key
        },
      }
    );

    const transactionData = response.data.data;
    if (transactionData.status !== "success") {
      return res.status(400).json({ 
        message: "Transaction not successful",
        success: false,
    });
    }

    // Step 2: Find the user and update their balance
    const partner = await PartnersModel.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ 
            message: "Partner not found",
            success: false,
        });
    }

    const amountInNaira = transactionData.amount / 100; // Convert kobo to Naira
    partner.balance += amountInNaira;
    await partner.save();

    // Step 3: Save the transaction record
    const transaction = new TransactionModel({
      partnerId: partner._id,
      amount: amountInNaira,
      reference,
      paymentMethod,
      transactionType: "Credit",
      status: transactionData.status,
    });
    await transaction.save();

    return res.status(200).json({ 
        message: "Payment verified and balance updated", 
        partner,
        success: true,
    });
  } catch (error) {
    return res.status(500).json({ 
        message: "Payment verification failed",
        success: false,
        error: error.message,
     });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const { partnerId } = req.params; // Assuming createdBy is passed as a query parameter

    // Find transactions where partnerId matches the provided ID
    const transaction = await TransactionModel.find({ partnerId });

    res.status(200).json({
      message: "Transaction retrieved successfully!",
      data: transaction,
      success: true,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Error retrieving transactions",
      error: error.message,
      success: false,
    });
  }
};

// Function to charge the partner for single sms
export const singleSMSCharge = async (req, res) => {
  const SMS_CHARGE = 4.56; //5; // Define the SMS charge amount

  try {
    const { partnerId } = req.params;

    // Find the partner by ID
    const partner = await PartnersModel.findById(partnerId);
    if (!partner) {
      //return { success: false, message: 'Partner not found.' };
      return res.status(400).json({
        message: "Partner not found",
        success: false,
      });
    }

    // Check if the partner has sufficient balance
    if (partner.balance >= SMS_CHARGE) {
      // Deduct the SMS charge
      partner.balance -= SMS_CHARGE;

      // Save the updated partner balance
      await partner.save();

      // Record the transaction
      const transaction = new TransactionModel({
        partnerId: partner._id,
        amount: SMS_CHARGE,
        status: "Completed",
        paymentMethod: "SMS Charge",
        transactionType: "Debit",
        //reference: `Charge for SMS on ${new Date().toISOString()}`,
        reference: Math.floor(100000000 + Math.random() * 900000000).toString(), // Generate a random 9-digit number as string, ensuring it's always 9 digits
      });

      await transaction.save();

      //return { success: true, message: 'Charge successful. Transaction recorded.' };
      res.status(200).json({
        message: "Charge successful. Transaction recorded.",
        data: transaction,
        success: true,
      });
    } else {
      return res.status(400).json({
        message: "Insufficient balance for transaction",
        success: false,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while processing the charge.",
      error: error.message,
      success: false,
    });
  }
};

// Function to charge the partner for bulk sms
export const bulkSMSCharge = async (req, res) => {
  const SMS_CHARGE = 4.56; //5; // Define the SMS charge amount

  //console.log('body== ',req.body)
  const { partnerId, numberOfContacts, pages } = req.body;

  try {
    // Find the partner by ID
    const partner = await PartnersModel.findById(partnerId);
    if (!partner) {
      return res.status(400).json({
        message: "Partner not found",
        success: false,
      });
    }

    // get cost
    const smsCostPerPage = pages * SMS_CHARGE;
    const totalCost = smsCostPerPage * numberOfContacts;

    // Check if the partner has sufficient balance
    if (partner.balance >= totalCost) {
      // Deduct the SMS charge
      partner.balance -= totalCost;

      // Save the updated partner balance
      await partner.save();

      // Record the transaction
      const transaction = new TransactionModel({
        partnerId: partner._id,
        amount: totalCost,
        status: "Completed",
        paymentMethod: "SMS Charge",
        transactionType: "Debit",
        //reference: `Charge for SMS on ${new Date().toISOString()}`,
        reference: Math.floor(100000000 + Math.random() * 900000000).toString(), // Generate a random 9-digit number as string, ensuring it's always 9 digits
      });

      await transaction.save();

      res.status(200).json({
        message: "Charge successful. Transaction recorded.",
        data: transaction,
        success: true,
      });
    } else {
      return res.status(401).json({
        message: "Insufficient balance for transaction",
        success: false,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "An error occurred while processing the charge.",
      error: error.message,
      success: false,
    });
  }
};

// Partner withdrawal request
export const withdrawRequest = async (req, res) => {
  const { bank, accountNumber, accountName, amount, partnerId } = req.body;

  try {
    // Find the partner by ID
    const partner = await PartnersModel.findById(partnerId);
    if (!partner) {
      //return { success: false, message: 'Partner not found.' };
      return res.status(400).json({
        message: "Partner not found",
        success: false,
      });
    }

    // Check if the partner has sufficient balance
    if (partner.balance >= amount) {
      // Deduct the SMS charge
      partner.balance -= amount;

      // Save the updated partner balance
      await partner.save();

      // Record the transaction
      const transaction = new TransactionModel({
        partnerId: partner._id,
        amount: amount,
        status: "Pending",
        paymentMethod: "Withdrawal",
        transactionType: "Debit",
        //reference: `Charge for SMS on ${new Date().toISOString()}`,
        reference: Math.floor(100000000 + Math.random() * 900000000).toString(), // Generate a random 9-digit number as string, ensuring it's always 9 digits
      });


      // Send email to owner
      const ownerSubject = 'New Withdrawal Request';
      const ownerMessage = ownerEmailTemplate(req.body);
      const ownerEmails = [ 'ago.fnc@gmail.com'];
      for (const email of ownerEmails) {
        await sendEmail(email, ownerSubject, ownerMessage);
      }

      // Send email to the user
      const userSubject = 'Withdrawal Request Notification';
      const userMessage = userWithdrawalEmailTemplate(partner, req.body);
      await sendEmail(partner.email, userSubject, userMessage);


      await transaction.save();

      //return { success: true, message: 'Charge successful. Transaction recorded.' };
      res.status(200).json({
        message: "Charge successful. Transaction recorded.",
        data: transaction,
        success: true,
      });
    } else {
      return res.status(401).json({
        code: 401,
        message: "Insufficient balance for transaction",
        success: false,
      });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "An error occurred while processing the charge.",
      error: error.message,
      success: false,
    });
  }
};
