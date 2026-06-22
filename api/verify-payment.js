const crypto = require("crypto");
const { readJson, handleError, methodNotAllowed, sendJson } = require("../lib/api-utils");
const { getProduct } = require("../lib/products");
const { getKeySecret } = require("../lib/razorpay-config");

function verifySignature(orderId, paymentId, signature, keySecret) {
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  return (
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      methodNotAllowed(response);
      return;
    }

    const keySecret = getKeySecret();
    if (!keySecret) {
      sendJson(response, 503, {
        message: "Set RAZORPAY_KEY_SECRET in Vercel Environment Variables."
      });
      return;
    }

    const body = await readJson(request);
    const orderId = String(body.razorpay_order_id || "");
    const paymentId = String(body.razorpay_payment_id || "");
    const signature = String(body.razorpay_signature || "");

    if (!orderId || !paymentId || !signature) {
      sendJson(response, 400, { message: "Missing payment verification fields." });
      return;
    }

    if (!verifySignature(orderId, paymentId, signature, keySecret)) {
      sendJson(response, 400, { message: "Payment signature verification failed." });
      return;
    }

    const product = getProduct(body.productId);

    sendJson(response, 200, {
      status: "placed",
      orderNumber: `ORD-${Date.now().toString().slice(-8)}`,
      productId: product ? product.id : null,
      productName: product ? product.name : "Selected product",
      paymentId
    });
  } catch (error) {
    handleError(response, error);
  }
};
