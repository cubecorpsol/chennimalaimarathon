const nodemailer = require("nodemailer");
const axios = require("axios");

// GoHighLevel (GHL) API Sender with Automatic Contact Upsert & Tagging
async function sendViaGHL(recipientData, subject, htmlContent) {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!token || !locationId) return false;

  const headers = {
    Authorization: `Bearer ${token}`,
    Version: "2021-07-28",
    "Content-Type": "application/json"
  };

  // Parse recipient information
  const toEmail = typeof recipientData === "string" ? recipientData : recipientData.email;
  const fullName = typeof recipientData === "object" && recipientData.fullName ? recipientData.fullName : "Runner";
  const nameParts = fullName.trim().split(" ");
  const firstName = nameParts[0] || "Runner";
  const lastName = nameParts.slice(1).join(" ") || "";
  const rawPhone = typeof recipientData === "object" ? recipientData.phone || "" : "";
  const cleanPhone = String(rawPhone).replace(/[^\d+]/g, "").trim();

  // Step 1: Upsert Contact in GHL to get a valid contactId
  const upsertUrl = "https://services.leadconnectorhq.com/contacts/upsert";
  const upsertPayload = {
    locationId: locationId,
    email: toEmail,
    firstName: firstName,
    lastName: lastName,
    tags: ["Chennimalai Marathon", "Confirmed Runner"]
  };

  // Only include phone if valid length to prevent GHL API 400 validation errors
  if (cleanPhone && cleanPhone.length >= 10) {
    upsertPayload.phone = cleanPhone;
  }

  const upsertRes = await axios.post(upsertUrl, upsertPayload, { headers });
  const contactId = upsertRes.data?.contact?.id || upsertRes.data?.id || upsertRes.data?.contactId;

  if (!contactId) {
    throw new Error("Could not retrieve GHL Contact ID during upsert");
  }

  // Step 2: Send Email Message using the retrieved contactId
  const msgUrl = "https://services.leadconnectorhq.com/conversations/messages";
  const msgPayload = {
    type: "Email",
    contactId: contactId,
    subject: subject,
    html: htmlContent
  };

  if (process.env.GHL_FROM_EMAIL) {
    msgPayload.emailFrom = process.env.GHL_FROM_EMAIL;
  }

  const msgRes = await axios.post(msgUrl, msgPayload, { headers });
  return msgRes.status >= 200 && msgRes.status < 300;
}

// Nodemailer SMTP Transporter (Fallback)
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
    ${isDemo ? '<div style="background:#fff3cd;color:#856404;padding:10px;margin-bottom:15px;border-radius:5px;font-weight:bold;">⚠️ DEMO MODE TEST EMAIL — NO DATABASE ROWS WERE WRITTEN & SLOT COUNT IS UNCHANGED.</div>' : ''}
    <h2>Chennimalai Marathon Registration Confirmation</h2>
    <p>Dear <strong>${record.fullName || "Runner"}</strong>,</p>
    <p>Thank you for registering! Your payment has been received successfully. Below are your official marathon registration details and receipt:</p>
    <ul>
      <li><strong>Bib Number:</strong> ${record.tshirtNumber || "N/A"}</li>
      <li><strong>Category:</strong> ${record.category || "N/A"} (${record.participantType || "Runner"})</li>
      <li><strong>Full Name:</strong> ${record.fullName || "N/A"}</li>
      <li><strong>Email:</strong> ${record.email || "N/A"}</li>
      <li><strong>Phone:</strong> ${record.phone || "N/A"}</li>
      <li><strong>T-Shirt Size:</strong> ${record.tshirtSize || "N/A"} (${record.tshirtSelected ? 'Included' : 'Not Opted'})</li>
      <li><strong>Blood Group:</strong> ${record.bloodGroup || "N/A"}</li>
      <li><strong>Registration Fee:</strong> ₹${record.registrationFee || 0}</li>
      <li><strong>T-Shirt Fee:</strong> ₹${record.tshirtFee || 0}</li>
      <li><strong>Total Amount Paid:</strong> ₹${record.totalAmount || 0}</li>
      <li><strong>Payment ID:</strong> ${record.razorpayPaymentId || record.payuMihpayid || "N/A"}</li>
    </ul>
    <p>See you at the starting line on 30 August 2026 (Flag-off: 5:55 AM)!</p>
  `;
}

async function sendRegistrationEmail(record, isDemo = false) {
  const subject = `${isDemo ? "[DEMO TEST] " : ""}Registration Confirmed - Chennimalai Marathon (Bib #${record.tshirtNumber || "N/A"})`;
  const htmlContent = buildEmailHTML(record, isDemo);

  // 1. Primary Method: GoHighLevel (GHL) API
  if (process.env.GHL_PRIVATE_INTEGRATION_TOKEN && process.env.GHL_LOCATION_ID) {
    try {
      await sendViaGHL(record, subject, htmlContent);
      console.log(`✉️ [GHL API] Confirmation email sent to ${record.email}`);
      return true;
    } catch (ghlErr) {
      console.error("❌ GHL_EMAIL_SEND_ERROR:", ghlErr.response?.data || ghlErr.message);
    }
  }

  // 2. Secondary Method: Fallback to SMTP
  try {
    const smtpObj = await createTransporter();
    if (!smtpObj) {
      console.log(`✉️ [LOG ONLY] Email dispatched for ${record.email} (Bib: ${record.tshirtNumber})`);
      return true;
    }

    const mailOptions = {
      from: `"Chennimalai Marathon" <${smtpObj.senderEmail}>`,
      to: record.email,
      subject: subject,
      html: htmlContent
    };

    await smtpObj.transporter.sendMail(mailOptions);
    console.log(`✉️ [SMTP] Confirmation email sent to ${record.email}`);
    return true;
  } catch (err) {
    console.error("❌ SMTP_EMAIL_SEND_ERROR:", err.message);
    return false;
  }
}

async function sendOTPEmail(email, otp) {
  const subject = `Your Admin Verification Code: ${otp}`;
  const htmlContent = `
    <h2>Chennimalai Marathon - Admin OTP Login</h2>
    <p>Hello Admin,</p>
    <p>Your One-Time Password (OTP) for logging in to the Chennimalai Marathon Admin Dashboard is: <strong>${otp}</strong></p>
    <p>This OTP will expire in 10 minutes. If you did not request this login, please ignore this email.</p>
  `;

  if (process.env.GHL_PRIVATE_INTEGRATION_TOKEN && process.env.GHL_LOCATION_ID) {
    try {
      await sendViaGHL({ email: email, fullName: "Admin" }, subject, htmlContent);
      console.log(`🔑 [GHL API] OTP sent to ${email}`);
      return true;
    } catch (ghlErr) {
      console.error("❌ GHL_OTP_ERROR:", ghlErr.response?.data || ghlErr.message);
    }
  }

  try {
    const smtpObj = await createTransporter();
    console.log(`🔑 [ADMIN OTP DISPATCHED] Email: ${email} | OTP Code: ${otp}`);
    if (smtpObj) {
      await smtpObj.transporter.sendMail({
        from: `"Chennimalai Marathon Admin" <${smtpObj.senderEmail}>`,
        to: email,
        subject: subject,
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
