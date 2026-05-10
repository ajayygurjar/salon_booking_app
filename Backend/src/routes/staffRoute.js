const express = require("express");
const router = express.Router();

const {
  createStaff,
  getAllStaff,
  getStaff,
  updateStaff,
  deleteStaff,
  assignServices,
} = require("../controllers/staffController");

const { protect } = require("../middlewares/authMiddleware");
const { isAdmin } = require("../middlewares/adminMiddleware");

// PUBLIC / PROTECTED READS
router.get("/", getAllStaff);
router.get("/:id", getStaff);

// ADMIN ONLY (WRITE)
router.post("/", protect, isAdmin, createStaff);
router.put("/:id", protect, isAdmin, updateStaff);
router.delete("/:id", protect, isAdmin, deleteStaff);

// ASSIGN SERVICES TO STAFF (ADMIN)
router.put("/:id/services", protect, isAdmin, assignServices);

module.exports = router;
