const Razorpay = require("razorpay");
const crypto = require("crypto");
const { Appointment, Service, Staff, User } = require("../models");
const { sendBookingConfirmation } = require("../utils/mailer");
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

    const appointment = await Appointment.findByPk(appointmentId, {
      include: [
        { model: User, as: "user", attributes: ["name", "email"] },
        { model: Service, as: "service", attributes: ["name"] },
        { model: Staff, as: "staff", attributes: ["name"] },
      ],
    });

    await appointment.update({
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "razorpay",
      transactionId: razorpay_payment_id,
    });

    await sendBookingConfirmation({
      to: appointment.user.email,
      userName: appointment.user.name,
      serviceName: appointment.service.name,
      staffName: appointment.staff.name,
      date: appointment.date,
      time: appointment.time,
      amount: appointment.amountPaid,
    });

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
