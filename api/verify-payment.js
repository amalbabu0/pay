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

function resolveItems(body) {
  if (Array.isArray(body.items) && body.items.length > 0) {
    return body.items
      .map((item) => {
        const product = getProduct(item.productId);
        const quantity = Number(item.quantity);

        if (!product || !Number.isInteger(quantity) || quantity < 1) {
          return null;
        }

        return {
          productId: product.id,
          name: product.name,
          quantity,
          pricePaise: product.pricePaise
        };
      })
      .filter(Boolean);
  }

  const product = getProduct(body.productId);
  return product
    ? [{
        productId: product.id,
        name: product.name,
        quantity: 1,
        pricePaise: product.pricePaise
      }]
    : [];
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

    const items = resolveItems(body);
    const amount = items.reduce((total, item) => total + item.pricePaise * item.quantity, 0);

    sendJson(response, 200, {
      status: "placed",
      orderNumber: `ORD-${Date.now().toString().slice(-8)}`,
      items,
      amount,
      paymentId
    });
  } catch (error) {
    handleError(response, error);
  }
};
