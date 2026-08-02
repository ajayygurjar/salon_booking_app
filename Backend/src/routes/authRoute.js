const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMe,
  updateProfile,
  getAllUsers,
} = require("../controllers/authController");

const { protect } = require("../middlewares/authMiddleware");
const { isAdmin } = require("../middlewares/adminMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.get("/users", protect, isAdmin, getAllUsers);

module.exports = router;