const sequelize = require("../config/db");
const User = require("./User");

const db = {};

db.sequelize = sequelize;
db.User = User;

module.exports = db;
