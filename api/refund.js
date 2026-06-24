const { readJson, handleError, methodNotAllowed, sendJson } = require("../lib/api-utils");
const { getRazorpayClient, toRazorpayError } = require("../lib/razorpay-config");

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      methodNotAllowed(response);
      return;
    }

    const body = await readJson(request);
    const paymentId = String(body.payment_id || body.paymentId || "").trim();
    const amount = Number(body.amount || 0);

    if (!paymentId) {
      sendJson(response, 400, { message: "Missing payment ID for refund." });
      return;
    }

    const razorpay = getRazorpayClient();

    try {
      const refundOptions = { speed: "normal" };
      if (Number.isInteger(amount) && amount > 0) {
        refundOptions.amount = amount;
      }

      const refund = await razorpay.payments.refund(paymentId, refundOptions);

      sendJson(response, 200, {
        status: "refunded",
        refundId: refund.id,
        paymentId: refund.payment_id,
        amount: refund.amount,
        refundStatus: refund.status
      });
    } catch (error) {
      throw toRazorpayError(error);
    }
  } catch (error) {
    handleError(response, error);
  }
};
