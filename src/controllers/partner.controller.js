import {PartnersModel, ReservationCodeModel} from '../models/partner.model.js';
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

    //console.log('body== ',req.body)

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