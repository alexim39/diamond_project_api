import { ProspectSurveyModel, PartnerSurveyModel } from '../models/survey.model.js';
import { PartnersModel } from '../../partner/models/partner.model.js';
import { sendEmail } from "../../../services/emailService.js";
import { ownerEmailTemplate, partnerOwnerEmailTemplate } from '../services/email/ownerTemplate.js';
import { userWelcomeEmailTemplate } from '../services/email/userTemplate.js';


export const ProspectSurveyForm = async (req, res) => {
  try {
    const surveyData = req.body;

    // Check if the phone number already exists in the database
    const existingSurvey = await ProspectSurveyModel.findOne({ phoneNumber: surveyData.phoneNumber });

    if (existingSurvey) {
      return res.status(400).json({ 
        success: false, 
        message: 'You\'ve already taken our survey. Thanks for your interest!' 
      });
    }

    // Save the survey data to MongoDB
    const survey = new ProspectSurveyModel(surveyData);
    await survey.save();

    // Prepare email templates
    const ownerSubject = 'New Prospect Survey Submission';
    const ownerMessage = ownerEmailTemplate(surveyData);
    const userSubject = 'Welcome to Diamond Project';
    const userMessage = userWelcomeEmailTemplate(surveyData);

    // Find the referring partner
    const referringPartner = await PartnersModel.findOne({ username: surveyData.username });

    // Case: Partner found and username is not "business"
    if (referringPartner && referringPartner.username !== 'business') {
      await sendEmail(referringPartner.email, ownerSubject, ownerMessage);
    } else {
      // Find partners with matching state
      let statePartners = await PartnersModel.find({ state: surveyData.state });

      if (statePartners.length > 0) {
        // Send to partners in the same state
        for (const partner of statePartners) {
          await sendEmail(partner.email, ownerSubject, ownerMessage);
        }
      } else {
        // No matching state partners, send to all partners
        const allPartners = await PartnersModel.find({});
        for (const partner of allPartners) {
          await sendEmail(partner.email, ownerSubject, ownerMessage);
        }
      }
    }

    // Send welcome email to the prospect
    await sendEmail(surveyData.email, userSubject, userMessage);

    res.status(200).json({ 
      success: true, 
      message: 'Thank you for completing our survey, we will be in touch with you soon.' 
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'An error occurred while processing your request. Please try again later.'
    });
  }
};

// Partner Survey form handler
export const PartnerSurveyForm = async (req, res) => {
  try {
    const surveyData = req.body;

    // Save the survey data to MongoDB
    const survey = new PartnerSurveyModel(surveyData);
    await survey.save();


    // Send email to form owner
    const ownerSubject = 'Partner Survey Submission';
    const ownerMessage = partnerOwnerEmailTemplate(surveyData);
    const ownerEmails = ['ago.fnc@gmail.com'];
    for (const email of ownerEmails) {
      await sendEmail(email, ownerSubject, ownerMessage);
    }

    res.status(200).json({
        success: true, 
        survey
    });

  } catch (error) {
    res.status(500).json({ 
        success: false,
        error: error.message,
        message: 'An error occurred while processing your request. Please try again later.'
    });
  }
};
