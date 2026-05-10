const { Service } = require("../models");

exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.findAll();
    res.json(services);
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
    await Service.destroy({ where: { id: req.params.id } });
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
