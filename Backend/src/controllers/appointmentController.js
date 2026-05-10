const { Appointment, Service, Staff, User } = require("../models");
const { getAvailableSlots } = require("../utils/slotHelper");

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
  try {
    const { serviceId, staffId, date, time, notes } = req.body;

    // Validate required fields
    if (!serviceId || !staffId || !date || !time) {
      return res.status(400).json({
        message: "serviceId, staffId, date and time are required",
      });
    }

    // Check staff exists
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Check service exists and get price
    const service = await Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Re-check slot at booking time (prevents race conditions)
    const available = await getAvailableSlots(date, staffId, serviceId);
    if (!available.includes(time)) {
      return res.status(409).json({
        message: "This slot is no longer available. Please choose another.",
      });
    }

    // Create the appointment
    const appointment = await Appointment.create({
      userId: req.user.id,
      serviceId,
      staffId,
      date,
      time,
      notes,
      status: "pending_payment",
      paymentStatus: "unpaid",
      amountPaid: service.price,
    });

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully. Please complete payment.",
      appointment,
    });
  } catch (error) {
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
  try {
    const { newDate, newTime } = req.body;

    if (!newDate || !newTime) {
      return res
        .status(400)
        .json({ message: "newDate and newTime are required" });
    }

    const appointment = await Appointment.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "Cannot reschedule a cancelled appointment" });
    }

    if (appointment.status === "completed") {
      return res
        .status(400)
        .json({ message: "Cannot reschedule a completed appointment" });
    }

    // Check the new slot is available
    const available = await getAvailableSlots(
      newDate,
      appointment.staffId,
      appointment.serviceId,
    );

    if (!available.includes(newTime)) {
      return res
        .status(409)
        .json({ message: "That new slot is not available" });
    }

    await appointment.update({
      date: newDate,
      time: newTime,
      status: "rescheduled",
    });

    res.json({
      success: true,
      message: "Appointment rescheduled successfully",
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, userId: req.user.id },
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

    const wasAlreadyPaid = appointment.paymentStatus === "paid";
    const newPaymentStatus = wasAlreadyPaid ? "refunded" : "unpaid";

    await appointment.update({
      status: "cancelled",
      paymentStatus: newPaymentStatus,
    });

    res.json({
      success: true,
      message: "Appointment cancelled",
      refundInitiated: wasAlreadyPaid,
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
  try {
    const appointment = await Appointment.findByPk(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    await appointment.update(req.body);

    res.json({
      success: true,
      message: "Appointment updated",
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
