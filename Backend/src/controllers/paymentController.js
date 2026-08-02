const Razorpay = require("razorpay");
const crypto = require("crypto");
const { Appointment, Service, Staff, User, Invoice } = require("../models");
const { sendBookingConfirmation } = require("../utils/mailer");
const { emitEvent } = require("../utils/socketEmitter");
require("dotenv").config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: "appointmentId is required" });
    }

    const appointment = await Appointment.findOne({
      where: { id: appointmentId, userId: req.user.id },
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.paymentStatus === "paid") {
      return res.status(400).json({ message: "Already paid" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(appointment.amountPaid * 100),
      currency: "INR",
      receipt: `appt_${appointmentId}`,
      notes: { appointmentId: String(appointmentId) },
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      appointmentId,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      appointmentId,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed — invalid signature",
      });
    }

    // Only the appointment's owner may confirm it.
    const appointment = await Appointment.findOne({
      where: { id: appointmentId, userId: req.user.id },
      include: [
        { model: User, as: "user", attributes: ["name", "email"] },
        { model: Service, as: "service", attributes: ["name"] },
        { model: Staff, as: "staff", attributes: ["name"] },
      ],
    });

    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    // Persist the payment result first — this is the source of truth. Everything
    // after this point is best-effort and must not fail the response, or we'd
    // return an error for a payment that actually succeeded.
    await appointment.update({
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "razorpay",
      transactionId: razorpay_payment_id,
    });

    // Generate the invoice before the email so a mail failure can't skip it.
    try {
      const count = (await Invoice.count()) + 1;
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count).padStart(5, "0")}`;

      await Invoice.findOrCreate({
        where: { appointmentId: appointment.id },
        defaults: {
          appointmentId: appointment.id,
          invoiceNumber,
          amount: appointment.amountPaid,
          status: "generated",
        },
      });
    } catch (invErr) {
      console.error("Invoice generation failed:", invErr.message);
    }

    // Confirmation email is best-effort.
    try {
      await sendBookingConfirmation({
        to: appointment.user.email,
        userName: appointment.user.name,
        serviceName: appointment.service.name,
        staffName: appointment.staff.name,
        date: appointment.date,
        time: appointment.time,
        amount: appointment.amountPaid,
      });
    } catch (emailErr) {
      console.error("Confirmation email failed:", emailErr.message);
    }

    // Notify customer & admin of confirmed booking
    emitEvent("booking:status", {
      id: appointment.id,
      status: "confirmed",
      paymentStatus: "paid",
    }, `user:${appointment.userId}`);
    emitEvent("booking:confirmed", {
      id: appointment.id,
      userId: appointment.userId,
      serviceName: appointment.service?.name,
      staffName: appointment.staff?.name,
      date: appointment.date,
      time: appointment.time,
    }, "admin");

    res.json({
      success: true,
      message: "Payment verified. Appointment confirmed!",
      appointment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, userId: req.user.id },
      attributes: [
        "id",
        "status",
        "paymentStatus",
        "paymentMethod",
        "transactionId",
        "amountPaid",
      ],
    });

    if (!appointment) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ success: true, payment: appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
