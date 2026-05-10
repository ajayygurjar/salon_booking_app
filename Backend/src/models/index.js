const sequelize = require("../config/db");

const User = require("./User");
const Service = require("./Service");
const Staff = require("./Staff");

// Junction table with proper config
const StaffService = sequelize.define(
  "StaffService",
  {},
  {
    tableName: "staff_services",
    timestamps: false,
  },
);

// Associations
Staff.belongsToMany(Service, { through: StaffService });
Service.belongsToMany(Staff, { through: StaffService });

module.exports = {
  sequelize,
  User,
  Service,
  Staff,
  StaffService,
};
