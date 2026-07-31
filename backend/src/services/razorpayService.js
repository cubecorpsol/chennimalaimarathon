const crypto = require("crypto");
const Razorpay = require("razorpay");
const { Settings, Registration } = require("../db");
const sheets = require("./sheetsService");
const payuService = require("./payuService");
const { getBaseUrl, isDevelopment, isProduction } = require("../config");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "dummy_key",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummy_secret"
});

function hasRazorpayCredentials() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** In development (or when keys are missing), frontend should skip live Razorpay checkout. */
function shouldBypassLiveCheckout() {
  return isDevelopment() || !hasRazorpayCredentials();
}

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

// 1. Create Order with backend pricing calculation & MongoDB persistence (Supports Razorpay & PayU)
async function createOrder(req, res) {
  try {
    const settings = await Settings.findOne() || {
      adultFee: 500, kidsFee: 300, tshirtPrice: 200,
      maxRegistrations: 1000, isOpen: true, ageCutoff: 13,
      paymentGateway: "razorpay"
    };

    // Check total successful registrations count in MongoDB
    const successCount = await Registration.countDocuments({ paymentStatus: "Success" });
    if (!settings.isOpen || successCount >= settings.maxRegistrations) {
      return res.status(403).json({
        error: "REGISTRATIONS_CLOSED",
        message: "Registrations are closed. All slots have been filled or registrations are disabled."
      });
    }

    const formData = req.body || {};
    const emailLower = String(formData.email || "").trim().toLowerCase();

    // Backend Pricing Logic
    const age = calculateAge(formData.dob);
    const participantType = age > (settings.ageCutoff || 13) ? "Adult" : "Kids";
    const category = participantType === "Adult" ? "7 KM Timed Run" : "3.5 KM Fun Run";

    const tshirtSelected = formData.tshirtSelected !== false && String(formData.tshirtSelected) !== "false";
    const registrationFee = participantType === "Adult" ? settings.adultFee : settings.kidsFee;
    const tshirtFee = tshirtSelected ? settings.tshirtPrice : 0;
    const subtotal = registrationFee + tshirtFee;
    const pgFee = Number((subtotal * 0.025).toFixed(2));
    const totalAmount = Number((subtotal + pgFee).toFixed(2));

    const activeGateway = settings.paymentGateway || "razorpay";

    if (activeGateway === "payu") {
      const payuTxnId = `PAYU_TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const { key, salt, actionUrl } = payuService.getPayuCredentials();

      const hostUrl = getBaseUrl(req, "BACKEND_URL");
      const callbackUrl = `${hostUrl}/api/payu/callback`;

      const firstname = (formData.fullName || "Runner").trim().split(" ")[0] || "Runner";
      const amountStr = totalAmount.toFixed(2);
      const productinfo = "Chennimalai Marathon 2026 Registration";
      const udf1 = "chennimalai_marathon";

      const hash = payuService.generatePayuRequestHash({
        key,
        txnid: payuTxnId,
        amount: amountStr,
        productinfo,
        firstname,
        email: emailLower,
        udf1,
        salt
      });

      const regDoc = await Registration.create({
        fullName: formData.fullName || "",
        dob: formData.dob || "",
        age,
        participantType,
        category,
        gender: formData.gender || "others",
        phone: formData.phone || "",
        email: emailLower,
        district: formData.district || "",
        tshirtSize: participantType === "Kids" ? "N/A" : (formData.tshirtSize || "M"),
        tshirtSelected: participantType !== "Kids" && tshirtSelected,
        bloodGroup: formData.bloodGroup || "O+",
        emergencyContact: formData.emergencyContact || "",
        registrationFee,
        tshirtFee,
        pgFee,
        totalAmount,
        paymentStatus: "Pending",
        paymentGateway: "payu",
        payuTxnId: payuTxnId,
        failureReason: `PayU order created (${payuTxnId}), payment pending`
      });

      sheets.appendRegistrationStatus({
        timestamp: new Date().toISOString(),
        fullName: regDoc.fullName, dob: regDoc.dob, age: regDoc.age,
        participantType: regDoc.participantType, category: regDoc.category,
        gender: regDoc.gender, phone: regDoc.phone, email: regDoc.email,
        district: regDoc.district, pincode: regDoc.pincode, tshirtSize: regDoc.tshirtSize,
        tshirtSelected: regDoc.tshirtSelected, bloodGroup: regDoc.bloodGroup,
        tshirtNumber: "N/A", emergencyContact: regDoc.emergencyContact,
        registrationFee: regDoc.registrationFee, totalAmount: regDoc.totalAmount,
        status: "PENDING", failureReason: regDoc.failureReason
      }).catch(err => console.warn("Google Sheets status sync caught:", err.message));

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
          phone: formData.phone || "",
          surl: callbackUrl,
          furl: callbackUrl,
          hash,
          udf1
        },
        totalAmount,
        registrationFee,
        tshirtFee,
        pgFee,
        participantType,
        category
      });
    }

    // Default: Razorpay Order Creation
    let orderId = `order_dev_${Date.now()}`;
    let amountPaise = Math.round(totalAmount * 100);

    if (isProduction() && hasRazorpayCredentials()) {
      const options = {
        amount: amountPaise,
        currency: "INR",
        receipt: `marathon_rcpt_${Date.now()}`
      };
      const order = await razorpay.orders.create(options);
      orderId = order.id;
    } else if (isProduction()) {
      return res.status(500).json({
        error: "GATEWAY_NOT_CONFIGURED",
        message: "Razorpay credentials are not configured for production."
      });
    }

    // Create/Upsert Pending Registration in MongoDB
    const regDoc = await Registration.create({
      fullName: formData.fullName || "",
      dob: formData.dob || "",
      age,
      participantType,
      category,
      gender: formData.gender || "others",
      phone: formData.phone || "",
      email: emailLower,
      district: formData.district || "",
      pincode: formData.pincode || "",
      tshirtSize: participantType === "Kids" ? "N/A" : (formData.tshirtSize || "M"),
      tshirtSelected: participantType !== "Kids" && tshirtSelected,
      bloodGroup: formData.bloodGroup || "O+",
      emergencyContact: formData.emergencyContact || "",
      registrationFee,
      tshirtFee,
      pgFee,
      totalAmount,
      paymentStatus: "Pending",
      paymentGateway: "razorpay",
      razorpayOrderId: orderId,
      failureReason: `Order created (${orderId}), payment pending`
    });

    // Asynchronously sync to Sheets status tab (never block backend response if Sheets fails)
    sheets.appendRegistrationStatus({
      timestamp: new Date().toISOString(),
      fullName: regDoc.fullName, dob: regDoc.dob, age: regDoc.age,
      participantType: regDoc.participantType, category: regDoc.category,
      gender: regDoc.gender, phone: regDoc.phone, email: regDoc.email,
      district: regDoc.district, pincode: regDoc.pincode, tshirtSize: regDoc.tshirtSize,
      tshirtSelected: regDoc.tshirtSelected, bloodGroup: regDoc.bloodGroup,
      tshirtNumber: "N/A", emergencyContact: regDoc.emergencyContact,
      registrationFee: regDoc.registrationFee, totalAmount: regDoc.totalAmount,
      status: "PENDING", failureReason: regDoc.failureReason
    }).catch(err => console.warn("Google Sheets status sync caught:", err.message));

    return res.json({
      success: true,
      gateway: "razorpay",
      orderId,
      amount: amountPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID || "",
      isDevelopment: shouldBypassLiveCheckout(),
      totalAmount,
      registrationFee,
      tshirtFee,
      pgFee,
      participantType,
      category
    });

  } catch (err) {
    console.error("RAZORPAY_CREATE_ORDER_ERROR:", err);
    return res.status(500).json({ error: "ORDER_CREATION_FAILED", message: err.message });
  }
}

// 2. Handle Pending (Modal Closed)
async function handlePaymentPending(req, res) {
  try {
    const { formData, orderId, reason } = req.body || {};
    const emailLower = String(formData?.email || "").trim().toLowerCase();

    if (orderId) {
      await Registration.findOneAndUpdate(
        { razorpayOrderId: orderId },
        { paymentStatus: "Pending", failureReason: reason || "User closed payment window without paying" }
      );
    } else if (emailLower) {
      await Registration.findOneAndUpdate(
        { email: emailLower, paymentStatus: "Pending" },
        { failureReason: reason || "User closed payment window without paying" },
        { sort: { createdAt: -1 } }
      );
    }

    return res.json({ success: true, recorded: true });
  } catch (err) {
    return res.status(500).json({ error: "LOG_FAILED", message: err.message });
  }
}

// 3. Handle Failure
async function handlePaymentFailure(req, res) {
  try {
    const { formData, orderId, reason } = req.body || {};
    const emailLower = String(formData?.email || "").trim().toLowerCase();

    if (orderId) {
      await Registration.findOneAndUpdate(
        { razorpayOrderId: orderId },
        { paymentStatus: "Failed", failureReason: reason || "Transaction declined by gateway" }
      );
    } else if (emailLower) {
      await Registration.findOneAndUpdate(
        { email: emailLower, paymentStatus: "Pending" },
        { paymentStatus: "Failed", failureReason: reason || "Transaction declined by gateway" },
        { sort: { createdAt: -1 } }
      );
    }

    return res.json({ success: true, recorded: true });
  } catch (err) {
    return res.status(500).json({ error: "LOG_FAILED", message: err.message });
  }
}

// 4. Verify HMAC Signature
function verifySignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature) return false;
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "dummy_secret")
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return generatedSignature === signature;
}

/**
 * Create a Razorpay order for an existing registration (token / resume payment).
 * Returns a development order id when NODE_ENV is not production or credentials are missing.
 */
async function createRazorpayOrder(amountPaise, receiptPrefix = "marathon_token") {
  const amount = Math.max(0, Math.round(Number(amountPaise) || 0));
  if (isDevelopment() || !hasRazorpayCredentials()) {
    if (isProduction() && !hasRazorpayCredentials()) {
      throw new Error("Razorpay credentials are not configured for production.");
    }
    return {
      id: `order_dev_${Date.now()}`,
      amount,
      currency: "INR",
      demo: true
    };
  }
  const order = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt: `${receiptPrefix}_${Date.now()}`.slice(0, 40)
  });
  return { id: order.id, amount: order.amount, currency: order.currency || "INR", demo: false };
}

module.exports = {
  createOrder,
  handlePaymentPending,
  handlePaymentFailure,
  createRazorpayOrder,
  verifySignature,
  isDevelopment,
  isProduction,
  shouldBypassLiveCheckout
};

