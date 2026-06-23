const { ORDER_TABLE, supabaseRequest } = require("./supabase-config");

function toDatabaseOrder(order, userId) {
  return {
    id: order.id,
    user_id: order.userId || userId,
    status: order.status,
    order_number: order.orderNumber || "",
    gateway_order_id: order.gatewayOrderId || "",
    payment_id: order.paymentId || "",
    amount_paise: Number(order.amountPaise || 0),
    message: order.message || "",
    items: Array.isArray(order.items) ? order.items : [],
    created_at: order.createdAt || new Date().toISOString(),
    updated_at: order.updatedAt || new Date().toISOString()
  };
}

function fromDatabaseOrder(row) {
  return {
    id: row.id,
    userId: row.user_id || "",
    status: row.status,
    orderNumber: row.order_number || "",
    gatewayOrderId: row.gateway_order_id || "",
    paymentId: row.payment_id || "",
    amountPaise: Number(row.amount_paise || 0),
    message: row.message || "",
    items: Array.isArray(row.items) ? row.items : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function listOrders(accessToken) {
  const rows = await supabaseRequest(`/rest/v1/${ORDER_TABLE}?select=*&order=created_at.desc&limit=50`, {
    method: "GET",
    accessToken
  });

  return Array.isArray(rows) ? rows.map(fromDatabaseOrder) : [];
}

async function upsertOrder(order, accessToken, userId) {
  const rows = await supabaseRequest(`/rest/v1/${ORDER_TABLE}?on_conflict=id`, {
    method: "POST",
    accessToken,
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(toDatabaseOrder(order, userId))
  });

  return Array.isArray(rows) && rows[0] ? fromDatabaseOrder(rows[0]) : order;
}

module.exports = {
  listOrders,
  upsertOrder
};
