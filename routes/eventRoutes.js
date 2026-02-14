const express = require("express");
const pool = require("../config/db");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();
/* ---------- Customer: create event ---------- */
// POST /api/events
router.post("/", protect, async (req, res, next) => {
  try {
    const { type, eventDatetime, numberOfGuests } = req.body;

    if (!type || !eventDatetime || !numberOfGuests) {
      return res.status(400).json({
        message: "Type, event datetime, and number of guests are required",
      });
    }

    if (Number(numberOfGuests) <= 0) {
      return res
        .status(400)
        .json({ message: "Number of guests must be greater than 0" });
    }

    const [result] = await pool.execute(
      `INSERT INTO events
        (user_id, event_type, event_datetime, number_of_guests, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [req.user.id, type, eventDatetime, numberOfGuests]
    );

    res.status(201).json({
      message: "Event request created",
      eventId: result.insertId,
      status: "pending",
    });
  } catch (err) {
    next(err);
  }
});

/* ---------- Customer: view own events ---------- */
// GET /api/events/my

router.get("/my", protect, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, user_id, event_type, event_datetime, number_of_guests, status,
              created_at, updated_at
       FROM events
       WHERE user_id = ?
       ORDER BY event_datetime DESC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* ---------- ADMIN: list all events with user info ---------- */
// GET /api/events?status=pending|approved|cancelled|all
router.get("/", protect, adminOnly, async (req, res, next) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT
        e.id,
        e.user_id,
        e.event_type,
        e.event_datetime,
        e.number_of_guests,
        e.status,
        e.created_at,
        e.updated_at,
        u.name  AS customer_name,
        u.email AS customer_email
      FROM events e
      JOIN users u ON e.user_id = u.id
    `;

    const params = [];

    if (status && status !== "all") {
      sql += " WHERE e.status = ?";
      params.push(status);
    }

    sql += " ORDER BY e.event_datetime ASC";

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/* ---------- ADMIN: update event status ---------- */
// PUT /api/events/:id/status
router.put("/:id/status", protect, adminOnly, async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "approved", "cancelled"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const [result] = await pool.execute(
      `UPDATE events
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ message: "Event status updated" });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/events/:id
 * Allow owner to update their event while it's still pending
 * Body: any of { type, eventDatetime, numberOfGuests }
 */
router.put("/:id", protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, eventDatetime, numberOfGuests } = req.body;

    const [existingArr] = await pool.execute(
      "SELECT * FROM events WHERE id = ?",
      [id]
    );

    if (existingArr.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const existing = existingArr[0];

    if (existing.user_id !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not allowed to edit this event" });
    }

    if (existing.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending events can be modified" });
    }

    const newType = type || existing.event_type;
    const newDatetime = eventDatetime || existing.event_datetime;
    const newGuests = numberOfGuests || existing.number_of_guests;

    if (!newType || !newDatetime || Number(newGuests) <= 0) {
      return res.status(400).json({ message: "Invalid event data" });
    }

    await pool.execute(
      `UPDATE events
       SET event_type = ?, event_datetime = ?, number_of_guests = ?
       WHERE id = ?`,
      [newType, newDatetime, newGuests, id]
    );

    res.json({ message: "Event updated" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
