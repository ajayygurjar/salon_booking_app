const express = require("express");
const router = express.Router();

const {
  getAllServices,
  getService,
  createService,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

const { protect } = require("../middlewares/authMiddleware");
const { isAdmin } = require("../middlewares/adminMiddleware");

router.get("/", getAllServices);
router.get("/:id", getService);
router.post("/", protect, isAdmin, createService);
router.put("/:id", protect, isAdmin, updateService);
router.delete("/:id", protect, isAdmin, deleteService);

module.exports = router;
