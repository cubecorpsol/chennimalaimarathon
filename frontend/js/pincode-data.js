/* =========================================================
   CHENNIMALAI MARATHON — TAMIL NADU PINCODE → DISTRICT DATASET
   Used only by the District–Pincode auto-fill feature in
   js/script.js. Does not affect any other page behaviour.

   Structure:
   - TN_PINCODE_EXACT   : exact 6-digit PIN overrides for well-known
                          head post offices (used first — most
                          accurate, especially for the newer
                          districts formed by splitting older ones,
                          e.g. Chengalpattu, Ranipet, Tirupathur,
                          Kallakurichi, Tenkasi, Mayiladuthurai).
   - TN_PINCODE_PREFIX  : fallback map keyed by the first 3 digits
                          of the PIN code → the majority/common
                          district served by that PIN range. Used
                          when there is no exact match above.

   District names below match the <select id="district"> option
   values in register.html exactly, so a lookup hit can be applied
   to the dropdown directly without any extra string mapping.
   ========================================================= */

window.TN_PINCODE_EXACT = {
  // Newer districts / carved-out districts — exact head-office PINs
  "603001": "Chengalpattu",
  "603002": "Chengalpattu",
  "603103": "Chengalpattu",
  "632401": "Ranipet",
  "632512": "Ranipet",
  "635601": "Tirupathur",
  "635651": "Tirupathur",
  "606601": "Kallakurichi",
  "606202": "Kallakurichi",
  "627811": "Tenkasi",
  "627852": "Tenkasi",
  "609001": "Mayiladuthurai",
  "609301": "Mayiladuthurai",
  "621220": "Ariyalur",
  "621212": "Perambalur"
};

window.TN_PINCODE_PREFIX = {
  "600": "Chennai",
  "601": "Tiruvallur",
  "602": "Tiruvallur",
  "603": "Chengalpattu",
  "604": "Kanchipuram",
  "605": "Viluppuram",
  "606": "Tiruvannamalai",
  "607": "Cuddalore",
  "608": "Mayiladuthurai",
  "609": "Nagapattinam",
  "610": "Thanjavur",
  "611": "Thanjavur",
  "612": "Thanjavur",
  "613": "Thanjavur",
  "614": "Tiruvarur",
  "620": "Tiruchirappalli",
  "621": "Ariyalur",
  "622": "Pudukkottai",
  "623": "Ramanathapuram",
  "624": "Dindigul",
  "625": "Madurai",
  "626": "Virudhunagar",
  "627": "Tirunelveli",
  "628": "Thoothukudi",
  "629": "Kanyakumari",
  "630": "Sivaganga",
  "631": "Kanchipuram",
  "632": "Vellore",
  "633": "Krishnagiri",
  "635": "Dharmapuri",
  "636": "Salem",
  "637": "Namakkal",
  "638": "Erode",
  "639": "Karur",
  "641": "Coimbatore",
  "642": "Tiruppur",
  "643": "Nilgiris"
};

/* Looks up a district name for a 6-digit pincode string.
   Returns the district name (string) on match, or null if the
   pincode is not recognised. */
window.lookupTNDistrictByPincode = function (pincode) {
  if (!/^\d{6}$/.test(pincode)) return null;

  if (window.TN_PINCODE_EXACT[pincode]) {
    return window.TN_PINCODE_EXACT[pincode];
  }

  var prefix = pincode.slice(0, 3);
  if (window.TN_PINCODE_PREFIX[prefix]) {
    return window.TN_PINCODE_PREFIX[prefix];
  }

  return null;
};
