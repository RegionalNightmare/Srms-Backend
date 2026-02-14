// routes/adminRoutes.js
const express = require("express");
const pool = require("../config/db"); // mysql2/promise pool
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/admin/stats
router.get("/stats", protect, adminOnly, async (req, res, next) => {
  try {
    const [
      totalUsersRow,
      totalOrdersRow,
      totalRevenueRow,
      pendingReservationsRow,
      upcomingReservationsRow,
      pendingEventsRow,
      approvedUpcomingEventsRow,
    ] = await Promise.all([
      // total users
      pool
        .execute("SELECT COUNT(*) AS totalUsers FROM users")
        .then(([rows]) => rows[0]),

      // total orders
      pool
        .execute("SELECT COUNT(*) AS totalOrders FROM orders")
        .then(([rows]) => rows[0]),

      // total revenue from all orders
      pool
        .execute(
          "SELECT COALESCE(SUM(total_price), 0) AS totalRevenue FROM orders"
        )
        .then(([rows]) => rows[0]),

      // pending reservations
      pool
        .execute(
          "SELECT COUNT(*) AS pendingReservations FROM reservations WHERE status = 'pending'"
        )
        .then(([rows]) => rows[0]),

      // upcoming approved reservations
      pool
        .execute(
          "SELECT COUNT(*) AS upcomingReservations FROM reservations WHERE status = 'approved' AND reservation_datetime >= NOW()"
        )
        .then(([rows]) => rows[0]),

      // pending events
      pool
        .execute(
          "SELECT COUNT(*) AS pendingEvents FROM events WHERE status = 'pending'"
        )
        .then(([rows]) => rows[0]),

      // approved upcoming events
      pool
        .execute(
          "SELECT COUNT(*) AS approvedUpcomingEvents FROM events WHERE status = 'approved' AND event_datetime >= NOW()"
        )
        .then(([rows]) => rows[0]),
    ]);

    res.json({
      totalUsers: totalUsersRow.totalUsers,
      totalOrders: totalOrdersRow.totalOrders,
      totalRevenue: Number(totalRevenueRow.totalRevenue) || 0,
      pendingReservations: pendingReservationsRow.pendingReservations,
      upcomingReservations: upcomingReservationsRow.upcomingReservations,
      pendingEvents: pendingEventsRow.pendingEvents,
      approvedUpcomingEvents:
        approvedUpcomingEventsRow.approvedUpcomingEvents,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * ADMIN ORDERS
 * GET  /api/admin/orders
 * PUT  /api/admin/orders/:id   { status: 'pending' | 'completed' | 'cancelled' }
 */
router.get("/orders", protect, adminOnly, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `
      SELECT
        o.id,
        o.total_price,
        o.type,
        o.status,
        o.created_at,
        u.name  AS user_name,
        u.email AS user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      `
    );

    res.json(rows);
  } catch (err) {
    console.error("Admin GET /orders error:", err);
    next(err);
  }
});

router.put("/orders/:id", protect, adminOnly, async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["pending", "completed", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const [result] = await pool.execute(
      "UPDATE orders SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order status updated" });
  } catch (err) {
    console.error("Admin PUT /orders/:id error:", err);
    next(err);
  }
});

/**
 * ADMIN RESERVATIONS
 * GET  /api/admin/reservations
 * PUT  /api/admin/reservations/:id   { status: 'pending' | 'approved' | 'cancelled' }
 */
router.get("/reservations", protect, adminOnly, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `
      SELECT
        r.id,
        r.reservation_datetime,
        r.number_of_guests,
        r.notes,
        r.status,
        r.created_at,
        u.name  AS user_name,
        u.email AS user_email
      FROM reservations r
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.reservation_datetime DESC
      `
    );

    res.json(rows);
  } catch (err) {
    console.error("Admin GET /reservations error:", err);
    next(err);
  }
});

router.put(
  "/reservations/:id",
  protect,
  adminOnly,
  async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["pending", "approved", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    try {
      const [result] = await pool.execute(
        "UPDATE reservations SET status = ? WHERE id = ?",
        [status, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      res.json({ message: "Reservation status updated" });
    } catch (err) {
      console.error("Admin PUT /reservations/:id error:", err);
      next(err);
    }
  }
);

/**
 * ADMIN EVENTS
 * GET  /api/admin/events
 * PUT  /api/admin/events/:id   { status: 'pending' | 'approved' | 'cancelled' }
 */
router.get("/events", protect, adminOnly, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `
      SELECT
        e.id,
        e.event_type,
        e.event_datetime,
        e.number_of_guests,
        e.status,
        e.created_at,
        u.name  AS user_name,
        u.email AS user_email
      FROM events e
      LEFT JOIN users u ON e.user_id = u.id
      ORDER BY e.event_datetime DESC
      `
    );

    res.json(rows);
  } catch (err) {
    console.error("Admin GET /events error:", err);
    next(err);
  }
});

router.put("/events/:id", protect, adminOnly, async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["pending", "approved", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const [result] = await pool.execute(
      "UPDATE events SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ message: "Event status updated" });
  } catch (err) {
    console.error("Admin PUT /events/:id error:", err);
    next(err);
  }
});

module.exports = router;
