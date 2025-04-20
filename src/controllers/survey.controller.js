import { ProspectSurveyModel, PartnerSurveyModel } from '../models/survey.model.js';
import { PartnersModel } from '../models/partner.model.js';
import { sendEmail } from '../services/emailService.js';
import { ownerEmailTemplate, partnerOwnerEmailTemplate } from '../services/templates/survey/ownerTemplate.js';
import { userWelcomeEmailTemplate } from '../services/templates/survey/userTemplate.js';

// Prospect Survey form handler
export const ProspectSurveyForm = async (req, res) => {
  try {
    const surveyData = req.body;

    // Save the survey data to MongoDB
    const survey = new ProspectSurveyModel(surveyData);
    await survey.save();

    // Find the partner by username
    const partner = await PartnersModel.findOne({ username: surveyData.username });
    if (!partner) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Send email to form owner
    const ownerSubject = 'New Prospect Survey Submission';
    const ownerMessage = ownerEmailTemplate(surveyData);
    const ownerEmails = [partner.email, 'ago.fnc@gmail.com', 'omodunbiadams@gmail.com'];
    for (const email of ownerEmails) {
      await sendEmail(email, ownerSubject, ownerMessage);
    }

    // Send welcome email to the user
    const userSubject = 'Welcome to Diamond Project Online';
    const userMessage = userWelcomeEmailTemplate(surveyData);
    await sendEmail(surveyData.email, userSubject, userMessage);

    res.status(200).json({success: true, survey});

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
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

    res.status(200).json({success: true, survey});

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
