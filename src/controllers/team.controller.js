import {TeamModel} from '../models/team.model.js';
import nodemailer from 'nodemailer'; 


// Create a Nodemailer transporter
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
};

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
