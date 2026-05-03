const sequelize = require("./src/config/database");

const app = require("./src/app");

const PORT = process.env.PORT || 5000;

sequelize
  .sync({ alter: true })
  .then(() => console.log("Database synced"))
  .catch((err) => console.error(err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
