import { SurveyModel } from '../models/survey.model.js';
import { PartnersModel } from '../models/partner.model.js';
import { sendEmail } from '../services/emailService.js';
import { ownerEmailTemplate } from '../services/templates/survey/ownerTemplate.js';
import { userWelcomeEmailTemplate } from '../services/templates/survey/userTemplate.js';

// Survey form handler
export const surveyForm = async (req, res) => {
  try {
    const surveyData = req.body;

    // Save the survey data to MongoDB
    const survey = new SurveyModel(surveyData);
    await survey.save();

    // Find the partner by username
    const partner = await PartnersModel.findOne({ username: surveyData.username });
    if (!partner) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send email to form owner
    const ownerSubject = 'New Survey Submission';
    const ownerMessage = ownerEmailTemplate(surveyData);
    const ownerEmails = [partner.email, 'ago.fnc@gmail.com', 'adeyemi.t@diamondprojectonline.com'];
    for (const email of ownerEmails) {
      await sendEmail(email, ownerSubject, ownerMessage);
    }

    // Send welcome email to the user
    const userSubject = 'Welcome to Diamond Project Online';
    const userMessage = userWelcomeEmailTemplate(surveyData);
    await sendEmail(surveyData.email, userSubject, userMessage);

    res.status(200).json(survey);

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: error.message });
  }
};
