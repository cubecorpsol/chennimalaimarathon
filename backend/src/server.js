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
const payuService = require("./services/payuService");
const razorpayService = require("./services/razorpayService");
const { DISTRICTS, BLOOD_GROUPS, TSHIRT_SIZES, RULES, getBaseUrl } = require("./config");

const JWT_SECRET = process.env.JWT_SECRET || "chennimalai_marathon_secret_jwt_key_2026";
const mutex = new Mutex();

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize MongoDB Connection on Startup
connectDB();

// Serve Static Frontend Files
app.use(express.static(path.join(__dirname, "../../frontend")));

function calculateAge(dobStr) {
  if (!dobStr) return 20;
  const parts = dobStr.split(/[\/\-]/).map(Number);
  const [dd, mm, yyyy] = parts;
  if (!yyyy || !mm || !dd) return 20;
  const dob = new Date(yyyy, mm - 1, dd);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthday) age--;
  return age;
}

// Helper function to validate fields
function validate(data) {
  const age = calculateAge(data.dob);
  const isKids = age <= 13;
  const required = [
    "fullName", "dob", "phone", "email", "district",
    "pincode", "bloodGroup", "gender", "emergencyContact"
  ];
  if (!isKids) {
    required.push("tshirtSize");
  }
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
      maxRegistrations: 1000, isOpen: true, showRemainingSlots: true, paymentGateway: "razorpay"
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
      paymentGateway: settings.paymentGateway || "razorpay",
      demoMode: process.env.DEMO_MODE === "true",
      dryRunMode: process.env.DRY_RUN_MODE === "true"
    });
  } catch (err) {
    console.error("STATUS_ERROR", err);
    res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

// Payment Gateway Order Creation & Handlers
app.post("/api/create-order", razorpayService.createOrder);
app.post("/api/payment-pending", razorpayService.handlePaymentPending);
app.post("/api/payment-failed", razorpayService.handlePaymentFailure);
app.post("/api/register-gateway-issue", razorpayService.handleRegisterGatewayIssue);

function isPaymentTokenInvalid(reg) {
  if (!reg) return { invalid: true, code: "INVALID_TOKEN", message: "Invalid or non-existent payment link." };
  if (reg.paymentTokenUsed || reg.paymentStatus === "Success") {
    return { invalid: true, paid: true, message: "Payment has already been completed for this registration link. Link cannot be reused." };
  }
  if (reg.paymentTokenExpiresAt && new Date() > new Date(reg.paymentTokenExpiresAt)) {
    return { invalid: true, expired: true, message: "This payment request link has expired. Please contact support to request a new link." };
  }
  return { invalid: false };
}

async function markRegistrationPaymentSuccess(reg, extras = {}) {
  const settings = await Settings.findOne() || { tshirtCounter: 11, maxRegistrations: 1000 };
  const needsBib = !reg.tshirtNumber || reg.tshirtNumber === "N/A";

  if (needsBib) {
    const updatedSettings = await Settings.findOneAndUpdate(
      {},
      { $inc: { tshirtCounter: 1 } },
      { new: true, upsert: true }
    );
    reg.tshirtNumber = String(updatedSettings.tshirtCounter - 1).padStart(RULES.TSHIRT_NUMBER_PAD_LENGTH || 4, "0");
  }

  reg.paymentStatus = "Success";
  reg.paymentTokenUsed = true;
  reg.failureReason = extras.failureReason || "Payment Successful";
  reg.updatedAt = new Date();
  if (extras.razorpayPaymentId) reg.razorpayPaymentId = extras.razorpayPaymentId;
  if (extras.razorpaySignature) reg.razorpaySignature = extras.razorpaySignature;
  if (extras.payuMihpayid) reg.payuMihpayid = extras.payuMihpayid;
  if (extras.paymentGateway) reg.paymentGateway = extras.paymentGateway;
  if (extras.paymentGatewayResponse) reg.paymentGatewayResponse = extras.paymentGatewayResponse;
  await reg.save();

  const newSuccessCount = await Registration.countDocuments({ paymentStatus: "Success" });
  if (newSuccessCount >= settings.maxRegistrations) {
    await Settings.updateOne({}, { isOpen: false });
  }

  return { reg, newSuccessCount, closed: newSuccessCount >= settings.maxRegistrations };
}

// Payment Request Secure Link Endpoints
app.get("/api/payment-request/:token", async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: "MISSING_TOKEN", message: "Payment token is required." });

    const reg = await Registration.findOne({ paymentToken: token });
    const check = isPaymentTokenInvalid(reg);
    if (check.invalid) {
      if (check.paid) {
        return res.json({ success: false, isPaid: true, message: check.message });
      }
      if (check.expired) {
        return res.json({ success: false, isExpired: true, message: check.message });
      }
      return res.status(404).json({ error: check.code || "INVALID_TOKEN", message: check.message });
    }

    const settings = await Settings.findOne() || { paymentGateway: "razorpay" };
    const activeGateway = settings.paymentGateway || reg.paymentGateway || "razorpay";

    res.json({
      success: true,
      registration: {
        id: reg._id,
        fullName: reg.fullName,
        email: reg.email,
        phone: reg.phone,
        category: reg.category,
        participantType: reg.participantType,
        tshirtSize: reg.tshirtSize,
        tshirtSelected: reg.tshirtSelected,
        registrationFee: reg.registrationFee || 0,
        tshirtFee: reg.tshirtFee || 0,
        totalAmount: reg.totalAmount || 0,
        paymentGateway: activeGateway
      }
    });
  } catch (err) {
    console.error("GET_PAYMENT_REQUEST_ERROR", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Failed to retrieve payment request details." });
  }
});

app.post("/api/create-order-for-token", async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: "MISSING_TOKEN", message: "Token is required." });

    const reg = await Registration.findOne({ paymentToken: token });
    const check = isPaymentTokenInvalid(reg);
    if (check.invalid) {
      if (check.paid) return res.status(400).json({ error: "ALREADY_PAID", message: check.message });
      if (check.expired) return res.status(400).json({ error: "EXPIRED_TOKEN", message: check.message });
      return res.status(404).json({ error: "INVALID_TOKEN", message: check.message });
    }

    const settings = await Settings.findOne() || { paymentGateway: "razorpay", isOpen: true, maxRegistrations: 1000 };
    const successCount = await Registration.countDocuments({ paymentStatus: "Success" });
    if (!settings.isOpen || successCount >= settings.maxRegistrations) {
      return res.status(403).json({
        error: "REGISTRATIONS_CLOSED",
        message: "Registrations are closed. All slots have been filled or registrations are disabled."
      });
    }

    const activeGateway = settings.paymentGateway || reg.paymentGateway || "razorpay";
    const totalAmount = Number(reg.totalAmount) || 0;

    if (activeGateway === "payu") {
      const payuTxnId = `PAYU_TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const { key, salt, actionUrl } = payuService.getPayuCredentials();
      if (!key || !salt) {
        return res.status(500).json({ error: "GATEWAY_NOT_CONFIGURED", message: "PayU credentials are not configured on the server." });
      }

      const hostUrl = getBaseUrl(req, "BACKEND_URL");
      const callbackUrl = `${hostUrl}/api/payu/callback`;
      const firstname = (reg.fullName || "Runner").trim().split(" ")[0] || "Runner";
      const amountStr = totalAmount.toFixed(2);
      const productinfo = "Chennimalai Marathon 2026 Registration";
      const emailLower = String(reg.email || "").trim().toLowerCase();
      const udf1 = "chennimalai_marathon";
      const udf2 = "token_pay";

      const hash = payuService.generatePayuRequestHash({
        key,
        txnid: payuTxnId,
        amount: amountStr,
        productinfo,
        firstname,
        email: emailLower,
        udf1,
        udf2,
        salt
      });

      reg.payuTxnId = payuTxnId;
      reg.paymentStatus = "Pending";
      reg.paymentGateway = "payu";
      reg.failureReason = `PayU token payment order created (${payuTxnId}), payment pending`;
      reg.updatedAt = new Date();
      await reg.save();

      return res.json({
        success: true,
        gateway: "payu",
        action: actionUrl,
        payuParams: {
          key,
          txnid: payuTxnId,
          amount: amountStr,
          productinfo,
          firstname,
          email: emailLower,
          phone: reg.phone || "",
          surl: callbackUrl,
          furl: callbackUrl,
          hash,
          udf1,
          udf2
        },
        totalAmount,
        fullName: reg.fullName,
        email: reg.email,
        phone: reg.phone
      });
    }

    // Default: Razorpay
    const amountPaise = Math.round(totalAmount * 100);
    const order = await razorpayService.createRazorpayOrder(amountPaise, "token_rcpt");

    reg.razorpayOrderId = order.id;
    reg.paymentStatus = "Pending";
    reg.paymentGateway = "razorpay";
    reg.failureReason = `Razorpay token payment order created (${order.id}), payment pending`;
    reg.updatedAt = new Date();
    await reg.save();

    return res.json({
      success: true,
      gateway: "razorpay",
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID || "",
      demoMode: !!order.demo || razorpayService.isDemo() || razorpayService.isDryRun(),
      totalAmount,
      fullName: reg.fullName,
      email: reg.email,
      phone: reg.phone
    });
  } catch (err) {
    console.error("CREATE_TOKEN_ORDER_ERROR", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Order creation failed." });
  }
});

// Verify Razorpay payment for token-based checkout (updates existing registration only)
app.post("/api/verify-token-payment", async (req, res) => {
  const release = await mutex.acquire();
  try {
    const data = req.body || {};
    const token = data.token;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    if (!token) {
      return res.status(400).json({ error: "MISSING_TOKEN", message: "Payment token is required." });
    }
    if (!razorpay_order_id) {
      return res.status(400).json({ error: "MISSING_ORDER", message: "Razorpay order id is required." });
    }

    const reg = await Registration.findOne({ paymentToken: token });
    const check = isPaymentTokenInvalid(reg);
    if (check.invalid) {
      if (check.paid) return res.status(400).json({ error: "ALREADY_PAID", message: check.message });
      if (check.expired) return res.status(400).json({ error: "EXPIRED_TOKEN", message: check.message });
      return res.status(404).json({ error: "INVALID_TOKEN", message: check.message });
    }

    if (reg.razorpayOrderId && reg.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ error: "ORDER_MISMATCH", message: "Payment order does not match this payment link." });
    }

    const isValid = razorpayService.isDryRun() || razorpayService.isDemo() ||
      razorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      await Registration.findOneAndUpdate(
        { _id: reg._id },
        { paymentStatus: "Failed", failureReason: "Payment signature verification failed" }
      );
      return res.status(400).json({
        error: "PAYMENT_VERIFICATION_FAILED",
        message: "Security check failed. Transaction signature invalid."
      });
    }

    const { reg: updated, newSuccessCount, closed } = await markRegistrationPaymentSuccess(reg, {
      razorpayPaymentId: razorpay_payment_id || "DEMO_PAY_ID",
      razorpaySignature: razorpay_signature || "DEMO_SIG",
      paymentGateway: "razorpay",
      failureReason: "Payment Successful"
    });

    const sheetData = {
      timestamp: updated.createdAt.toISOString(),
      fullName: updated.fullName, dob: updated.dob, age: updated.age,
      participantType: updated.participantType, category: updated.category,
      gender: updated.gender, phone: updated.phone, email: updated.email,
      district: updated.district, pincode: updated.pincode, tshirtSize: updated.tshirtSize,
      tshirtSelected: updated.tshirtSelected, bloodGroup: updated.bloodGroup,
      tshirtNumber: updated.tshirtNumber, emergencyContact: updated.emergencyContact,
      registrationFee: updated.registrationFee, tshirtFee: updated.tshirtFee,
      totalAmount: updated.totalAmount, status: "SUCCESS",
      failureReason: `Payment ID: ${updated.razorpayPaymentId}`
    };
    sheets.appendRegistrationSuccess(sheetData).catch(() => {});
    sheets.appendRegistrationStatus(sheetData).catch(() => {});

    try {
      await emailService.sendRegistrationEmail(updated, razorpayService.isDemo());
    } catch (emailErr) {
      console.error("TOKEN_PAYMENT_EMAIL_FAILED", emailErr.message);
    }

    return res.json({
      success: true,
      category: updated.category,
      participantType: updated.participantType,
      tshirtNumber: updated.tshirtNumber,
      totalAmount: updated.totalAmount,
      registeredSoFar: newSuccessCount,
      closed
    });
  } catch (err) {
    console.error("VERIFY_TOKEN_PAYMENT_ERROR", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  } finally {
    release();
  }
});


// PayU Callback Route (HTTP POST Redirect from PayU Hosted Checkout)
app.post("/api/payu/callback", async (req, res) => {
  const release = await mutex.acquire();
  try {
    const data = req.body || {};
    const { salt } = payuService.getPayuCredentials();
    const isValidHash = payuService.verifyPayuResponseHash(data, salt);

    const txnid = data.txnid || "";
    const mihpayid = data.mihpayid || "";
    const status = String(data.status || "").toLowerCase();
    const errorMsg = data.error_Message || data.unmappedstatus || "Transaction declined";
    const isTokenPay = String(data.udf2 || "") === "token_pay";

    const frontendUrl = getBaseUrl(req, "FRONTEND_URL");
    const successRedirectBase = isTokenPay ? `${frontendUrl}/pay.html` : `${frontendUrl}/register.html`;
    const failRedirectBase = isTokenPay ? `${frontendUrl}/pay.html` : `${frontendUrl}/register.html`;

    if (!isValidHash && !razorpayService.isDryRun() && !razorpayService.isDemo()) {
      console.error("PAYU_CALLBACK_HASH_INVALID:", data);
      if (txnid) {
        await Registration.findOneAndUpdate(
          { payuTxnId: txnid },
          { paymentStatus: "Failed", failureReason: "PayU callback hash signature verification failed" }
        );
      }
      return res.redirect(`${failRedirectBase}?status=failed&reason=${encodeURIComponent("Security signature verification failed")}`);
    }

    if (status === "success") {
      let regRecord = await Registration.findOne({ payuTxnId: txnid });
      let justCompleted = false;

      if (!regRecord) {
        // Do not invent a registration from PayU callback alone for token payments
        if (isTokenPay) {
          return res.redirect(`${failRedirectBase}?status=failed&reason=${encodeURIComponent("Registration not found for this payment")}`);
        }
        const updatedSettings = await Settings.findOneAndUpdate(
          {},
          { $inc: { tshirtCounter: 1 } },
          { new: true, upsert: true }
        );
        const tshirtNumber = String(updatedSettings.tshirtCounter - 1).padStart(RULES.TSHIRT_NUMBER_PAD_LENGTH || 4, "0");

        regRecord = await Registration.create({
          fullName: data.firstname || "Runner",
          dob: "01/01/2000", age: 20, participantType: "Adult", category: "7 KM Timed Run",
          gender: "others", phone: data.phone || "0000000000",
          email: String(data.email || "").trim().toLowerCase(),
          district: "Erode", pincode: "638051", tshirtSize: "M", tshirtSelected: true,
          bloodGroup: "O+", emergencyContact: "0000000000", tshirtNumber,
          paymentStatus: "Success", paymentGateway: "payu", payuTxnId: txnid, payuMihpayid: mihpayid,
          paymentTokenUsed: true, paymentGatewayResponse: data, failureReason: "Payment Successful"
        });
        justCompleted = true;
      } else if (regRecord.paymentStatus !== "Success") {
        await markRegistrationPaymentSuccess(regRecord, {
          payuMihpayid: mihpayid,
          paymentGateway: "payu",
          paymentGatewayResponse: data,
          failureReason: "Payment Successful"
        });
        justCompleted = true;
      } else if (!regRecord.paymentTokenUsed) {
        regRecord.paymentTokenUsed = true;
        await regRecord.save();
      }

      if (justCompleted) {
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
          failureReason: `PayU ID: ${mihpayid || txnid}`
        };

        sheets.appendRegistrationSuccess(sheetData).catch(() => {});
        sheets.appendRegistrationStatus(sheetData).catch(() => {});

        try {
          await emailService.sendRegistrationEmail(regRecord, razorpayService.isDemo());
        } catch (e) {
          console.error("PAYU_EMAIL_SEND_FAILED", e.message);
        }
      }

      return res.redirect(`${successRedirectBase}?status=success&txnid=${encodeURIComponent(txnid)}&bib=${encodeURIComponent(regRecord.tshirtNumber || "")}&name=${encodeURIComponent(regRecord.fullName || "")}&email=${encodeURIComponent(regRecord.email || "")}&category=${encodeURIComponent(regRecord.category || "")}`);
    } else {
      if (txnid) {
        await Registration.findOneAndUpdate(
          { payuTxnId: txnid },
          { paymentStatus: "Failed", paymentGatewayResponse: data, failureReason: errorMsg }
        );
      }
      return res.redirect(`${failRedirectBase}?status=failed&reason=${encodeURIComponent(errorMsg)}`);
    }
  } catch (err) {
    console.error("PAYU_CALLBACK_ERROR", err);
    return res.status(500).send("Internal Server Error handling PayU payment status");
  } finally {
    release();
  }
});

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

    // Find and update MongoDB Registration — never invent a new record when an order id is present
    let regRecord;
    if (razorpay_order_id) {
      regRecord = await Registration.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          paymentStatus: "Success",
          paymentTokenUsed: true,
          tshirtNumber,
          razorpayPaymentId: razorpay_payment_id || "DEMO_PAY_ID",
          razorpaySignature: razorpay_signature || "DEMO_SIG",
          failureReason: "Payment Successful",
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!regRecord) {
        return res.status(404).json({
          error: "ORDER_NOT_FOUND",
          message: "No pending registration found for this payment order."
        });
      }
    } else {
      const emailLower = String(data.email).trim().toLowerCase();
      const age = parseInt(data.age || 20, 10);
      const participantType = age > (settings.ageCutoff || 13) ? "Adult" : "Kids";
      const category = participantType === "Adult" ? "7 KM Timed Run" : "3.5 KM Fun Run";

      regRecord = await Registration.create({
        fullName: data.fullName, dob: data.dob, age,
        participantType, category, gender: data.gender, phone: data.phone,
        email: emailLower, district: data.district, pincode: data.pincode,
        tshirtSize: participantType === "Kids" ? "N/A" : (data.tshirtSize || "M"), tshirtSelected: participantType !== "Kids" && data.tshirtSelected !== false && data.tshirtSelected !== "false",
        bloodGroup: data.bloodGroup, emergencyContact: data.emergencyContact,
        tshirtNumber, paymentStatus: "Success", paymentTokenUsed: true,
        razorpayOrderId: `order_${Date.now()}`,
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