const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/settingController");
const { protect } = require("../middlewares/authMiddleware");
const { isAdmin } = require("../middlewares/adminMiddleware");

router.get("/", ctrl.getSettings);
router.put("/", protect, isAdmin, ctrl.updateSetting);

module.exports = router;
