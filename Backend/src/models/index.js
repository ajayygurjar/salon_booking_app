const sequelize = require("../config/database");

const db = {};

db.sequelize = sequelize;

// Test connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log("MySQL + Sequelize connected");
  } catch (error) {
    console.error("Unable to connect:", error.message);
  }
})();

module.exports = db;
