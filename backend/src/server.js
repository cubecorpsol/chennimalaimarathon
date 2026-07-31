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

const { connectDB, Settings, Registration, AdminUser, Sponsorship } = require("./db");
const sheets = require("./services/sheetsService");
const emailService = require("./services/emailService");
const payuService = require("./services/payuService");
const razorpayService = require("./services/razorpayService");
const { DISTRICTS, BLOOD_GROUPS, TSHIRT_SIZES, RULES, getBaseUrl, isDevelopment } = require("./config");

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
      maxRegistrations: 1000, isOpen: true, showRemainingSlots: true, paymentGateway: "razorpay",
      ageCutoff: 13
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
      ageCutoff: settings.ageCutoff || 13,
      paymentGateway: settings.paymentGateway || "razorpay",
      nodeEnv: process.env.NODE_ENV || "development",
      isDevelopment: isDevelopment()
    });
  } catch (err) {
    console.error("STATUS_ERROR", err);
    res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

// Public Sponsors List
app.get("/api/sponsors", async (req, res) => {
  try {
    const sponsors = await Sponsorship.find({ paymentStatus: "Success", isApproved: true })
      .select("companyName contactPerson tier amount website logoUrl message createdAt")
      .sort({ amount: -1, createdAt: -1 });
    res.json({ success: true, sponsors });
  } catch (err) {
    console.error("GET_SPONSORS_ERROR", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Failed to fetch sponsors list." });
  }
});

// Create Order for Sponsorship (0% Payment Gateway Fee Added)
app.post("/api/sponsorship/create-order", async (req, res) => {
  try {
    const data = req.body || {};
    const { companyName, contactPerson, phone, email, designation, tier, amount, gstin, website, logoUrl, message } = data;

    if (!companyName || !contactPerson || !phone || !email || !amount) {
      return res.status(400).json({ error: "MISSING_FIELDS", message: "Company name, contact person, phone, email, and amount are required." });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: "INVALID_AMOUNT", message: "Please enter a valid sponsorship amount." });
    }

    const settings = await Settings.findOne() || { paymentGateway: "razorpay" };
    const activeGateway = settings.paymentGateway || "razorpay";
    const selectedTier = tier || "Custom";

    if (activeGateway === "payu") {
      const payuTxnId = `SPN_PAYU_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const { key, salt, actionUrl } = payuService.getPayuCredentials();
      
      const hostUrl = getBaseUrl(req, "BACKEND_URL");
      const callbackUrl = `${hostUrl}/api/payu/callback`;
      const firstname = companyName.trim().split(" ")[0] || "Sponsor";
      const amountStr = numericAmount.toFixed(2);
      const productinfo = `Chennimalai Marathon Sponsorship (${selectedTier})`;
      const emailLower = String(email).trim().toLowerCase();
      const udf1 = "sponsorship";
      const udf2 = "sponsor_pay";

      const hash = payuService.generatePayuRequestHash({
        key, txnid: payuTxnId, amount: amountStr, productinfo,
        firstname, email: emailLower, udf1, udf2, salt
      });

      const sponsorship = await Sponsorship.create({
        companyName, contactPerson, phone, email: emailLower, designation: designation || "",
        tier: selectedTier, amount: numericAmount, gstin: gstin || "", website: website || "",
        logoUrl: logoUrl || "", message: message || "", paymentStatus: "Pending",
        paymentGateway: "payu", payuTxnId
      });

      return res.json({
        success: true, gateway: "payu", action: actionUrl,
        sponsorshipId: sponsorship._id,
        payuParams: {
          key, txnid: payuTxnId, amount: amountStr, productinfo,
          firstname, email: emailLower, phone: phone || "",
          surl: callbackUrl, furl: callbackUrl, hash, udf1, udf2
        },
        totalAmount: numericAmount
      });
    }

    // Default: Razorpay (0% PG Fee - exact amount charged)
    const amountPaise = Math.round(numericAmount * 100);
    const order = await razorpayService.createRazorpayOrder(amountPaise, "spn_rcpt");

    const sponsorship = await Sponsorship.create({
      companyName, contactPerson, phone, email: String(email).trim().toLowerCase(),
      designation: designation || "", tier: selectedTier, amount: numericAmount,
      gstin: gstin || "", website: website || "", logoUrl: logoUrl || "",
      message: message || "", paymentStatus: "Pending", paymentGateway: "razorpay",
      razorpayOrderId: order.id
    });

    return res.json({
      success: true,
      gateway: "razorpay",
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID || "",
      isDevelopment: !!order.demo || isDevelopment(),
      sponsorshipId: sponsorship._id,
      totalAmount: numericAmount
    });
  } catch (err) {
    console.error("SPONSORSHIP_CREATE_ORDER_ERROR", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Failed to create sponsorship order." });
  }
});

async function generateNextSponsorId() {
  const last = await Sponsorship.findOne({ sponsorId: { $regex: /^SPN-\d+$/ } })
    .sort({ sponsorId: -1 })
    .select("sponsorId")
    .lean();
  let nextNum = 1001;
  if (last?.sponsorId) {
    const parsed = parseInt(String(last.sponsorId).replace("SPN-", ""), 10);
    if (!Number.isNaN(parsed)) nextNum = parsed + 1;
  }
  return `SPN-${String(nextNum).padStart(4, "0")}`;
}

async function markSponsorshipPaymentSuccess(sponsorship, extras = {}) {
  if (!sponsorship) return { sponsorship: null, justCompleted: false };
  if (sponsorship.paymentStatus === "Success" && sponsorship.sponsorId && sponsorship.sponsorId !== "N/A") {
    Object.assign(sponsorship, extras);
    if (Object.keys(extras).length) await sponsorship.save();
    return { sponsorship, justCompleted: false };
  }

  if (!sponsorship.sponsorId || sponsorship.sponsorId === "N/A") {
    sponsorship.sponsorId = await generateNextSponsorId();
  }
  sponsorship.paymentStatus = "Success";
  if (typeof sponsorship.isApproved !== "boolean") sponsorship.isApproved = true;
  Object.assign(sponsorship, extras);
  await sponsorship.save();
  return { sponsorship, justCompleted: true };
}

// Verify Payment for Sponsorship
app.post("/api/sponsorship/verify-payment", async (req, res) => {
  try {
    const data = req.body || {};
    const { sponsorshipId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    let sponsorship;
    if (sponsorshipId) {
      sponsorship = await Sponsorship.findById(sponsorshipId);
    } else if (razorpay_order_id) {
      sponsorship = await Sponsorship.findOne({ razorpayOrderId: razorpay_order_id });
    }

    if (!sponsorship) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Sponsorship record not found." });
    }

    if (sponsorship.paymentStatus === "Success") {
      return res.json({ success: true, sponsorId: sponsorship.sponsorId, companyName: sponsorship.companyName });
    }

    const isValid = isDevelopment() ||
      razorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      sponsorship.paymentStatus = "Failed";
      sponsorship.failureReason = "Payment signature verification failed";
      await sponsorship.save();
      return res.status(400).json({ error: "VERIFICATION_FAILED", message: "Payment signature invalid." });
    }

    const release = await mutex.acquire();
    try {
      sponsorship = await Sponsorship.findById(sponsorship._id);
      if (!sponsorship) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Sponsorship record not found." });
      }
      if (sponsorship.paymentStatus !== "Success") {
        await markSponsorshipPaymentSuccess(sponsorship, {
          razorpayPaymentId: razorpay_payment_id || "DEMO_PAY_ID",
          razorpaySignature: razorpay_signature || "DEMO_SIG",
          isApproved: true,
          failureReason: "Payment Successful"
        });
      }
    } finally {
      release();
    }

    res.json({
      success: true,
      sponsorId: sponsorship.sponsorId,
      companyName: sponsorship.companyName,
      amount: sponsorship.amount,
      tier: sponsorship.tier
    });

    emailService.sendSponsorshipEmail(sponsorship, isDevelopment()).catch(err => console.error("SPONSORSHIP_EMAIL_FAILED", err.message));
  } catch (err) {
    console.error("SPONSORSHIP_VERIFY_ERROR", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Failed to verify sponsorship payment." });
  }
});

// Payment Gateway Order Creation & Handlers
app.post("/api/create-order", razorpayService.createOrder);
app.post("/api/payment-pending", razorpayService.handlePaymentPending);
app.post("/api/payment-failed", razorpayService.handlePaymentFailure);

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

    const regFee = reg.registrationFee || 0;
    const tshirtFee = reg.tshirtFee || 0;
    const subtotal = regFee + tshirtFee;
    const computedPgFee = Number((subtotal * 0.025).toFixed(2));
    const pgFee = reg.pgFee !== undefined && reg.pgFee > 0 ? reg.pgFee : computedPgFee;
    const totalAmount = reg.totalAmount && reg.totalAmount > subtotal ? reg.totalAmount : Number((subtotal + pgFee).toFixed(2));

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
        registrationFee: regFee,
        tshirtFee: tshirtFee,
        pgFee: pgFee,
        totalAmount: totalAmount,
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
    const regFee = reg.registrationFee || 0;
    const tshirtFee = reg.tshirtFee || 0;
    const subtotal = regFee + tshirtFee;
    const computedPgFee = Number((subtotal * 0.025).toFixed(2));
    const pgFee = reg.pgFee !== undefined && reg.pgFee > 0 ? reg.pgFee : computedPgFee;
    const totalAmount = reg.totalAmount && reg.totalAmount > subtotal ? reg.totalAmount : Number((subtotal + pgFee).toFixed(2));

    if (reg.pgFee !== pgFee || reg.totalAmount !== totalAmount) {
      reg.pgFee = pgFee;
      reg.totalAmount = totalAmount;
    }

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
      isDevelopment: !!order.demo || isDevelopment(),
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
  const data = req.body || {};
  const token = data.token;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

  if (!token) {
    return res.status(400).json({ error: "MISSING_TOKEN", message: "Payment token is required." });
  }
  if (!razorpay_order_id) {
    return res.status(400).json({ error: "MISSING_ORDER", message: "Razorpay order id is required." });
  }

  const existingReg = await Registration.findOne({ paymentToken: token });
  const check = isPaymentTokenInvalid(existingReg);
  if (check.invalid) {
    if (check.paid) return res.json({ success: true, isPaid: true, category: existingReg.category, tshirtNumber: existingReg.tshirtNumber, totalAmount: existingReg.totalAmount });
    if (check.expired) return res.status(400).json({ error: "EXPIRED_TOKEN", message: check.message });
    return res.status(404).json({ error: "INVALID_TOKEN", message: check.message });
  }

  if (existingReg.razorpayOrderId && existingReg.razorpayOrderId !== razorpay_order_id) {
    return res.status(400).json({ error: "ORDER_MISMATCH", message: "Payment order does not match this payment link." });
  }

  const isValid = isDevelopment() ||
    razorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

  if (!isValid) {
    await Registration.findOneAndUpdate(
      { _id: existingReg._id },
      { paymentStatus: "Failed", failureReason: "Payment signature verification failed" }
    );
    return res.status(400).json({
      error: "PAYMENT_VERIFICATION_FAILED",
      message: "Security check failed. Transaction signature invalid."
    });
  }

  let updatedRecord;
  let newSuccessCount = 0;
  let closed = false;

  const release = await mutex.acquire();
  try {
    const resSuccess = await markRegistrationPaymentSuccess(existingReg, {
      razorpayPaymentId: razorpay_payment_id || "DEMO_PAY_ID",
      razorpaySignature: razorpay_signature || "DEMO_SIG",
      paymentGateway: "razorpay",
      failureReason: "Payment Successful"
    });
    updatedRecord = resSuccess.reg;
    newSuccessCount = resSuccess.newSuccessCount;
    closed = resSuccess.closed;
  } catch (err) {
    console.error("VERIFY_TOKEN_PAYMENT_ERROR", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  } finally {
    release();
  }

  // Fast response
  res.json({
    success: true,
    category: updatedRecord.category,
    participantType: updatedRecord.participantType,
    tshirtNumber: updatedRecord.tshirtNumber,
    totalAmount: updatedRecord.totalAmount,
    registeredSoFar: newSuccessCount,
    closed
  });

  // Non-blocking async background tasks
  const sheetData = {
    timestamp: updatedRecord.createdAt.toISOString(),
    fullName: updatedRecord.fullName, dob: updatedRecord.dob, age: updatedRecord.age,
    participantType: updatedRecord.participantType, category: updatedRecord.category,
    gender: updatedRecord.gender, phone: updatedRecord.phone, email: updatedRecord.email,
    district: updatedRecord.district, pincode: updatedRecord.pincode, tshirtSize: updatedRecord.tshirtSize,
    tshirtSelected: updatedRecord.tshirtSelected, bloodGroup: updatedRecord.bloodGroup,
    tshirtNumber: updatedRecord.tshirtNumber, emergencyContact: updatedRecord.emergencyContact,
    registrationFee: updatedRecord.registrationFee, tshirtFee: updatedRecord.tshirtFee,
    pgFee: updatedRecord.pgFee, totalAmount: updatedRecord.totalAmount, status: "SUCCESS",
    failureReason: `Payment ID: ${updatedRecord.razorpayPaymentId}`
  };
  sheets.appendRegistrationSuccess(sheetData).catch(() => {});
  sheets.appendRegistrationStatus(sheetData).catch(() => {});
  emailService.sendRegistrationEmail(updatedRecord, isDevelopment()).catch(err => console.error("TOKEN_PAYMENT_EMAIL_FAILED", err.message));
});


// PayU Callback Route (HTTP POST Redirect from PayU Hosted Checkout)
app.post("/api/payu/callback", async (req, res) => {
  const data = req.body || {};
  const { salt } = payuService.getPayuCredentials();
  const isValidHash = payuService.verifyPayuResponseHash(data, salt);

  const txnid = data.txnid || "";
  const mihpayid = data.mihpayid || "";
  const status = String(data.status || "").toLowerCase();
  const errorMsg = data.error_Message || data.unmappedstatus || "Transaction declined";
  const isTokenPay = String(data.udf2 || "") === "token_pay";
  const isSponsorshipPay =
    String(data.udf1 || "") === "sponsorship" ||
    String(data.udf2 || "") === "sponsor_pay" ||
    String(txnid).startsWith("SPN_PAYU_");

  const frontendUrl = getBaseUrl(req, "FRONTEND_URL");
  const sponsorshipRedirectBase = `${frontendUrl}/sponsorship.html`;
  const successRedirectBase = isTokenPay ? `${frontendUrl}/pay.html` : `${frontendUrl}/register.html`;
  const failRedirectBase = isTokenPay ? `${frontendUrl}/pay.html` : `${frontendUrl}/register.html`;

  // ---- Sponsorship PayU return path ----
  if (isSponsorshipPay) {
    if (!isValidHash && !isDevelopment()) {
      console.error("PAYU_SPONSORSHIP_CALLBACK_HASH_INVALID:", data);
      if (txnid) {
        await Sponsorship.findOneAndUpdate(
          { payuTxnId: txnid },
          { paymentStatus: "Failed", failureReason: "PayU callback hash signature verification failed", paymentGatewayResponse: data }
        );
      }
      return res.redirect(`${sponsorshipRedirectBase}?status=failed&reason=${encodeURIComponent("Security signature verification failed")}`);
    }

    if (status === "success") {
      let sponsorship = null;
      let justCompleted = false;
      const release = await mutex.acquire();
      try {
        sponsorship = await Sponsorship.findOne({ payuTxnId: txnid });
        if (!sponsorship) {
          return res.redirect(`${sponsorshipRedirectBase}?status=failed&reason=${encodeURIComponent("Sponsorship record not found for this payment")}`);
        }
        if (sponsorship.paymentStatus !== "Success") {
          const result = await markSponsorshipPaymentSuccess(sponsorship, {
            payuMihpayid: mihpayid,
            paymentGateway: "payu",
            paymentGatewayResponse: data,
            isApproved: true,
            failureReason: "Payment Successful"
          });
          sponsorship = result.sponsorship;
          justCompleted = result.justCompleted;
        }
      } catch (err) {
        console.error("PAYU_SPONSORSHIP_CALLBACK_ERROR", err);
      } finally {
        release();
      }

      if (justCompleted && sponsorship) {
        emailService.sendSponsorshipEmail(sponsorship, isDevelopment()).catch(err => console.error("PAYU_SPONSORSHIP_EMAIL_FAILED", err.message));
      }

      return res.redirect(
        `${sponsorshipRedirectBase}?status=success&sponsorId=${encodeURIComponent(sponsorship?.sponsorId || "")}&company=${encodeURIComponent(sponsorship?.companyName || "")}&txnid=${encodeURIComponent(txnid)}`
      );
    }

    if (txnid) {
      await Sponsorship.findOneAndUpdate(
        { payuTxnId: txnid },
        { paymentStatus: "Failed", paymentGatewayResponse: data, failureReason: errorMsg }
      );
    }
    return res.redirect(`${sponsorshipRedirectBase}?status=failed&reason=${encodeURIComponent(errorMsg)}`);
  }

  // ---- Registration / token-pay PayU return path ----
  if (!isValidHash && !isDevelopment()) {
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
    let regRecord;
    let justCompleted = false;

    const release = await mutex.acquire();
    try {
      regRecord = await Registration.findOne({ payuTxnId: txnid });
      if (!regRecord) {
        if (isTokenPay) {
          return res.redirect(`${failRedirectBase}?status=failed&reason=${encodeURIComponent("Registration not found for this payment")}`);
        }
        // Do not invent fake registrations for unknown txn IDs
        return res.redirect(`${failRedirectBase}?status=failed&reason=${encodeURIComponent("Registration not found for this payment")}`);
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
    } catch (err) {
      console.error("PAYU_CALLBACK_MUTEX_ERROR", err);
    } finally {
      release();
    }

    if (justCompleted && regRecord) {
      const sheetData = {
        timestamp: regRecord.createdAt.toISOString(),
        fullName: regRecord.fullName, dob: regRecord.dob, age: regRecord.age,
        participantType: regRecord.participantType, category: regRecord.category,
        gender: regRecord.gender, phone: regRecord.phone, email: regRecord.email,
        district: regRecord.district, pincode: regRecord.pincode, tshirtSize: regRecord.tshirtSize,
        tshirtSelected: regRecord.tshirtSelected, bloodGroup: regRecord.bloodGroup,
        tshirtNumber: regRecord.tshirtNumber, emergencyContact: regRecord.emergencyContact,
        registrationFee: regRecord.registrationFee, tshirtFee: regRecord.tshirtFee,
        pgFee: regRecord.pgFee, totalAmount: regRecord.totalAmount, status: "SUCCESS",
        failureReason: `PayU ID: ${mihpayid || txnid}`
      };
      sheets.appendRegistrationSuccess(sheetData).catch(() => {});
      sheets.appendRegistrationStatus(sheetData).catch(() => {});
      emailService.sendRegistrationEmail(regRecord, isDevelopment()).catch(err => console.error("PAYU_EMAIL_SEND_FAILED", err.message));
    }

    return res.redirect(`${successRedirectBase}?status=success&txnid=${encodeURIComponent(txnid)}&bib=${encodeURIComponent(regRecord?.tshirtNumber || "")}&name=${encodeURIComponent(regRecord?.fullName || "")}&email=${encodeURIComponent(regRecord?.email || "")}&category=${encodeURIComponent(regRecord?.category || "")}`);
  } else {
    if (txnid) {
      await Registration.findOneAndUpdate(
        { payuTxnId: txnid },
        { paymentStatus: "Failed", paymentGatewayResponse: data, failureReason: errorMsg }
      );
    }
    return res.redirect(`${failRedirectBase}?status=failed&reason=${encodeURIComponent(errorMsg)}`);
  }
});

// Razorpay Webhook Endpoint for Automatic Async Payment Confirmation
app.post("/api/razorpay/webhook", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (expectedSignature !== signature) {
      console.warn("⚠️ RAZORPAY_WEBHOOK_SIGNATURE_MISMATCH");
      return res.status(400).send("Invalid Webhook Signature");
    }
  }

  const event = req.body?.event;
  const payload = req.body?.payload || {};

  if (event === "payment.captured" || event === "order.paid") {
    const paymentEntity = payload.payment?.entity || {};
    const orderId = paymentEntity.order_id || payload.order?.entity?.id;
    const paymentId = paymentEntity.id;

    if (orderId) {
      let updatedRecord = null;
      let updatedSponsorship = null;
      const release = await mutex.acquire();
      try {
        let reg = await Registration.findOne({ razorpayOrderId: orderId });
        if (reg && reg.paymentStatus !== "Success") {
          const resSuccess = await markRegistrationPaymentSuccess(reg, {
            razorpayPaymentId: paymentId || "WEBHOOK_PAY_ID",
            paymentGateway: "razorpay",
            failureReason: "Payment Successful (Razorpay Webhook)"
          });
          updatedRecord = resSuccess.reg;
        } else if (!reg) {
          let sponsorship = await Sponsorship.findOne({ razorpayOrderId: orderId });
          if (sponsorship && sponsorship.paymentStatus !== "Success") {
            const result = await markSponsorshipPaymentSuccess(sponsorship, {
              razorpayPaymentId: paymentId || "WEBHOOK_PAY_ID",
              paymentGateway: "razorpay",
              isApproved: true,
              failureReason: "Payment Successful (Razorpay Webhook)"
            });
            updatedSponsorship = result.sponsorship;
          }
        }
      } catch (err) {
        console.error("WEBHOOK_PROCESSING_ERROR", err);
      } finally {
        release();
      }

      if (updatedRecord) {
        const sheetData = {
          timestamp: updatedRecord.createdAt.toISOString(),
          fullName: updatedRecord.fullName, dob: updatedRecord.dob, age: updatedRecord.age,
          participantType: updatedRecord.participantType, category: updatedRecord.category,
          gender: updatedRecord.gender, phone: updatedRecord.phone, email: updatedRecord.email,
          district: updatedRecord.district, pincode: updatedRecord.pincode, tshirtSize: updatedRecord.tshirtSize,
          tshirtSelected: updatedRecord.tshirtSelected, bloodGroup: updatedRecord.bloodGroup,
          tshirtNumber: updatedRecord.tshirtNumber, emergencyContact: updatedRecord.emergencyContact,
          registrationFee: updatedRecord.registrationFee, tshirtFee: updatedRecord.tshirtFee,
          pgFee: updatedRecord.pgFee, totalAmount: updatedRecord.totalAmount, status: "SUCCESS",
          failureReason: `Webhook Payment ID: ${paymentId}`
        };
        sheets.appendRegistrationSuccess(sheetData).catch(() => {});
        sheets.appendRegistrationStatus(sheetData).catch(() => {});
        emailService.sendRegistrationEmail(updatedRecord, isDevelopment()).catch(err => console.error("WEBHOOK_EMAIL_FAILED", err.message));
      }

      if (updatedSponsorship) {
        emailService.sendSponsorshipEmail(updatedSponsorship, isDevelopment()).catch(err => console.error("WEBHOOK_SPONSORSHIP_EMAIL_FAILED", err.message));
      }
    }
  }

  return res.status(200).json({ status: "ok" });
});

// Main Public Registration Verification Endpoint
app.post("/api/register", async (req, res) => {
  const data = req.body || {};
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

  // 1. Idempotency Check: if order is already marked Success, return immediately
  if (razorpay_order_id) {
    const existingReg = await Registration.findOne({ razorpayOrderId: razorpay_order_id });
    if (existingReg && existingReg.paymentStatus === "Success") {
      const successCount = await Registration.countDocuments({ paymentStatus: "Success" });
      const settings = await Settings.findOne() || { maxRegistrations: 1000 };
      return res.json({
        success: true,
        category: existingReg.category,
        participantType: existingReg.participantType,
        tshirtNumber: existingReg.tshirtNumber,
        totalAmount: existingReg.totalAmount,
        registeredSoFar: successCount,
        closed: successCount >= settings.maxRegistrations
      });
    }
  }

  const isValid = isDevelopment() ||
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

  let updatedRecord;
  let newSuccessCount = 0;
  let closed = false;

  const release = await mutex.acquire();
  try {
    const settings = await Settings.findOne() || { maxRegistrations: 1000, isOpen: true, tshirtCounter: 11 };
    const successCount = await Registration.countDocuments({ paymentStatus: "Success" });

    if (!settings.isOpen || successCount >= settings.maxRegistrations) {
      return res.status(403).json({
        error: "REGISTRATIONS_CLOSED",
        message: "Registrations are closed. All slots have been filled."
      });
    }

    let regRecord;
    if (razorpay_order_id) {
      regRecord = await Registration.findOne({ razorpayOrderId: razorpay_order_id });
      if (!regRecord) {
        return res.status(404).json({
          error: "ORDER_NOT_FOUND",
          message: "No pending registration found for this payment order."
        });
      }
    } else {
      const emailLower = String(data.email || "").trim().toLowerCase();
      const age = parseInt(data.age || 20, 10);
      const participantType = age > (settings.ageCutoff || 13) ? "Adult" : "Kids";
      const category = participantType === "Adult" ? "7 KM Timed Run" : "3.5 KM Fun Run";

      regRecord = await Registration.create({
        fullName: data.fullName || "Runner", dob: data.dob || "01/01/2000", age,
        participantType, category, gender: data.gender || "others", phone: data.phone || "",
        email: emailLower, district: data.district || "", pincode: data.pincode || "",
        tshirtSize: participantType === "Kids" ? "N/A" : (data.tshirtSize || "M"),
        tshirtSelected: participantType !== "Kids" && data.tshirtSelected !== false && data.tshirtSelected !== "false",
        bloodGroup: data.bloodGroup || "O+", emergencyContact: data.emergencyContact || "",
        tshirtNumber: "N/A", paymentStatus: "Pending",
        razorpayOrderId: `order_${Date.now()}`
      });
    }

    const resSuccess = await markRegistrationPaymentSuccess(regRecord, {
      razorpayPaymentId: razorpay_payment_id || "DEMO_PAY_ID",
      razorpaySignature: razorpay_signature || "DEMO_SIG",
      paymentGateway: "razorpay",
      failureReason: "Payment Successful"
    });

    updatedRecord = resSuccess.reg;
    newSuccessCount = resSuccess.newSuccessCount;
    closed = resSuccess.closed;
  } catch (err) {
    console.error("REGISTER_ERROR", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  } finally {
    release();
  }

  // FAST RESPONSE: Send JSON response IMMEDIATELY
  res.json({
    success: true,
    category: updatedRecord.category,
    participantType: updatedRecord.participantType,
    tshirtNumber: updatedRecord.tshirtNumber,
    totalAmount: updatedRecord.totalAmount,
    registeredSoFar: newSuccessCount,
    closed
  });

  // NON-BLOCKING ASYNC TASKS: Send email & sync Google Sheets in background
  const sheetData = {
    timestamp: updatedRecord.createdAt.toISOString(),
    fullName: updatedRecord.fullName, dob: updatedRecord.dob, age: updatedRecord.age,
    participantType: updatedRecord.participantType, category: updatedRecord.category,
    gender: updatedRecord.gender, phone: updatedRecord.phone, email: updatedRecord.email,
    district: updatedRecord.district, pincode: updatedRecord.pincode, tshirtSize: updatedRecord.tshirtSize,
    tshirtSelected: updatedRecord.tshirtSelected, bloodGroup: updatedRecord.bloodGroup,
    tshirtNumber: updatedRecord.tshirtNumber, emergencyContact: updatedRecord.emergencyContact,
    registrationFee: updatedRecord.registrationFee, tshirtFee: updatedRecord.tshirtFee,
    pgFee: updatedRecord.pgFee, totalAmount: updatedRecord.totalAmount, status: "SUCCESS",
    failureReason: `Payment ID: ${updatedRecord.razorpayPaymentId}`
  };
  sheets.appendRegistrationSuccess(sheetData).catch(() => {});
  sheets.appendRegistrationStatus(sheetData).catch(() => {});
  emailService.sendRegistrationEmail(updatedRecord, isDevelopment()).catch(err => console.error("ASYNC_EMAIL_FAILED", err.message));
});

// Admin routes have been moved to the standalone chennimalaimarathon-admin project.

const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`🚀 Marathon Server running on port ${PORT}`));
}

module.exports = app;