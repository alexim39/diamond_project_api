import { ProspectModel } from "../models/prospect.model.js";
import { ProspectSurveyModel } from "../../survey/models/survey.model.js";
import { PartnersModel } from '../../partner/models/partner.model.js';


// Prospect contact contnroller
export const CreateContactList = async (req, res) => {
  try {
    const { body } = req;

    // Check if a prospect with the same phone or email already exists
    const existingProspect = await ProspectModel.findOne({
      $or: [
        { prospectPhone: body.prospectPhone },
        { prospectEmail: body.prospectEmail }, // Adjust to your actual field name
      ],
    });

    if (existingProspect) {
      return res.status(400).json({
        message: "Prospect with this phone number or email already exist!",
        success: false
      });
    }

    // Create a new document using the data from the request body
    const newProspect = new ProspectModel(body);

    // Save the document to the database
    await newProspect.save();

    res.status(200).json({
      message: "Contact created successfully!",
      success: true
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      success: false
    });
  }
};

// Prospect update
export const UpdateContactList = async (req, res) => {
  try {
    const { body } = req;
    const updatedProspect = await ProspectModel.findByIdAndUpdate(
      body.prospectId,
      {
        prospectName: body.prospectName,
        prospectSurname: body.prospectSurname,
        prospectPhone: body.prospectPhone,
        prospectEmail: body.prospectEmail,
        prospectSource: body._prospectSourceid,
        prospectRemark: body.prospectRemark,
      },
      { new: true, runValidators: true } // new: true returns the updated document
    );

    if (!updatedProspect) {
      return res.status(404).json({ 
        message: "Prospect not found",
        success: false
      });
    }

    res.status(200).json({updatedProspect, success: true});

  } catch (error) {
    console.log(error);
    res.status(400).json({ 
      message: error.message,
      success: false
    });
  }
};

// Route handler to fetch all contacts by createdBy
export const getContactsCreatedBy = async (req, res) => {
  try {
    const { createdBy } = req.params;

    // Step 1: Find the user and get username
    const partner = await PartnersModel.findById(createdBy);
    if (!partner) {
      return res.status(404).json({ 
        message: "User not found",
        success: false
      });
    }

    // Step 2: user found username to get user from survey collection
    const prospectObject = await ProspectModel.find({
      partnerId: partner._id,
    });

    if (!prospectObject) {
      return res.status(400).json({ 
        message: "Prospects not found",
        success: false
       });
    }

    res.status(200).json({
      message: "Prospects retrieved successfully!",
      data: prospectObject,
      success: true
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Error retrieving Ads",
      error: error.message,
      success: false
    });
  }
};

// import survey list to contacts list
export const importSurveyToContact = async (req, res) => {
  //(surveyId) {
  try {
    const { partnerId } = req.params;

    // Step 1: Find the user and get username
    const partner = await PartnersModel.findById(partnerId);
    if (!partner) {
      return res.status(400).json({ 
        message: "User not found", 
        success: false 
      });
    }

    // Step 2: user found username to get user from survey collection
    const surveys = await ProspectSurveyModel.find({
      username: partner.username,
    });

    if (surveys.length === 0) {
      return res
        .status(401)
        .json({ 
          message: "No surveys found with the matching username",
          success: false
        });
    }

    let importedCount = 0; // Counter for successful imports

    for (const survey of surveys) {
      // Check if a prospect with the same email or phone number already exists
      const existingProspect = await ProspectModel.findOne({
        $or: [
          { prospectEmail: survey.email },
          { prospectPhone: survey.phoneNumber },
        ],
      });

      if (existingProspect) {
        console.log(
          `Prospect with email ${survey.email} or phone ${survey.phoneNumber} already exists.`
        );

        // Update the prospectStatus to "Moved to Contact"
        survey.prospectStatus = "Moved to Contact";
        await survey.save();

        continue; // Skip to the next survey if a duplicate is found
      }

      // Create a new prospect using the data from the survey
      const newProspect = new ProspectModel({
        prospectName: survey.name,
        prospectSurname: survey.surname,
        prospectEmail: survey.email,
        prospectPhone: survey.phoneNumber,
        prospectSource: "Unique Link",
        partnerId: partner._id,
        surverId: survey._id,
      });

      // Save the new prospect entry to the database
      await newProspect.save();
      importedCount++; // Increment the counter
    }

    //console.log('All matching surveys successfully imported as prospects');
    res.status(200).json({
      message: `${importedCount} Prospects imported successfully!`,
      success: true
    });
  } catch (error) {
    //console.error(error.message);
    res.status(500).json({
      message: "Error importing surveys to contacts",
      error: error.message,
      success: false
    });
  }
};

// Get all survey prospect for
export const getSurveyProspectFor = async (req, res) => {
  try {
    const { createdBy } = req.params;

    // Step 1: Find the user and get username
    const partner = await PartnersModel.findById(createdBy);
    if (!partner) {
      return res.status(404).json({ 
        message: "User not found",
        success: false
      });
    }

    /// Step 2: user found username to get user from survey collection
    const prospectObject = await ProspectSurveyModel.find({
      username: partner.username,
    });

    if (!prospectObject) {
      return res.status(400).json({ 
        message: "Prospects not found",
        success: false
      });
    }

    res.status(200).json({
      message: "Prospects retrieved successfully!",
      data: prospectObject,
      success: true
    });
  } catch (error) {
    //console.error(error.message);
    res.status(500).json({
      message: "Error retrieving Ads",
      error: error.message,
      success: false
    });
  }
};


// Get all surver prospect gotton by the system (Username = business)
export const getAllSurveyProspect = async (req, res) => {
  try {

    /// Step 1: user found username to get user from survey collection
    const prospectObject = await ProspectSurveyModel.find({ username: 'business' });

    if (!prospectObject) {
      return res.status(400).json({ 
        message: "System prospects not found",
        success: false
      });
    }

    res.status(200).json({
      message: "Prospects retrieved successfully!",
      data: prospectObject,
      success: true
    });
  } catch (error) {
    //console.error(error.message);
    res.status(500).json({
      message: "Error retrieving Ads",
      error: error.message,
      success: false
    });
  }
};

// Get all surver prospect gotton by the system (Username !== business)
export const getAllMySurveyProspect = async (req, res) => {
  try {

    const { username } = req.params;

    /// Step 1: user found username to get user from survey collection
    const prospectObject = await ProspectSurveyModel.find({ username: username });

    if (!prospectObject) {
      return res.status(400).json({ 
        message: "Partner prospects not found",
        success: false
      });
    }

    res.status(200).json({
      message: "Prospects retrieved successfully!",
      data: prospectObject,
      success: true
    });
  } catch (error) {
    //console.error(error.message);
    res.status(500).json({
      message: "Error retrieving Ads",
      error: error.message,
      success: false
    });
  }
};

/* Import single prospect from survey to contact */
export const importSingleFromSurveyToContact = async (req, res) => {
  try {
    const { partnerId, prospectId } = req.params;

    // Get the user survey by prospectId
    const survey = await ProspectSurveyModel.findById(prospectId);

    if (!survey) {
      return res.status(404).json({
        message: "Survey not found.",
        success: false
      });
    }

    // Create a new prospect using the data from the survey
    const newProspect = new ProspectModel({
      prospectName: survey.name,
      prospectSurname: survey.surname,
      prospectEmail: survey.email,
      prospectPhone: survey.phoneNumber,
      prospectSource: "Unique Link",
      partnerId: partnerId,
      surverId: survey._id, // Corrected typo: surverId -> surveyId
      survey: {
        ageRange: survey.ageRange,
        socialMedia: survey.socialMedia,
        employedStatus: survey.employedStatus,
        importanceOfPassiveIncome: survey.importanceOfPassiveIncome,
        onlinePurchaseSchedule: survey.onlinePurchaseSchedule,
        primaryOnlineBusinessMotivation: survey.primaryOnlineBusinessMotivation,
        comfortWithTech: survey.comfortWithTech,
        onlineBusinessTimeDedication: survey.onlineBusinessTimeDedication,
        referralCode: survey.referralCode,
        referral: survey.referral,
        country: survey.country,
        state: survey.state,
      },
    });

    // Save the new prospect entry to the database
    await newProspect.save();

    // Update the prospectStatus to "Moved to Contact"
    survey.prospectStatus = "Moved to Contact";
    await survey.save();

    // Delete the survey entry after moving to ProspectModel
    await ProspectSurveyModel.findByIdAndDelete(survey._id);

    res.status(200).json({
      message: "Prospect moved successfully to your contact list!",
      // data: newProspect, // Send back the created prospect data if needed
      success: true
    });
  } catch (error) {
    res.status(500).json({
      message: 'Prospect not moved, something went wrong',
      error: error.message,
      success: false
    });
  }
};


// delete single prospect from survey
/* export const deleteSingleFromSurvey = async (req, res) => {
  try {
    const { prospectId } = req.params;

    // Get the survey based on the provided prospectId
    const survey = await ProspectSurveyModel.findById(prospectId);

    // Check if the survey exists
    if (!survey) {
      return res.status(404).json({
        message: "Survey not found",
        success: false
      });
    }

    // Here we delete the survey entry
    await ProspectSurveyModel.findByIdAndDelete(prospectId);

    res.status(200).json({
      message: "Survey deleted successfully!",
      success: true
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Error deleting survey",
      error: error.message,
      success: false
    });
  }
}; */


// get single prospect by id  
export const getProspectById = async (req, res) => {  
  try {  
      const { prospectId } = req.params;  

      // Get the prospect based on the provided prospectId  
      const prospect = await ProspectModel.findById(prospectId);  
      
      // Check if the prospect exists  
      if (!prospect) {  
          return res.status(404).json({  
              message: 'Prospect not found', 
              success: false 
          });  
      }  

      res.status(200).json({  
          message: 'Prospect retrieved successfully!',  
          data: prospect, // Send the prepared data  
          success: true
      });  

  } catch (error) {  
      console.error(error.message);  
      res.status(500).json({  
          message: 'Error retrieving data',  
          error: error.message,  
          success: false
      });  
  }      
};  


// get status
export const updateProspectStatus = async (req, res) => {
  try {
    const { status, prospectId } = req.body;

    // Update the status of the prospect with the provided id
    const prospect = await ProspectModel.findByIdAndUpdate(
      prospectId,
      { status: status }, // Update only the status field
      { new: true, runValidators: true }
    );

    if (!prospect) {
      return res.status(404).json({
        message: "Prospect not found",
        success: false
      });
    }

    res.status(200).json({
      message: "Prospect status updated successfully!",
      success: true
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating data",
      error: error.message,
      success: false
    });
  }
};

// get remark
export const updateProspectRemark = async (req, res) => {
  try {
    const { remark, prospectId } = req.body;

    // Update the status of the prospect with the provided id
    const prospect = await ProspectModel.findByIdAndUpdate(
      prospectId,
      { prospectRemark: remark }, // Update only the status field
      { new: true, runValidators: true }
    );

    if (!prospect) {
      return res.status(404).json({
        message: "Prospect not found",
        success: false
      });
    }

    res.status(200).json({
      message: "Prospect record updated successfully!",
      success: true
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating data",
      error: error.message,
      success: false
    });
  }
};

// delete single prospect from prospect
export const deleteSingleFromProspect = async (req, res) => {
  try {
    const { prospectId } = req.params;

    // Get the prospect based on the provided prospectId
    const prospect = await ProspectModel.findById(prospectId);

    // Check if exists
    if (!prospect) {
      return res.status(404).json({
        message: "Prospect not found",
        success: false
      });
    }

    // Here we delete the survey entry
    await ProspectModel.findByIdAndDelete(prospectId);

    res.status(200).json({
      message: "Prospect deleted successfully!",
      success: true
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting survey",
      error: error.message,
      success: false
    });
  }
};


/* Move single prospect from contact back to survey */
export const moveSingleProspectBackToSurvey = async (req, res) => {
  try {
    const { prospectId } = req.params;

    // Get the prospect by prospectId
    const prospect = await ProspectModel.findById(prospectId);

    if (!prospect) {
      return res.status(404).json({
        message: "Prospect not found in contacts.",
        success: false
      });
    }

    // Check if the surveyRecord exists
    if (!prospect.survey) {
      return res.status(400).json({
        message: "Prospect does not have associated survey record.",
        success: false
      });
    }

    // Create a new survey entry using the data from the prospect's surveyRecord
    const newSurvey = new ProspectSurveyModel({
      ageRange: prospect.survey.ageRange,
      socialMedia: prospect.survey.socialMedia,
      employedStatus: prospect.survey.employedStatus,
      importanceOfPassiveIncome: prospect.survey.importanceOfPassiveIncome,
      onlinePurchaseSchedule: prospect.survey.onlinePurchaseSchedule,
      primaryOnlineBusinessMotivation: prospect.survey.primaryOnlineBusinessMotivation,
      comfortWithTech: prospect.survey.comfortWithTech,
      onlineBusinessTimeDedication: prospect.survey.onlineBusinessTimeDedication,
      phoneNumber: prospect.prospectPhone, // Use prospect's phone number
      email: prospect.prospectEmail,       // Use prospect's email
      name: prospect.prospectName,         // Use prospect's name
      surname: prospect.prospectSurname,   // Use prospect's surname
      referralCode: prospect.survey.referralCode,
      referral: prospect.survey.referral,
      userDevice: prospect.userDevice,      // Assuming this was part of the original survey
      prospectStatus: 'Not Moved to Contact', // Reset the status
      username: prospect.username,          // Assuming this was part of the original survey
      country: prospect.survey.country || 'Nigeria', // Default if not present
      state: prospect.survey.state,
    });

    // Save the new survey entry to the database
    const savedSurvey = await newSurvey.save();

    // Optionally, update the prospect record or delete it
    // Option 1: Update prospectStatus in ProspectModel
    //prospect.prospectStatus = "Moved Back to Survey";
    //prospect.surveyId = savedSurvey._id; // Link back to the new survey
    //await prospect.save();

    // Option 2: Delete the prospect entry after moving back to SurveyModel
    await ProspectModel.findByIdAndDelete(prospectId);

    res.status(200).json({
      message: "Prospect moved back to survey list successfully!",
      //data: savedSurvey, // Send back the created survey data
      success: true
    });

  } catch (error) {
    res.status(500).json({
      message: 'Prospect not moved back to survey, something went wrong',
      error: error.message,
      success: false
    });
  }
};
