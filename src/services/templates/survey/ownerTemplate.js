export const ownerEmailTemplate = (surveyData) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
    <header style="text-align: center; padding: 10px; background-color: #f4f4f4;">
      <span style="font-family: sans-serif; font-size: 20px; font-weight: bold; color: #0e0d17;">Diamond Project Online</span>
    </header>
    <main style="padding: 20px;">
      <h2>Survey Submission</h2>
      <p>A prospect named <strong>${surveyData.name.toUpperCase()} ${surveyData.surname.toUpperCase()}</strong> with phone number <strong>${surveyData.phoneNumber}</strong> just submitted the survey form from <a href="https://diamondprojectonline.com">Diamond Project Online</a>.</p>
      <p>You may need to follow up with the user via WhatsApp or phone call.</p>

      <h3>Prospect Contact Details</h3>

      <ul>
        <li><strong>Name: </strong> ${surveyData.name.toUpperCase()}</ol>
        <li><strong>Surname: </strong> ${surveyData.surname.toUpperCase()}</li>
        <li><strong>Country: </strong> ${surveyData.country}</li>
        <li><strong>State: </strong> ${surveyData.state}</li>
      </ul>

      <br>
      <div style="text-align: center;">
        <a href="https://partners.diamondprojectonline.com/" style="padding: 10px 20px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 5px; text-align: center; margin: 1em 0;">Go to Partners Platform</a>
      </div>
    </main>
    <br>
    <footer style="text-align: center; padding: 20px; background-color: #f4f4f4; margin-top: 20px;">
     <p>Diamond Project: Becoming the ultimate version of yourself  </p>
    </footer>
  </div>
`;


export const partnerOwnerEmailTemplate = (surveyData) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
    <header style="text-align: center; padding: 10px; background-color: #f4f4f4;">
      <span style="font-family: sans-serif; font-size: 20px; font-weight: bold; color: #0e0d17;">Diamond Project Online</span>
    </header>
    <main style="padding: 20px;">
      <h2>Partner Survey Submission</h2>
      <p>A partner named <strong>${surveyData.name.toUpperCase()} </strong> with phone number <strong>${surveyData.phoneNumber}</strong> just submitted the survey form from <a href="https://survey.diamondprojectonline.com">Diamond Project Online Survey</a>.</p>
      <p>This is just for your information</p>

      <h3>Prospect Contact Details</h3>

      <ul>
        <li><strong>Name: </strong> ${surveyData.name.toUpperCase()}</ol>
        <li><strong>Phone number: </strong> ${surveyData.phoneNumber}</li>
      </ul>

      <br>
      <div style="text-align: center;">
        <a href="https://partners.diamondprojectonline.com/" style="padding: 10px 20px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 5px; text-align: center; margin: 1em 0;">Go to Partners Platform</a>
      </div>
    </main>
    <br>
    <footer style="text-align: center; padding: 20px; background-color: #f4f4f4; margin-top: 20px;">
     <p>Diamond Project: Becoming the ultimate version of yourself  </p>
    </footer>
  </div>
`;