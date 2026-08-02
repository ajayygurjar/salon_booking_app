require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const sequelize = require("./src/config/db");
require("./src/models");
require("./src/jobs/reminderCron");
const { connectRedis } = require("./src/config/redis");
const { initSocket } = require("./src/config/socket");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

initSocket(server);

Promise.all([sequelize.sync({ alter: true }), connectRedis()])
  .then(() => console.log("Database synced"))
  .catch((err) => console.error(err));

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
