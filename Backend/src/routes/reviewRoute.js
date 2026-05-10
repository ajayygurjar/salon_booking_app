const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/reviewController");
const { protect } = require("../middlewares/authMiddleware");
const { isAdmin } = require("../middlewares/adminMiddleware");

// Public
router.get("/", ctrl.getAllReviews);
router.get("/:id", ctrl.getReview);

// Auth required
router.post("/", protect, ctrl.createReview);

// Admin only
router.put("/:id/reply", protect, isAdmin, ctrl.replyToReview);
router.delete("/:id", protect, isAdmin, ctrl.deleteReview);

module.exports = router;
