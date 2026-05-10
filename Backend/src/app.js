const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/v1/auth", require("./routes/authRoute"));
app.use("/api/v1/services", require("./routes/serviceRoute"));
app.use("/api/v1/staff", require("./routes/staffRoute"));

app.get("/", (req, res) => {
  res.send("Salon Booking API is running...");
});

module.exports = app;
