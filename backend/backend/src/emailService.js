const nodemailer = require("nodemailer");

/**
 * Creates a Nodemailer transporter using environment variables.
 * Make sure these exist in your .env file:
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 */
function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return null; // Return null if SMTP isn't configured yet
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Generates HTML content for the confirmation email
 */
function buildEmailHTML(record, isDemo) {
  const modeBadge = isDemo
    ? `<div style="background:#fff3cd; color:#856404; padding:10px; border-radius:5px; margin-bottom:15px; font-weight:bold; text-align:center;">
        ⚠️ DEMO MODE REGISTRATION - THIS IS A TEST EMAIL
       </div>`
    : "";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
      ${modeBadge}
      <h2 style="color: #0d6efd; text-align: center;">Chennimalai Marathon Registration Confirmation</h2>
      <p>Dear <strong>${record.fullName}</strong>,</p>
      <p>Thank you for registering! Here are your registration details:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>T-Shirt Number:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color:#d9534f; font-weight:bold;">${record.tshirtNumber}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Category:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.category}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Full Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.fullName}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>DOB:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.dob} (Age: ${record.age})</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Gender:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.gender}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>T-Shirt Size:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.tshirtSize}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Blood Group:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.bloodGroup}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>District:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.district} (${record.pincode})</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Emergency Contact:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.emergencyContact}</td></tr>
      </table>

      <p style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
        See you at the starting line! — Chennimalai Marathon Team
      </p>
    </div>
  `;
}

/**
 * Sends registration email (handles demo & live modes safely)
 */
async function sendRegistrationEmail(record, isDemo = false) {
  try {
    const transporter = createTransporter();

    // Fallback if .env SMTP is not setup yet
    if (!transporter) {
      console.warn("⚠️ SMTP environment variables not found in .env. Skipping real email dispatch.");
      console.log(`[EMAIL SIMULATION - ${isDemo ? "DEMO" : "LIVE"}] Sent to: ${record.email}`);
      return true;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Chennimalai Marathon" <noreply@marathon.com>',
      to: record.email,
      subject: isDemo 
        ? `[DEMO] Registration Received - ${record.fullName}` 
        : `Registration Confirmed - Chennimalai Marathon (${record.tshirtNumber})`,
      html: buildEmailHTML(record, isDemo),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email successfully sent to ${record.email} (Message ID: ${info.messageId})`);
    return true;

  } catch (err) {
    console.error("❌ EMAIL_SEND_ERROR:", err.message);
    // Don't throw inside demo mode so the user request still succeeds
    if (isDemo) {
      console.warn("⚠️ Email dispatch failed in Demo mode, but registration was completed successfully.");
      return false;
    }
    throw err;
  }
}

module.exports = {
  sendRegistrationEmail,
};