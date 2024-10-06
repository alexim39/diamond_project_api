export const userWelcomeEmailTemplate = (surveyData) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">

    <header style="text-align: center; padding: 10px; background-color: #f4f4f4;">
      <span style="font-family: sans-serif; font-size: 20px; font-weight: bold; color: #0e0d17;">Diamond Project Online</span>
    </header>

    <main style="padding: 20px;">
      <h2>Welcome to Diamond Project Online - Your Path to Digital Freedom</h2>

      <p>Hi <strong>${surveyData.name.toUpperCase()}</strong>,</p>

      <p>
      Thank you for taking the time to visit Diamond Project Online and complete our survey. 
      We're excited to introduce you to a unique opportunity that could transform your life.
      </p>

      <p>
      Diamond Project Online is more than just a business platform - it's your gateway to financial freedom in the digital world. 
      We've combined the power of digital marketing with dynamic online partnership programs to create a system that empowers entrepreneurs like you.
      </p>

      <p>
      Here's what makes Diamond Project Online special:
      </p>

      <ul>
      <ol><strong>Global Reach: </strong> Connect with customers and partners worldwide, all from the comfort of your home.</ol>
      <ol><strong>Flexibility: </strong> Work on your own terms, anytime and anywhere.</ol>
      <ol><strong>Passive Income Potential: </strong> Build residual income streams that work for you 24/7.</ol>
      <ol><strong>Personal Branding: </strong> Establish your authority and grow your influence online.</ol>
      <ol><strong>Scalability: </strong>Expand your business without limits.</ol>
      <ol><strong>Expert Mentorship: </strong> Benefit from our comprehensive training programs and step-by-step guidance.</ol>
      </ul>

      <p>
      When you join us, you'll receive a personalized link and access to our advanced online software, making it effortless to promote, manage, and grow your business.
      </p>

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

      <div style="text-align: center;">
        <a href="https://diamondprojectonline.com/plans" style="padding: 10px 20px; background-color: #28A745; color: white; text-decoration: none; border-radius: 5px; text-align: center; margin: 1em 0;">Get Started Now</a>
      </div>

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
