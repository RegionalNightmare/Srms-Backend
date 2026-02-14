const express = require("express");
const pool = require("../config/db");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { generateRef, processCard } = require("../services/demoPaymentService");

const router = express.Router();

// POST /api/payments/intent
router.post("/intent", protect, async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const [[order]] = await pool.execute(
      "SELECT * FROM orders WHERE id = ?",
      [orderId]
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not your order" });
    }

    const ref = generateRef();

    const [result] = await pool.execute(
      `INSERT INTO payments (order_id, amount, transaction_ref)
       VALUES (?, ?, ?)`,
      [orderId, order.total_price, ref]
    );

    res.json({
      paymentId: result.insertId,
      transactionRef: ref,
      amount: order.total_price,
      currency: "USD",
      status: "created",
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/confirm
router.post("/confirm", protect, async (req, res, next) => {
  try {
    const { paymentId, cardNumber } = req.body;

    const [[payment]] = await pool.execute(
      "SELECT * FROM payments WHERE id = ?",
      [paymentId]
    );

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const result = processCard(cardNumber);

    if (!result.success) {
      await pool.execute(
        `UPDATE payments SET status='failed', failure_reason=? WHERE id=?`,
        [result.reason, paymentId]
      );

      return res.status(402).json({ message: result.reason });
    }

    // success
    await pool.execute(
      `UPDATE payments SET status='succeeded' WHERE id=?`,
      [paymentId]
    );

    await pool.execute(
      `UPDATE orders SET status='completed' WHERE id=?`,
      [payment.order_id]
    );

    res.json({
      message: "Payment successful",
      receipt: {
        paymentId,
        amount: payment.amount,
        reference: payment.transaction_ref,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/:id
router.get("/:id", protect, async (req, res, next) => {
  try {
    const [[payment]] = await pool.execute(
      "SELECT * FROM payments WHERE id = ?",
      [req.params.id]
    );

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    res.json(payment);
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/:id/refund
router.post("/:id/refund", protect, adminOnly, async (req, res, next) => {
  try {
    const [[payment]] = await pool.execute(
      "SELECT * FROM payments WHERE id=?",
      [req.params.id]
    );

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.status !== "succeeded") {
      return res.status(400).json({ message: "Cannot refund unpaid payment" });
    }

    await pool.execute(
      "UPDATE payments SET status='refunded' WHERE id=?",
      [payment.id]
    );

    await pool.execute(
      "UPDATE orders SET status='cancelled' WHERE id=?",
      [payment.order_id]
    );

    res.json({ message: "Payment refunded" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
