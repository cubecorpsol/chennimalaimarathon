const crypto = require("crypto");

function getPayuCredentials() {
  const key = process.env.PAYU_MERCHANT_KEY || process.env.PAYU_KEY || "";
  const salt = process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT || "";
  const mode = (process.env.PAYU_MODE || "test").toLowerCase();
  const actionUrl = mode === "live" 
    ? "https://secure.payu.in/_payment" 
    : "https://test.payu.in/_payment";

  return { key, salt, mode, actionUrl };
}

/**
 * Generates PayU Hosted Checkout Request Hash (SHA-512)
 * Formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
 */
function generatePayuRequestHash({ key, txnid, amount, productinfo, firstname, email, udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "", salt }) {
  const hashSequence = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
  return crypto.createHash("sha512").update(hashSequence).digest("hex");
}

/**
 * Verifies PayU Response Hash (SHA-512) upon callback (surl / furl)
 * With additionalCharges: sha512(additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 * Without additionalCharges: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
function verifyPayuResponseHash(params, salt) {
  const {
    key = "",
    txnid = "",
    amount = "",
    productinfo = "",
    firstname = "",
    email = "",
    status = "",
    udf1 = "",
    udf2 = "",
    udf3 = "",
    udf4 = "",
    udf5 = "",
    hash = "",
    additionalCharges = ""
  } = params;

  let hashSequence = "";
  if (additionalCharges) {
    hashSequence = `${additionalCharges}|${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  } else {
    hashSequence = `${salt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  }

  const calculatedHash = crypto.createHash("sha512").update(hashSequence).digest("hex");
  return calculatedHash.toLowerCase() === String(hash).toLowerCase();
}

module.exports = {
  getPayuCredentials,
  generatePayuRequestHash,
  verifyPayuResponseHash
};
