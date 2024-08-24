import {PartnersModel} from '../models/partner.model.js';
import {BookingModel} from '../models/booking.model.js';
import {SurveyModel} from '../models/survey.model.js';
import {ReservationCodeModel} from '../models/reservation-code.model.js';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

 // check if a partner exist
export const checkPartnerUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const returnedObject = await PartnersModel.findOne({ username: username });

        if (returnedObject) {
            res.status(200).json(returnedObject);
        } else {
            res.status(404).json({
                message: "No record found for the provided username."
            });
        }

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        });
    }
}

// generate a unique username for user
const generateUniqueUsername = async (name, surname) => {
    let username = '';
    // Generate username from the first character of the name and surname
    if (name && surname) {
      const baseUsername = (name.charAt(0) + surname).toLowerCase();
      let candidateUsername = baseUsername;
      let counter = 1;
  
      // Loop until a unique username is found
      while (true) {
        try {
          // Check if the username already exists in the database
          const existingUser = await PartnersModel.findOne({ username: candidateUsername }).exec();
          if (!existingUser) {
            username = candidateUsername;
            break;
          } else {
            // Generate a new candidate username with a counter suffix
            candidateUsername = baseUsername + counter;
            counter++;
          }
        } catch (error) {
          console.error('Error while checking username uniqueness:', error.message);
          throw new Error('Error generating unique username');
        }
      }
    }
  
    if (!username) {
      throw new Error('Error generating unique username');
    }
  
    return username;
  };

// partner registration
export const partnerSignup = async (req, res) => {


     // Check if the reservation code exists
    const reservationCodeExists = await ReservationCodeModel.findOne({
        code: req.body.reservationCode
    })

     if (!reservationCodeExists) {
         return res.status(400).json({
             message: 'The reservation code does not exist.',
             code: '400'
         });
     }

     if (reservationCodeExists) {
        // If the code exists, check its status  
        if (reservationCodeExists.status === 'Pending') { 
            return res.status(402).send({
                message: 'The reservation code has not been approved',
            });
        }
       
    }

     // Check if the reservation code have been used
     const reservationCodeUsed = await PartnersModel.findOne({
        reservationCode: req.body.reservationCode
    })

    if (reservationCodeUsed) {
        return res.status(401).send({
            message: "Code exist"
        })
    }

    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
  
      const username = await generateUniqueUsername(req.body.name, req.body.surname);
  
      const user = await PartnersModel.create({
          name: req.body.name,
          surname: req.body.surname,
          email: req.body.email,
          password: hashedPassword,
          tnc: req.body.tnc,
          reservationCode: req.body.reservationCode,
          phone: req.body.phone,
          username: username,
      });
  
      // Don't return user password
      const { password, ...userObject } = await user.toJSON();
  
      res.status(200).json(userObject);
  
    } catch (error) {
      console.error(error.message);
      res.status(500).json({
          message: error.message
      });
    }
  };

// User login
export const partnerSignin = async (req, res) => {

    //console.log('body== ',req.body)

    try {
        const user = await PartnersModel.findOne({
            email: req.body.email
        })

        if (!user) {
            return res.status(404).send({
                message: "User does not exist"
            })
        }

        if (!await bcrypt.compare(req.body.password, user.password)) {
            return res.status(400).json({
                message: "Invalid password credentails"
            })
        }

        // NOTE secret should be stored in env file
        const token = jwt.sign({id: user._id}, process.env.JWTTOKENSECRET);
        res.cookie('jwt', token, {
            httpOnly: true,
            sameSite: 'none',
            secure: true, // set to true if you're using https
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        })

        //res.send(token)
        res.send({
            message: 'success'
        })

    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}

// Get user
export const getPartner = async (req, res) => {
    try {
        const cookie = req.cookies['jwt']

        // NOTE secret should be stored in env file
        const claims = jwt.verify(cookie, process.env.JWTTOKENSECRET);

        if (!claims) {
            return res.status(401).send({
                message: "User unauthenticated"
            })
        }

        //const user = await PartnersModel.findOne({_id: claims.id}).populate('courses');
        const user = await PartnersModel.findOne({_id: claims.id});


        const {password, ...userObject} = await user.toJSON()

        res.status(200).send(userObject)

    } catch (error) {
        console.error(error.message);
        res.status(401).json({
            message: "Unauthenticated",
            error: error.message
        })
    }
}

// logout
export const partnerSignout = async (req, res) => {
    try {
        res.cookie('jwt', '', {maxAge: 0});
        res.send({
            message: 'logged_out'
        })


    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}


// Update a partner
export const updateProfile = async (req, res) => {  
    try {  
        const { id, name, surname, bio, email, phone, address, dobDatePicker } = req.body;  

        // Create an object with only the fields you want to update  
        const updateData = { name, surname, bio, email, phone, address, dobDatePicker };  

        const partner = await PartnersModel.findByIdAndUpdate(id, updateData, { new: true });  
        if (!partner) {  
            return res.status(404).json({  
                message: `Partner not found`  
            });  
        }  

        res.status(200).json({  
            message: 'Partner updated successfully!',  
            data: partner,  
        });  

    } catch (error) {  
        console.error(error.message);  
        res.status(500).json({  
            message: error.message  
        });  
    }  
};

// Update a profession
export const updateProfession = async (req, res) => {  
    try {  
        const { id, jobTitle, educationBackground, hobby, skill} = req.body;  

        // Create an object with only the fields you want to update  
        const updateData = { jobTitle, educationBackground, hobby, skill };  

        const partner = await PartnersModel.findByIdAndUpdate(id, updateData, { new: true });  
        if (!partner) {  
            return res.status(404).json({  
                message: `Partner not found`  
            });  
        }  

        res.status(200).json({  
            message: 'Partner updated successfully!',  
            data: partner,  
        });  

    } catch (error) {  
        console.error(error.message);  
        res.status(500).json({  
            message: error.message  
        });  
    }  
};

// Update username  
/* export const updateUsername = async (req, res) => {  
    try {  
        const { id, username } = req.body;  

        // Check if the new username already exists for another partner  
        const existingPartner = await PartnersModel.findOne({ username });  
        if (existingPartner && existingPartner._id.toString() !== id) {  
            return res.status(400).json({  
                message: 'Username already in use by another partner.',
            });  
        }  

        // Create an object with only the fields you want to update  
        const updateData = { username };  

        const partner = await PartnersModel.findByIdAndUpdate(id, updateData, { new: true });  
        if (!partner) {  
            return res.status(404).json({  
                message: `Partner not found`  
            });  
        }  

        res.status(200).json({  
            message: 'Partner updated successfully!',  
            data: partner,  
        });  

    } catch (error) {  
        console.error(error.message);  
        res.status(500).json({  
            message: error.message  
        });  
    }  
};
 */

// update username
export const updateUsername = async (req, res) => {  
    try {  
        const { id, username } = req.body;  

        // Check if the new username already exists for another partner  
        const existingPartner = await PartnersModel.findOne({ username });  
        if (existingPartner && existingPartner._id.toString() !== id) {  
            return res.status(400).json({  
                message: 'Username already in use by another partner.',  
            });  
        }  

        // Find the partner to be updated  
        const partnerToUpdate = await PartnersModel.findById(id);  
        if (!partnerToUpdate) {  
            return res.status(404).json({  
                message: `Partner not found`  
            });  
        }  

        // Capture the old username for updating surveys  
        const oldUsername = partnerToUpdate.username;  

        // Create an object with only the fields you want to update  
        const updateData = { username };  

        // Update the username in PartnersModel  
        const partner = await PartnersModel.findByIdAndUpdate(id, updateData, { new: true });  

        // Update all occurrences of the old username in SurveyModel  
        await SurveyModel.updateMany(  
            { username: oldUsername }, // Find surveys with the old username  
            { $set: { username } } // Update to the new username  
        ); 

        // Update all occurrences of the old username in BookingModel  
        await BookingModel.updateMany(  
            { username: oldUsername }, // Find surveys with the old username  
            { $set: { username } } // Update to the new username  
        );  

        res.status(200).json({  
            message: 'Partner updated successfully!',  
            data: partner,  
        });  

    } catch (error) {  
        console.error(error.message);  
        res.status(500).json({  
            message: error.message  
        });  
    }  
};

// Change password  
export const changePassword = async (req, res) => {  
    const { id, currentPassword, newPassword } = req.body;  

    // Validate input  
    if (!currentPassword || !newPassword) {  
        return res.status(400).json({  
            message: 'Old password and new password are required.'  
        });  
    }  

    if (newPassword.length < 6) {  
        return res.status(401).json({  
            message: 'New password must be at least 8 characters long.'  
        });  
    }  

    if (currentPassword === newPassword) {  
        return res.status(402).json({  
            message: 'Old password and new password cannot be the same.'  
        });  
    }  

    try {  
        // Find the partner by ID  
        const partner = await PartnersModel.findById(id);  
        if (!partner) {  
            return res.status(404).json({  
                message: 'Partner not found.'  
            });  
        }  

        // Check if the old password matches the hashed password in the database  
        const isMatch = await bcrypt.compare(currentPassword, partner.password);  
        if (!isMatch) {  
            return res.status(401).json({  
                message: 'Current password is incorrect.'  
            });  
        }  

        // Hash the new password  
        const salt = await bcrypt.genSalt(10);  
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);  

        // Update the password in the database  
        partner.password = hashedNewPassword;  
        await partner.save();  

        res.status(200).json({  
            message: 'Password changed successfully!'  
        });  

    } catch (error) {  
        console.error(error.message);  
        res.status(500).json({  
            message: error.message  
        });  
    }  
};

// Get all partners
export const getAllUsers = async (req, res) => {
    try {  
        const partners = await PartnersModel.find();  
        res.status(200).json(partners);  
    } catch (error) {  
        console.error('Error fetching partners:', error);  
        res.status(500).json({ message: 'Internal server error' });  
    }  
}

// Get partner by name and surname  
export const getPartnerByName = async (req, res) => {  
    const { name, surname } = req.params; // Retrieve name and surname from request parameters  

    try {  
       // Find the partner with matching name and surname  
       const partner = await PartnersModel.findOne({ name: name, surname: surname });  
        
       // If no partner is found, return a 404 status  
       if (!partner) {  
           return res.status(404).json({ message: 'Partner not found' });  
       }

        // Return the found partners  
        res.status(200).json({  
            message: 'Partner found',
            data: partner
        });
    } catch (error) {  
        console.error('Error fetching partners:', error);  
        res.status(500).json({ message: 'Internal server error' });  
    }  
};

// Follow a partner
export const followPartner = async (req, res) => {
    try {
        const { searchPartnerId } = req.params; // ID of the partner to follow
        const partnerId = req.body.partnerId; // ID of the current user (from authentication)
    
       // console.log('followPartner:');
        /* console.log('searchPartnerId:', searchPartnerId);
        console.log('partnerId:', partnerId); */

      // Validate that the searchPartnerId is provided
      if (!searchPartnerId) {
        return res.status(400).json({ message: 'Missing required parameter: searchPartnerId' });
      }
  
      const partnerToFollow = await PartnersModel.findById(searchPartnerId);
      if (!partnerToFollow) {
        return res.status(404).json({ message: 'Partner not found' });
      }
  
      // Add current user to the followers list if not already following
      if (!partnerToFollow.followers.includes(partnerId)) {
        partnerToFollow.followers.push(partnerId);
        await partnerToFollow.save();
        return res.status(200).json({ message: 'Successfully followed the partner' });
      }
  
      return res.status(400).json({ message: 'You are already following this partner' });
    } catch (error) {
      console.error('Error following partner:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  };
  

// Unfollow a partner
export const unfollowPartner = async (req, res) => {
    try {
        const { searchPartnerId } = req.params; // ID of the partner to follow
        const partnerId = req.body.partnerId; // ID of the current user (from authentication)
    
        //console.log('unfollowPartner:');
        /* console.log('searchPartnerId:', searchPartnerId);
        console.log('partnerId:', partnerId); */

      // Validate that the parameters are provided
      if (!searchPartnerId || !partnerId) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
  
      const partnerToUnfollow = await PartnersModel.findById(searchPartnerId);
      if (!partnerToUnfollow) {
        return res.status(404).json({ message: 'Partner not found' });
      }
  
      // Remove the current user from the followers list if following
      if (partnerToUnfollow.followers.includes(partnerId)) {
        partnerToUnfollow.followers = partnerToUnfollow.followers.filter(
          followerId => followerId.toString() !== partnerId.toString()
        );
        await partnerToUnfollow.save();
        return res.status(200).json({ message: 'Successfully unfollowed the partner' });
      }
  
      return res.status(400).json({ message: 'You are not following this partner' });
    } catch (error) {
      console.error('Error unfollowing partner:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  };
  
export const checkFollowStatus = async (req, res) => {
    try {
      const { searchPartnerId, partnerId } = req.params; // Extracting both parameters
  
      //console.log('checkFollowStatus:');
      /* console.log('searchPartnerId:', searchPartnerId);
      console.log('partnerId:', partnerId); */
      
      // Validate that the parameters are provided
      if (!searchPartnerId || !partnerId) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
  
      const partner = await PartnersModel.findById(searchPartnerId);
      if (!partner) {
        return res.status(404).json({ message: 'Partner not found' });
      }
  
      // Check if the current user's ID is in the followers array
      const isFollowing = partner.followers.includes(partnerId);
  
      return res.status(200).json({ isFollowing });
    } catch (error) {
      console.error('Error checking follow status:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  };
  