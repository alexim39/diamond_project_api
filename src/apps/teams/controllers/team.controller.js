import {TeamModel} from '../models/teams.model.js';


// Save team details  
export const saveTeam = async (req, res) => {  
    const { teamName, description, teamPurpose, partnerId } = req.body;  

    // Validate required fields  
    if (!teamName || !teamPurpose || !partnerId) {  
        return res.status(400).json({ 
            message: "Please fill in all required fields.",
            success: false
        });  
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
        res.status(200).json({
            savedTeam,
            message: "Team created successfully!",
            success: true
        });
    } catch (error) {  
        res.status(500).json({ 
            message: "Internal server error",
            error: error.message,
            success: false
        });  
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
            return res.status(400).json({ 
                message: 'Teams not found',
                success: false
            });  
        } 

        res.status(200).json({  
            message: 'Teams retrieved successfully!',  
            data: teamsObject,
            success: true
        });

    } catch (error) {  
        res.status(500).json({  
            message: 'Error retrieving SMS and transactions',  
            error: error.message,
            success: false
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
      success: true
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving teams',
      error: error.message,
      success: false
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
            return res.status(404).json({ 
                message: 'Team not found',
                success: false
            });  
        }

        res.status(200).json({  
            message: 'Team retrieved successfully!',  
            data: team,
            success: true
        });

    } catch (error) {  
        res.status(500).json({  
            message: 'Error retrieving SMS and transactions',  
            error: error.message,
            success: false
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
          success: true
      });  

    } catch (error) {  
        res.status(500).json({  
            message: 'Error retrieving SMS and transactions',  
            error: error.message, 
            success: false 
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
            return res.status(404).json({ 
                message: 'Team not found',
                success: false
            });
        }

        if (updatedTeam.members.length === 0) {
            return res.status(200).json({ 
                message: 'Team member deleted successfully! Team is now empty.', 
                data: updatedTeam,
                success: true
            });
        }

        res.status(200).json({
            message: 'Team member deleted successfully!',
            data: updatedTeam,
            success: true
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error deleting team member',
            error: error.message,
            success: false
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
                message: `Team not found`,
                success: false
            });  
        }  

        res.status(200).json({  
            message: 'Partner updated successfully!',  
            data: team,
            success: true
        });  

    } catch (error) {  
        res.status(500).json({  
            error: error.message,
            message: 'Error updating team',
            success: false
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
      return res.status(400).json({ 
        message: "Please fill in all required fields - team and partners are required.",
        success: false
    });
    }
  
    if (!Array.isArray(teamMemberObject) || teamMemberObject.length === 0) {
      return res.status(400).json({ 
        message: "Please provide at least one partner.",
        success: false
    });
    }
  
    try {
      // 1. Find the team
      const team = await TeamModel.findById(teamId);
  
      if (!team) {
        return res.status(404).json({ 
            message: "Team not found.",
            success: false
        });
      }
  
      // 2. Extract partner IDs (handling _id or id) and filter out duplicates
      const partnerIds = teamMemberObject.map(partner => partner._id || partner.id).filter(partnerId => !team.members.includes(partnerId));
  
      if (partnerIds.length === 0) {
          return res.status(200).json({ 
            message: "No new members to add",
            success: true
        });
      }
  
  
      // 3. Update the team's members (using $push and $each for efficiency)
      const updatedTeam = await TeamModel.findByIdAndUpdate(
        teamId,
        { $push: { members: { $each: partnerIds } } },
        { new: true } // Return the updated document
      );
  
      if (!updatedTeam) {
          return res.status(404).json({ 
            message: "Team not found.",
            success: false
        });
      }
  
      res.status(200).json({
        updatedTeam,
        message: "Team members added successfully!",
        success: true
    }); // Respond with the updated team
  
    } catch (error) {
      res.status(500).json({ 
        message: "Internal server error",
        error: error.message,
        success: false
    });
    }
};