const express = require("express");
const pool = require("../config/db");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * GET /api/users/me
 * Get the currently authenticated user (without password)
 */
router.get("/me", protect, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/me
 * Update logged-in user's own basic profile fields
 * Body: { "name": "...", "email": "..." }
 */
router.put("/me", protect, async (req, res, next) => {
  try {
    const { name, email } = req.body;

    const [existingArr] = await pool.execute(
      "SELECT * FROM users WHERE id = ?",
      [req.user.id]
    );
    if (existingArr.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const existing = existingArr[0];

    const newName = name || existing.name;
    const newEmail = email || existing.email;

    // If email changed, ensure uniqueness
    if (newEmail !== existing.email) {
      const [emailCheck] = await pool.execute(
        "SELECT id FROM users WHERE email = ? AND id <> ?",
        [newEmail, req.user.id]
      );
      if (emailCheck.length > 0) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    await pool.execute(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [newName, newEmail, req.user.id]
    );

    res.json({ message: "Profile updated" });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users
 * Admin: list all users
 */
router.get("/", protect, adminOnly, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, role, created_at, updated_at FROM users ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/:id
 * Admin: get single user
 */
router.get("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      "SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/:id/role
 * Admin: update a user's role
 * Body: { "role": "customer" | "admin" }
 */
router.put("/:id/role", protect, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowed = ["customer", "admin"];
    if (!allowed.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const [existing] = await pool.execute(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await pool.execute("UPDATE users SET role = ? WHERE id = ?", [role, id]);

    res.json({ message: "User role updated" });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/users/:id
 * Admin: delete a user
 */
router.delete("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await pool.execute("DELETE FROM users WHERE id = ?", [id]);

    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
