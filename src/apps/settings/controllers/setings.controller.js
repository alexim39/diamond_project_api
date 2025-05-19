import { sendEmail } from "../../../services/emailService.js";
import { PartnersModel } from './../../partner/models/partner.model.js';
import { GeneratePartnerNotifications } from './../../utils/generateNotifications.js'

// Save notification settings
export const UpdateNotification = async (req, res) => {
  try {
    const { value, partnerId } = req.body;

    // Find the partner by ID and update their settings
    const updatedPartner = await PartnersModel.findByIdAndUpdate(
      partnerId,
      { 'settings.notification': value },
      { new: true, runValidators: true } // 'new: true' returns the updated document
    );

    if (!updatedPartner) {
      return res.status(404).json({
        message: 'Partner not found',
        success: false
      });
    }

    res.status(200).json({
      message: 'Notification settings updated successfully',
      success: true
    });

  } catch (error) {
    res.status(500).json({
      message: 'There was an error updating your settings',
      error: error.message,
      success: false
    });
  }
};

// Get partner notifications
export const getNotifications = async (req, res) => {
  try {
    const { partnerId } = req.params;

    // Validate partnerId
    if (!partnerId) {
      return res.status(400).json({
        message: "partnerId is required.",
        success: false
      });
    }

    // Find the partner by ID
    const partner = await PartnersModel.findById(partnerId);

    // Check if partner exists
    if (!partner) {
      return res.status(404).json({
        message: "Partner not found.",
        success: false
      });
    }

    
  GeneratePartnerNotifications(partner._id)
  .then((notifications) => {
    //console.log(notifications);

    res.status(200).json({
      message: "Notifications retrieved successfully!",
      data: notifications,
      success: true
    });
  })
  .catch((error) => {
    console.error(error);

    res.status(500).json({
      message: "An error occurred while fetching notifications.",
      error: error.message,
      success: false
    });
  });

  } catch (error) {
    res.status(500).json({
      message: "An error occurred while fetching the partner.",
      error: error.message,
      success: false
    });
  }
};
