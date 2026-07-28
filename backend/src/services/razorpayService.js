const crypto = require("crypto");
const Razorpay = require("razorpay");
const sheets = require("./sheetsService");
const { RULES } = require("../config");

// Read modes directly from .env dynamically
const isDryRun = () => process.env.DRY_RUN_MODE === "true";
const isDemo = () => process.env.DEMO_MODE === "true";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || ""
});

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

// 1. Create Order Handler
async function createOrder(req, res) {
  try {
    const meta = await sheets.getMeta();
    if (meta.closed || meta.registrationCount >= RULES.MAX_REGISTRATIONS) {
      return res.status(403).json({
        error: "REGISTRATIONS_CLOSED",
        message: "Registrations are closed. All 1,000 slots have been filled."
      });
    }

    const formData = req.body || {};
    if (!isDryRun() && formData.email && (await sheets.emailExists(String(formData.email).trim().toLowerCase()))) {
      return res.status(409).json({
        error: "DUPLICATE_EMAIL",
        message: "This email address is already registered."
      });
    }

    const options = {
      amount: 10000, // ₹100 in paise
      currency: "INR",
      receipt: `marathon_rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    const age = calculateAge(formData.dob);
    const category = age <= RULES.AGE_CUTOFF_YEARS ? RULES.CATEGORY_3_5KM : RULES.CATEGORY_7KM;

    // Log PENDING status ONLY in Production Mode
    if (!isDryRun() && !isDemo()) {
      await sheets.appendRegistrationStatus({
        timestamp: new Date().toISOString(),
        fullName: formData.fullName, dob: formData.dob, age, category,
        gender: formData.gender, phone: formData.phone,
        email: String(formData.email).trim().toLowerCase(),
        district: formData.district, pincode: formData.pincode,
        tshirtSize: formData.tshirtSize, bloodGroup: formData.bloodGroup,
        tshirtNumber: "N/A", emergencyContact: formData.emergencyContact,
        status: "PENDING", failureReason: `Order created (${order.id}), payment pending`
      });
    } else {
      console.log("🧪 [TEST/DRY RUN] Razorpay order generated. DB writes skipped.");
    }

    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error("RAZORPAY_CREATE_ORDER_ERROR:", err);
    return res.status(500).json({ error: "ORDER_CREATION_FAILED", message: err.message });
  }
}

// 2. Pending Handler (Modal Closed)
async function handlePaymentPending(req, res) {
  if (isDryRun() || isDemo()) {
    console.log("🧪 [TEST/DRY RUN] Modal closed. DB logging skipped.");
    return res.json({ success: true, dryRun: true });
  }

  try {
    const { formData, reason } = req.body || {};
    if (!formData) return res.status(400).json({ error: "MISSING_DATA" });
    const age = calculateAge(formData.dob);
    const category = age <= RULES.AGE_CUTOFF_YEARS ? RULES.CATEGORY_3_5KM : RULES.CATEGORY_7KM;

    await sheets.appendRegistrationStatus({
      timestamp: new Date().toISOString(),
      fullName: formData.fullName, dob: formData.dob, age, category,
      gender: formData.gender, phone: formData.phone,
      email: String(formData.email).trim().toLowerCase(),
      district: formData.district, pincode: formData.pincode,
      tshirtSize: formData.tshirtSize, bloodGroup: formData.bloodGroup,
      tshirtNumber: "N/A", emergencyContact: formData.emergencyContact,
      status: "PENDING", failureReason: reason || "User closed payment window without paying"
    });
    return res.json({ success: true, recorded: true });
  } catch (err) {
    return res.status(500).json({ error: "LOG_FAILED" });
  }
}

// 3. Payment Failure Handler
async function handlePaymentFailure(req, res) {
  if (isDryRun() || isDemo()) {
    console.log("🧪 [TEST/DRY RUN] Payment failed test. DB logging skipped.");
    return res.json({ success: true, dryRun: true });
  }

  try {
    const { formData, reason } = req.body || {};
    if (!formData) return res.status(400).json({ error: "MISSING_DATA" });
    const age = calculateAge(formData.dob);
    const category = age <= RULES.AGE_CUTOFF_YEARS ? RULES.CATEGORY_3_5KM : RULES.CATEGORY_7KM;

    await sheets.appendRegistrationStatus({
      timestamp: new Date().toISOString(),
      fullName: formData.fullName, dob: formData.dob, age, category,
      gender: formData.gender, phone: formData.phone,
      email: String(formData.email).trim().toLowerCase(),
      district: formData.district, pincode: formData.pincode,
      tshirtSize: formData.tshirtSize, bloodGroup: formData.bloodGroup,
      tshirtNumber: "N/A", emergencyContact: formData.emergencyContact,
      status: "FAILED", failureReason: reason || "Payment transaction failed"
    });
    return res.json({ success: true, recorded: true });
  } catch (err) {
    return res.status(500).json({ error: "LOG_FAILED" });
  }
}

// 4. Verify HMAC Signature
function verifySignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature) return false;
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return generatedSignature === signature;
}

module.exports = {
  createOrder,
  handlePaymentPending,
  handlePaymentFailure,
  verifySignature,
  isDryRun,
  isDemo
};
