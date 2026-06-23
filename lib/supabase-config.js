const ORDER_TABLE = "orders";

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
}

function getSupabaseAnonKey() {
  return String(process.env.SUPABASE_ANON_KEY || "").trim();
}

function getSupabaseKey() {
  return String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
}

function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseKey());
}

function getSupabaseEndpoint(path) {
  const supabaseUrl = getSupabaseUrl();

  if (!supabaseUrl || !getSupabaseKey()) {
    const error = new Error("Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel Environment Variables.");
    error.statusCode = 503;
    throw error;
  }

  return `${supabaseUrl}${path}`;
}

function getSupabaseHeaders(prefer, accessToken) {
  const anonKey = getSupabaseAnonKey();
  const key = getSupabaseKey();
  const headers = {
    apikey: anonKey || key,
    Authorization: `Bearer ${accessToken || key}`,
    "Content-Type": "application/json"
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  return headers;
}

async function supabaseRequest(path, options = {}) {
  const { accessToken, prefer, headers, ...fetchOptions } = options;

  const response = await fetch(getSupabaseEndpoint(path), {
    ...fetchOptions,
    headers: {
      ...getSupabaseHeaders(prefer, accessToken),
      ...(headers || {})
    }
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const message = data && (data.message || data.details || data.hint)
      ? data.message || data.details || data.hint
      : "Supabase request failed.";
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

module.exports = {
  ORDER_TABLE,
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
  supabaseRequest
};
