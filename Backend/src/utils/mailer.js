const nodemailer = require("nodemailer");
require("dotenv").config();

// ── Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,   
  },
});

// ── Booking Confirmation Email 
const sendBookingConfirmation = async ({ to, userName, serviceName, staffName, date, time, amount }) => {
  await transporter.sendMail({
    from:    `"GlowUp Salon" <${process.env.EMAIL_USER}>`,
    to,
    subject: "✅ Appointment Confirmed — GlowUp Salon",
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#C1567A">Appointment Confirmed!</h2>
        <p>Hi <strong>${userName}</strong>, your booking is confirmed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#666">Service</td><td><strong>${serviceName}</strong></td></tr>
          <tr><td style="padding:8px;color:#666">Stylist</td><td>${staffName}</td></tr>
          <tr><td style="padding:8px;color:#666">Date</td><td>${date}</td></tr>
          <tr><td style="padding:8px;color:#666">Time</td><td>${time}</td></tr>
          <tr><td style="padding:8px;color:#666">Amount Paid</td><td><strong>₹${amount}</strong></td></tr>
        </table>
        <p style="color:#666;font-size:13px">See you soon! — GlowUp Salon</p>
      </div>
    `,
  });
};

// ── Appointment Reminder Email 
const sendReminderEmail = async ({ to, userName, serviceName, staffName, date, time }) => {
  await transporter.sendMail({
    from:    `"GlowUp Salon" <${process.env.EMAIL_USER}>`,
    to,
    subject: "⏰ Reminder: Your appointment is tomorrow!",
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#C1567A">Appointment Reminder</h2>
        <p>Hi <strong>${userName}</strong>, just a reminder about tomorrow's appointment.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#666">Service</td><td><strong>${serviceName}</strong></td></tr>
          <tr><td style="padding:8px;color:#666">Stylist</td><td>${staffName}</td></tr>
          <tr><td style="padding:8px;color:#666">Date</td><td>${date}</td></tr>
          <tr><td style="padding:8px;color:#666">Time</td><td>${time}</td></tr>
        </table>
        <p style="color:#666;font-size:13px">See you tomorrow! — GlowUp Salon</p>
      </div>
    `,
  });
};

// ── Cancellation Email ────────────────────────────────────────────
const sendCancellationEmail = async ({ to, userName, serviceName, date, time, refund }) => {
  await transporter.sendMail({
    from:    `"GlowUp Salon" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Appointment Cancelled — GlowUp Salon",
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#C1567A">Appointment Cancelled</h2>
        <p>Hi <strong>${userName}</strong>, your appointment has been cancelled.</p>
        <p><strong>${serviceName}</strong> on ${date} at ${time}</p>
        ${refund ? "<p style='color:green'>A refund has been initiated and will reflect in 5-7 business days.</p>" : ""}
        <p style="color:#666;font-size:13px">We hope to see you again — GlowUp Salon</p>
      </div>
    `,
  });
};

const sendRescheduleEmail = async ({ to, userName, serviceName, staffName, oldDate, oldTime, newDate, newTime }) => {
  await transporter.sendMail({
    from:    `"GlowUp Salon" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Appointment Rescheduled — GlowUp Salon",
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#C1567A">Appointment Rescheduled</h2>
        <p>Hi <strong>${userName}</strong>, your appointment has been rescheduled.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#666">Service</td><td><strong>${serviceName}</strong></td></tr>
          <tr><td style="padding:8px;color:#666">Stylist</td><td>${staffName}</td></tr>
          <tr><td style="padding:8px;color:#666">Previous</td><td>${oldDate} at ${oldTime}</td></tr>
          <tr><td style="padding:8px;color:#666">New</td><td><strong>${newDate} at ${newTime}</strong></td></tr>
        </table>
        <p style="color:#666;font-size:13px">See you soon! — GlowUp Salon</p>
      </div>
    `,
  });
};

module.exports = { sendBookingConfirmation, sendReminderEmail, sendCancellationEmail, sendRescheduleEmail };