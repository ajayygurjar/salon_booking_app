const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/invoiceController");
const { protect } = require("../middlewares/authMiddleware");
const { isAdmin } = require("../middlewares/adminMiddleware");

router.get("/my", protect, ctrl.getMyInvoices);
router.get("/", protect, isAdmin, ctrl.getAllInvoices);
router.get("/:id", protect, ctrl.getInvoice);

module.exports = router;
