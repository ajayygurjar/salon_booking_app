const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      process.env.CLIENT_URL, 
    ].filter(Boolean),
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/v1/auth", require("./routes/authRoute"));
app.use("/api/v1/services", require("./routes/serviceRoute"));
app.use("/api/v1/staff", require("./routes/staffRoute"));
app.use("/api/v1/appointments", require("./routes/appointmentRoute"));
app.use("/api/v1/payments", require("./routes/paymentRoute"));
app.use("/api/v1/reviews", require("./routes/reviewRoute"));
app.use("/api/v1/settings", require("./routes/settingRoute"));
app.use("/api/v1/invoices", require("./routes/invoiceRoute"));

app.get("/", (req, res) => {
  res.send("Salon Booking API is running...");
});

module.exports = app;
