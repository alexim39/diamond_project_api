import { sendEmail } from "../../../services/emailService.js";
import { PartnersModel } from './../../partner/models/partner.model.js';


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
