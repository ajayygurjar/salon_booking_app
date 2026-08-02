const { Staff, Service, Appointment } = require("../models");

// CREATE STAFF
exports.createStaff = async (req, res) => {
  try {
    const staff = await Staff.create(req.body);
    res.status(201).json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ALL STAFF
exports.getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.findAll({
      include: [{ model: Service, as: "services" }],
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ONE STAFF
exports.getStaff = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id, {
      include: [{ model: Service, as: "services" }],
    });

    if (!staff) return res.status(404).json({ message: "Staff not found" });

    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE STAFF
exports.updateStaff = async (req, res) => {
  try {
    await Staff.update(req.body, { where: { id: req.params.id } });

    const updated = await Staff.findByPk(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE STAFF
exports.deleteStaff = async (req, res) => {
  try {
    const existing = await Appointment.findOne({
      where: { staffId: req.params.id, status: ["pending_payment", "confirmed", "rescheduled"] },
    });
    if (existing) {
      return res.status(409).json({
        message: "Cannot delete staff with active appointments. Cancel or complete them first.",
      });
    }
    await Staff.destroy({ where: { id: req.params.id } });
    res.json({ message: "Staff deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ASSIGN SERVICES TO STAFF
exports.assignServices = async (req, res) => {
  try {
    const { serviceIds } = req.body;

    // Add this debug line temporarily:
    console.log("serviceIds received:", serviceIds);

    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res
        .status(400)
        .json({ message: "serviceIds must be a non-empty array" });
    }

    const staff = await Staff.findByPk(req.params.id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    const services = await Service.findAll({ where: { id: serviceIds } });

    console.log("services found:", services.length); 

    await staff.setServices(services);

    res.json({ message: "Services assigned successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
