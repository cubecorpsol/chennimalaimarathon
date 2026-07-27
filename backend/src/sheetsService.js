const { google } = require("googleapis");
const { RULES } = require("./config");

function getSpreadsheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error("Missing GOOGLE_SHEET_ID in environment variables. Please check your .env file.");
  }
  return id;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(
      "Missing Google Service Account credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY) in environment variables. Please check your .env file."
    );
  }
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
  await auth.authorize();
  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}

async function getMeta() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: "Meta!A1:B3"
  });
  const rows = res.data.values || [];
  const meta = {
    registrationCount: 0,
    tshirtCounter: RULES.TSHIRT_NUMBER_START,
    closed: false
  };
  for (const row of rows) {
    const [key, val] = row;
    if (key === "registrationCount") meta.registrationCount = Number(val || 0);
    if (key === "tshirtCounter") meta.tshirtCounter = Number(val || RULES.TSHIRT_NUMBER_START);
    if (key === "closed") meta.closed = String(val).trim().toUpperCase() === "TRUE";
  }
  return meta;
}

async function setCell(range, value) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] }
  });
}

async function setClosed(isClosed) {
  await setCell("Meta!B3", isClosed ? "TRUE" : "FALSE");
}

async function incrementRegistrationCount() {
  const meta = await getMeta();
  const newCount = (meta.registrationCount || 0) + 1;
  await setCell("Meta!B1", newCount);
  return newCount;
}

async function getNextTshirtNumber() {
  const meta = await getMeta();
  const current = meta.tshirtCounter || RULES.TSHIRT_NUMBER_START;
  await setCell("Meta!B2", current + 1);
  return String(current).padStart(RULES.TSHIRT_NUMBER_PAD_LENGTH, "0");
}

async function emailExists(emailLower) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: "Registrations!H2:H"
  });
  const rows = res.data.values || [];
  return rows.some((r) => r[0] && String(r[0]).trim().toLowerCase() === emailLower);
}

async function appendRegistration(record) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: "Registrations!A:N",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[
        record.timestamp,
        record.fullName,
        record.dob,
        record.age,
        record.category,
        record.gender,
        record.phone,
        record.email,
        record.district,
        record.pincode,
        record.tshirtSize,
        record.bloodGroup,
        record.tshirtNumber,
        record.emergencyContact
      ]]
    }
  });
}

module.exports = {
  getMeta,
  setClosed,
  incrementRegistrationCount,
  getNextTshirtNumber,
  emailExists,
  appendRegistration
};