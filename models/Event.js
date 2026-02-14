// models/eventModel.js
const pool = require("../config/db");

// Create event
async function createEvent({
  userId,
  type,
  eventDatetime,
  numberOfGuests,
  menuSelection,
}) {
  const menuSelectionStr = menuSelection
    ? JSON.stringify(menuSelection)
    : null;

  const [result] = await pool.execute(
    `INSERT INTO events
      (user_id, type, event_datetime, number_of_guests, menu_selection, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [userId, type, eventDatetime, numberOfGuests, menuSelectionStr]
  );

  return {
    eventId: result.insertId,
    status: "pending",
  };
}

// Get events by user
async function getEventsByUserId(userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM events
     WHERE user_id = ?
     ORDER BY event_datetime DESC`,
    [userId]
  );

  return rows.map((ev) => ({
    ...ev,
    menu_selection: ev.menu_selection ? JSON.parse(ev.menu_selection) : null,
  }));
}

// Admin: get all events with filters
async function getAllEvents({ status, from, to } = {}) {
  let sql =
    "SELECT e.*, u.name AS customer_name, u.email AS customer_email FROM events e JOIN users u ON e.user_id = u.id WHERE 1=1";
  const params = [];

  if (status) {
    sql += " AND e.status = ?";
    params.push(status);
  }
  if (from) {
    sql += " AND e.event_datetime >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND e.event_datetime <= ?";
    params.push(to);
  }

  sql += " ORDER BY e.event_datetime DESC";

  const [rows] = await pool.execute(sql, params);

  return rows.map((ev) => ({
    ...ev,
    menu_selection: ev.menu_selection ? JSON.parse(ev.menu_selection) : null,
  }));
}

// Get single event
async function getEventById(id) {
  const [rows] = await pool.execute("SELECT * FROM events WHERE id = ?", [id]);
  return rows[0] || null;
}

// Admin: update status
async function updateEventStatus(id, status) {
  await pool.execute("UPDATE events SET status = ? WHERE id = ?", [status, id]);
}

// Owner: update pending event
async function updateEvent(id, data) {
  const existing = await getEventById(id);
  if (!existing) return null;

  const {
    type = existing.type,
    eventDatetime = existing.event_datetime,
    numberOfGuests = existing.number_of_guests,
    menuSelection,
    notes,
  } = data;

  const newMenuSelection =
    menuSelection !== undefined
      ? JSON.stringify(menuSelection)
      : existing.menu_selection;

  const newNotes = notes ?? existing.notes;

  await pool.execute(
    `UPDATE events
     SET type = ?, event_datetime = ?, number_of_guests = ?, menu_selection = ?, notes = ?
     WHERE id = ?`,
    [type, eventDatetime, numberOfGuests, newMenuSelection, newNotes, id]
  );

  return getEventById(id);
}

module.exports = {
  createEvent,
  getEventsByUserId,
  getAllEvents,
  getEventById,
  updateEventStatus,
  updateEvent,
};
