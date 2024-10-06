export const userNotificationEmailTemplate = (userBooking) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">

    <header style="text-align: center; padding: 10px; background-color: #f4f4f4;">
      <span style="font-family: sans-serif; font-size: 20px; font-weight: bold; color: #0e0d17;">Diamond Project Online</span>
    </header>

    <main style="padding: 20px;">
      <h2>Your One-on-One Session is Confirmed – Let’s Unlock Your Potential!</h2>

      <p>Hi <strong>${userBooking.name.toUpperCase()}</strong>,</p>

      <p>
        Fantastic news! Your one-on-one session with Diamond Project Online has been successfully booked. 
        This is your chance to explore how our platform can help you achieve financial freedom and personal growth.
      </p>

      <h3>
      Here are some of the benefits you stand to get on the session:
      </h3>

      <ul>
        <ol>Learn how our system works and how you can start generating income online.</ol>
        <ol>Get personalized guidance tailored to your business goals.</ol>
        <ol>Understand the tools and mentorship available to support your success.</ol>
        <ol>Ask personalized questions and get answers directly from our top consultants and more.</ol>
      </ul>

      <h3>
        Here are the session details:
      </h3>

     <ul>
        <li><strong>Date: </strong> ${new Date(userBooking.consultDate)}<</ol>
        <li><strong>Time: </strong> ${userBooking.consultTime}</li>
        <li><strong>Platform: </strong> ${userBooking.contactMethod}</li>
        <li><strong>Purpose: </strong> ${userBooking.reason}</li>
      </ul>


      <p>
      If you have further questions, please visit our <a href="https://diamondprojectonline.com/faq" style="color: #007BFF;">FAQ page</a> for answers to some questions about our business or reach out to us at contacts@diamondprojectonline.com
      </p>

      <p>
      Let's build your digital legacy together!
      </p>

      <p>
      Best regards,
      <br>
      Alex Imenwo
      <br>
      <strong>Diamond Project Online Team</strong>
      </p>

    </main>

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
