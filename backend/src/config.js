const DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore",
  "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram",
  "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai",
  "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
  "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi",
  "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
  "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur",
  "Vellore", "Viluppuram", "Virudhunagar"
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const RULES = {
  MAX_REGISTRATIONS: 1000,
  TSHIRT_NUMBER_START: 11,
  TSHIRT_NUMBER_PAD_LENGTH: 4,
  AGE_CUTOFF_YEARS: 13,
  CATEGORY_3_5KM: "3.5 KM Fun Run",
  CATEGORY_7KM: "7 KM Timed Run"
};

function getBaseUrl(req, envVar) {
  if (envVar && process.env[envVar]) {
    return process.env[envVar].replace(/\/+$/, "");
  }
  const host = req ? req.get("host") : "";
  let protocol = (req && (req.headers["x-forwarded-proto"] || req.protocol)) || "http";
  
  // Default to https for non-localhost environments to avoid mixed-content / non-secure form POST warnings
  if (protocol === "http" && host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    protocol = "https";
  }
  return `${protocol}://${host}`;
}

/** Live mode only when NODE_ENV=production. Anything else is treated as development. */
const isProduction = () => process.env.NODE_ENV === "production";
const isDevelopment = () => !isProduction();

module.exports = {
  DISTRICTS,
  BLOOD_GROUPS,
  TSHIRT_SIZES,
  RULES,
  getBaseUrl,
  isProduction,
  isDevelopment
};