const { google } = require("googleapis");
const { RULES } = require("../config");

function getSpreadsheetId() {
  return process.env.GOOGLE_SHEET_ID || "";
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return null;
  return new google.auth.JWT(
    email,
    null,
    key.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
}

let cachedClient = null;
async function getSheetsClient() {
  if (cachedClient) return cachedClient;
  const auth = getAuth();
  if (!auth) return null;
  await auth.authorize();
  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}

// Safely appends to Google Sheets tab 'Registrations'
async function appendRegistrationSuccess(record) {
  try {
    const sheetId = getSpreadsheetId();
    if (!sheetId) return false;
    const sheets = await getSheetsClient();
    if (!sheets) return false;

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Registrations!A:R",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[
          record.timestamp || new Date().toISOString(),
          record.fullName || "",
          record.dob || "",
          record.age || "",
          record.participantType || "",
          record.category || "",
          record.gender || "",
          record.phone || "",
          record.email || "",
          record.district || "",
          record.pincode || "",
          record.tshirtSize || "",
          record.tshirtSelected ? "YES" : "NO",
          record.bloodGroup || "",
          record.tshirtNumber || "N/A",
          record.registrationFee || 0,
          record.tshirtFee || 0,
          record.totalAmount || 0
        ]]
      }
    });
    return true;
  } catch (err) {
    console.warn("⚠️ [GS SYNC WARNING] appendRegistrationSuccess failed:", err.message);
    return false;
  }
}

// Safely appends to Google Sheets tab 'Registration Status'
async function appendRegistrationStatus(record) {
  try {
    const sheetId = getSpreadsheetId();
    if (!sheetId) return false;
    const sheets = await getSheetsClient();
    if (!sheets) return false;

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "'Registration Status'!A:T",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[
          record.timestamp || new Date().toISOString(),
          record.fullName || "",
          record.dob || "",
          record.age || "",
          record.participantType || "",
          record.category || "",
          record.gender || "",
          record.phone || "",
          record.email || "",
          record.district || "",
          record.pincode || "",
          record.tshirtSize || "",
          record.tshirtSelected ? "YES" : "NO",
          record.bloodGroup || "",
          record.tshirtNumber || "N/A",
          record.emergencyContact || "",
          record.registrationFee || 0,
          record.totalAmount || 0,
          record.status || "PENDING",
          record.failureReason || ""
        ]]
      }
    });
    return true;
  } catch (err) {
    console.warn("⚠️ [GS SYNC WARNING] appendRegistrationStatus failed:", err.message);
    return false;
  }
}

module.exports = {
  appendRegistrationSuccess,
  appendRegistrationStatus
};
