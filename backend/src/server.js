process.on("unhandledRejection", (reason) => console.error("UNHANDLED CRASH REASON:", reason));
process.on("uncaughtException", (err) => console.error("UNCAUGHT EXCEPTION:", err));

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Mutex } = require("async-mutex");
const sheets = require("./services/sheetsService");
const email = require("./services/emailService");
const razorpayService = require("./services/razorpayService");
const { DISTRICTS, BLOOD_GROUPS, TSHIRT_SIZES, RULES } = require("./config");

const app = express();
app.use(cors());
app.use(express.json());

// Serves static frontend files
app.use(express.static(path.join(__dirname, "../../frontend")));

const mutex = new Mutex();

function calculateAge(dobStr) {
  const parts = dobStr.split(/[\/\-]/).map(Number);
  const [dd, mm, yyyy] = parts;
  const dob = new Date(yyyy, mm - 1, dd);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthday) age--;
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

// Metadata Routes
app.get("/api/districts", (req, res) => res.json(DISTRICTS));
app.get("/api/blood-groups", (req, res) => res.json(BLOOD_GROUPS));
app.get("/api/tshirt-sizes", (req, res) => res.json(TSHIRT_SIZES));

// Status Endpoint Syncs .env Modes to Frontend Dynamically
app.get("/api/status", async (req, res) => {
  try {
    const meta = await sheets.getMeta();
    const isClosed = meta.closed || meta.registrationCount >= RULES.MAX_REGISTRATIONS;
    res.json({
      closed: isClosed,
      registeredSoFar: meta.registrationCount,
      maxRegistrations: RULES.MAX_REGISTRATIONS,
      currentSlot: RULES.TSHIRT_NUMBER_START + meta.registrationCount,
      demoMode: process.env.DEMO_MODE === "true",
      dryRunMode: process.env.DRY_RUN_MODE === "true"
    });
  } catch (err) {
    console.error("STATUS_ERROR", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// Razorpay Handlers
app.post("/api/create-order", razorpayService.createOrder);
app.post("/api/payment-pending", razorpayService.handlePaymentPending);
app.post("/api/payment-failed", razorpayService.handlePaymentFailure);

// Main Registration Endpoint
app.post("/api/register", async (req, res) => {
  const release = await mutex.acquire();
  try {
    const meta = await sheets.getMeta();
    if (meta.closed || meta.registrationCount >= RULES.MAX_REGISTRATIONS) {
      if (!meta.closed) await sheets.setClosed(true);
      return res.status(403).json({
        error: "REGISTRATIONS_CLOSED",
        message: "Registrations are closed. All 1,000 slots have been filled."
      });
    }

    const data = req.body || {};
    const missingField = validate(data);
    if (missingField) return res.status(400).json({ error: "MISSING_FIELD", field: missingField });

    const emailLower = String(data.email).trim().toLowerCase();
    const age = calculateAge(data.dob);
    const category = age <= RULES.AGE_CUTOFF_YEARS ? RULES.CATEGORY_3_5KM : RULES.CATEGORY_7KM;

    // Verify HMAC Payment Signature
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;
    const isValid = razorpayService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      if (!razorpayService.isDryRun()) {
        await sheets.appendRegistrationStatus({
          timestamp: new Date().toISOString(),
          fullName: data.fullName, dob: data.dob, age, category,
          gender: data.gender, phone: data.phone, email: emailLower,
          district: data.district, pincode: data.pincode, tshirtSize: data.tshirtSize,
          bloodGroup: data.bloodGroup, tshirtNumber: "N/A", emergencyContact: data.emergencyContact,
          status: "FAILED", failureReason: "Payment signature mismatch / tampered request"
        });
      }
      return res.status(400).json({
        error: "PAYMENT_VERIFICATION_FAILED",
        message: "Security check failed. Transaction signature invalid."
      });
    }

    // =========================================================================
    // 🧪 DRY RUN MODE CHECK (Triggered via DRY_RUN_MODE=true in .env)
    // =========================================================================
    if (razorpayService.isDryRun()) {
      console.log("🧪 [DRY RUN SUCCESS] Razorpay Signature Verified! Skipped Google Sheets DB, Slot Counter, and GHL Email.");
      return res.json({
        success: true,
        category,
        tshirtNumber: "TEST-0000",
        registeredSoFar: meta.registrationCount,
        closed: false,
        note: "Dry Run complete. Signature verified with zero DB or email changes."
      });
    }

    // =========================================================================
    // PRODUCTION MODE (Both DEMO_MODE & DRY_RUN_MODE are false)
    // =========================================================================
    const tshirtNumber = await sheets.getNextTshirtNumber();
    const newCount = await sheets.incrementRegistrationCount();

    const record = {
      timestamp: new Date().toISOString(),
      fullName: data.fullName, dob: data.dob, age, category,
      gender: data.gender, phone: data.phone, email: emailLower,
      district: data.district, pincode: data.pincode, tshirtSize: data.tshirtSize,
      bloodGroup: data.bloodGroup, tshirtNumber, emergencyContact: data.emergencyContact,
      status: "SUCCESS", failureReason: `Payment ID: ${razorpay_payment_id || "N/A"} | Order ID: ${razorpay_order_id || "N/A"}`
    };

    // Append to Google Sheets tabs
    await sheets.appendRegistrationSuccess(record);
    await sheets.appendRegistrationStatus(record);

    if (newCount >= RULES.MAX_REGISTRATIONS) {
      await sheets.setClosed(true);
    }

    // Trigger Live GHL Email
    try {
      await email.sendRegistrationEmail(record, false);
    } catch (emailErr) {
      console.error("GHL_EMAIL_SEND_FAILED", emailErr);
    }

    return res.json({
      success: true,
      category,
      tshirtNumber,
      registeredSoFar: newCount,
      closed: newCount >= RULES.MAX_REGISTRATIONS
    });
  } catch (err) {
    console.error("REGISTER_ERROR", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  } finally {
    release();
  }
});

// Demo Mode Endpoint (Triggered when DEMO_MODE=true in .env)
app.post("/api/register-demo", async (req, res) => {
  try {
    const data = req.body || {};
    const missingField = validate(data);
    if (missingField) return res.status(400).json({ error: "MISSING_FIELD", field: missingField });

    const age = calculateAge(data.dob);
    const category = age <= RULES.AGE_CUTOFF_YEARS ? RULES.CATEGORY_3_5KM : RULES.CATEGORY_7KM;
    const demoTshirtNumber = "DEMO-0000";

    const record = {
      timestamp: new Date().toISOString(),
      fullName: data.fullName, dob: data.dob, age, category,
      gender: data.gender, phone: data.phone, email: String(data.email).trim().toLowerCase(),
      district: data.district, pincode: data.pincode, tshirtSize: data.tshirtSize,
      bloodGroup: data.bloodGroup, tshirtNumber: demoTshirtNumber, emergencyContact: data.emergencyContact
    };

    await email.sendRegistrationEmail(record, true);

    return res.json({
      success: true, demo: true, category, tshirtNumber: demoTshirtNumber,
      note: "Demo request successful. Test email dispatched via GHL without DB writes."
    });
  } catch (err) {
    console.error("DEMO_ERROR", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;