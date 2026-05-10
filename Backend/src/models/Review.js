const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Review = sequelize.define("Review", {
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

  appointmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: "Appointments", key: "id" },
  },

  staffId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "Staff", key: "id" },
  },

  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5,
    },
  },

  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },


  staffReply: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

module.exports = Review;
