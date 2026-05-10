const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/appointmentController");
const { protect } = require("../middlewares/authMiddleware");
const { isAdmin } = require("../middlewares/adminMiddleware");

router.get("/slots", ctrl.getSlots);

//ADMIN
router.get("/admin/all", protect, isAdmin, ctrl.getAllAppointments);
router.put("/admin/:id", protect, isAdmin, ctrl.adminUpdateAppointment);

//Customer
router.get("/my", protect, ctrl.getMyAppointments);
router.post("/", protect, ctrl.createAppointment);
router.get("/:id", protect, ctrl.getAppointment);
router.put("/:id/reschedule", protect, ctrl.reschedule);
router.delete("/:id", protect, ctrl.cancelAppointment);

module.exports = router;
