import nodemailer from 'nodemailer';

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: 'c21fg.online',
  secure: true,
  port: 465,
  auth: {
    user: 'alex.i@c21fg.online', // your email
    pass: process.env.EMAILPASS, // stored in environment variables
  },
});
/* const transporter = nodemailer.createTransport({
  host: 'async.ng',
  secure: true,
  port: 465,
  auth: {
    user: 'alex.i@async.ng', // your email
    pass: process.env.EMAILPASS, // stored in environment variables
  },
}); */

/* const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
     user: 'ago.fnc@gmail.com', // your email
    pass: process.env.EMAILPASS, // stored in environment variables
  },
}); */

// Reusable function to send emails
export const sendEmail = async (email, subject, htmlContent) => {
  try {
    await transporter.sendMail({
      from: 'noreply@c21fg.online', // Sender email
      to: email,
      subject: subject,
      html: htmlContent,
    });
    console.log(`Email sent to ${email}`);
  } catch (error) {
    console.error(`Error sending email to ${email}: ${error.message}`);
  }
};
