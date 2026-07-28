const nodemailer = require("nodemailer");

async function createTransporter() {
  const account1User = process.env.SMTP_USER_1 || process.env.GMAIL_ACCOUNT_1;
  const account1Pass = process.env.SMTP_PASS_1 || process.env.GMAIL_APP_PASSWORD_1;

  if (!account1User || !account1Pass) return null;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false,
    auth: { user: account1User, pass: account1Pass }
  });

  return { transporter, senderEmail: account1User };
}

function buildEmailHTML(record, isDemo) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1c2b3a; background-color: #f8fafc; border-radius: 8px;">
      ${isDemo ? '<div style="background: #fff3cd; color: #856404; padding: 12px; border-radius: 6px; font-weight: bold; margin-bottom: 20px; border: 1px solid #ffeba1;">⚠️ DEMO MODE TEST EMAIL — NO DATABASE ROWS WERE WRITTEN & SLOT COUNT IS UNCHANGED.</div>' : ''}
      <h2 style="color: #0d1f47; margin-bottom: 10px;">Chennimalai Marathon Registration Confirmation</h2>
      <p>Dear <strong>${record.fullName}</strong>,</p>
      <p>Thank you for registering! Your payment has been received successfully. Below are your official marathon registration details and receipt:</p>
      
      <table style="width: 100%; max-width: 550px; border-collapse: collapse; font-size: 14px; background: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 15px;">
        <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 10px; font-weight: bold; color: #4a5568;">Bib Number:</td><td style="padding: 10px; font-weight: bold; color: #2b6cb0;">${record.tshirtNumber || "N/A"}</td></tr>
        <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 10px; font-weight: bold; color: #4a5568;">Category:</td><td style="padding: 10px;">${record.category || "N/A"} (${record.participantType || "Runner"})</td></tr>
        <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 10px; font-weight: bold; color: #4a5568;">Full Name:</td><td style="padding: 10px;">${record.fullName || "N/A"}</td></tr>
        <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 10px; font-weight: bold; color: #4a5568;">Email:</td><td style="padding: 10px;">${record.email || "N/A"}</td></tr>
        <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 10px; font-weight: bold; color: #4a5568;">Phone:</td><td style="padding: 10px;">${record.phone || "N/A"}</td></tr>
        <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 10px; font-weight: bold; color: #4a5568;">T-Shirt Size:</td><td style="padding: 10px;">${record.tshirtSize || "N/A"} (${record.tshirtSelected ? 'Included' : 'Not Opted'})</td></tr>
        <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 10px; font-weight: bold; color: #4a5568;">Blood Group:</td><td style="padding: 10px;">${record.bloodGroup || "N/A"}</td></tr>
        <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 10px; font-weight: bold; color: #4a5568;">Registration Fee:</td><td style="padding: 10px;">₹${record.registrationFee || 0}</td></tr>
        <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 10px; font-weight: bold; color: #4a5568;">T-Shirt Fee:</td><td style="padding: 10px;">₹${record.tshirtFee || 0}</td></tr>
        <tr style="border-bottom: 2px solid #3182ce;"><td style="padding: 10px; font-weight: bold; color: #2d3748; font-size: 16px;">Total Amount Paid:</td><td style="padding: 10px; font-weight: bold; color: #2b6cb0; font-size: 16px;">₹${record.totalAmount || 0}</td></tr>
        <tr><td style="padding: 10px; font-weight: bold; color: #4a5568;">Payment ID:</td><td style="padding: 10px; color: #718096; font-size: 12px;">${record.razorpayPaymentId || "N/A"}</td></tr>
      </table>

      <p style="color: #276749; font-weight: bold; margin-top: 20px; font-size: 15px;">See you at the starting line on 30 August 2026 (Flag-off: 5:55 AM)!</p>
    </div>
  `;
}

async function sendRegistrationEmail(record, isDemo = false) {
  try {
    const smtpObj = await createTransporter();
    if (!smtpObj) {
      console.log(`✉️ [EMAIL LOG - ${isDemo ? "DEMO" : "LIVE"}] Confirmation for ${record.email} (Bib: ${record.tshirtNumber}, Total: ₹${record.totalAmount})`);
      return true;
    }

    const mailOptions = {
      from: `"Chennimalai Marathon" <${smtpObj.senderEmail}>`,
      to: record.email,
      subject: `${isDemo ? "[DEMO TEST] " : ""}Registration Confirmed - Chennimalai Marathon (Bib #${record.tshirtNumber})`,
      html: buildEmailHTML(record, isDemo)
    };

    await smtpObj.transporter.sendMail(mailOptions);
    console.log(`✉️ Confirmation email sent to ${record.email}`);
    return true;
  } catch (err) {
    console.error("❌ EMAIL_SEND_ERROR:", err.message);
    if (isDemo) return false;
    return false;
  }
}

async function sendOTPEmail(email, otp) {
  try {
    const smtpObj = await createTransporter();
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1a202c; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2b6cb0;">Chennimalai Marathon - Admin OTP Login</h2>
        <p>Hello Admin,</p>
        <p>Your One-Time Password (OTP) for logging in to the Chennimalai Marathon Admin Dashboard is:</p>
        <div style="background: #edf2f7; font-size: 28px; font-weight: bold; letter-spacing: 5px; text-align: center; padding: 15px; border-radius: 6px; color: #2d3748; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #718096; font-size: 13px;">This OTP will expire in 10 minutes. If you did not request this login, please ignore this email.</p>
      </div>
    `;

    console.log(`🔑 [ADMIN OTP DISPATCHED] Email: ${email} | OTP Code: ${otp}`);

    if (smtpObj) {
      await smtpObj.transporter.sendMail({
        from: `"Chennimalai Marathon Admin" <${smtpObj.senderEmail}>`,
        to: email,
        subject: `Your Admin Verification Code: ${otp}`,
        html: htmlContent
      });
    }
    return true;
  } catch (err) {
    console.error("❌ OTP_EMAIL_ERROR:", err.message);
    return false;
  }
}

module.exports = { sendRegistrationEmail, sendOTPEmail };
