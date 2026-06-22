const { readJson, handleError, methodNotAllowed, sendJson } = require("../lib/api-utils");
const { getProduct } = require("../lib/products");
const {
  CURRENCY,
  MIN_AMOUNT_PAISE,
  getRazorpayClient,
  toRazorpayError
} = require("../lib/razorpay-config");

function parseAmount(value) {
  const amount = Number(value);
  return Number.isInteger(amount) ? amount : 0;
}

function createReceipt(productId) {
  const safeId = String(productId || "order").replace(/[^a-z0-9_-]/gi, "").slice(0, 12);
  return `rcpt_${safeId}_${Date.now()}`.slice(0, 40);
}

function resolveOrderRequest(body) {
  const product = body.productId ? getProduct(body.productId) : null;

  if (body.productId && !product) {
    const error = new Error("Invalid product selected.");
    error.statusCode = 400;
    throw error;
  }

  const amount = product ? product.pricePaise : parseAmount(body.amount);
  if (amount < MIN_AMOUNT_PAISE) {
    const error = new Error("Amount must be at least 100 paise.");
    error.statusCode = 400;
    throw error;
  }

  const currency = String(body.currency || CURRENCY).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    const error = new Error("Currency must be a 3-letter code.");
    error.statusCode = 400;
    throw error;
  }

  const receipt = String(body.receipt || createReceipt(product && product.id)).slice(0, 40);

  return {
    product,
    amount,
    currency,
    receipt
  };
}

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      methodNotAllowed(response);
      return;
    }

    const body = await readJson(request);
    const orderRequest = resolveOrderRequest(body);
    const razorpay = getRazorpayClient();

    try {
      const order = await razorpay.orders.create({
        amount: orderRequest.amount,
        currency: orderRequest.currency,
        receipt: orderRequest.receipt,
        notes: orderRequest.product
          ? {
              product_id: orderRequest.product.id,
              product_name: orderRequest.product.name
            }
          : {}
      });

      sendJson(response, 200, {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency
      });
    } catch (error) {
      throw toRazorpayError(error);
    }
  } catch (error) {
    handleError(response, error);
  }
};
