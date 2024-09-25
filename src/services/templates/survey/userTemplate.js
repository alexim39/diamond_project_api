export const userWelcomeEmailTemplate = (surveyData) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
    <header style="text-align: center; padding: 10px; background-color: #f4f4f4;">
      /* <img src="https://diamondprojectonline.com/logo.png" alt="Diamond Project" style="width: 150px;"> */
      <span style="font-family: sans-serif; font-size: 20px; font-weight: bold; color: black;">Diamond Project Online</span>
    </header>
    <main style="padding: 20px;">
      <h1>Welcome to Diamond Project</h1>
      <p>Dear <strong>${surveyData.name}</strong>,</p>
      <p>Thank you for your interest in Diamond Project! We are excited to have you on board.</p>
      <p>If you have any questions, please visit our <a href="https://diamondprojectonline.com/faq" style="color: #007BFF;">FAQ page</a> for answers to common questions.</p>
      <br>
      <div style="text-align: center;">
        <a href="https://diamondprojectonline.com/dashboard" style="padding: 10px 20px; background-color: #28A745; color: white; text-decoration: none; border-radius: 5px; text-align: center; margin: 1em 0;">Visit Your Dashboard</a>
      </div>
    </main>
    <br>
    <footer style="text-align: center; padding: 20px; background-color: #f4f4f4; margin-top: 20px;">
     <p>Follow us on:
        <a href="https://www.facebook.com/profile.php?id=61561933352527" style="margin: 0 5px;">Facebook</a> |
      </p>
      <p><a href="https://diamondprojectonline.com/legal/privacy">Privacy</a> | 
        <a href="https://diamondprojectonline.com/legal/terms">Terms</a> | 
        <a href="#">Unsubscribe</a>
      </p>
    </footer>
  </div>
`;
