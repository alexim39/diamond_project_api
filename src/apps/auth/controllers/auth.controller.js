//import { PartnersModel } from "../../partner/models/partner.model.js";
import bcrypt from "bcryptjs";
import { sendEmail } from "../../../services/emailService.js";
import crypto from 'crypto';
import jwt from "jsonwebtoken";
import dotenv  from "dotenv"
dotenv.config()
import { ReservationCodeModel } from "../../reservation-code/models/reservation-code.model.js";
import { PartnersModel } from './../../partner/models/partner.model.js';
import { userNotificationEmailTemplate } from "../services/email/userTemplate.js";


  



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
export const signup = async (req, res) => {
  const { name, surname, email, password, reservationCode, tnc, phone } = req.body;

  // Validate reservation code
  const reservation = await ReservationCodeModel.findOne({
    code: reservationCode.trim(),
  }).collation({ locale: "en", strength: 2 });

  if (!reservation) {
    return res.status(400).json({ 
      message: "The reservation code is invalid or does not exist", 
      success: false 
    });
  }
  if (reservation.status === "Pending") {
    return res.status(402).json({ 
      message: "Reservation code is pending approval", 
      success: false 
    });
  }

  const isCodeUsed = await PartnersModel.findOne({ reservationCode: reservationCode.trim() });
  if (isCodeUsed) {
    return res.status(401).json({ 
      message: "This reservation code has already been used", 
      success: false 
    });
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
      return res.status(404).json({ 
        message: "Upline partner not found", 
        success: false 
      });
    }
    newPartner.partnerOf = reservation.partnerId;
  }

  await newPartner.save();

  // Send welcome email
  const userSubject = "Welcome to Diamond Project Online Partners Platform!";
  const userMessage = userNotificationEmailTemplate(newPartner);
  await sendEmail(newPartner.email, userSubject, userMessage);

  const { password: _, ...userObject } = newPartner.toJSON();
  res.status(200).json({
    userObject, 
    message: "Registration successful", 
    success: true 
  });
};







// Get partner details
export const getPartner = async (req, res) => {
  const token = req.cookies["jwt"];
  const claims = jwt.verify(token, process.env.JWTTOKENSECRET);

  if (!claims) {
    return res.status(401).json({ message: "User unauthenticated" });
  }

  const user = await PartnersModel.findById(claims.id);
  const { password: _, ...userObject } = user.toJSON();
  res.status(200).json(userObject);
};






// Partner login
export const signin = async (req, res) => {
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
};






// Logout
export const partnerSignout = async (req, res) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.json({ message: "Logged out successfully" });
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