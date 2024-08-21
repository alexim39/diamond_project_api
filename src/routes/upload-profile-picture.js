import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import {PartnersModel} from '../models/partner.model.js';


const ProfilePictureRouter = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'src/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${req.params.userId}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
  
const upload = multer({ storage: storage });
  

// upload profile picture
ProfilePictureRouter.post('/image/:userId', upload.single('profilePicture'), async (req, res) => {
    const userId = req.params.userId; // Get user ID from the request parameters

    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    try {

       /*  // Find the current user and check if they already have a profile image
        const currentUser = await PartnersModel.findById(userId);
        if (!currentUser) {
            return res.status(404).send('User not found.');
        }

        // If the user has a current profile image, delete the old image file
        if (currentUser.profileImage) {
            console.log('Current User:', currentUser);
            console.log('Profile Image:', currentUser.profileImage);

            const oldImagePath = path.join(__dirname, '..', 'src', 'uploads', currentUser.profileImage);
            console.log('Old Image Path:', oldImagePath);

            // Ensure the oldImagePath exists before attempting to delete it
            fs.access(oldImagePath, fs.constants.F_OK, (err) => {
                if (err) {
                    console.error(`Image file does not exist: ${oldImagePath}`);
                } else {
                    fs.unlink(oldImagePath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error(`Failed to delete old image: ${unlinkErr.message}`);
                        } else {
                            console.log('Old profile image deleted successfully.');
                        }
                    });
                }
            });
        } */

        // Update the user's profileImage field with the new file path
        const updatedPartner = await PartnersModel.findByIdAndUpdate(
            userId,
            { profileImage: req.file.filename }, // Save the path to the image
            { new: true, runValidators: true }
        );

        if (!updatedPartner) {
            return res.status(404).send('User not found.');
        }

        res.status(200).json({
            message: 'Profile picture updated successfully.',
            profileImageName: updatedPartner.profileImage
        });
    } catch (error) {
        res.status(500).json({ error: `Failed to update profile picture: ${error.message}` });
    }

});


export default ProfilePictureRouter;