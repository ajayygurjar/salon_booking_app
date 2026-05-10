const { Review, Appointment, User, Staff, Service } = require("../models");

exports.createReview = async (req, res) => {
  try {
    const { appointmentId, rating, comment } = req.body;

    if (!appointmentId || !rating) {
      return res
        .status(400)
        .json({ message: "appointmentId and rating are required" });
    }

    const appointment = await Appointment.findOne({
      where: { id: appointmentId, userId: req.user.id },
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.status !== "completed") {
      return res.status(400).json({
        message: "You can only review a completed appointment",
      });
    }

    const existing = await Review.findOne({ where: { appointmentId } });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Review already submitted for this appointment" });
    }

    const review = await Review.create({
      userId: req.user.id,
      appointmentId,
      staffId: appointment.staffId,
      rating,
      comment,
    });

    res
      .status(201)
      .json({ success: true, message: "Review submitted", review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    const where = {};
    if (req.query.staffId) where.staffId = req.query.staffId;

    const reviews = await Review.findAll({
      where,
      include: [
        { model: User, as: "user", attributes: ["name"] },
        { model: Staff, as: "staff", attributes: ["name"] },
        {
          model: Appointment,
          as: "appointment",
          attributes: ["date"],
          include: [{ model: Service, as: "service", attributes: ["name"] }],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, total: reviews.length, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReview = async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id, {
      include: [
        { model: User, as: "user", attributes: ["name"] },
        { model: Staff, as: "staff", attributes: ["name"] },
      ],
    });
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json({ success: true, review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.replyToReview = async (req, res) => {
  try {
    const { staffReply } = req.body;

    if (!staffReply) {
      return res.status(400).json({ message: "staffReply is required" });
    }

    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    await review.update({ staffReply });
    res.json({ success: true, message: "Reply added", review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    await review.destroy();
    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
