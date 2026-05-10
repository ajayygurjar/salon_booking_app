const sequelize = require("../config/db");
const User = require("./User");
const Service = require("./Service");
const Staff = require("./Staff");
const Appointment = require("./Appointment");

const StaffService = sequelize.define(
  "StaffService",
  {},
  { tableName: "staff_services", timestamps: false },
);

Staff.belongsToMany(Service, {
  through: StaffService,
  as: "services",
});
Service.belongsToMany(Staff, {
  through: StaffService,
  as: "staff",
});

//Appointment → User, Service, Staff (many-to-one)
Appointment.belongsTo(User, { foreignKey: "userId", as: "user" });
Appointment.belongsTo(Service, { foreignKey: "serviceId", as: "service" });
Appointment.belongsTo(Staff, { foreignKey: "staffId", as: "staff" });

//User, Service, Staff → Appointments (one-to-many)
User.hasMany(Appointment, { foreignKey: "userId", as: "appointments" });
Service.hasMany(Appointment, { foreignKey: "serviceId", as: "appointments" });
Staff.hasMany(Appointment, { foreignKey: "staffId", as: "appointments" });

module.exports = {
  sequelize,
  User,
  Service,
  Staff,
  StaffService,
  Appointment,
};
