const { handleError, methodNotAllowed, readJson, sendJson } = require("../lib/api-utils");
const { listOrders, upsertOrder } = require("../lib/order-store");
const { isSupabaseConfigured } = require("../lib/supabase-config");

module.exports = async function handler(request, response) {
  try {
    if (!isSupabaseConfigured()) {
      sendJson(response, 200, {
        supabaseConfigured: false,
        orders: [],
        message: "Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel Environment Variables."
      });
      return;
    }

    if (request.method === "GET") {
      const orders = await listOrders();
      sendJson(response, 200, {
        supabaseConfigured: true,
        orders
      });
      return;
    }

    if (request.method === "POST") {
      const body = await readJson(request);
      if (!body.order || !body.order.id) {
        sendJson(response, 400, { message: "Missing order payload." });
        return;
      }

      const order = await upsertOrder(body.order);
      sendJson(response, 200, {
        supabaseConfigured: true,
        order
      });
      return;
    }

    methodNotAllowed(response);
  } catch (error) {
    handleError(response, error);
  }
};
