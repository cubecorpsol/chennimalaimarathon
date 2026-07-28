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

module.exports = { DISTRICTS, BLOOD_GROUPS, TSHIRT_SIZES, RULES };