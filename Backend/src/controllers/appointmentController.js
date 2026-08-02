const { Sequelize } = require("sequelize");
const { Appointment, Service, Staff, User, sequelize } = require("../models");
const { getAvailableSlots, invalidateSlotCache } = require("../utils/slotHelper");
const {
  sendCancellationEmail,
  sendRescheduleEmail,
} = require("../utils/mailer");
const { emitEvent } = require("../utils/socketEmitter");
const Razorpay = require("razorpay");
require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.getSlots = async (req, res) => {
  try {
    const { staffId, serviceId, date } = req.query;

    if (!staffId || !serviceId || !date) {
      return res.status(400).json({
        message: "staffId, serviceId and date are all required",
      });
    }

    const availableSlots = await getAvailableSlots(date, +staffId, +serviceId);

    res.json({
      success: true,
      date,
      staffId: +staffId,
      serviceId: +serviceId,
      availableSlots,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createAppointment = async (req, res) => {
  const { serviceId, staffId, date, time, notes } = req.body;

  // Validate required fields
  if (!serviceId || !staffId || !date || !time) {
    return res.status(400).json({
      message: "serviceId, staffId, date and time are required",
    });
  }

  // Serialize concurrent bookings for the same staff so two requests can't both
  // pass the availability check and grab the same slot. READ COMMITTED so the
  // authoritative re-check below sees rows committed by a booking that just
  // released the lock.
  const t = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED,
  });

  try {
    // Locking the staff row is what forces same-staff bookings to serialize:
    // the second request blocks here until the first commits or rolls back.
    const staff = await Staff.findByPk(staffId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!staff) {
      await t.rollback();
      return res.status(404).json({ message: "Staff not found" });
    }

    const service = await Service.findByPk(serviceId, { transaction: t });
    if (!service) {
      await t.rollback();
      return res.status(404).json({ message: "Service not found" });
    }

    // Authoritative slot check: skip the Redis cache and read inside the locked
    // transaction so a just-committed booking is always visible here.
    const available = await getAvailableSlots(date, staffId, serviceId, {
      skipCache: true,
      transaction: t,
    });
    if (!available.includes(time)) {
      await t.rollback();
      return res.status(409).json({
        message: "This slot is no longer available. Please choose another.",
      });
    }

    const appointment = await Appointment.create(
      {
        userId: req.user.id,
        serviceId,
        staffId,
        date,
        time,
        notes,
        status: "pending_payment",
        paymentStatus: "unpaid",
        amountPaid: service.price,
      },
      { transaction: t },
    );

    await t.commit();

    // Post-commit: refresh cache and notify. Both are best-effort — a failure
    // here must not undo a booking that is already committed.
    await invalidateSlotCache(date, staffId);

    emitEvent("booking:new", {
      id: appointment.id,
      userId: req.user.id,
      serviceId,
      staffId,
      date,
      time,
    }, "admin");

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully. Please complete payment.",
      appointment,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

exports.getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Service,
          as: "service",
          attributes: ["name", "duration", "price", "category"],
        },
        { model: Staff, as: "staff", attributes: ["name", "email", "phone"] },
      ],
      order: [
        ["date", "DESC"],
        ["time", "ASC"],
      ],
    });

    res.json({ success: true, total: appointments.length, appointments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        {
          model: Service,
          as: "service",
          attributes: ["name", "duration", "price", "category", "description"],
        },
        { model: Staff, as: "staff", attributes: ["name", "email", "phone"] },
      ],
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reschedule = async (req, res) => {
  const { newDate, newTime } = req.body;

  if (!newDate || !newTime) {
    return res
      .status(400)
      .json({ message: "newDate and newTime are required" });
  }

  const t = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED,
  });

  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        { model: User, as: "user", attributes: ["name", "email"] },
        { model: Service, as: "service", attributes: ["name"] },
        { model: Staff, as: "staff", attributes: ["name"] },
      ],
      transaction: t,
    });

    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.status === "cancelled") {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Cannot reschedule a cancelled appointment" });
    }

    if (appointment.status === "completed") {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "Cannot reschedule a completed appointment" });
    }

    // Serialize against concurrent bookings/reschedules for the same staff.
    await Staff.findByPk(appointment.staffId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const oldDate = appointment.date;
    const oldTime = appointment.time;

    // Authoritative slot check inside the locked transaction (cache bypassed).
    const available = await getAvailableSlots(
      newDate,
      appointment.staffId,
      appointment.serviceId,
      { skipCache: true, transaction: t },
    );

    if (!available.includes(newTime)) {
      await t.rollback();
      return res
        .status(409)
        .json({ message: "That new slot is not available" });
    }

    await appointment.update(
      {
        date: newDate,
        time: newTime,
        status: "rescheduled",
      },
      { transaction: t },
    );

    await t.commit();

    // Post-commit: refresh cache for old and new slots (best-effort).
    await invalidateSlotCache(oldDate, appointment.staffId);
    await invalidateSlotCache(newDate, appointment.staffId);

    // Send reschedule notification email
    try {
      await sendRescheduleEmail({
        to: appointment.user.email,
        userName: appointment.user.name,
        serviceName: appointment.service.name,
        staffName: appointment.staff.name,
        oldDate,
        oldTime,
        newDate,
        newTime,
      });
    } catch (emailErr) {
      console.error("Reschedule email failed:", emailErr.message);
    }

    // Notify admin
    emitEvent("booking:rescheduled", {
      id: appointment.id,
      userId: appointment.userId,
      oldDate,
      oldTime,
      newDate,
      newTime,
    }, "admin");

    // Notify customer
    emitEvent("booking:status", {
      id: appointment.id,
      status: "rescheduled",
      date: newDate,
      time: newTime,
    }, `user:${appointment.userId}`);

    res.json({
      success: true,
      message: "Appointment rescheduled successfully",
      appointment,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        { model: User, as: "user", attributes: ["name", "email"] },
        { model: Service, as: "service", attributes: ["name"] },
      ],
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "Appointment is already cancelled" });
    }

    if (appointment.status === "completed") {
      return res
        .status(400)
        .json({ message: "Cannot cancel a completed appointment" });
    }

    let refundProcessed = false;

    // Process actual refund via Razorpay if paid
    if (appointment.paymentStatus === "paid" && appointment.transactionId) {
      try {
        const payment = await razorpay.payments.fetch(
          appointment.transactionId,
        );

        if (payment.status === "captured") {
          await razorpay.payments.refund(appointment.transactionId, {
            amount: Math.round(appointment.amountPaid * 100),
          });
          refundProcessed = true;
        }
      } catch (refundErr) {
        console.error("Refund processing failed:", refundErr.message);
      }
    }

    const newPaymentStatus = refundProcessed
      ? "refunded"
      : appointment.paymentStatus === "paid"
        ? "refunded"
        : "unpaid";

    const oldDate = appointment.date;
    const oldTime = appointment.time;

    await appointment.update({
      status: "cancelled",
      paymentStatus: newPaymentStatus,
    });

    // Invalidate slot cache
    await invalidateSlotCache(oldDate, appointment.staffId, appointment.serviceId);

    // Send cancellation email
    try {
      await sendCancellationEmail({
        to: appointment.user.email,
        userName: appointment.user.name,
        serviceName: appointment.service.name,
        date: oldDate,
        time: oldTime,
        refund: refundProcessed,
      });
    } catch (emailErr) {
      console.error("Cancellation email failed:", emailErr.message);
    }

    // Notify admin
    emitEvent("booking:cancelled", {
      id: appointment.id,
      userId: appointment.userId,
      date: oldDate,
      time: oldTime,
    }, "admin");

    // Notify the customer (if they have another tab open)
    emitEvent("booking:status", {
      id: appointment.id,
      status: "cancelled",
      paymentStatus: newPaymentStatus,
    }, `user:${appointment.userId}`);

    res.json({
      success: true,
      message: "Appointment cancelled",
      refundInitiated: refundProcessed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      include: [
        { model: User, as: "user", attributes: ["name", "email", "phone"] },
        {
          model: Service,
          as: "service",
          attributes: ["name", "price", "duration"],
        },
        { model: Staff, as: "staff", attributes: ["name", "email"] },
      ],
      order: [
        ["date", "DESC"],
        ["time", "ASC"],
      ],
    });

    res.json({ success: true, total: appointments.length, appointments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminUpdateAppointment = async (req, res) => {
  const scheduleChange =
    req.body.date || req.body.time || req.body.staffId || req.body.serviceId;

  // Non-scheduling updates (status, notes, payment fields) don't touch slot
  // availability — apply them directly, no locking needed.
  if (!scheduleChange) {
    try {
      const appointment = await Appointment.findByPk(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      await appointment.update(req.body);

      if (req.body.status) {
        emitEvent("booking:status", {
          id: appointment.id,
          status: req.body.status,
        }, `user:${appointment.userId}`);
      }

      return res.json({
        success: true,
        message: "Appointment updated",
        appointment,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // Scheduling change: same locked-transaction pattern as booking/reschedule.
  const t = await sequelize.transaction({
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED,
  });

  try {
    const appointment = await Appointment.findByPk(req.params.id, {
      transaction: t,
    });
    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ message: "Appointment not found" });
    }

    const oldDate = appointment.date;
    const oldStaffId = appointment.staffId;

    // Resolve the target slot from the incoming values, falling back to current.
    const targetStaffId = req.body.staffId || appointment.staffId;
    const targetServiceId = req.body.serviceId || appointment.serviceId;
    const targetDate = req.body.date || appointment.date;
    const targetTime = req.body.time || appointment.time;

    // Lock the target staff row to serialize against concurrent bookings.
    const staff = await Staff.findByPk(targetStaffId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!staff) {
      await t.rollback();
      return res.status(404).json({ message: "Staff not found" });
    }

    // Authoritative slot check inside the locked transaction (cache bypassed).
    const available = await getAvailableSlots(
      targetDate,
      targetStaffId,
      targetServiceId,
      { skipCache: true, transaction: t },
    );
    if (!available.includes(targetTime)) {
      await t.rollback();
      return res.status(409).json({
        message: "Target slot is not available",
      });
    }

    await appointment.update(req.body, { transaction: t });

    await t.commit();

    // Post-commit: refresh cache for both the old and new staff/date.
    await invalidateSlotCache(oldDate, oldStaffId);
    await invalidateSlotCache(targetDate, targetStaffId);

    if (req.body.status) {
      emitEvent("booking:status", {
        id: appointment.id,
        status: req.body.status,
      }, `user:${appointment.userId}`);
    }

    res.json({
      success: true,
      message: "Appointment updated",
      appointment,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    res.status(500).json({ message: error.message });
  }
};
