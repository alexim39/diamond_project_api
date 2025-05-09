import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import { PartnersModel } from '../apps/partner/models/partner.model.js';

const ProfileImageRouter = express.Router();

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
ProfileImageRouter.post('/profile/:userId', upload.single('profilePicture'), async (req, res) => {
    const userId = req.params.userId; // Get user ID from the request parameters

    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded. Please upload a profile picture.',
        success: false
      });
    }

    try {

        // Find the current user and check if they already have a profile image
        const currentUser = await PartnersModel.findById(userId);
        if (!currentUser) {
            return res.status(404).json({
                message: 'User not found.',
                success: false
            });
        }

        // If the user has a current profile image, delete the old image file
        if (currentUser.profileImage) {

            // Convert `import.meta.url` to `__dirname` equivalent
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            //const oldImagePath = path.join(__dirname, '..', 'src', 'uploads', currentUser.profileImage);
            const oldImagePath = path.join(__dirname, '..', 'uploads', currentUser.profileImage);
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
        }

        // Update the user's profileImage field with the new file path
        const updatedPartner = await PartnersModel.findByIdAndUpdate(
            userId,
            { profileImage: req.file.filename }, // Save the path to the image
            { new: true, runValidators: true }
        );

        if (!updatedPartner) {
            return res.status(404).json({
                message: 'User not found.',
                success: false
            });
        }

        res.status(200).json({
            message: 'Profile picture updated successfully.',
            //profileImageName: updatedPartner.profileImage
            success: true,
            //profileImage: `http://localhost:3000/uploads/${updatedPartner.profileImage}` // Adjust the URL as needed
        });
    } catch (error) {
        res.status(500).json({ 
            message: `Failed to update profile picture: ${error.message}`,
            success: false
        });
    }

});


export default ProfileImageRouter;