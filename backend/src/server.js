process.on("unhandledRejection", (reason) => console.error("UNHANDLED CRASH REASON:", reason));
process.on("uncaughtException", (err) => console.error("UNCAUGHT EXCEPTION:", err));

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Mutex } = require("async-mutex");

const { connectDB, Settings, Registration, AdminUser } = require("./db");
const sheets = require("./services/sheetsService");
const emailService = require("./services/emailService");
const razorpayService = require("./services/razorpayService");
const { DISTRICTS, BLOOD_GROUPS, TSHIRT_SIZES, RULES } = require("./config");

const JWT_SECRET = process.env.JWT_SECRET || "chennimalai_marathon_secret_jwt_key_2026";
const mutex = new Mutex();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize MongoDB Connection on Startup
connectDB();

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, "../../frontend")));

// Helper function to validate fields
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

// Public Status Endpoint - Dynamics Settings from MongoDB
app.get("/api/status", async (req, res) => {
  try {
    const settings = await Settings.findOne() || {
      adultFee: 500, kidsFee: 300, tshirtPrice: 200, pricingTitle: "Marathon Registration Fees",
      maxRegistrations: 1000, isOpen: true, showRemainingSlots: true
    };

    const successCount = await Registration.countDocuments({ paymentStatus: "Success" });
    const isClosed = !settings.isOpen || successCount >= settings.maxRegistrations;

    res.json({
      closed: isClosed,
      isOpen: settings.isOpen,
      registeredSoFar: successCount,
      maxRegistrations: settings.maxRegistrations,
      remainingSlots: Math.max(0, settings.maxRegistrations - successCount),
      showRemainingSlots: settings.showRemainingSlots,
      adultFee: settings.adultFee,
      kidsFee: settings.kidsFee,
      tshirtPrice: settings.tshirtPrice,
      pricingTitle: settings.pricingTitle,
      demoMode: process.env.DEMO_MODE === "true",
      dryRunMode: process.env.DRY_RUN_MODE === "true"
    });
  } catch (err) {
    console.error("STATUS_ERROR", err);
    res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

// Razorpay Order Creation & Handlers
app.post("/api/create-order", razorpayService.createOrder);
app.post("/api/payment-pending", razorpayService.handlePaymentPending);
app.post("/api/payment-failed", razorpayService.handlePaymentFailure);

// Main Public Registration Verification Endpoint
app.post("/api/register", async (req, res) => {
  const release = await mutex.acquire();
  try {
    const data = req.body || {};
    const settings = await Settings.findOne() || { maxRegistrations: 1000, isOpen: true, tshirtCounter: 11 };
    const successCount = await Registration.countDocuments({ paymentStatus: "Success" });

    if (!settings.isOpen || successCount >= settings.maxRegistrations) {
      return res.status(403).json({
        error: "REGISTRATIONS_CLOSED",
        message: "Registrations are closed. All slots have been filled."
      });
    }

    const missingField = validate(data);
    if (missingField) return res.status(400).json({ error: "MISSING_FIELD", field: missingField });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    // Verify Signature unless in DryRun/Demo mode
    const isValid = razorpayService.isDryRun() || razorpayService.isDemo() ||
      razorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      if (razorpay_order_id) {
        await Registration.findOneAndUpdate(
          { razorpayOrderId: razorpay_order_id },
          { paymentStatus: "Failed", failureReason: "Payment signature verification failed" }
        );
      }
      return res.status(400).json({
        error: "PAYMENT_VERIFICATION_FAILED",
        message: "Security check failed. Transaction signature invalid."
      });
    }

    // Atomic Bib Number increment in MongoDB Settings
    const updatedSettings = await Settings.findOneAndUpdate(
      {},
      { $inc: { tshirtCounter: 1 } },
      { new: true, upsert: true }
    );

    const tshirtNumber = String(updatedSettings.tshirtCounter - 1).padStart(RULES.TSHIRT_NUMBER_PAD_LENGTH || 4, "0");

    // Find and update MongoDB Registration
    let regRecord;
    if (razorpay_order_id) {
      regRecord = await Registration.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          paymentStatus: "Success",
          tshirtNumber,
          razorpayPaymentId: razorpay_payment_id || "DEMO_PAY_ID",
          razorpaySignature: razorpay_signature || "DEMO_SIG",
          failureReason: "Payment Successful",
          updatedAt: new Date()
        },
        { new: true }
      );
    }

    if (!regRecord) {
      const emailLower = String(data.email).trim().toLowerCase();
      const age = parseInt(data.age || 20, 10);
      const participantType = age > (settings.ageCutoff || 13) ? "Adult" : "Kids";
      const category = participantType === "Adult" ? "7 KM Timed Run" : "3.5 KM Fun Run";

      regRecord = await Registration.create({
        fullName: data.fullName, dob: data.dob, age,
        participantType, category, gender: data.gender, phone: data.phone,
        email: emailLower, district: data.district, pincode: data.pincode,
        tshirtSize: data.tshirtSize, tshirtSelected: data.tshirtSelected !== false,
        bloodGroup: data.bloodGroup, emergencyContact: data.emergencyContact,
        tshirtNumber, paymentStatus: "Success",
        razorpayOrderId: razorpay_order_id || `order_${Date.now()}`,
        razorpayPaymentId: razorpay_payment_id || `pay_${Date.now()}`,
        razorpaySignature: razorpay_signature || "N/A"
      });
    }

    const newSuccessCount = await Registration.countDocuments({ paymentStatus: "Success" });
    if (newSuccessCount >= settings.maxRegistrations) {
      await Settings.updateOne({}, { isOpen: false });
    }

    // Synchronize to Google Sheets (Safe Try-Catch so Sheets never blocks DB)
    const sheetData = {
      timestamp: regRecord.createdAt.toISOString(),
      fullName: regRecord.fullName, dob: regRecord.dob, age: regRecord.age,
      participantType: regRecord.participantType, category: regRecord.category,
      gender: regRecord.gender, phone: regRecord.phone, email: regRecord.email,
      district: regRecord.district, pincode: regRecord.pincode, tshirtSize: regRecord.tshirtSize,
      tshirtSelected: regRecord.tshirtSelected, bloodGroup: regRecord.bloodGroup,
      tshirtNumber: regRecord.tshirtNumber, emergencyContact: regRecord.emergencyContact,
      registrationFee: regRecord.registrationFee, tshirtFee: regRecord.tshirtFee,
      totalAmount: regRecord.totalAmount, status: "SUCCESS",
      failureReason: `Payment ID: ${regRecord.razorpayPaymentId}`
    };

    sheets.appendRegistrationSuccess(sheetData).catch(() => {});
    sheets.appendRegistrationStatus(sheetData).catch(() => {});

    // Trigger Confirmation Email with complete pricing breakdown
    try {
      await emailService.sendRegistrationEmail(regRecord, razorpayService.isDemo());
    } catch (emailErr) {
      console.error("EMAIL_SEND_FAILED", emailErr.message);
    }

    return res.json({
      success: true,
      category: regRecord.category,
      participantType: regRecord.participantType,
      tshirtNumber: regRecord.tshirtNumber,
      totalAmount: regRecord.totalAmount,
      registeredSoFar: newSuccessCount,
      closed: newSuccessCount >= settings.maxRegistrations
    });

  } catch (err) {
    console.error("REGISTER_ERROR", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  } finally {
    release();
  }
});

// Demo Mode Registration
app.post("/api/register-demo", async (req, res) => {
  try {
    const data = req.body || {};
    const missingField = validate(data);
    if (missingField) return res.status(400).json({ error: "MISSING_FIELD", field: missingField });

    const demoRecord = {
      fullName: data.fullName, dob: data.dob, age: 20,
      participantType: "Adult", category: "7 KM Timed Run",
      gender: data.gender, phone: data.phone, email: String(data.email).trim().toLowerCase(),
      district: data.district, pincode: data.pincode, tshirtSize: data.tshirtSize,
      tshirtSelected: true, bloodGroup: data.bloodGroup, tshirtNumber: "DEMO-0000",
      emergencyContact: data.emergencyContact, registrationFee: 500, tshirtFee: 200, totalAmount: 700
    };

    await emailService.sendRegistrationEmail(demoRecord, true);

    return res.json({
      success: true, demo: true, category: demoRecord.category, tshirtNumber: demoRecord.tshirtNumber,
      note: "Demo request successful. Test email dispatched without DB writes."
    });
  } catch (err) {
    console.error("DEMO_ERROR", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

// Admin routes have been moved to the standalone chennimalaimarathon-admin project.

const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`🚀 Marathon Server running on port ${PORT}`));
}

module.exports = app;