import { PartnersModel } from "../models/partner.model.js";
import { BookingModel } from "../models/booking.model.js";
import { ProspectSurveyModel } from "../models/survey.model.js";
import { ReservationCodeModel } from "../models/reservation-code.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/emailService.js";
import { userWelcomeEmailTemplate } from "../services/templates/partner/signup.js";
import dotenv  from "dotenv"
dotenv.config()
import nodemailer from 'nodemailer';


// Utility function for error handling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Check if a partner exists
export const checkPartnerUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const partner = await PartnersModel.findOne({ username });

  if (partner) {
    return res.status(200).json(partner);
  }

  res.status(404).json({
    message: "Username not found",
    code: "404",
  });
});

// Generate a unique username
const generateUniqueUsername = async (name, surname) => {
  if (!name || !surname) {
    throw new Error("Name and surname are required to generate a username");
  }

  const baseUsername = (name.charAt(0) + surname).toLowerCase();
  let candidateUsername = baseUsername;
  let counter = 1;

  while (true) {
    const existingUser = await PartnersModel.findOne({ username: candidateUsername }).exec();
    if (!existingUser) return candidateUsername;
    candidateUsername = `${baseUsername}${counter++}`;
  }
};

// Partner registration
export const partnerSignup = asyncHandler(async (req, res) => {
  const { name, surname, email, password, reservationCode, tnc, phone } = req.body;

  // Validate reservation code
  const reservation = await ReservationCodeModel.findOne({
    code: reservationCode.trim(),
  }).collation({ locale: "en", strength: 2 });

  if (!reservation) {
    return res.status(400).json({ message: "Invalid reservation code", code: "400" });
  }
  if (reservation.status === "Pending") {
    return res.status(402).json({ message: "Reservation code is not approved yet" });
  }

  const isCodeUsed = await PartnersModel.findOne({ reservationCode: reservationCode.trim() });
  if (isCodeUsed) {
    return res.status(401).json({ message: "Reservation code already used" });
  }

  // Hash password and generate username
  const hashedPassword = await bcrypt.hash(password.trim(), 10);
  const username = await generateUniqueUsername(name.trim(), surname.trim());

  // Create new partner
  const newPartner = new PartnersModel({
    name: name.trim(),
    surname: surname.trim(),
    email: email.trim(),
    password: hashedPassword,
    tnc,
    reservationCode: reservationCode.trim(),
    phone: phone.trim(),
    username,
  });

  // Assign partnerOf if the reservation is approved
  if (reservation.status === "Approved" && reservation.partnerId) {
    const uplinePartner = await PartnersModel.findById(reservation.partnerId);
    if (!uplinePartner) {
      return res.status(404).json({ message: "Upline partner not found" });
    }
    newPartner.partnerOf = reservation.partnerId;
  }

  await newPartner.save();

  // Send welcome email
  const userSubject = "Welcome to Diamond Project Online Partners Platform!";
  const userMessage = userWelcomeEmailTemplate(newPartner);
  await sendEmail(newPartner.email, userSubject, userMessage);

  const { password: _, ...userObject } = newPartner.toJSON();
  res.status(200).json(userObject);
});

// Partner login
export const partnerSignin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await PartnersModel.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWTTOKENSECRET, {
    expiresIn: "1d",
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({ message: "Login successful" });
});

// Get partner details
export const getPartner = asyncHandler(async (req, res) => {
  const token = req.cookies["jwt"];
  const claims = jwt.verify(token, process.env.JWTTOKENSECRET);

  if (!claims) {
    return res.status(401).json({ message: "User unauthenticated" });
  }

  const user = await PartnersModel.findById(claims.id);
  const { password: _, ...userObject } = user.toJSON();
  res.status(200).json(userObject);
});

// Logout
export const partnerSignout = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.json({ message: "Logged out successfully" });
});

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


// Reset password
export const requestPasswordReset  = async (req, res) => {

  try {

    const { email } = req.body;
    const SECRET_KEY = process.env.JWTTOKENSECRET;
    const RESET_TOKEN_EXPIRY = '1h'; // Token expires in 1 hour

    const partner = await PartnersModel.findOne({ email });
    if (!partner) return res.status(404).send('Partner not found');

    // Generate JWT token
    const resetToken = jwt.sign({ email: partner.email }, SECRET_KEY, { expiresIn: RESET_TOKEN_EXPIRY });

    // Store the token and expiration in the user's record
    //partner.resetPasswordToken = resetToken;
    //partner.resetPasswordExpires = RESET_TOKEN_EXPIRY;

    // Save the updated user record
    //await partner.save();

    // Create reset URL
    const resetUrl = `https://diamondprojectonline.com/partner/reset-password?token=${resetToken}`;

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

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        <p>This link will expire in 45 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: "Password reset link sent to your email.",
    });


  } catch (error) {
    console.error(error.message);
    res.status(500).json({
        message: error.message
    })
  }

}

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Check if newPassword is provided
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required." });
    }

    const decoded = jwt.verify(token, SECRET_KEY);
    const partner = await PartnersModel.findOne({ email: decoded.email });
    if (!partner) return res.status(404).send('Partner not found');

    // Hash the new password
    partner.password = await bcrypt.hash(newPassword, 10);
    await partner.save();

    res.send('Password successfully updated');

  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      message: "An error occurred while resetting the password.",
      error: error.message,
    });
  }
};