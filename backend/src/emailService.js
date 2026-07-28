const nodemailer = require("nodemailer");
const sheets = require("./sheetsService");

async function createTransporter() {
  const meta = await sheets.getMeta();
  const useAccount1 = (meta.emailAccount1S || 0) <= (meta.emailAccount2S || 0);

  const account = useAccount1
    ? { user: process.env.GMAIL_ACCOUNT_1, pass: process.env.GMAIL_APP_PASSWORD_1, num: 1 }
    : { user: process.env.GMAIL_ACCOUNT_2, pass: process.env.GMAIL_APP_PASSWORD_2, num: 2 };

  if (!account.user || !account.pass) return null;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 587, secure: false,
    auth: { user: account.user, pass: account.pass }
  });

  return { transporter, accountNum: account.num, senderEmail: account.user };
}

function buildEmailHTML(record, isDemo) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #1c2b3a;">
      ${isDemo ? '<div style="background: #fff3cd; color: #856404; padding: 12px; border-radius: 6px; font-weight: bold; margin-bottom: 20px; border: 1px solid #ffeba1;">⚠️ DEMO MODE TEST EMAIL — NO DATABASE ROWS WERE WRITTEN & SLOT COUNT IS UNCHANGED.</div>' : ''}
      <h2 style="color: #0d1f47;">Chennimalai Marathon Registration Confirmation</h2>
      <p>Dear <strong>${record.fullName}</strong>,</p>
      <p>Thank you for registering! Here are your complete details:</p>
      <table style="width: 100%; max-width: 500px; border-collapse: collapse; font-size: 14px;">
        <tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px 0; font-weight: bold;">Bib Number:</td><td>${record.tshirtNumber || "N/A"}</td></tr>
        <tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px 0; font-weight: bold;">Category:</td><td>${record.category || "N/A"}</td></tr>
        <tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px 0; font-weight: bold;">Full Name:</td><td>${record.fullName || "N/A"}</td></tr>
        <tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px 0; font-weight: bold;">Email:</td><td>${record.email || "N/A"}</td></tr>
        <tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px 0; font-weight: bold;">Phone:</td><td>${record.phone || "N/A"}</td></tr>
        <tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px 0; font-weight: bold;">DOB:</td><td>${record.dob || "N/A"} (Age: ${record.age || "N/A"})</td></tr>
        <tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px 0; font-weight: bold;">T-Shirt Size:</td><td>${record.tshirtSize || "N/A"}</td></tr>
        <tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px 0; font-weight: bold;">Blood Group:</td><td>${record.bloodGroup || "N/A"}</td></tr>
      </table>
      <p style="color: #1f6d3f; font-weight: bold; margin-top: 15px;">See you at the starting line on 30 August 2026 (Flag-off: 5:55 AM)!</p>
    </div>
  `;
}

async function sendToGHL(record, isDemo) {
  if (!process.env.GHL_PRIVATE_INTEGRATION_TOKEN || !process.env.GHL_LOCATION_ID) {
    return { synced: false, emailSent: false };
  }
  try {
    const fetchFn = global.fetch || (await import("node-fetch")).default;

    const contactPayload = {
      locationId: process.env.GHL_LOCATION_ID,
      email: record.email,
      name: record.fullName,
      phone: record.phone,
      dateOfBirth: record.dob,
      city: record.district,
      postalCode: record.pincode,
      tags: [
        "Chennimalai Marathon", record.category, `TShirt: ${record.tshirtNumber}`,
        `Size: ${record.tshirtSize}`, `Blood: ${record.bloodGroup}`,
        isDemo ? "DEMO TEST RUN" : "Confirmed Registration"
      ]
    };

    const contactRes = await fetchFn("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GHL_PRIVATE_INTEGRATION_TOKEN}`,
        "Version": "2021-07-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(contactPayload)
    });

    if (!contactRes.ok) return { synced: false, emailSent: false };
    const contactData = await contactRes.json();
    const contactId = contactData.contact?.id || contactData.id;

    if (contactId) {
      const emailPayload = {
        type: "Email",
        contactId: contactId,
        subject: `${isDemo ? "[DEMO TEST] " : ""}Registration Confirmed - Chennimalai Marathon (Bib #${record.tshirtNumber})`,
        html: buildEmailHTML(record, isDemo)
      };

      const msgRes = await fetchFn("https://services.leadconnectorhq.com/conversations/messages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GHL_PRIVATE_INTEGRATION_TOKEN}`,
          "Version": "2021-04-15",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });

      if (msgRes.ok) {
        console.log(`✉️ [GHL EMAIL] Dispatched to: ${record.email}`);
        return { synced: true, emailSent: true };
      }
    }
    return { synced: true, emailSent: false };
  } catch (err) {
    console.warn(`⚠️ [GHL] Error: ${err.message}`);
    return { synced: false, emailSent: false };
  }
}

async function sendRegistrationEmail(record, isDemo = false) {
  const ghlResult = await sendToGHL(record, isDemo);
  if (ghlResult && ghlResult.emailSent) return true;

  try {
    const smtpObj = await createTransporter();
    if (!smtpObj) {
      console.log(`[EMAIL SIMULATION - ${isDemo ? "DEMO" : "LIVE"}] Sent to: ${record.email}`);
      return true;
    }

    const mailOptions = {
      from: `"Chennimalai Marathon" <${smtpObj.senderEmail}>`,
      to: record.email,
      subject: `${isDemo ? "[DEMO TEST] " : ""}Registration Confirmed - Chennimalai Marathon (Bib #${record.tshirtNumber})`,
      html: buildEmailHTML(record, isDemo)
    };

    await smtpObj.transporter.sendMail(mailOptions);
    await sheets.incrementEmailCount(smtpObj.accountNum);
    console.log(`✉️ Sent via Gmail Account #${smtpObj.accountNum} to ${record.email}`);
    return true;
  } catch (err) {
    console.error("❌ EMAIL_SEND_ERROR:", err.message);
    if (isDemo) return false;
    throw err;
  }
}

module.exports = { sendRegistrationEmail };