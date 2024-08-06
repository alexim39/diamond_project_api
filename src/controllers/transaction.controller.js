import nodemailer from 'nodemailer';
import {TransactionModel} from '../models/transaction.model.js';
import axios from 'axios';
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


// confirm payment
export const confirmPayment = async (req, res) => {
    const { reference, partnerId } = req.body;
    const paymentMethod = 'Paystack';
        
  // Step 1: Verify the transaction with Paystack
  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer sk_test_2b176cfecf4bf2bf8ed1de53b55f868dc4ed9127`, // Replace with your Paystack secret key
      },
    });

    const transactionData = response.data.data;
    if (transactionData.status !== 'success') {
      return res.status(400).json({ message: 'Transaction not successful' });
    }

    // Step 2: Find the user and update their balance
    const partner = await PartnersModel.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ message: 'User not found' });
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
      status: transactionData.status,
    });
    await transaction.save();

    return res.status(200).json({ message: 'Payment verified and balance updated', partner });
  } catch (error) {
    console.error('Payment verification failed:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }

    
}


export const getTransactions = async (req, res) => {
  try {
    const { partnerId } = req.params; // Assuming createdBy is passed as a query parameter

    // Find transactions where partnerId matches the provided ID
    const transac = await TransactionModel.find({ partnerId });

    res.status(200).json({
      message: 'Transaction retrieved successfully!',
      data: transac,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: 'Error retrieving transactions',
      error: error.message,
    });
  }
};