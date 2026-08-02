const { Invoice, Appointment, User, Service, Staff } = require("../models");

exports.getMyInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      include: [
        {
          model: Appointment,
          as: "appointment",
          where: { userId: req.user.id },
          attributes: ["date", "time", "status"],
          include: [
            { model: Service, as: "service", attributes: ["name"] },
            { model: Staff, as: "staff", attributes: ["name"] },
          ],
        },
      ],
      order: [["issuedAt", "DESC"]],
    });

    res.json({ success: true, total: invoices.length, invoices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        {
          model: Appointment,
          as: "appointment",
          attributes: ["date", "time", "status", "amountPaid"],
          include: [
            { model: User, as: "user", attributes: ["name", "email"] },
            { model: Service, as: "service", attributes: ["name", "duration"] },
            { model: Staff, as: "staff", attributes: ["name"] },
          ],
        },
      ],
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      include: [
        {
          model: Appointment,
          as: "appointment",
          attributes: ["date", "time", "status"],
          include: [
            { model: User, as: "user", attributes: ["name", "email"] },
            { model: Service, as: "service", attributes: ["name"] },
            { model: Staff, as: "staff", attributes: ["name"] },
          ],
        },
      ],
      order: [["issuedAt", "DESC"]],
    });

    res.json({ success: true, total: invoices.length, invoices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
