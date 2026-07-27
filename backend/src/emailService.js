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
 * Generates HTML content for the confirmation email (Formatted for live customers, all form fields included)
 */
function buildEmailHTML(record, isDemo) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
      <h2 style="color: #0d6efd; text-align: center;">Chennimalai Marathon Registration Confirmation</h2>
      <p>Dear <strong>${record.fullName}</strong>,</p>
      <p>Thank you for registering! Here are your complete registration details:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>T-Shirt Number:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd; color:#d9534f; font-weight:bold;">${record.tshirtNumber || "N/A"}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Category:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.category || "N/A"}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Full Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.fullName || "N/A"}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Email Address:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.email || "N/A"}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Phone Number:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.phone || "N/A"}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Date of Birth:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.dob || "N/A"} (Age: ${record.age || "N/A"})</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Gender:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.gender || "N/A"}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>T-Shirt Size:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.tshirtSize || "N/A"}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Blood Group:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.bloodGroup || "N/A"}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>District & Pincode:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.district || "N/A"} (${record.pincode || "N/A"})</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Emergency Contact:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${record.emergencyContact || "N/A"}</td></tr>
      </table>

      <p style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
        See you at the starting line! — Chennimalai Marathon Team
      </p>
    </div>
  `;
}

/**
 * Syncs contact to GoHighLevel (GHL) and sends confirmation email via GHL Conversations API
 */
async function sendToGHL(record, isDemo) {
  if (!process.env.GHL_PRIVATE_INTEGRATION_TOKEN || !process.env.GHL_LOCATION_ID) {
    return false;
  }
  try {
    const fetchFn = global.fetch || (await import("node-fetch")).default;
    
    // Step 1: Upsert Contact in CRM with ALL form fields
    const contactPayload = {
      locationId: process.env.GHL_LOCATION_ID,
      email: record.email,
      name: record.fullName,
      phone: record.phone,
      dateOfBirth: record.dob,
      city: record.district,
      postalCode: record.pincode,
      tags: [
        "Chennimalai Marathon",
        record.category,
        `TShirt: ${record.tshirtNumber}`,
        `Size: ${record.tshirtSize}`,
        `Blood: ${record.bloodGroup}`,
        `Gender: ${record.gender}`,
        `District: ${record.district}`,
        `Pincode: ${record.pincode}`,
        `Emergency: ${record.emergencyContact}`,
        "Confirmed Registration"
      ]
    };

    const contactRes = await fetchFn("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GHL_PRIVATE_INTEGRATION_TOKEN}`,
        "Version": "2021-07-28",
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(contactPayload)
    });

    if (!contactRes.ok) {
      const errText = await contactRes.text();
      console.warn(`⚠️ [GHL] Contact upsert failed (Status ${contactRes.status}): ${errText}`);
      return false;
    }

    const contactData = await contactRes.json();
    const contactId = contactData.contact?.id || contactData.contact?._id || contactData.id;
    console.log(`✅ [GHL CRM] Contact synced to GoHighLevel: ${record.email} (ID: ${contactId || "N/A"})`);

    // Step 2: Request GHL to send confirmation email via Conversations API
    if (contactId) {
      const emailPayload = {
        type: "Email",
        contactId: contactId,
        subject: `Registration Confirmed - Chennimalai Marathon (T-Shirt #${record.tshirtNumber})`,
        html: buildEmailHTML(record, isDemo)
      };

      const msgRes = await fetchFn("https://services.leadconnectorhq.com/conversations/messages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GHL_PRIVATE_INTEGRATION_TOKEN}`,
          "Version": "2021-04-15",
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });

      if (msgRes.ok) {
        console.log(`✉️ [GHL EMAIL] Confirmation email successfully dispatched via GoHighLevel to: ${record.email}`);
        return { synced: true, emailSent: true };
      } else {
        const msgErr = await msgRes.text();
        console.warn(`⚠️ [GHL EMAIL] Contact added, but direct GHL email dispatch failed (Status ${msgRes.status}): ${msgErr}`);
        if (msgRes.status === 401 || msgErr.includes("scope") || msgErr.includes("authorized")) {
          console.warn(`🔒 [GHL SCOPE ERROR] Your GoHighLevel token is missing the 'conversations/message.write' scope! Enable it in your GoHighLevel Developer Settings.`);
        } else {
          console.warn(`💡 Ensure your GoHighLevel account has an Email Provider (LC Email / Mailgun) enabled in Location Settings!`);
        }
        return { synced: true, emailSent: false };
      }
    }
    return { synced: true, emailSent: false };
  } catch (err) {
    console.warn(`⚠️ [GHL] Sync/Email error: ${err.message}`);
    return { synced: false, emailSent: false };
  }
}

/**
 * Sends registration email (handles demo & live modes safely)
 */
async function sendRegistrationEmail(record, isDemo = false) {
  // 1. Sync contact to GoHighLevel CRM and try triggering GHL Email
  const ghlResult = await sendToGHL(record, isDemo);

  // If GHL successfully dispatched the email, we are done!
  if (ghlResult && ghlResult.emailSent) {
    return true;
  }

  // 2. Fallback to direct SMTP (Only used if GHL email dispatch failed or GHL is not configured)
  try {
    const transporter = createTransporter();

    if (!transporter) {
      if (ghlResult && ghlResult.synced) {
        console.log(`ℹ️ [NOTE] Contact synced to GoHighLevel CRM, but direct email was not sent (To fix: grant 'conversations/message.write' scope to your GHL token OR add SMTP credentials to .env).`);
      } else {
        console.log(`[EMAIL SIMULATION - ${isDemo ? "DEMO" : "LIVE"}] Sent to: ${record.email}`);
      }
      return true;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Chennimalai Marathon" <noreply@marathon.com>',
      to: record.email,
      subject: `Registration Confirmed - Chennimalai Marathon (T-Shirt #${record.tshirtNumber})`,
      html: buildEmailHTML(record, isDemo),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email successfully sent to ${record.email} (Message ID: ${info.messageId})`);
    return true;

  } catch (err) {
    console.error("❌ EMAIL_SEND_ERROR:", err.message);
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