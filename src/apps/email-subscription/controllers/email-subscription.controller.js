import {EmailSubscriptionModel} from '../models/email-subscription.model.js';
import { sendEmail } from "../../../services/emailService.js";

  
// User email subscription
export const emailSubscription = async (req, res) => {
    try {

     // console.log('sent==',req.body);

        const emailSubscription = await EmailSubscriptionModel.create({
            email: req.body.email,
            userDevice: req.body.userDevice,
            username: req.body.username,
        });

        // Send email after successfully submitting the records
        const emailSubject = 'Diamond Project Email Subscription';
        const emailMessage = `
            <h1>Email Subscription</h1>
            <p>Kindly note that someone subscribed to the email subscription form on Diamond Project webiste: ${req.body.email}</p>
        `;

        const emailsToSend = ['ago.fnc@gmail.com'];

        for (const email of emailsToSend) {
            await sendEmail(email, emailSubject, emailMessage);
        }

        res.status(200).json({
          success: true, 
          message: "Thanks for subscribing. We will not spam your mailbox.",
          emailSubscription
        });

    } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          message: "Error subscribing to email list",
        })
    }
}

// delete single prospect email from list
export const deleteSingleEmailFromEmailList = async (req, res) => {
    try {
      const { emailId } = req.params;
    
      // Get the email based on the provided prospectId
      const email = await EmailSubscriptionModel.findById(emailId);
  
      // Check if the email exists
      if (!email) {
        return res.status(404).json({
          message: "Email not found",
          success: false,
        });
      }
  
      // Here we delete the email entry
      await EmailSubscriptionModel.findByIdAndDelete(emailId);
  
      res.status(200).json({
        message: "Email deleted successfully!",
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error deleting email",
        error: error.message,
        success: false,
      });
    }
  };