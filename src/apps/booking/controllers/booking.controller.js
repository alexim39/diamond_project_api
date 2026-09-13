import { BookingModel } from "../models/booking.model.js";
import { sendEmail } from "../../../services/emailService.js";
import { PartnersModel } from './../../partner/models/partner.model.js';
import { EmailSubscriptionModel } from "../../email-subscription/models/email-subscription.model.js";
import { ownerEmailTemplate } from "../services/email/ownerTemplate.js";
import { userNotificationEmailTemplate } from "../services/email/userTemplate.js";

// User survey form
export const SessionBookingController = async (req, res) => {
  try {
    const {
      reason,
      description,
      referralCode,
      consultDate,
      consultTime,
      contactMethod,
      referral,
      phone,
      email,
      name,
      surname,
      userDevice,
      username
    } = req.body;

    // Check for required fields — email is optional (not all prospects share it),
    // phone is the primary contact key. Username is required to attribute the booking.
    if (!consultDate || !consultTime || !phone || !username) {
      return res.status(400).json({
        message: "Missing required booking information.",
        success: false
      });
    }

    // Prevent duplicate booking for the same user at the same date/time
    // (only compare non-empty identifiers — blank emails must not collide).
    const or = [];
    if (email) or.push({ email });
    if (phone) or.push({ phone });
    let existingBooking = null;
    if (or.length > 0) {
      existingBooking = await BookingModel.findOne({
        $or: or,
        consultDate: consultDate,
        consultTime: consultTime
      });
    }

    if (existingBooking) {
      return res.status(400).json({
        message: "You have already booked a session for this date and time.",
        success: false
      });
    }

    // Create the booking
    const userBooking = await BookingModel.create({
      reason,
      description,
      referralCode,
      consultDate,
      consultTime,
      contactMethod,
      referral,
      phone,
      email,
      name,
      surname,
      userDevice,
      username
      // status: 'Scheduled',
    });

    // Find the user by username (for owner notification — best-effort)
    const partner = await PartnersModel.findOne({ username });

    // Send emails best-effort — a mail failure must never turn a saved booking into a 500.
    try {
      if (partner?.email) {
        const ownerSubject = "Notification for One-on-One Session Booking";
        const ownerMessage = ownerEmailTemplate(userBooking);
        await sendEmail(partner.email, ownerSubject, ownerMessage);
      }
    } catch (e) { console.warn('[booking] owner email failed:', e?.message ?? e); }

    try {
      if (userBooking.email) {
        const userSubject = "Your Session Booking is Confirmed – Let’s Talk Business!";
        const userMessage = userNotificationEmailTemplate(userBooking);
        await sendEmail(userBooking.email, userSubject, userMessage);
      }
    } catch (e) { console.warn('[booking] prospect email failed:', e?.message ?? e); }

    if (!partner) {
      // Booking is already saved — surface as success with a hint, not a 404 that looks like a failure.
      return res.status(200).json({
        message: 'Session booked, but owner account was not found for notification.',
        success: true
      });
    }

    res.status(200).json({
      message: 'Session has been successfully booked. Ensure to meet with prospect on time!',
      success: true
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: error.message,
      message: "Error creating booking",
      success: false
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
      return res.status(404).json({ 
        message: "User not found",
        success: false,
      });
    }

    /// Step 2: user found username to get user from BookingModel collection
    const prospectObject = await BookingModel.find({
      username: partner.username,
    });

    if (!prospectObject) {
      return res.status(400).json({ 
        message: "Prospects not found",
        success: false,
      });
    }

    res.status(200).json({
      message: "Prospects retrieved successfully!",
      data: prospectObject,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving Ads",
      error: error.message,
      success: false,
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
        success: false,
      });
    }

    // Here we delete the survey entry
    await BookingModel.findByIdAndDelete(id);

    res.status(200).json({
      message: "Booking deleted successfully!",
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting survey",
      error: error.message,
      success: false,
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
        return res.status(404).json({ 
          message: "Booking not found",
          success: false,
        });
      }
  
      res.status(200).json({
        updatedBooking, 
        success: true
      });
    } catch (error) {
      res.status(400).json({ 
        message: error.message,
        success: false,
      });
    }
};

// get partner email list
export const getPartnerEmailList = async (req, res) => {
    try {
      const { createdBy } = req.params;
  
      // Step 1: Find the user and get username
      const partner = await PartnersModel.findById(createdBy);
      if (!partner) {
        return res.status(404).json({ 
          message: "User not found",
          success: false,
        });
      }
  
      /// Step 2: user found username to get user from emailListObject collection
      const emailListObject = await EmailSubscriptionModel.find({
        username: partner.username,
      });
  
      if (!emailListObject) {
        return res.status(400).json({ 
          message: "Email list not found",
          success: false,
        });
      }
  
      res.status(200).json({
        message: "Email list retrieved successfully!",
        data: emailListObject,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error retrieving Ads",
        error: error.message,
        success: false,
      });
    }
  };
