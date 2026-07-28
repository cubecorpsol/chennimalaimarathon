process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 UNHANDLED CRASH REASON:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") }); // Workspace root
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });    // backend/
require("dotenv").config();                                                   // Current working directory
const express = require("express");
const cors = require("cors");
const { Mutex } = require("async-mutex");

const sheets = require("./sheetsService");
const email = require("./emailService");
const { DISTRICTS, BLOOD_GROUPS, TSHIRT_SIZES, RULES } = require("./config");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../frontend/final")));

const mutex = new Mutex();

function calculateAge(dobStr) {
  const parts = dobStr.split(/[\/\-]/).map(Number);
  const [dd, mm, yyyy] = parts;
  const dob = new Date(yyyy, mm - 1, dd);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}

function validate(data) {
  const required = [
    "fullName", "dob", "phone", "email", "district",
    "pincode", "tshirtSize", "bloodGroup", "gender", "emergencyContact"
  ];
  for (const field of required) {
    if (!data[field] || String(data[field]).trim() === "") return field;
  }
  return null;
}

app.get("/api/districts", (req, res) => res.json(DISTRICTS));
app.get("/api/blood-groups", (req, res) => res.json(BLOOD_GROUPS));
app.get("/api/tshirt-sizes", (req, res) => res.json(TSHIRT_SIZES));

app.get("/api/status", async (req, res) => {
  try {
    const meta = await sheets.getMeta();
    res.json({
      closed: meta.closed || meta.registrationCount >= RULES.MAX_REGISTRATIONS,
      registeredSoFar: meta.registrationCount,
      maxRegistrations: RULES.MAX_REGISTRATIONS
    });
  } catch (err) {
    console.error("STATUS_ERROR", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// REAL REGISTRATION
app.post("/api/register", async (req, res) => {
  const release = await mutex.acquire();
  try {
    const meta = await sheets.getMeta();

    if (meta.closed || meta.registrationCount >= RULES.MAX_REGISTRATIONS) {
      if (!meta.closed) await sheets.setClosed(true);
      return res.status(403).json({
        error: "REGISTRATIONS_CLOSED",
        message: "Registrations are closed. All 1000 slots have been filled."
      });
    }

    const data = req.body || {};
    const missingField = validate(data);
    if (missingField) return res.status(400).json({ error: "MISSING_FIELD", field: missingField });

    const emailLower = String(data.email).trim().toLowerCase();
    const alreadyRegistered = await sheets.emailExists(emailLower);
    if (alreadyRegistered) {
      return res.status(409).json({
        error: "DUPLICATE_EMAIL",
        message: "This email address has already been registered."
      });
    }

    const age = calculateAge(data.dob);
    const category = age <= RULES.AGE_CUTOFF_YEARS ? RULES.CATEGORY_5KM : RULES.CATEGORY_10KM;

    const tshirtNumber = await sheets.getNextTshirtNumber();
    const newCount = await sheets.incrementRegistrationCount();

    const record = {
      timestamp: new Date().toISOString(),
      fullName: data.fullName,
      dob: data.dob,
      age,
      category,
      gender: data.gender,
      phone: data.phone,
      email: emailLower,
      district: data.district,
      pincode: data.pincode,
      tshirtSize: data.tshirtSize,
      bloodGroup: data.bloodGroup,
      tshirtNumber,
      emergencyContact: data.emergencyContact
    };

    await sheets.appendRegistration(record);

    if (newCount >= RULES.MAX_REGISTRATIONS) {
      await sheets.setClosed(true);
    }

    try {
      await email.sendRegistrationEmail(record, false);
    } catch (emailErr) {
      console.error("EMAIL_SEND_FAILED", emailErr);
    }

    return res.json({
      success: true,
      category,
      tshirtNumber,
      registeredSoFar: newCount
    });
  } catch (err) {
    console.error("REGISTER_ERROR", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  } finally {
    release();
  }
});

// DEMO REGISTRATION (Triggers GHL email, skips Sheets DB & 1000 counter)
app.post("/api/register-demo", async (req, res) => {
  try {
    const data = req.body || {};
    const missingField = validate(data);
    if (missingField) return res.status(400).json({ error: "MISSING_FIELD", field: missingField });

    const age = calculateAge(data.dob);
    const category = age <= RULES.AGE_CUTOFF_YEARS ? RULES.CATEGORY_5KM : RULES.CATEGORY_10KM;
    const demoTshirtNumber = "DEMO-0000";

    const record = {
      timestamp: new Date().toISOString(),
      fullName: data.fullName,
      dob: data.dob,
      age,
      category,
      gender: data.gender,
      phone: data.phone,
      email: data.email,
      district: data.district,
      pincode: data.pincode,
      tshirtSize: data.tshirtSize,
      bloodGroup: data.bloodGroup,
      tshirtNumber: demoTshirtNumber,
      emergencyContact: data.emergencyContact
    };

    await email.sendRegistrationEmail(record, true);

    return res.json({
      success: true,
      demo: true,
      category,
      tshirtNumber: demoTshirtNumber,
      note: "Demo request successful. No sheet rows written and registration count unchanged."
    });
  } catch (err) {
    console.error("DEMO_ERROR", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

app.get("/api", (req, res) => res.send("Chennimalai Marathon backend API is active."));

const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
module.exports = app;