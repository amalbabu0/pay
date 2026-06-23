function sendJson(response, statusCode, data) {
  const payload = JSON.stringify(data);

  if (typeof response.setHeader === "function") {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
  }

  if (typeof response.status === "function" && typeof response.json === "function") {
    response.status(statusCode).json(data);
    return;
  }

  if (typeof response.writeHead === "function") {
    response.writeHead(statusCode, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8"
    });
  } else {
    response.statusCode = statusCode;
  }

  response.end(payload);
}

function methodNotAllowed(response) {
  sendJson(response, 405, { message: "Method not allowed." });
}

async function readJson(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    try {
      return request.body ? JSON.parse(request.body) : {};
    } catch (error) {
      const parseError = new Error("Invalid JSON request body.");
      parseError.statusCode = 400;
      throw parseError;
    }
  }

  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        reject(error);
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        const parseError = new Error("Invalid JSON request body.");
        parseError.statusCode = 400;
        reject(parseError);
      }
    });

    request.on("error", reject);
  });
}

function handleError(response, error) {
  sendJson(response, error.statusCode || 500, {
    message: error.message || "Server error."
  });
}

module.exports = {
  handleError,
  methodNotAllowed,
  readJson,
  sendJson
};
