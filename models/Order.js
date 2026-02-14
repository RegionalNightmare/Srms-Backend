// models/orderModel.js
const pool = require("../config/db");

/**
 * Validate menu items and compute total price
 * items: [{ menuItemId, quantity }]
 */
async function calculateTotalAndValidateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Order must contain at least one item");
  }

  const ids = items.map((it) => it.menuItemId);
  const placeholders = ids.map(() => "?").join(",");

  const [rows] = await pool.execute(
    `SELECT id, price, available FROM menu_items WHERE id IN (${placeholders})`,
    ids
  );

  if (rows.length !== ids.length) {
    throw new Error("One or more menu items do not exist");
  }

  let total = 0;
  const priceMap = new Map();
  rows.forEach((row) => {
    if (!row.available) {
      throw new Error(`Menu item with ID ${row.id} is not available`);
    }
    priceMap.set(row.id, Number(row.price));
  });

  items.forEach((it) => {
    const price = priceMap.get(it.menuItemId);
    if (!price) {
      throw new Error(`Menu item with ID ${it.menuItemId} not found`);
    }
    const qty = Number(it.quantity) || 1;
    total += price * qty;
  });

  return total;
}

/**
 * Create order + order_items in a transaction
 */
async function createOrder({ userId, items, type, deliveryAddress }) {
  const connection = await pool.getConnection();

  try {
    const totalPrice = await calculateTotalAndValidateItems(items);

    await connection.beginTransaction();

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, total_price, status, type, delivery_address)
       VALUES (?, ?, 'pending', ?, ?)`,
      [userId, totalPrice, type, deliveryAddress || null]
    );

    const orderId = orderResult.insertId;

    for (const it of items) {
      await connection.execute(
        `INSERT INTO order_items (order_id, menu_item_id, quantity)
         VALUES (?, ?, ?)`,
        [orderId, it.menuItemId, it.quantity || 1]
      );
    }

    await connection.commit();

    return { orderId, totalPrice };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// Get all orders for a specific user (including items)
async function getOrdersByUserId(userId) {
  const [orders] = await pool.execute(
    `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );

  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const placeholders = orderIds.map(() => "?").join(",");

  const [items] = await pool.execute(
    `SELECT oi.*, mi.name AS menu_item_name, mi.price AS menu_item_price
     FROM order_items oi
     JOIN menu_items mi ON oi.menu_item_id = mi.id
     WHERE oi.order_id IN (${placeholders})`,
    orderIds
  );

  const itemsByOrder = {};
  items.forEach((row) => {
    if (!itemsByOrder[row.order_id]) itemsByOrder[row.order_id] = [];
    itemsByOrder[row.order_id].push({
      id: row.id,
      menuItemId: row.menu_item_id,
      name: row.menu_item_name,
      price: Number(row.menu_item_price),
      quantity: row.quantity,
    });
  });

  return orders.map((o) => ({
    ...o,
    total_price: Number(o.total_price),
    items: itemsByOrder[o.id] || [],
  }));
}

// Admin: get all orders (optionally by status)
async function getAllOrders({ status } = {}) {
  let sql = "SELECT * FROM orders WHERE 1=1";
  const params = [];

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }

  sql += " ORDER BY created_at DESC";

  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Admin: update order status
async function updateOrderStatus(orderId, status) {
  await pool.execute("UPDATE orders SET status = ? WHERE id = ?", [
    status,
    orderId,
  ]);
}

module.exports = {
  createOrder,
  getOrdersByUserId,
  getAllOrders,
  updateOrderStatus,
};
