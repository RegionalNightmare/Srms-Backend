const express = require("express");
const pool = require("../config/db");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * POST /api/reservations
 * Body:
 * {
 *   "reservationDatetime": "2025-11-20T19:00:00",
 *   "numberOfGuests": 4,
 *   "notes": "Window seat please"
 * }
 */
router.post("/", protect, async (req, res, next) => {
  try {
    const { reservationDatetime, numberOfGuests, notes } = req.body;

    if (!reservationDatetime || !numberOfGuests) {
      return res
        .status(400)
        .json({ message: "Reservation date/time and guests are required" });
    }

    if (Number(numberOfGuests) <= 0) {
      return res.status(400).json({ message: "Number of guests must be > 0" });
    }

    // Check for double booking at the exact datetime
    const [existing] = await pool.execute(
      `SELECT * FROM reservations
       WHERE reservation_datetime = ?
         AND status <> 'cancelled'`,
      [reservationDatetime]
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ message: "This time slot is already booked" });
    }

    const [result] = await pool.execute(
      `INSERT INTO reservations
        (user_id, reservation_datetime, number_of_guests, notes, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [req.user.id, reservationDatetime, numberOfGuests, notes || null]
    );

    res.status(201).json({
      message: "Reservation created",
      reservationId: result.insertId,
      status: "pending",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reservations/my
 * Get reservations for current user
 */
router.get("/my", protect, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM reservations
       WHERE user_id = ?
       ORDER BY reservation_datetime DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reservations (admin)
 * Optional query: ?status=confirmed
 */
router.get("/", protect, adminOnly, async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql =
      "SELECT r.*, u.name AS customer_name, u.email AS customer_email FROM reservations r JOIN users u ON r.user_id = u.id WHERE 1=1";
    const params = [];

    if (status) {
      sql += " AND r.status = ?";
      params.push(status);
    }

    sql += " ORDER BY r.reservation_datetime DESC";

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/reservations/:id/status (admin)
 * Body: { "status": "pending" | "confirmed" | "cancelled" }
 */
router.put("/:id/status", protect, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["pending", "confirmed", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const [existing] = await pool.execute(
      "SELECT * FROM reservations WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    await pool.execute(
      "UPDATE reservations SET status = ? WHERE id = ?",
      [status, id]
    );

    res.json({ message: "Reservation status updated" });
  } catch (err) {
    next(err);
  }
});

/**
 * (Optional) PUT /api/reservations/:id
 * Allow user to update their own reservation if still pending
 * Body: { "reservationDatetime": "...", "numberOfGuests": 5, "notes": "..." }
 */
router.put("/:id", protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reservationDatetime, numberOfGuests, notes } = req.body;

    const [existingArr] = await pool.execute(
      "SELECT * FROM reservations WHERE id = ?",
      [id]
    );
    if (existingArr.length === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const existing = existingArr[0];

    // Only owner OR admin can edit – but here we enforce owner only.
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ message: "Not allowed to edit this reservation" });
    }

    if (existing.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending reservations can be modified" });
    }

    // If date/time is changing, re-check double booking (optional)
    let newDatetime = reservationDatetime || existing.reservation_datetime;
    let newGuests = numberOfGuests || existing.number_of_guests;
    let newNotes = notes ?? existing.notes;

    if (!newDatetime || Number(newGuests) <= 0) {
      return res
        .status(400)
        .json({ message: "Invalid reservation data" });
    }

    if (newDatetime !== existing.reservation_datetime.toISOString().slice(0, 19).replace('T', ' ')) {
      // Rough check – DB datetime vs incoming ISO, you can adjust this comparison as needed
      const [conflicts] = await pool.execute(
        `SELECT * FROM reservations
         WHERE reservation_datetime = ?
           AND status <> 'cancelled'
           AND id <> ?`,
        [newDatetime, id]
      );
      if (conflicts.length > 0) {
        return res
          .status(400)
          .json({ message: "This time slot is already booked" });
      }
    }

    await pool.execute(
      `UPDATE reservations
       SET reservation_datetime = ?, number_of_guests = ?, notes = ?
       WHERE id = ?`,
      [newDatetime, newGuests, newNotes, id]
    );

    res.json({ message: "Reservation updated" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
