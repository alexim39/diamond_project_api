import {TeamModel} from '../models/team.model.js';
import nodemailer from 'nodemailer'; 


/* // Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: 'async.ng',
    secure: true,
    port: 465,
    auth: {
      user: 'alex.i@async.ng', // replace with your email
      pass: process.env.EMAILPASS, // replace with your password
    },
});
  
// Function to send email
const sendEmail = async (email, subject, message) => {
    try {
        await transporter.sendMail({
        //from: 'Do-not-reply@async.ng', // replace with your Gmail email
        from: 'Do-not-reply@diamondprojectonline.com', // replace with your Gmail email
        to: email,
        subject: subject,
        html: message,
        });
        console.log(`Email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending email to ${email}: ${error.message}`);
    }
}; */

// Save team details  
export const saveTeam = async (req, res) => {  
    const { teamName, description, teamPurpose, partnerId } = req.body;  

    // Validate required fields  
    if (!teamName || !teamPurpose || !partnerId) {  
        return res.status(400).json({ message: "Please fill in all required fields." });  
    }  

    // Create the team entry  
    const newTeam = new TeamModel({  
        teamName,  
        description,  
        teamPurpose,  
        partnerId  
    });  

    try {  
        const savedTeam = await newTeam.save();  
        res.status(200).json(savedTeam); // Respond with the created team  
    } catch (error) {  
        console.error('Error saving the team:', error);  
        res.status(500).json({ message: "Internal server error" });  
    }  
};


// get team created by partner
export const getTeamsCreatedBy = async (req, res) => {
    try {  
        const { partnerId } = req.params;

        //console.log(partnerId)
      
        // Find teams objects for the partner  
        const teamsObject = await TeamModel.find({  
            partnerId: partnerId 
        });  

  
        if (!teamsObject || teamsObject.length === 0) {  
            return res.status(400).json({ message: 'Teams not found' });  
        } 

        res.status(200).json({  
            message: 'Teams retrieved successfully!',  
            data: teamsObject  
        });

    } catch (error) {  
        console.error(error.message);  
        res.status(500).json({  
            message: 'Error retrieving SMS and transactions',  
            error: error.message,  
        });  
    }  
}


/* // Get all teams where the partner is a member
const getTeamsByMember = async (req, res) => {
    try {
        const { partnerId } = req.params;

        const memberTeams = await TeamModel.find({ members: partnerId }).populate('members'); // Find where partnerId is in members

        res.status(200).json({
            message: 'Teams where partner is a member retrieved successfully!',
            data: memberTeams,
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: 'Error retrieving teams',
            error: error.message,
        });
    }
}; */

// Get all teams where the partner is either the creator or a member
export const getTeamsByCreatorOrPartner = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const createdTeams = await TeamModel.find({ partnerId }).populate('members');
    const memberTeams = await TeamModel.find({ members: partnerId }).populate('members');

    const allTeams = [...createdTeams, ...memberTeams];

    // Remove duplicate teams (if a partner is both creator and member)
    const uniqueTeams = allTeams.filter((team, index, self) =>
        index === self.findIndex((t) => t._id.equals(team._id)) // Compare ObjectIds
    );

    res.status(200).json({
      message: 'Teams retrieved successfully!',
      data: uniqueTeams,
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: 'Error retrieving teams',
      error: error.message,
    });
  }
};


// get a team by partner
export const getTeamBy = async (req, res) => {
    try {  
        const { id } = req.params;    
      
        // Find teams objects for the partner 
        const team = await TeamModel.findById(id).populate('members'); // Populate members;  
        if (!team) {  
            return res.status(404).json({ message: 'Team not found' });  
        }

        res.status(200).json({  
            message: 'Team retrieved successfully!',  
            data: team  
        });

    } catch (error) {  
        console.error(error.message);  
        res.status(500).json({  
            message: 'Error retrieving SMS and transactions',  
            error: error.message,  
        });  
    }  
}

// delete a team by partner
export const deleteTeamBy = async (req, res) => {
    try {  
        const { id } = req.params;  
        
      // Here we delete the survey entry  
      await TeamModel.findByIdAndDelete(id);  

      res.status(200).json({  
          message: 'Team deleted successfully!',  
          data: null, // Consider returning null or the survey id if you want to confirm deletion  
      });  

    } catch (error) {  
        console.error(error.message);  
        res.status(500).json({  
            message: 'Error retrieving SMS and transactions',  
            error: error.message,  
        });  
    }  
}


// delete a team member
export const deleteTeamMember = async (req, res) => {
    try {
        const { teamId, memberId } = req.params; // Get both teamId and memberId

        //console.log(teamId)
        //console.log(memberId)

        // Find the team and update its members (using $pull)
        const updatedTeam = await TeamModel.findByIdAndUpdate(
            teamId,
            { $pull: { members: memberId } }, // $pull removes the specified memberId
            { new: true } // Return the updated document
        ).populate('members'); // Populate members after deletion

        if (!updatedTeam) {
            return res.status(404).json({ message: 'Team not found' });
        }

        if (updatedTeam.members.length === 0) {
            return res.status(200).json({ message: 'Team member deleted successfully! Team is now empty.', data: updatedTeam });
        }

        res.status(200).json({
            message: 'Team member deleted successfully!',
            data: updatedTeam
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: 'Error deleting team member',
            error: error.message,
        });
    }
};


// update a team by partner
export const updateTeamBy = async (req, res) => {
    try {  

       // console.log(req.body)
        const { temaId, partnerId, teamPurpose, description, teamName} = req.body;  

        // Create an object with only the fields you want to update  
        const updateData = { teamName, description, teamPurpose };  

        const team = await TeamModel.findByIdAndUpdate(temaId, updateData, { new: true });  
        if (!team) {  
            return res.status(404).json({  
                message: `Team not found`  
            });  
        }  

        res.status(200).json({  
            message: 'Partner updated successfully!',  
            data: team,  
        });  

    } catch (error) {  
        console.error(error.message);  
        res.status(500).json({  
            message: error.message  
        });  
    } 
}


// add team member
export const addTeamMember = async (req, res) => {
    const { teamMemberObject, teamId } = req.body;
  
    //console.log(teamMemberObject);
    //console.log(teamId);
  
    // Validate required fields
    if (!teamMemberObject || !teamId) {
      return res.status(400).json({ message: "Please fill in all required fields - team and partners are required." });
    }
  
    if (!Array.isArray(teamMemberObject) || teamMemberObject.length === 0) {
      return res.status(400).json({ message: "Please provide at least one partner." });
    }
  
    try {
      // 1. Find the team
      const team = await TeamModel.findById(teamId);
  
      if (!team) {
        return res.status(404).json({ message: "Team not found." });
      }
  
      // 2. Extract partner IDs (handling _id or id) and filter out duplicates
      const partnerIds = teamMemberObject.map(partner => partner._id || partner.id).filter(partnerId => !team.members.includes(partnerId));
  
      if (partnerIds.length === 0) {
          return res.status(200).json({ message: "No new members to add" });
      }
  
  
      // 3. Update the team's members (using $push and $each for efficiency)
      const updatedTeam = await TeamModel.findByIdAndUpdate(
        teamId,
        { $push: { members: { $each: partnerIds } } },
        { new: true } // Return the updated document
      );
  
      if (!updatedTeam) {
          return res.status(404).json({ message: "Team not found." });
      }
  
      res.status(200).json(updatedTeam); // Respond with the updated team
  
    } catch (error) {
      console.error('Error adding team members:', error);
      res.status(500).json({ message: "Internal server error" });
    }
};