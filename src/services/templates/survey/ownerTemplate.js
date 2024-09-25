export const ownerEmailTemplate = (surveyData) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
    <header style="text-align: center; padding: 10px; background-color: #f4f4f4;">
      <span style="font-family: sans-serif; font-size: 20px; font-weight: bold; color: black;">Diamond Project Online</span>
    </header>
    <main style="padding: 20px;">
      <h1>Survey Submission</h1>
      <p>A prospect named <strong>${surveyData.name} ${surveyData.surname}</strong> with phone number <strong>${surveyData.phoneNumber}</strong> just submitted the survey form from <a href="https://diamondprojectonline.com">Diamond Project Online</a>.</p>
      <p>You may need to follow up with the user via WhatsApp or phone call.</p>
      <h2>Prospect Contact Details</h2>
      <p><strong>Name:</strong> ${surveyData.name}</p>
      <p><strong>Surname:</strong> ${surveyData.surname}</p>
      <p><strong>Email address:</strong> ${surveyData.email}</p>
      <p><strong>Phone number:</strong> ${surveyData.phoneNumber}</p>
      <br>
      <div style="text-align: center;">
        <a href="https://partners.diamondprojectonline.com/" style="padding: 10px 20px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 5px; text-align: center; margin: 1em 0;">Go to Partner Dashboard</a>
      </div>
    </main>
    <br>
    <footer style="text-align: center; padding: 20px; background-color: #f4f4f4; ; margin-top: 20px;"">
      <p>Follow us on:
        <a href="https://www.facebook.com/profile.php?id=61561933352527" style="margin: 0 5px;">Facebook</a> |
      </p>
      <p><a href="https://diamondprojectonline.com/legal/privacy">Privacy</a> | 
        <a href="https://diamondprojectonline.com/legal/terms">Terms</a> | 
      </p>
    </footer>
  </div>
`;
