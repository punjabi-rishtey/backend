const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text) => {
  if (process.env.DEMO_LOCAL_MEDIA === "true") {
    const { assertDemoIsolated } = require("../config/demoGuard");
    assertDemoIsolated();
    console.log("Demo mode skipped outbound email.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: process.env.EMAIL_USER, // Set in .env
        pass: process.env.EMAIL_PASS, // Set in .env
      },
    });

    await transporter.sendMail({
      from: `"Matrimonial App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email could not be sent");
  }
};

module.exports = sendEmail;
