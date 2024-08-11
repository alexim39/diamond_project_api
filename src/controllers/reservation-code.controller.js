import {ReservationCodeModel} from '../models/reservation-code.model.js';
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

  
// submit code
/* export const submitReservationCode = async (req, res) => {
    try { 

        //const { username, channel } = req.body;
        const { body } = req;

        // Check if the code already exists in the database
        const existingCode = await ReservationCodeModel.findOne({ code: body.code }).exec();  
  
        if (existingCode) {  
            return res.status(400).json({  
                message: 'Code exist',  
                code: '400',
            });  
        }  
  
        // Create a new document using the data from the request body  
        const newCode = new ReservationCodeModel(body);  
  
        // Save the document to the database  
        await newCode.save();
  
       res.status(201).json({  
            message: 'Code created successfully!',  
            data: newCode, // Include the saved data in the response  
        });


    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: error.message
        })
    }
}
 */

export const submitReservationCode = async (req, res) => {
    try {  
        const { code, partnerId, prospectId } = req.body;

        // Check if the reservation code exists  
        const existingCode = await ReservationCodeModel.findOne({ code });  

        if (existingCode) {  
            // If the code exists, check its status  
            if (existingCode.status === 'Pending') {  
                //throw new Error('The code has not been approved.');  
                return res.status(400).send({  
                    message: 'The code has not been approved',  
                    code: '400',
                }); 
            } else if (existingCode.status === 'Approved') {  
                //throw new Error('The code has already been used.'); 
                return res.status(401).send({  
                    message: 'The code has already been used',  
                    code: '401',
                });  
            }  
        }  

        // If the code does not exist or is approved, save the new reservation code  
        const newReservationCode = new ReservationCodeModel({  
            code,  
            partnerId,  
            prospectId,  
            //status: 'Pending' // or set to whatever status is appropriate  
        });  

        await newReservationCode.save();  
        //return { success: true, message: 'Reservation code saved successfully.' };  
        res.status(201).json({  
            message: 'Code created successfully!',  
            data: newReservationCode, // Include the saved data in the response  
        });

    } catch (error) {  
        return { success: false, message: error.message };  
    }  
}  
