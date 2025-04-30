import { BookingModel } from "../models/booking.model.js";
import { sendEmail } from "../../../services/emailService.js";
import { PartnersModel } from './../../partner/models/partner.model.js';
import { EmailSubscriptionModel } from "../../../models/email-subscription.model.js";
import { ownerEmailTemplate } from "../services/email/ownerTemplate.js";
import { userNotificationEmailTemplate } from "../services/email/userTemplate.js";

// User survey form
export const bookingForm = async (req, res) => {
  try {
    //console.log('sent==',req.body);

    const userBooking = await BookingModel.create({
      reason: req.body.reason,
      description: req.body.description,
      referralCode: req.body.referralCode,
      consultDate: req.body.consultDate,
      consultTime: req.body.consultTime,
      contactMethod: req.body.contactMethod,
      referral: req.body.referral,
      phone: req.body.phone,
      email: req.body.email,
      name: req.body.name,
      surname: req.body.surname,
      userDevice: req.body.userDevice,
      username: req.body.username,
      //status: 'Scheduled',
    });

    // Find the user by username
    const partner = await PartnersModel.findOne({
      username: req.body.username,
    });

    if (!partner) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send email to owner
    const ownerSubject = "Notification for One-on-One Booking Session";
    const ownerMessage = ownerEmailTemplate(userBooking);
    const ownerEmails = [
      partner.email,
      "ago.fnc@gmail.com",
    ];
    for (const email of ownerEmails) {
      await sendEmail(email, ownerSubject, ownerMessage);
    }

    // Send email to the user
    const userSubject =
      "Your One-on-One Session is Confirmed – Let’s Unlock Your Potential!";
    const userMessage = userNotificationEmailTemplate(userBooking);
    await sendEmail(userBooking.email, userSubject, userMessage);

    res.status(200).json(userBooking);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get all booking for partner
export const getBookingsForPartner = async (req, res) => {
  try {
    const { createdBy } = req.params;

    // Step 1: Find the user and get username
    const partner = await PartnersModel.findById(createdBy);
    if (!partner) {
      return res.status(404).json({ message: "User not found" });
    }

    /// Step 2: user found username to get user from BookingModel collection
    const prospectObject = await BookingModel.find({
      username: partner.username,
    });

    if (!prospectObject) {
      return res.status(400).json({ message: "Prospects not found" });
    }

    res.status(200).json({
      message: "Prospects retrieved successfully!",
      data: prospectObject,
    });
  } catch (error) {
    //console.error(error.message);
    res.status(500).json({
      message: "Error retrieving Ads",
      error: error.message,
    });
  }
};

// delete booking
export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await BookingModel.findById(id);

    // Check if the boooking exists
    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    // Here we delete the survey entry
    await BookingModel.findByIdAndDelete(id);

    res.status(200).json({
      message: "Booking deleted successfully!",
      data: null, // Consider returning null or the survey id if you want to confirm deletion
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Error deleting survey",
      error: error.message,
    });
  }
};

// Booking update
export const UpdateBooking = async (req, res) => {
    try {
      const { body } = req;
      const updatedBooking = await BookingModel.findByIdAndUpdate(
        body.id,
        {
          status: body.sessionStatus,
          description: body.sessionRemark,
        },
        { new: true, runValidators: true } // new: true returns the updated document
      );
  
      if (!updatedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
  
      res.status(200).json(updatedBooking);
    } catch (error) {
      console.log(error);
      res.status(400).json({ message: error.message });
    }
};

// get partner email list
export const getPartnerEmailList = async (req, res) => {
    try {
      const { createdBy } = req.params;
  
      // Step 1: Find the user and get username
      const partner = await PartnersModel.findById(createdBy);
      if (!partner) {
        return res.status(404).json({ message: "User not found" });
      }
  
      /// Step 2: user found username to get user from emailListObject collection
      const emailListObject = await EmailSubscriptionModel.find({
        username: partner.username,
      });
  
      if (!emailListObject) {
        return res.status(400).json({ message: "Email list not found" });
      }
  
      res.status(200).json({
        message: "Email list retrieved successfully!",
        data: emailListObject,
      });
    } catch (error) {
      //console.error(error.message);
      res.status(500).json({
        message: "Error retrieving Ads",
        error: error.message,
      });
    }
  };
