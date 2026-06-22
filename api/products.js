const { products } = require("../lib/products");
const { handleError, methodNotAllowed, sendJson } = require("../lib/api-utils");

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      methodNotAllowed(response);
      return;
    }

    sendJson(response, 200, { products });
  } catch (error) {
    handleError(response, error);
  }
};
