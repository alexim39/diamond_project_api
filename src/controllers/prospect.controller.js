import nodemailer from "nodemailer";
import { ProspectModel } from "../models/prospect.model.js";
import { SurveyModel } from "../models/survey.model.js";
import { PartnersModel } from "../models/partner.model.js";
import { PreapproachDownloadModel } from "../models/contact.model.js";

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: "async.ng",
  secure: true,
  port: 465,
  auth: {
    user: "alex.i@async.ng", // replace with your email
    pass: process.env.EMAILPASS, // replace with your password
  },
});

// Function to send email
const sendEmail = async (email, subject, message) => {
  try {
    await transporter.sendMail({
      //from: 'Do-not-reply@async.ng', // replace with your Gmail email
      from: "Do-not-reply@diamondprojectonline.com", // replace with your Gmail email
      to: email,
      subject: subject,
      html: message,
    });
    console.log(`Email sent to ${email}`);
  } catch (error) {
    console.error(`Error sending email to ${email}: ${error.message}`);
  }
};

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
        message: "Prospect already exists with this phone number or email!",
        data: existingProspect, // Optionally include the existing data
      });
    }

    // Create a new document using the data from the request body
    const newProspect = new ProspectModel(body);

    // Save the document to the database
    await newProspect.save();

    res.status(201).json({
      message: "Prospect created successfully!",
      data: newProspect, // Include the saved data in the response
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: error.message,
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
      return res.status(404).json({ message: "Prospect not found" });
    }

    res.status(200).json(updatedProspect);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message });
  }
};

// Route handler to fetch all contacts by createdBy
export const getContactsCreatedBy = async (req, res) => {
  try {
    const { createdBy } = req.params;

    // Step 1: Find the user and get username
    const partner = await PartnersModel.findById(createdBy);
    if (!partner) {
      return res.status(404).json({ message: "User not found" });
    }

    // Step 2: user found username to get user from survey collection
    const prospectObject = await ProspectModel.find({
      partnerId: partner._id,
    });

    if (!prospectObject) {
      return res.status(400).json({ message: "Prospects not found" });
    }

    res.status(200).json({
      message: "Prospects retrieved successfully!",
      data: prospectObject,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Error retrieving Ads",
      error: error.message,
    });
  }
};

// import contacts from survey
export const importSurveyToProspect = async (req, res) => {
  //(surveyId) {
  try {
    const { partnerId } = req.params;

    // Step 1: Find the user and get username
    const partner = await PartnersModel.findById(partnerId);
    if (!partner) {
      return res.status(400).json({ message: "User not found" });
    }

    // Step 2: user found username to get user from survey collection
    const surveys = await SurveyModel.find({
      username: partner.username,
    });

    if (surveys.length === 0) {
      return res
        .status(401)
        .json({ message: "No surveys found with the matching username" });
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
    res.status(201).json({
      message: "Prospects imported successfully!",
      data: { numberOfImports: importedCount }, // Include the saved data in the response
    });
  } catch (error) {
    //console.error(error.message);
    res.status(500).json({
      message: "Error retrieving Ads",
      error: error.message,
    });
  }
};

// Get all survey prospect
export const getSurveyProspect = async (req, res) => {
  try {
    const { createdBy } = req.params;

    // Step 1: Find the user and get username
    const partner = await PartnersModel.findById(createdBy);
    if (!partner) {
      return res.status(404).json({ message: "User not found" });
    }

    /// Step 2: user found username to get user from survey collection
    const prospectObject = await SurveyModel.find({
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

/* Import single prospect from survey to contact */
export const importSingleFromSurveyToContact = async (req, res) => {
  try {
    const { partnerId, prospectId } = req.params;

    // Get the user survey by prospectId
    const survey = await SurveyModel.findById(prospectId);

    if (!survey) {
      return res.status(404).json({
        message: "Survey not found.",
      });
    }

    // Update the prospectStatus to "Moved to Contact"
    survey.prospectStatus = "Moved to Contact";
    await survey.save();

    // Create a new prospect using the data from the survey
    const newProspect = new ProspectModel({
      prospectName: survey.name,
      prospectSurname: survey.surname,
      prospectEmail: survey.email,
      prospectPhone: survey.phoneNumber,
      prospectSource: "Unique Link",
      partnerId: partnerId,
      surveyId: survey._id, // If you need to keep the survey ID, uncomment this
    });

    // Save the new prospect entry to the database
    await newProspect.save();

    // Delete the survey entry after moving to ProspectModel
    //await SurveyModel.findByIdAndDelete(survey._id);

    res.status(200).json({
      message: "Prospects moved successfully!",
      data: newProspect, // Send back the created prospect data
    });
  } catch (error) {
    //console.error(error.message);
    res.status(500).json({
      message: "Error importing prospect from survey",
      error: error.message,
    });
  }
};

// delete single prospect from survey
export const deleteSingleFromSurvey = async (req, res) => {
  try {
    const { prospectId } = req.params;

    // Get the survey based on the provided prospectId
    const survey = await SurveyModel.findById(prospectId);

    // Check if the survey exists
    if (!survey) {
      return res.status(404).json({
        message: "Survey not found",
      });
    }

    // Here we delete the survey entry
    await SurveyModel.findByIdAndDelete(prospectId);

    res.status(200).json({
      message: "Survey deleted successfully!",
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

// get single prospect by id
/* export const getProspectById = async (req, res) => {
  try {
    const { prospectId } = req.params;

    // Get the prospect based on the provided prospectId
    const prospect = await ProspectModel.findById(prospectId);

    // Check if the prospect exists
    if (!prospect) {
      return res.status(404).json({
        message: "Prospect not found",
      });
    }

    res.status(200).json({
      message: "Prospect retrieved successfully!",
      data: prospect,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Error deleting data",
      error: error.message,
    });
  }
}; */

/* // get single prospect by id  
export const getProspectById = async (req, res) => {  
  try {  
    const { prospectId } = req.params;  

    // Get the prospect based on the provided prospectId  
    const prospect = await ProspectModel.findById(prospectId);  
    
    // Check if the prospect exists  
    if (!prospect) {  
        return res.status(404).json({  
            message: 'Prospect not found',  
        });  
    }  

    // Find pre-approach downloads with the same email and phone number  
    const preapproachDownloads = await PreapproachDownloadModel.find({  
        email: prospect.prospectEmail,  
        phone: prospect.prospectPhone  
    });  

    // Determine if there are matching pre-approach downloads  
    const hasPreapproach = preapproachDownloads.length > 0;  

    // Prepare the response data by spreading the original prospect data  
    const responseData = {  
        prospect: {  
            ...prospect.toObject(), // Spread existing prospect properties  
            preapproachDownload: hasPreapproach // Add preapproachDownload flag  
        }  
    };  

    res.status(200).json({  
        message: 'Prospect retrieved successfully!',  
        data: responseData.prospect // Send the prepared data  
    });  

  } catch (error) {  
      //console.error(error.message);  
      res.status(500).json({  
          message: 'Error retrieving data',  
          error: error.message,  
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
          });  
      }  

      // Find pre-approach downloads with the same email and phone number  
      const preapproachDownloads = await PreapproachDownloadModel.find({  
          email: prospect.prospectEmail,  
          phone: prospect.prospectPhone  
      });  

      // Determine if there are matching pre-approach downloads  
      const hasPreapproach = preapproachDownloads.length > 0;  

      // Find survey with the same email and phone number  
      const surveyData = await SurveyModel.findOne({  
          email: prospect.prospectEmail,  
          phoneNumber: prospect.prospectPhone  
      }).lean();  // Use lean to return a plain JavaScript object  

      // Prepare the response data by spreading the original prospect data  
      const responseData = {  
          prospect: {  
              ...prospect.toObject(), // Spread existing prospect properties  
              preapproachDownload: hasPreapproach, // Add preapproachDownload flag  
              survey: surveyData || null // Add survey data, or null if not found  
          }  
      };  

      res.status(200).json({  
          message: 'Prospect retrieved successfully!',  
          data: responseData.prospect // Send the prepared data  
      });  

  } catch (error) {  
      console.error(error.message);  
      res.status(500).json({  
          message: 'Error retrieving data',  
          error: error.message,  
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
      });
    }

    res.status(200).json({
      message: "Prospect retrieved successfully!",
      data: prospect,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Error deleting data",
      error: error.message,
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
      });
    }

    res.status(200).json({
      message: "Prospect retrieved successfully!",
      data: prospect,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: "Error deleting data",
      error: error.message,
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
      });
    }

    // Here we delete the survey entry
    await ProspectModel.findByIdAndDelete(prospectId);

    res.status(200).json({
      message: "Prospect deleted successfully!",
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
