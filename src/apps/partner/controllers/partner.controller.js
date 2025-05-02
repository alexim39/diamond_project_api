import { PartnersModel } from "../models/partner.model.js";
import { BookingModel } from "./../../booking/models/booking.model.js";
import { ProspectSurveyModel } from "../../survey/models/survey.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../../services/emailService.js";
import dotenv  from "dotenv"
dotenv.config()





// Check if a partner exists
export const checkPartnerUsername = async (req, res) => {
  const { username } = req.params;
  const partner = await PartnersModel.findOne({ username });

  if (partner) {
    return res.status(200).json({partner, success: true});
  }

  res.status(404).json({
    message: "Username not found",
    code: "404",
    success: false
  });
};







// Update a partner's profile
export const updateProfile = async (req, res) => {
  try {
    const { id, name, surname, bio, email, phone, address, dobDatePicker } =
      req.body;

    // Validate input
    if (!name || !surname || !email || !phone) {
      return res.status(400).json({
        message: "Name, surname, email, and phone are required.",
      });
    }

    // Update fields
    const updateData = {
      name,
      surname,
      bio,
      email,
      phone,
      address,
      dobDatePicker,
    };

    const partner = await PartnersModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found.",
      });
    }

    res.status(200).json({
      message: "Partner updated successfully!",
      data: partner,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: error.message,
    });
  }
};

// Update a partner's profession
export const updateProfession = async (req, res) => {
  try {
    const { id, jobTitle, educationBackground, hobby, skill } = req.body;

    if (!jobTitle || !educationBackground) {
      return res.status(400).json({
        message: "Job title and education background are required.",
      });
    }

    const updateData = { jobTitle, educationBackground, hobby, skill };

    const partner = await PartnersModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found.",
      });
    }

    res.status(200).json({
      message: "Partner's profession updated successfully!",
      data: partner,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: error.message,
    });
  }
};

// Update a partner's username
export const updateUsername = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id, username } = req.body;

    if (!username || !id) {
      throw new Error("Username and ID are required.");
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      throw new Error(
        "Username can only contain letters, numbers, and underscores."
      );
    }

    // Check if username already exists
    const existingPartner = await PartnersModel.findOne({ username }).session(
      session
    );
    if (existingPartner && existingPartner._id.toString() !== id) {
      throw new Error("Username already in use by another partner.");
    }

    const partner = await PartnersModel.findById(id).session(session);
    if (!partner) {
      throw new Error("Partner not found.");
    }

    const oldUsername = partner.username;

    partner.username = username;
    await partner.save({ session });

    // Update related collections
    await ProspectSurveyModel.updateMany(
      { username: oldUsername },
      { $set: { username } },
      { session }
    );

    await BookingModel.updateMany(
      { username: oldUsername },
      { $set: { username } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Username updated successfully!",
      data: partner,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({
      message: error.message,
    });
  }
};

// Change a partner's password
export const changePassword = async (req, res) => {
  const { id, currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      message: "Current password and new password are required.",
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      message: "New password must be at least 8 characters long.",
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      message: "Current password and new password cannot be the same.",
    });
  }

  try {
    const partner = await PartnersModel.findById(id);
    if (!partner) {
      return res.status(404).json({
        message: "Partner not found.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, partner.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Current password is incorrect.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    partner.password = hashedNewPassword;
    await partner.save();

    res.status(200).json({
      message: "Password changed successfully!",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get all partners in the database
export const getAllUsers = async (req, res) => {
  try {
    const partners = await PartnersModel.find();
    const sanitizedResult = JSON.stringify(partners).replace(/\s+/g, ""); // Remove all whitespace
    res.status(200).json(JSON.parse(sanitizedResult)); // Parse back to JSON
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get partner by name and/or surname
export const getPartnerByNames = async (req, res) => {
  const { name, surname } = req.params;
  try {
    const trimmedName = name ? name.trim() : "";
    const trimmedSurname = surname ? surname.trim() : "";

    const query = {};
    if (trimmedName) query.name = trimmedName;
    if (trimmedSurname) query.surname = trimmedSurname;

    const partners = await PartnersModel.find(query);

    if (!partners || partners.length === 0) {
      return res.status(404).json({ message: "Partner not found" });
    }
    res.status(200).json({
      message: "Partner(s) found",
      data: partners,
    });
  } catch (error) {
    console.error("Error fetching partner:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get partner by name
export const getPartnerByName = async (req, res) => {
  const { name } = req.params;
  try {
    const trimmedName = name ? name.trim() : "";
    const capitalizedTrimmedName = trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1);

    if (!capitalizedTrimmedName) {
      return res.status(400).json({ message: "Name is required." });
    }

    const query = { $or: [{ name: capitalizedTrimmedName }, { surname: capitalizedTrimmedName }] };
    const partners = await PartnersModel.find(query);

    if (!partners || partners.length === 0) {
      return res.status(404).json({ message: "Partner not found" });
    }
    res.status(200).json({
      message: "Partner(s) found",
      data: partners,
    });
  } catch (error) {
    console.error("Error fetching partner:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Follow a partner
export const followPartner = async (req, res) => {
  try {
    const { searchPartnerId } = req.params;
    const partnerId = req.body.partnerId;

    if (!searchPartnerId) {
      return res.status(400).json({ message: "Missing required parameter: searchPartnerId" });
    }

    const partnerToFollow = await PartnersModel.findById(searchPartnerId);
    if (!partnerToFollow) {
      return res.status(404).json({ message: "Partner not found" });
    }

    if (!partnerToFollow.followers.includes(partnerId)) {
      partnerToFollow.followers.push(partnerId);
      await partnerToFollow.save();
      return res.status(200).json({ message: "Successfully followed the partner" });
    }

    return res.status(400).json({ message: "You are already following this partner" });
  } catch (error) {
    console.error("Error following partner:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// Unfollow a partner
export const unfollowPartner = async (req, res) => {
  try {
    const { searchPartnerId } = req.params;
    const partnerId = req.body.partnerId;

    if (!searchPartnerId || !partnerId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const partnerToUnfollow = await PartnersModel.findById(searchPartnerId);
    if (!partnerToUnfollow) {
      return res.status(404).json({ message: "Partner not found" });
    }

    if (partnerToUnfollow.followers.includes(partnerId)) {
      partnerToUnfollow.followers = partnerToUnfollow.followers.filter(
        (followerId) => followerId.toString() !== partnerId.toString()
      );
      await partnerToUnfollow.save();
      return res.status(200).json({ message: "Successfully unfollowed the partner" });
    }

    return res.status(400).json({ message: "You are not following this partner" });
  } catch (error) {
    console.error("Error unfollowing partner:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// Check follow status
export const checkFollowStatus = async (req, res) => {
  try {
    const { searchPartnerId, partnerId } = req.params;

    if (!searchPartnerId || !partnerId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    const partner = await PartnersModel.findById(searchPartnerId);
    if (!partner) {
      return res.status(404).json({ message: "Partner not found" });
    }

    const isFollowing = partner.followers.includes(partnerId);

    return res.status(200).json({ isFollowing });
  } catch (error) {
    console.error("Error checking follow status:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// Update partner's social media links
const updateSocialMediaLink = async (req, res, platform, field) => {
  try {
    const { url, partnerId } = req.body;
    const updateData = { [field]: url };

    const partner = await PartnersModel.findByIdAndUpdate(partnerId, updateData, { new: true });
    if (!partner) {
      return res.status(404).json({ message: `Partner not found` });
    }

    res.status(200).json({ message: "Partner updated successfully!", data: partner });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: error.message });
  }
};

// Social media update handlers
export const updateWhatsappGroupLink = (req, res) => updateSocialMediaLink(req, res, "whatsappGroupLink", "whatsappGroupLink");
export const updateWhatsappChatLink = (req, res) => updateSocialMediaLink(req, res, "whatsappChatLink", "whatsappChatLink");
export const updateFacebookPage = (req, res) => updateSocialMediaLink(req, res, "facebookPage", "facebookPage");
export const updateLinkedinPage = (req, res) => updateSocialMediaLink(req, res, "linkedinPage", "linkedinPage");
export const updateYoutubePage = (req, res) => updateSocialMediaLink(req, res, "youtubePage", "youtubePage");
export const updateInstagramPage = (req, res) => updateSocialMediaLink(req, res, "instagramPage", "instagramPage");
export const tiktokPage = (req, res) => updateSocialMediaLink(req, res, "tiktokPage", "tiktokPage");
export const twitterPage = (req, res) => updateSocialMediaLink(req, res, "twitterPage", "twitterPage");

// Update Testimonial
export const updateTestimonial = async (req, res) => {
  try {
    const { testimonial, partnerId } = req.body;

    // Validate input
    if (!testimonial || !partnerId) {
      return res.status(400).json({
        message: "Testimonial and partnerId are required.",
      });
    }

    // Create an object with the field you want to update
    const updateData = { testimonial };

    // Update partner's testimonial
    const partner = await PartnersModel.findByIdAndUpdate(
      partnerId,
      updateData,
      { new: true }
    );

    // Check if partner exists
    if (!partner) {
      return res.status(404).json({
        message: `Partner not found.`,
      });
    }

    res.status(200).json({
      message: "Partner updated successfully!",
      data: partner,
    });
  } catch (error) {
    console.error("Error updating testimonial:", error.message);
    res.status(500).json({
      message: "An error occurred while updating the testimonial.",
      error: error.message,
    });
  }
};

// Get all partners of a given partner user
export const getPartnersOf = async (req, res) => {
  try {
    const { partnerId } = req.params;

    // Validate partnerId
    if (!partnerId) {
      return res.status(400).json({
        message: "partnerId is required.",
      });
    }

    // Find all partners where partnerOf matches the provided partnerId
    const partners = await PartnersModel.find({ partnerOf: partnerId }).exec();

    // Check if no partners are found
    if (partners.length === 0) {
      return res.status(404).json({
        message: `No partners found for this partner.`,
      });
    }

    res.status(200).json({
      message: "Partners retrieved successfully!",
      data: partners,
    });
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({
      message: "An error occurred while fetching partners.",
      error: error.message,
    });
  }
};

// Get a partner by ID
export const getPartnerById = async (req, res) => {
  try {
    const { partnerId } = req.params;

    // Validate partnerId
    if (!partnerId) {
      return res.status(400).json({
        message: "partnerId is required.",
      });
    }

    // Find the partner by ID
    const partner = await PartnersModel.findById(partnerId);

    // Check if partner exists
    if (!partner) {
      return res.status(404).json({
        message: "Partner not found.",
      });
    }

    res.status(200).json({
      message: "Partner retrieved successfully!",
      data: partner,
    });
  } catch (error) {
    console.error("Error fetching partner:", error);
    res.status(500).json({
      message: "An error occurred while fetching the partner.",
      error: error.message,
    });
  }
};  

