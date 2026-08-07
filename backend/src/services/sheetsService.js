const { google } = require("googleapis");

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

function resolveTempBib(record) {
  if (record.tempBibNumber && record.tempBibNumber !== "N/A") return record.tempBibNumber;
  if (record.tshirtNumber && record.tshirtNumber !== "N/A") return record.tshirtNumber;
  return "N/A";
}

function resolvePermBib(record) {
  if (record.permanentBibNumber && record.permanentBibNumber !== "N/A") return record.permanentBibNumber;
  return "N/A";
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
      range: "Registrations!A:V", // Expanded from A:S to A:V (3 new columns)
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
          record.tshirtSizeNum || "N/A",  // 🆕 Added Size Number (e.g., 34)
          record.tshirtWidth || "N/A",    // 🆕 Added Width in inches (e.g., 17)
          record.tshirtHeight || "N/A",   // 🆕 Added Height in inches (e.g., 24.75)
          record.tshirtSelected ? "YES" : "NO",
          record.bloodGroup || "",
          resolveTempBib(record),
          record.registrationFee || 0,
          record.tshirtFee || 0,
          record.totalAmount || 0,
          resolvePermBib(record)
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
      range: "'Registration Status'!A:X", // Expanded from A:U to A:X (3 new columns)
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
          record.tshirtSizeNum || "N/A",  // 🆕 Added Size Number (e.g., 34)
          record.tshirtWidth || "N/A",    // 🆕 Added Width in inches (e.g., 17)
          record.tshirtHeight || "N/A",   // 🆕 Added Height in inches (e.g., 24.75)
          record.tshirtSelected ? "YES" : "NO",
          record.bloodGroup || "",
          resolveTempBib(record),
          record.emergencyContact || "",
          record.registrationFee || 0,
          record.totalAmount || 0,
          record.status || "PENDING",
          record.failureReason || "",
          resolvePermBib(record)
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
