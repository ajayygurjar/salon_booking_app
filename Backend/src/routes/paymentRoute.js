const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/paymentController");
const { protect } = require("../middlewares/authMiddleware");

// POST /api/v1/payments/create-order
router.post("/create-order", protect, ctrl.createOrder);

// POST /api/v1/payments/verify
router.post("/verify", protect, ctrl.verifyPayment);

// GET  /api/v1/payments/appointment/:id — check payment status
router.get("/appointment/:id", protect, ctrl.getPaymentStatus);

module.exports = router;
