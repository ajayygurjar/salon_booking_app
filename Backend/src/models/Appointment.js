const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Appointment = sequelize.define("Appointment", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "Users", key: "id" },
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "Services", key: "id" },
  },
  staffId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "Staff", key: "id" },
  },

  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  time: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  status: {
    type: DataTypes.ENUM(
      "pending_payment",
      "confirmed",
      "completed",
      "cancelled",
      "rescheduled",
    ),
    defaultValue: "pending_payment",
  },

  paymentStatus: {
    type: DataTypes.ENUM("unpaid", "paid", "refunded"),
    defaultValue: "unpaid",
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  amountPaid: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

module.exports = Appointment;
