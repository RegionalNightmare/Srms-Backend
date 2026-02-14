// models/userModel.js
const pool = require("../config/db");

// Create a new user
async function createUser({ name, email, password, role = "customer" }) {
  const [result] = await pool.execute(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
    [name, email, password, role]
  );
  return result.insertId;
}

// Find by email (for login/registration check)
async function findUserByEmail(email) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [
    email,
  ]);
  return rows[0] || null;
}

// Find by ID (for auth middleware, profile, etc.)
async function findUserById(id) {
  const [rows] = await pool.execute(
    "SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

// Find full user (including password) by ID
async function findFullUserById(id) {
  const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);
  return rows[0] || null;
}

// Update own profile (name/email)
async function updateUserProfile(id, { name, email }) {
  await pool.execute("UPDATE users SET name = ?, email = ? WHERE id = ?", [
    name,
    email,
    id,
  ]);
}

// List all users (admin)
async function getAllUsers() {
  const [rows] = await pool.execute(
    "SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY created_at DESC"
  );
  return rows;
}

// Update user role (admin)
async function updateUserRole(id, role) {
  await pool.execute("UPDATE users SET role = ? WHERE id = ?", [role, id]);
}

// Delete user (admin)
async function deleteUser(id) {
  await pool.execute("DELETE FROM users WHERE id = ?", [id]);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  findFullUserById,
  updateUserProfile,
  getAllUsers,
  updateUserRole,
  deleteUser,
};
