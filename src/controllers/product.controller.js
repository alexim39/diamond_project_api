import {ProductModel, CartModel} from '../models/products.model.js';
import nodemailer from 'nodemailer';
import {TransactionModel} from '../models/transaction.model.js';
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

  
// get all products
export const getAllProducts = async (req, res) => {
    try {
      //const { createdBy } = req.params; // Assuming createdBy is passed as a query parameter
  
      // get products
      const products = await ProductModel.find({});
  
      res.status(200).json({
        message: 'Products retrieved successfully!',
        data: products,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({
        message: 'Error retrieving Ads',
        error: error.message,
      });
    }
  };


// Update a product
export const updateProduct = async (req, res) => {
  try {
      const {id} = req.params;
      const product = await ProductModel.findByIdAndUpdate(id, req.body);
      if (!product) {
          return res.status(404).json({
              message: `Product not found`
          })
      }
      const updatedProduct = await ProductModel.create(req.body);
      res.status(200).json({
        message: 'Products retrieved successfully!',
        data: updatedProduct,
      });

  } catch (error) {
      console.error(error.message);
      res.status(500).json({
          message: error.message
      })
  }
}
 
// Save cart  
export const Savecart = async (req, res) => {  
  try {  
    const { products, partnerId } = req.body;  

    // Find the partner by ID  
    const partner = await PartnersModel.findById(partnerId);  
    if (!partner) {  
      return res.status(400).json({  
        message: 'Partner not found',  
        data: null, // Optionally include the existing data  
      });  
    }  

    const cartProducts = [];  
    let totalCost = 0;  
  
    for (const productData of products) {  
      const product = await ProductModel.findOne({ _id: productData._id });  
      if (!product) {  
        console.warn(`Product with ID ${productData._id} not found. Skipping.`);  
        continue;  
      }  
  
      // Ensure price and quantity are valid numbers before calculating total cost  
      const price = Number(product.price);  
      const quantity = Number(productData.quantity);  
  
      if (!isNaN(price) && !isNaN(quantity) && quantity > 0) {  
        totalCost += price * quantity; // Calculate total cost based on price and quantity  
        cartProducts.push({ product: product._id, quantity }); // Add product ID and quantity to cartProducts  
      }  
    }  

    // Check if the partner has sufficient balance  
    if (partner.balance >= totalCost) {  
      // Deduct the total cost from partner's balance  
      partner.balance -= totalCost;  

      // Save the updated partner balance  
      await partner.save();  

      // Record the transaction  
      const transaction = new TransactionModel({  
        partnerId: partner._id,  
        amount: totalCost,  
        status: 'Completed',  
        paymentMethod: 'Product Purchase',  
        transactionType: 'Debit',  
        reference: Math.floor(100000000 + Math.random() * 900000000).toString() // Generate a random 9-digit number as string  
      });  

      await transaction.save();  

      // Create a new cart with products and total cost  
      const cart = new CartModel({  
        products: cartProducts,  
        totalCost: totalCost,  
        partner: partnerId,  
      });  
    
      await cart.save();  
      res.status(200).json({ message: 'Cart saved successfully', cart });   

    } else {  
      return res.status(401).json({  
        message: 'Insufficient balance for transaction',  
        data: null, // Optionally include the existing data  
      });   
    }   
  } catch (error) {  
    console.error(error);  
    res.status(500).json({ message: 'Failed to save cart', error });  
  }  
}

// Fetch all carts
export const GetAllCartsBy = async (req, res) => {  
  try {  
    const { partnerId } = req.params;   

    // Fetch carts and populate the products field  
    const carts = await CartModel.find({ partner: partnerId })  
      .populate({  
        path: 'products.product', // Populate the product field within products  
        model: 'Product' // Specify the model to populate  
      });  

    res.json(carts);  
  } catch (error) {  
    res.status(500).json({ message: 'Failed to fetch carts', error });  
  }  
}