export const userWelcomeEmailTemplate = (surveyData) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">

    <header style="text-align: center; padding: 10px; background-color: #f4f4f4;">
      <span style="font-family: sans-serif; font-size: 20px; font-weight: bold; color: #0e0d17;">Diamond Project Online</span>
    </header>

    <main style="padding: 20px;">

      <p>Hi ${surveyData.name.toUpperCase()},</p>

      <p>
      Thank you for taking the time to visit Diamond Project Online and completing our survey. 
      We're excited to introduce you to a unique opportunity that could transform your life.
      </p>

      <p>
      Diamond Project is more than just a project - it's your gateway to freedom in the digital world. 
      We've combined the power of digital marketing with dynamic online partnership programs to create a system that empowers people like you.
      </p>

      <p>
      Here's what makes Diamond Project Online special:
      </p>

      <ul>
      <ol><strong>Global Reach: </strong> Connect with partners worldwide, all from the comfort of your home.</ol>
      <ol><strong>Passive Income Potential: </strong> Build residual income streams that work for you 24/7.</ol>
      <ol><strong>Personal Branding: </strong> Establish your authority and grow your influence online.</ol>
      <ol><strong>Scalability: </strong>Expand your business without limits.</ol>
      <ol><strong>Expert Mentorship: </strong> Benefit from our comprehensive training programs and step-by-step guidance.</ol>
      </ul>

      <p>
      When you join us, you'll receive a personalized link and access to our advanced online platform, making it effortless to promote, manage, and grow your business.
      </p>

      <p>
      If you have further questions, kindly reach out to us at contacts@diamondprojectonline.com
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
    <br>
    <footer style="text-align: center; padding: 20px; background-color: #f4f4f4; margin-top: 20px;">
     <p>Diamond Project: Becoming the ultimate version of yourself  </p>
    </footer>
  </div>
`;
