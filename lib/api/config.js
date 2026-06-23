const { CURRENCY, areKeysConfigured, getKeyId } = require("../lib/razorpay-config");
const { handleError, methodNotAllowed, sendJson } = require("../lib/api-utils");
const { isSupabaseConfigured } = require("../lib/supabase-config");

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      methodNotAllowed(response);
      return;
    }

    sendJson(response, 200, {
      keyConfigured: areKeysConfigured(),
      keyId: getKeyId(),
      currency: CURRENCY,
      supabaseConfigured: isSupabaseConfigured()
    });
  } catch (error) {
    handleError(response, error);
  }
};
