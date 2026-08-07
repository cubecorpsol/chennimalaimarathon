const TSHIRT_MAP = {
  "XS":        { label: "XS (34)", sizeNum: "34", width: "17",   height: "24.75" },
  "XS (34)":   { label: "XS (34)", sizeNum: "34", width: "17",   height: "24.75" },
  "S":         { label: "S (36)",  sizeNum: "36", width: "18",   height: "26.25" },
  "S (36)":    { label: "S (36)",  sizeNum: "36", width: "18",   height: "26.25" },
  "M":         { label: "M (38)",  sizeNum: "38", width: "19",   height: "27.75" },
  "M (38)":    { label: "M (38)",  sizeNum: "38", width: "19",   height: "27.75" },
  "L":         { label: "L (40)",  sizeNum: "40", width: "20",   height: "28.75" },
  "L (40)":    { label: "L (40)",  sizeNum: "40", width: "20",   height: "28.75" },
  "XL":        { label: "XL (42)", sizeNum: "42", width: "21",   height: "29.75" },
  "XL (42)":   { label: "XL (42)", sizeNum: "42", width: "21",   height: "29.75" },
  "XXL":       { label: "XXL (44)", sizeNum: "44", width: "22",  height: "30.75" },
  "XXL (44)":  { label: "XXL (44)", sizeNum: "44", width: "22",  height: "30.75" },
  "XXXL":      { label: "XXXL (46)", sizeNum: "46", width: "23", height: "31.75" },
  "XXXL (46)": { label: "XXXL (46)", sizeNum: "46", width: "23", height: "31.75" }
};

function getTshirtDetails(inputSize) {
  if (!inputSize) return { label: "N/A", sizeNum: "N/A", width: "N/A", height: "N/A" };
  const key = String(inputSize).trim().toUpperCase();
  return TSHIRT_MAP[key] || { label: inputSize, sizeNum: "N/A", width: "N/A", height: "N/A" };
}

module.exports = {
  // ... your existing config exports ...
  getTshirtDetails
};

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