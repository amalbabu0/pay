const Razorpay = require("razorpay");

const CURRENCY = "INR";
const MIN_AMOUNT_PAISE = 100;

function getKeyId() {
  return String(process.env.RAZORPAY_KEY_ID || "").trim();
}

function getKeySecret() {
  return String(process.env.RAZORPAY_KEY_SECRET || "").trim();
}

function areKeysConfigured() {
  return Boolean(getKeyId() && getKeySecret());
}

function getRazorpayClient() {
  const keyId = getKeyId();
  const keySecret = getKeySecret();

  if (!keyId || !keySecret) {
    const error = new Error("Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel Environment Variables.");
    error.statusCode = 503;
    throw error;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}

function toRazorpayError(error) {
  const statusCode = Number(error.statusCode || error.status || 500);
  if (statusCode === 401) {
    const authError = new Error("Razorpay authentication failed. Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are from the same Razorpay mode and account.");
    authError.statusCode = 401;
    return authError;
  }

  const mappedError = new Error(
    error.error && error.error.description
      ? error.error.description
      : error.description || error.message || "Razorpay API request failed."
  );

  mappedError.statusCode = statusCode === 401 ? 401 : 500;
  return mappedError;
}

module.exports = {
  CURRENCY,
  MIN_AMOUNT_PAISE,
  areKeysConfigured,
  getKeyId,
  getKeySecret,
  getRazorpayClient,
  toRazorpayError
};
