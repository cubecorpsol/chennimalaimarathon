// const dns = require("dns");
// dns.setServers(["8.8.8.8", "8.8.4.4"]); 
// Force Node to use Google DNS


const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const SettingsSchema = new mongoose.Schema({
  adultFee: { type: Number, default: 500 },
  kidsFee: { type: Number, default: 300 },
  tshirtPrice: { type: Number, default: 200 },
  pricingTitle: { type: String, default: "Marathon Registration Fees" },
  maxRegistrations: { type: Number, default: 1000 },
  tshirtCounter: { type: Number, default: 11 },
  isOpen: { type: Boolean, default: true },
  showRemainingSlots: { type: Boolean, default: true },
  ageCutoff: { type: Number, default: 13 },
  paymentGateway: { type: String, enum: ["razorpay", "payu"], default: "razorpay" }
}, { timestamps: true });

const RegistrationSchema = new mongoose.Schema({
  tshirtNumber: { type: String, default: "N/A" },
  fullName: { type: String, required: true },
  dob: { type: String, required: true },
  age: { type: Number, required: true },
  participantType: { type: String, enum: ["Adult", "Kids"], required: true },
  category: { type: String, required: true },
  gender: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, index: true },
  district: { type: String, required: true },
  pincode: { type: String, required: true },
  tshirtSize: { type: String, required: true },
  tshirtSelected: { type: Boolean, default: true },
  bloodGroup: { type: String, required: true },
  emergencyContact: { type: String, required: true },
  registrationFee: { type: Number, default: 0 },
  tshirtFee: { type: Number, default: 0 },
  pgFee: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Success", "Failed", "Cancelled"],
    default: "Pending",
    index: true
  },
  paymentGateway: { type: String, enum: ["razorpay", "payu"], default: "razorpay" },
  razorpayOrderId: { type: String, default: "" },
  razorpayPaymentId: { type: String, default: "" },
  razorpaySignature: { type: String, default: "" },
  payuTxnId: { type: String, default: "" },
  payuMihpayid: { type: String, default: "" },
  paymentGatewayResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
  failureReason: { type: String, default: "" },
  paymentToken: { type: String, default: null, index: true },
  paymentTokenExpiresAt: { type: Date, default: null },
  paymentTokenUsed: { type: Boolean, default: false }
}, { timestamps: true });

const AdminUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, default: "Super Admin" },
  role: { type: String, enum: ["superadmin", "admin"], default: "admin" },
  otp: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null }
}, { timestamps: true });

const Settings = mongoose.model("Settings", SettingsSchema);
const Registration = mongoose.model("Registration", RegistrationSchema);
const AdminUser = mongoose.model("AdminUser", AdminUserSchema);

const SponsorshipSchema = new mongoose.Schema({
  sponsorId: { type: String, default: "N/A" },
  companyName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, index: true },
  designation: { type: String, default: "" },
  tier: {
    type: String,
    enum: ["Title", "Gold", "Silver", "Bronze", "Custom"],
    default: "Gold"
  },
  amount: { type: Number, required: true },
  gstin: { type: String, default: "" },
  website: { type: String, default: "" },
  logoUrl: { type: String, default: "" },
  message: { type: String, default: "" },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Success", "Failed", "Cancelled"],
    default: "Pending",
    index: true
  },
  paymentGateway: { type: String, enum: ["razorpay", "payu"], default: "razorpay" },
  razorpayOrderId: { type: String, default: "" },
  razorpayPaymentId: { type: String, default: "" },
  razorpaySignature: { type: String, default: "" },
  payuTxnId: { type: String, default: "" },
  payuMihpayid: { type: String, default: "" },
  paymentGatewayResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
  failureReason: { type: String, default: "" },
  isApproved: { type: Boolean, default: true }
}, { timestamps: true });

const Sponsorship = mongoose.model("Sponsorship", SponsorshipSchema);

async function connectDB() {
  const mongoURI = process.env.DATABASE_URL;
  if (!mongoURI) {
    console.error("❌ MONGODB_ERROR: DATABASE_URL is missing in environment variables.");
    return false;
  }

  try {
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB Atlas successfully.");
    await seedInitialData();
    return true;
  } catch (err) {
    console.error("❌ MONGODB_CONNECT_FAILED:", err.message);
    return false;
  }
}

async function seedInitialData() {
  try {
    // 1. Seed Settings if none exist
    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      await Settings.create({
        adultFee: 500,
        kidsFee: 300,
        tshirtPrice: 200,
        pricingTitle: "Marathon Registration Fees",
        maxRegistrations: 1000,
        tshirtCounter: 11,
        isOpen: true,
        showRemainingSlots: true,
        ageCutoff: 13
      });
      console.log("🌱 [DB SEED] Default Settings initialized.");
    }

    // 2. Seed Default Super Admin
    const defaultEmail = "sniwaserode@gmail.com";
    const existingAdmin = await AdminUser.findOne({ email: defaultEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await AdminUser.create({
        email: defaultEmail,
        password: hashedPassword,
        name: "Super Admin",
        role: "superadmin"
      });
      console.log(`🌱 [DB SEED] Super Admin user created: ${defaultEmail}`);
    }
  } catch (err) {
    console.error("❌ DB_SEED_ERROR:", err.message);
  }
}

module.exports = {
  connectDB,
  Settings,
  Registration,
  AdminUser,
  Sponsorship
};

