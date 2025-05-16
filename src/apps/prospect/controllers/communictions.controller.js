import { ProspectModel } from "../models/prospect.model.js";


/**
 * Update the prospect's communications status
 * @param {Object} req - The request object containing the prospectId, communications status, and other details
 * @param {Object} res - The response object to send the result back to the client  
 */
export const UpdateProspectCommunications = async (req, res) => {
  try {
    const { prospectId, ...communicationData } = req.body;

    const { interestLevel, date, type, duration, description, topicsDiscussed } = communicationData;

    // Validate required fields for a new communication
    if (!interestLevel || !date || !type || !description) {
      return res.status(400).json({
        message: "Missing required fields for communication",
        success: false,
      });
    }

    const newCommunication = {
      interestLevel,
      date: new Date(date), // Ensure date is a Date object
      type,
      duration: duration !== undefined ? parseInt(duration, 10) : undefined,
      description,
      topicsDiscussed: Array.isArray(topicsDiscussed) ? topicsDiscussed : (typeof topicsDiscussed === 'string' ? topicsDiscussed.split(',').map(topic => topic.trim()) : []),
      // You might want to pass other communication details in the request body as well
    };

    // Find the prospect and update their communications array
    const prospect = await ProspectModel.findByIdAndUpdate(
      prospectId,
      { $push: { communications: newCommunication } }, // Push the new communication object to the array
      { new: true, runValidators: true }
    );

    if (!prospect) {
      return res.status(404).json({
        message: "Prospect not found",
        success: false
      });
    }

    res.status(200).json({
      message: "Prospect communication updated successfully!",
      success: true,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error updating prospect communications",
      error: error.message,
      success: false
    });
  }
};


/**
 * Delete prospect communiction list entry
 */
export const DeleteProspectCommunication = async (req, res) => {
  try {
    const { prospectId, communicationId } = req.params;

    if (!prospectId || !communicationId) {
      return res.status(400).json({
        message: "Prospect ID and Communication ID are required",
        success: false,
      });
    }

    const prospect = await ProspectModel.findByIdAndUpdate(
      prospectId,
      { $pull: { communications: { _id: communicationId } } },
      { new: true }
    );

    if (!prospect) {
      return res.status(404).json({
        message: "Prospect not found",
        success: false,
      });
    }

    // Check if the communication was actually deleted (optional)
    const updatedProspect = await ProspectModel.findById(prospectId);
    const communicationExists = updatedProspect?.communications.some(
      (comm) => comm._id.toString() === communicationId
    );

    if (communicationExists) {
      return res.status(404).json({
        message: "Communication not found within the prospect",
        success: false,
      });
    }

    res.status(200).json({
      message: "Communication deleted successfully!",
      success: true,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error deleting communication",
      error: error.message,
      success: false,
    });
  }
};