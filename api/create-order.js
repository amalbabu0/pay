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

function resolveLineItems(body) {
  if (Array.isArray(body.items) && body.items.length > 0) {
    return body.items.map((item) => {
      const product = getProduct(item.productId);
      const quantity = Number(item.quantity);

      if (!product) {
        const error = new Error("Invalid product selected.");
        error.statusCode = 400;
        throw error;
      }

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        const error = new Error("Quantity must be between 1 and 99.");
        error.statusCode = 400;
        throw error;
      }

      return {
        product,
        quantity,
        amount: product.pricePaise * quantity
      };
    });
  }

  const product = body.productId ? getProduct(body.productId) : null;
  if (body.productId && !product) {
    const error = new Error("Invalid product selected.");
    error.statusCode = 400;
    throw error;
  }

  return product
    ? [{ product, quantity: 1, amount: product.pricePaise }]
    : [];
}

function resolveOrderRequest(body) {
  const items = resolveLineItems(body);
  const amount = items.length > 0
    ? items.reduce((total, item) => total + item.amount, 0)
    : parseAmount(body.amount);

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

  const receipt = String(body.receipt || createReceipt(items[0] && items[0].product.id)).slice(0, 40);

  return {
    items,
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
        notes: orderRequest.items.length > 0
          ? {
              item_count: String(orderRequest.items.reduce((total, item) => total + item.quantity, 0)),
              product_ids: orderRequest.items.map((item) => item.product.id).join(",").slice(0, 256)
            }
          : {}
      });

      sendJson(response, 200, {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        items: orderRequest.items.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          pricePaise: item.product.pricePaise
        }))
      });
    } catch (error) {
      throw toRazorpayError(error);
    }
  } catch (error) {
    handleError(response, error);
  }
};
