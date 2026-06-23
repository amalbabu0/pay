const { handleError, methodNotAllowed, readJson, sendJson } = require("../lib/api-utils");
const { listOrders, upsertOrder } = require("../lib/order-store");
const { isSupabaseConfigured } = require("../lib/supabase-config");

function getBearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

function getUserIdFromToken(accessToken) {
  const payload = accessToken.split(".")[1];
  if (!payload) {
    return "";
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    const claims = JSON.parse(decoded);
    return String(claims.sub || "");
  } catch (error) {
    return "";
  }
}

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

    const accessToken = getBearerToken(request);
    const userId = getUserIdFromToken(accessToken);

    if (!accessToken || !userId) {
      sendJson(response, 401, {
        supabaseConfigured: true,
        orders: [],
        message: "Sign in to sync orders."
      });
      return;
    }

    if (request.method === "GET") {
      const orders = await listOrders(accessToken);
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

      const order = await upsertOrder(body.order, accessToken, userId);
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
