import cron from 'node-cron';
import { PartnersModel } from "../models/partner.model.js";
import { sendEmail } from "../../../services/emailService.js";
import { userBirthdayEmailTemplate } from '../services/email/birthday.js';

// Function to send a birthday notification (replace with your actual logic)
async function sendBirthdayNotification(user) {
  console.log(`Sending birthday notification to: ${user}`);
  // Implement your notification sending logic here (e.g., using a mailing service)

  // Send welcome email to the user
  const userSubject = `Happy Birthday, ${user.name.toUpperCase()}!`;
  const userMessage = userBirthdayEmailTemplate(user);
  await sendEmail(user.email, userSubject, userMessage);
  

}

// Schedule the job to run every day at a specific time (e.g., 8:00 AM)
cron.schedule('0 8 * * *', async () => {
  try {
    const today = new Date();
    const todayMonth = today.getMonth(); // Get current month (0-11)
    const todayDate = today.getDate(); // Get current date (1-31)

    const users = await PartnersModel.find({ dobDatePicker: { $ne: null } }); // Find users with a recorded DoB

   /*  for (const user of users) {
      const dob = new Date(user.dobDatePicker); // Convert DoB to a Date object
      if (!isNaN(dob) && dob.getMonth() === todayMonth && dob.getDate() === todayDate) {
        await sendBirthdayNotification(user);
      }
    } */

    for (const user of users) {
      if (!user.dobDatePicker) continue;
      const dob = new Date(user.dobDatePicker);
      if (dob instanceof Date && !isNaN(dob.getTime())) {
        if (dob.getMonth() === todayMonth && dob.getDate() === todayDate) {
          await sendBirthdayNotification(user);
        }
      }
    }

    console.log('Checked for birthdays and sent notifications (if any).');
  } catch (error) {
    console.error('Error during birthday notification job:', error);
  }
});

console.log('Birthday notification job scheduled.');