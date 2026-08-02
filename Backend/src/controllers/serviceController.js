const { Service } = require("../models");

const { Op } = require("sequelize");
const { Appointment } = require("../models");

exports.getAllServices = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, isActive } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    if (category) {
      where.category = { [Op.like]: `%${category}%` };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const services = await Service.findAll({ where });
    res.json({ success: true, total: services.length, services });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getService = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ message: "Not found" });
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.createService = async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateService = async (req, res) => {
  try {
    await Service.update(req.body, { where: { id: req.params.id } });
    const updated = await Service.findByPk(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const existing = await Appointment.findOne({
      where: { serviceId: req.params.id, status: ["pending_payment", "confirmed", "rescheduled"] },
    });
    if (existing) {
      return res.status(409).json({
        message: "Cannot delete service with active appointments. Cancel or complete them first.",
      });
    }
    await Service.destroy({ where: { id: req.params.id } });
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
