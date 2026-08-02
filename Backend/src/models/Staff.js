const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Staff = sequelize.define(
  "Staff",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      unique: true,
    },

    phone: {
      type: DataTypes.STRING,
    },

    specialization: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    workingDays: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Mon,Tue,Wed,Thu,Fri,Sat",
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    freezeTableName: true,
  },
);

module.exports = Staff;
