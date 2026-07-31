const nodemailer = require("nodemailer");
const axios = require("axios");

/**
 * Builds a mobile-responsive HTML email template matching the frontend website design system.
 */
function buildResponsiveEmailWrapper({ previewText = "", headerSubtitle = "", contentHtml = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Chennimalai Marathon 2026</title>
  <style>
    /* Reset & Client-Specific Styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #1c2b3a; }

    /* Mobile Responsive Overrides */
    @media only screen and (max-width: 600px) {
      .email-wrapper { width: 100% !important; padding: 10px 6px !important; }
      .email-card { width: 100% !important; border-radius: 10px !important; }
      .header-padding { padding: 20px 16px !important; }
      .body-padding { padding: 20px 16px !important; }
      .footer-padding { padding: 20px 16px !important; }
      .brand-title { font-size: 18px !important; }
      .brand-tagline { font-size: 11px !important; }
      .logo-img { width: 56px !important; height: 56px !important; }
      .mobile-full-width { width: 100% !important; display: block !important; box-sizing: border-box !important; }
      .mobile-center { text-align: center !important; }
      .mobile-stack-cell { display: block !important; width: 100% !important; text-align: left !important; padding: 4px 0 !important; box-sizing: border-box !important; }
      .mobile-val-right { text-align: left !important; font-weight: 700 !important; }
      .cta-button { display: block !important; width: 100% !important; text-align: center !important; box-sizing: border-box !important; padding: 16px 12px !important; font-size: 16px !important; }
      .info-table td { font-size: 13px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;">

  ${previewText ? `<div style="display: none; font-size: 1px; color: #f1f5f9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${previewText}</div>` : ''}

  <!-- Main Outer Table -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f1f5f9; padding: 24px 0;">
    <tr>
      <td align="center" class="email-wrapper" style="padding: 0 12px;">

        <!-- Email Container Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-card" style="background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(13, 31, 71, 0.08); border: 1px solid #e2e8f0; max-width: 600px; width: 100%;">
          
          <!-- Top Accent Divider Bar -->
          <tr>
            <td height="5" style="background: linear-gradient(90deg, #f5a623 0%, #1f6d3f 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header Section (Navy Theme matching Website Header) -->
          <tr>
            <td style="background-color: #0d1f47; padding: 26px 28px;" class="header-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="70" valign="middle" style="padding-right: 16px;">
                    <img src="https://www.chennimalaimarathon.com/images/logo.webp" alt="Chennimalai Marathon Logo" width="68" height="68" class="logo-img" style="display: block; border: 0; outline: none;">
                  </td>
                  <td valign="middle">
                    <h1 class="brand-title" style="color: #ffffff; font-family: 'Poppins', 'Segoe UI', sans-serif; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: 0.5px; line-height: 1.2;">CHENNIMALAI MARATHON</h1>
                    <div class="brand-tagline" style="color: #f5a623; font-weight: 600; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.8px;">
                      Where Fitness Meets Heritage
                    </div>
                    ${headerSubtitle ? `<div style="color: #cbd5e1; font-size: 13px; margin-top: 4px; font-weight: 500;">${headerSubtitle}</div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content Area -->
          <tr>
            <td style="padding: 28px 28px 24px 28px; background-color: #ffffff;" class="body-padding">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer Section (Navy Theme matching Website Footer) -->
          <tr>
            <td style="background-color: #0a1836; color: #94a3b8; padding: 24px 28px; font-size: 13px; border-top: 1px solid #1e293b;" class="footer-padding">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 14px;">
                    <div style="font-family: 'Poppins', sans-serif; font-weight: 700; color: #ffffff; font-size: 15px; letter-spacing: 0.5px; margin-bottom: 4px;">
                      CHENNIMALAI MARATHON 2026
                    </div>
                    <div style="color: #f5a623; font-size: 12px; font-style: italic;">Where Fitness Meets Heritage</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="https://www.chennimalaimarathon.com" target="_blank" style="color: #7ed99a; text-decoration: none; font-weight: 600; margin: 0 8px; display: inline-block;">🌐 Website</a>
                    <span style="color: #334155;">|</span>
                    <a href="mailto:info@chennimalaimarathon.in" style="color: #7ed99a; text-decoration: none; font-weight: 600; margin: 0 8px; display: inline-block;">✉️ Contact Support</a>
                    <span style="color: #334155;">|</span>
                    <a href="https://www.instagram.com/chennimalai_marathon?igsh=MXM0Mmk0bDFtZGUwNg%3D%3D&utm_source=qr" target="_blank" style="color: #7ed99a; text-decoration: none; font-weight: 600; margin: 0 8px; display: inline-block;">📷 Instagram</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="border-top: 1px solid #1e293b; padding-top: 14px; font-size: 12px; color: #64748b; line-height: 1.4;">
                    © 2026 Chennimalai Marathon. All Rights Reserved.<br>
                    Official Support: <a href="mailto:info@chennimalaimarathon.in" style="color: #94a3b8;">info@chennimalaimarathon.in</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

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

function buildEmailHTML(record, isDev) {
  const bibDisplay = (record.tshirtNumber && record.tshirtNumber !== "N/A") ? `#${record.tshirtNumber}` : "Pending Assignment";
  const paymentIdDisplay = record.razorpayPaymentId || record.payuMihpayid || record.razorpayOrderId || "N/A";

  const regFee = record.registrationFee || 0;
  const tshirtFee = record.tshirtFee || 0;
  const subtotal = regFee + tshirtFee;
  const pgFee = record.pgFee !== undefined && record.pgFee > 0 ? record.pgFee : Number((subtotal * 0.025).toFixed(2));
  const totalAmount = record.totalAmount || Number((subtotal + pgFee).toFixed(2));

  const contentHtml = `
    ${isDev ? '<div style="background:#fff3cd;color:#856404;padding:12px;margin-bottom:18px;border-radius:8px;font-weight:bold;font-size:13px;">⚠️ DEVELOPMENT MODE TEST EMAIL</div>' : ''}
    
    <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Dear <strong>${record.fullName || "Runner"}</strong>,</p>
    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
      🎉 <strong>Congratulations!</strong> Your payment has been received successfully and your spot for <strong>Chennimalai Marathon 2026</strong> is officially confirmed!
    </p>

    <!-- Confirmed Registration Details Card -->
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #0d1f47; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f5a623; padding-bottom: 8px; margin-bottom: 12px;">
        🏃 Official Entry Receipt &amp; Summary
      </div>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" class="info-table" style="font-size: 14px; color: #334155;">
        <tr>
          <td class="mobile-stack-cell" style="padding: 6px 0; color: #64748b; font-weight: 600; width: 45%;">Official BIB Number:</td>
          <td class="mobile-stack-cell mobile-val-right" style="padding: 6px 0; font-weight: 800; color: #1f6d3f; text-align: right; font-size: 18px;">${bibDisplay}</td>
        </tr>
        <tr>
          <td class="mobile-stack-cell" style="padding: 6px 0; color: #64748b; font-weight: 600;">Event Category:</td>
          <td class="mobile-stack-cell mobile-val-right" style="padding: 6px 0; font-weight: 700; text-align: right; color: #0d1f47;">${record.category || "N/A"} (${record.participantType || "Runner"})</td>
        </tr>
        <tr>
          <td class="mobile-stack-cell" style="padding: 6px 0; color: #64748b; font-weight: 600;">Full Name:</td>
          <td class="mobile-stack-cell mobile-val-right" style="padding: 6px 0; font-weight: 700; text-align: right;">${record.fullName || "N/A"}</td>
        </tr>
        <tr>
          <td class="mobile-stack-cell" style="padding: 6px 0; color: #64748b; font-weight: 600;">Email Address:</td>
          <td class="mobile-stack-cell mobile-val-right" style="padding: 6px 0; text-align: right; word-break: break-all;">${record.email || "N/A"}</td>
        </tr>
        <tr>
          <td class="mobile-stack-cell" style="padding: 6px 0; color: #64748b; font-weight: 600;">Phone Number:</td>
          <td class="mobile-stack-cell mobile-val-right" style="padding: 6px 0; text-align: right;">${record.phone || "N/A"}</td>
        </tr>
        <tr>
          <td class="mobile-stack-cell" style="padding: 6px 0; color: #64748b; font-weight: 600;">T-Shirt Size:</td>
          <td class="mobile-stack-cell mobile-val-right" style="padding: 6px 0; font-weight: 700; text-align: right;">${record.tshirtSize || "N/A"} (${record.tshirtSelected ? 'Included' : 'Not Opted'})</td>
        </tr>
        <tr>
          <td class="mobile-stack-cell" style="padding: 6px 0; color: #64748b; font-weight: 600;">Blood Group:</td>
          <td class="mobile-stack-cell mobile-val-right" style="padding: 6px 0; font-weight: 700; color: #dc2626; text-align: right;">${record.bloodGroup || "N/A"}</td>
        </tr>
        <tr>
          <td class="mobile-stack-cell" style="padding: 6px 0; color: #64748b; font-weight: 600;">Payment Transaction ID:</td>
          <td class="mobile-stack-cell mobile-val-right" style="padding: 6px 0; font-weight: 600; text-align: right; font-family: monospace;">${paymentIdDisplay}</td>
        </tr>
      </table>
    </div>

    <!-- Total Paid Summary -->
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #166534;">
        <tr>
          <td class="mobile-stack-cell" style="padding: 4px 0;">Registration Fee:</td>
          <td class="mobile-stack-cell mobile-val-right" style="padding: 4px 0; font-weight: 600; text-align: right;">₹${regFee.toLocaleString("en-IN")}</td>
        </tr>
        ${tshirtFee > 0 ? `<tr>
          <td class="mobile-stack-cell" style="padding: 4px 0;">T-Shirt Addon Fee:</td>
          <td class="mobile-stack-cell mobile-val-right" style="padding: 4px 0; font-weight: 600; text-align: right;">₹${tshirtFee.toLocaleString("en-IN")}</td>
        </tr>` : ""}
        <tr>
          <td class="mobile-stack-cell" style="padding: 4px 0;">Payment Gateway Charges (2.5%):</td>
          <td class="mobile-stack-cell mobile-val-right" style="padding: 4px 0; font-weight: 600; text-align: right;">₹${pgFee.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr style="border-top: 1px dashed #86efac;">
          <td class="mobile-stack-cell" style="padding: 10px 0 0 0; font-weight: 800; font-size: 16px;">Total Amount Paid:</td>
          <td class="mobile-stack-cell mobile-val-right" style="padding: 10px 0 0 0; font-weight: 800; font-size: 18px; text-align: right; color: #15803d;">₹${totalAmount.toLocaleString("en-IN")}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; color: #1e293b; text-align: center; margin-top: 24px; line-height: 1.6;">
      🏃 <strong>See you at the starting line on 30 August 2026 (Flag-off: 05:55 AM)!</strong>
    </p>
  `;

  return buildResponsiveEmailWrapper({
    previewText: `Registration Confirmed! BIB #${record.tshirtNumber || 'Assigned'} - Chennimalai Marathon 2026`,
    headerSubtitle: "Registration Confirmation & Receipt",
    contentHtml
  });
}

async function sendRegistrationEmail(record, isDev = false) {
  const subject = `${isDev ? "[DEV] " : ""}Registration Confirmed - Chennimalai Marathon (Bib #${record.tshirtNumber || "N/A"})`;
  const htmlContent = buildEmailHTML(record, isDev);

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
  const contentHtml = `
    <p style="font-size: 15px; color: #334155; margin-top: 0;">Hello Admin,</p>
    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
      Your One-Time Password (OTP) for logging into the Chennimalai Marathon Admin Dashboard is:
    </p>
    <div style="background: #fff7ed; border: 2px dashed #ffedd5; font-size: 32px; font-weight: 800; letter-spacing: 6px; text-align: center; padding: 18px; border-radius: 10px; color: #ea580c; margin: 24px 0;">
      ${otp}
    </div>
    <div style="background: #f8fafc; border-left: 4px solid #f5a623; padding: 12px 14px; border-radius: 4px; margin-bottom: 20px;">
      <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;">
        ⏱️ <strong>Security Notice:</strong> This OTP will expire in 10 minutes. If you did not request this login, please ignore this email.
      </p>
    </div>
  `;

  const htmlContent = buildResponsiveEmailWrapper({
    previewText: `Your Admin Verification Code is ${otp}`,
    headerSubtitle: "Admin OTP Verification",
    contentHtml
  });

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
