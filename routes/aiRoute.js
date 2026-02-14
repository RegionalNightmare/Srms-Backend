const express = require("express");
const pool = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/ai/recommendations
router.get("/recommendations", protect, async (req, res, next) => {
  try {
    // MySQL-style random rows
    const [rows] = await pool.execute(
      "SELECT * FROM menu_items WHERE available = 1 ORDER BY RAND() LIMIT 3"
    );
    res.json({ recommendations: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/chatbot
router.post("/chatbot", async (req, res, next) => {
  try {
    const { message } = req.body;
    let reply = "I'm a basic chatbot. Ask me about today's specials or reservations!";

    if (message?.toLowerCase().includes("special")) {
      reply = "Today's special is Grilled Salmon with Lemon Butter Sauce.";
    }

    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
