// models/reservationModel.js
const pool = require("../config/db");

// Check if slot is free (no non-cancelled reservation at same datetime)
async function isSlotAvailable(reservationDatetime, excludeId = null) {
  let sql = `SELECT * FROM reservations
             WHERE reservation_datetime = ?
               AND status <> 'cancelled'`;
  const params = [reservationDatetime];

  if (excludeId) {
    sql += " AND id <> ?";
    params.push(excludeId);
  }

  const [rows] = await pool.execute(sql, params);
  return rows.length === 0;
}

// Create reservation
async function createReservation({ userId, reservationDatetime, guests, notes }) {
  const available = await isSlotAvailable(reservationDatetime);
  if (!available) {
    throw new Error("This time slot is already booked");
  }

  const [result] = await pool.execute(
    `INSERT INTO reservations
      (user_id, reservation_datetime, number_of_guests, notes, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [userId, reservationDatetime, guests, notes || null]
  );

  return {
    reservationId: result.insertId,
    status: "pending",
  };
}

// Get reservations by user
async function getReservationsByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM reservations
     WHERE user_id = ?
     ORDER BY reservation_datetime DESC`,
    [userId]
  );
  return rows;
}

// Admin: get all reservations (optional status)
async function getAllReservations({ status } = {}) {
  let sql =
    "SELECT r.*, u.name AS customer_name, u.email AS customer_email FROM reservations r JOIN users u ON r.user_id = u.id WHERE 1=1";
  const params = [];

  if (status) {
    sql += " AND r.status = ?";
    params.push(status);
  }

  sql += " ORDER BY r.reservation_datetime DESC";

  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Admin: update status
async function updateReservationStatus(id, status) {
  await pool.execute("UPDATE reservations SET status = ? WHERE id = ?", [
    status,
    id,
  ]);
}

// Get single reservation
async function getReservationById(id) {
  const [rows] = await pool.execute("SELECT * FROM reservations WHERE id = ?", [
    id,
  ]);
  return rows[0] || null;
}

// Owner: update pending reservation
async function updateReservation(id, { reservationDatetime, guests, notes }) {
  const existing = await getReservationById(id);
  if (!existing) return null;

  const newDatetime = reservationDatetime || existing.reservation_datetime;
  const newGuests = guests || existing.number_of_guests;
  const newNotes = notes ?? existing.notes;

  // If datetime changed, re-check availability
  if (reservationDatetime && reservationDatetime !== existing.reservation_datetime) {
    const available = await isSlotAvailable(reservationDatetime, id);
    if (!available) {
      throw new Error("This time slot is already booked");
    }
  }

  await pool.execute(
    `UPDATE reservations
     SET reservation_datetime = ?, number_of_guests = ?, notes = ?
     WHERE id = ?`,
    [newDatetime, newGuests, newNotes, id]
  );

  return getReservationById(id);
}

module.exports = {
  createReservation,
  getReservationsByUserId,
  getAllReservations,
  updateReservationStatus,
  getReservationById,
  updateReservation,
};
