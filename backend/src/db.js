// const dns = require("dns");
// dns.setServers(["8.8.8.8", "8.8.4.4"]); 
// Force Node to use Google DNS


const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const SettingsSchema = new mongoose.Schema({
  adultFee: { type: Number, default: 150 },
  kidsFee: { type: Number, default: 100 },
  tshirtPrice: { type: Number, default: 0 },
  pricingTitle: { type: String, default: "Marathon Registration Fees" },
  maxRegistrations: { type: Number, default: 1000 },
  tshirtCounter: { type: Number, default: 11 },
  isOpen: { type: Boolean, default: true },
  showRemainingSlots: { type: Boolean, default: true },
  ageCutoff: { type: Number, default: 13 },
  paymentGateway: { type: String, enum: ["razorpay", "payu"], default: "razorpay" },
  volunteerPageOpen: { type: Boolean, default: true },
  volunteerPromoEnabled: { type: Boolean, default: true },
  payPageOpen: { type: Boolean, default: true }
}, { timestamps: true });

const RegistrationSchema = new mongoose.Schema({
  tempBibNumber: { type: String, default: "N/A" },
  permanentBibNumber: { type: String, default: "N/A" },
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
  paymentTokenUsed: { type: Boolean, default: false },
  paymentRequestEmailSentAt: { type: Date, default: null }
}, { timestamps: true });

const AdminUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, default: "Super Admin" },
  role: { type: String, enum: ["superadmin", "admin"], default: "admin" },
  otp: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null }
}, { timestamps: true });

const ContactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, index: true },
  message: { type: String, required: true }
}, { timestamps: true });

const VolunteerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, index: true },
  district: { type: String, required: true },
  tshirtSize: { type: String, required: true },
  role: { type: String, required: true },
  experience: { type: String, default: "No" },
  message: { type: String, default: "" }
}, { timestamps: true });

const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);
const Registration = mongoose.models.Registration || mongoose.model("Registration", RegistrationSchema);
const AdminUser = mongoose.models.AdminUser || mongoose.model("AdminUser", AdminUserSchema);
const ContactMessage = mongoose.models.ContactMessage || mongoose.model("ContactMessage", ContactMessageSchema);
const Volunteer = mongoose.models.Volunteer || mongoose.model("Volunteer", VolunteerSchema);

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

const Sponsorship = mongoose.models.Sponsorship || mongoose.model("Sponsorship", SponsorshipSchema);

// Superadmin-configurable register.html field/step layout + system messages.
// Singleton, like Settings — one document holds the whole active configuration.
const RegistrationFormFieldSchema = new mongoose.Schema({
  key: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  required: { type: Boolean, default: true },
  label: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  errorMessage: { type: String, default: "" }
}, { _id: false });

const RegistrationFormStepSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  order: { type: Number, required: true },
  fields: [RegistrationFormFieldSchema]
}, { _id: false });

const RegistrationFormConfigSchema = new mongoose.Schema({
  steps: [RegistrationFormStepSchema],
  messages: {
    closedTitle: { type: String, default: "Registrations Closed" },
    closedText: { type: String, default: "All slots for the Chennimalai Marathon 2026 have been filled, or registrations are currently closed. Thank you to everyone who joined us!" },
    successTitle: { type: String, default: "You're registered!" },
    successText: { type: String, default: "Thank you for registering for the Chennimalai Marathon. A confirmation will be sent to your email — please check your Spam folder too." },
    // Announcement popup shown once per browser session on register.html — off by
    // default, admin opts in with their own title/message.
    popupEnabled: { type: Boolean, default: false },
    popupTitle: { type: String, default: "" },
    popupText: { type: String, default: "" }
  }
}, { timestamps: true });

const RegistrationFormConfig = mongoose.models.RegistrationFormConfig || mongoose.model("RegistrationFormConfig", RegistrationFormConfigSchema);

// Reproduces today's hardcoded register.html layout exactly, so seeding this
// changes nothing visually until a superadmin edits it via the admin panel.
const DEFAULT_REGISTRATION_FORM_CONFIG = {
  steps: [
    {
      id: "step-1",
      title: "Personal Details",
      subtitle: "Please provide your basic information to continue.",
      order: 0,
      fields: [
        { key: "fullName", enabled: true, required: true },
        { key: "dob", enabled: true, required: true },
        { key: "phone", enabled: true, required: true },
        { key: "email", enabled: true, required: true },
        { key: "district", enabled: true, required: true },
        { key: "pincode", enabled: true, required: true },
        { key: "tshirtSize", enabled: true, required: true },
        { key: "bloodGroup", enabled: true, required: true }
      ]
    },
    {
      id: "step-2",
      title: "Additional Details",
      subtitle: "Almost there! Just a few more details to complete your registration.",
      order: 1,
      fields: [
        { key: "gender", enabled: true, required: true },
        { key: "emergencyContact", enabled: true, required: true },
        { key: "fitnessConfirm", enabled: true, required: true }
      ]
    }
  ],
  messages: {}
};

// Cached connection — required on Vercel serverless so cold starts don't
// hit Mongoose buffering timeouts (settings.findOne() timed out after 10000ms).
let isConnected = false;
let connPromise = null;

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  connPromise = null;
});

mongoose.connection.on("error", () => {
  isConnected = false;
  connPromise = null;
});

async function connectDB() {
  const mongoURI = process.env.DATABASE_URL;
  if (!mongoURI) {
    console.error("❌ MONGODB_ERROR: DATABASE_URL is missing in environment variables.");
    throw new Error("DATABASE_URL is missing in environment variables.");
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  if (!connPromise) {
    connPromise = mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      // Fail fast instead of buffering queries for 10s when disconnected
      bufferCommands: false
    }).then(async (conn) => {
      isConnected = true;
      console.log("✅ Connected to MongoDB Atlas successfully.");
      await seedInitialData();
      return conn;
    }).catch((err) => {
      connPromise = null;
      isConnected = false;
      console.error("❌ MONGODB_CONNECT_FAILED:", err.message);
      throw err;
    });
  }

  await connPromise;
  return true;
}

async function seedInitialData() {
  try {
    // 1. Seed Settings if none exist
    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      await Settings.create({
        adultFee: 150,
        kidsFee: 100,
        tshirtPrice: 0,
        pricingTitle: "Marathon Registration Fees",
        maxRegistrations: 1000,
        tshirtCounter: 11,
        isOpen: true,
        showRemainingSlots: true,
        ageCutoff: 13
      });
      console.log("🌱 [DB SEED] Default Settings initialized.");
    } else {
      // Migrate legacy seed defaults (500/300) to current early-bird defaults (150/100)
      const migrated = await Settings.updateMany(
        { adultFee: 500, kidsFee: 300 },
        { $set: { adultFee: 150, kidsFee: 100 } }
      );
      if (migrated.modifiedCount > 0) {
        console.log("🌱 [DB SEED] Migrated legacy fees 500/300 → 150/100.");
      }
    }

    // 2. Seed Super Admin only when missing (avoid bcrypt.hash on every cold start)
    const defaultEmail = "sniwaserode@gmail.com";
    const existingAdmin = await AdminUser.findOne({ email: defaultEmail }).select("_id role");
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await AdminUser.create({
        email: defaultEmail,
        password: hashedPassword,
        name: "Super Admin",
        role: "superadmin"
      });
      console.log(`🌱 [DB SEED] Super Admin user created: ${defaultEmail}`);
    } else if (existingAdmin.role !== "superadmin") {
      existingAdmin.role = "superadmin";
      await existingAdmin.save();
    }

    // 3. Backfill legacy tshirtNumber → tempBibNumber for older registrations
    const backfilled = await Registration.updateMany(
      {
        tshirtNumber: { $exists: true, $nin: [null, "", "N/A"] },
        $or: [
          { tempBibNumber: { $exists: false } },
          { tempBibNumber: null },
          { tempBibNumber: "" },
          { tempBibNumber: "N/A" }
        ]
      },
      [{ $set: { tempBibNumber: "$tshirtNumber" } }]
    );
    if (backfilled.modifiedCount > 0) {
      console.log(`🌱 [DB SEED] Backfilled tempBibNumber from tshirtNumber for ${backfilled.modifiedCount} registrations.`);
    }

    // 4. Seed the default registration form config if none exists
    const formConfigCount = await RegistrationFormConfig.countDocuments();
    if (formConfigCount === 0) {
      await RegistrationFormConfig.create(DEFAULT_REGISTRATION_FORM_CONFIG);
      console.log("🌱 [DB SEED] Default Registration Form Config initialized.");
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
  Sponsorship,
  ContactMessage,
  Volunteer,
  RegistrationFormConfig,
  DEFAULT_REGISTRATION_FORM_CONFIG
};

