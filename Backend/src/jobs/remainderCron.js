const cron = require("node-cron");
const { Appointment, User, Service, Staff } = require("../models");
const { sendReminderEmail } = require("../utils/mailer");
const { Op } = require("sequelize");

cron.schedule("0 8 * * *", async () => {
  console.log("[CRON] Running daily reminder job...");

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const appointments = await Appointment.findAll({
      where: {
        date: tomorrowStr,
        status: ["confirmed", "rescheduled"],
      },
      include: [
        { model: User, as: "user", attributes: ["name", "email"] },
        { model: Service, as: "service", attributes: ["name"] },
        { model: Staff, as: "staff", attributes: ["name"] },
      ],
    });

    console.log(
      `[CRON] Found ${appointments.length} appointments for ${tomorrowStr}`,
    );

    for (const appt of appointments) {
      try {
        await sendReminderEmail({
          to: appt.user.email,
          userName: appt.user.name,
          serviceName: appt.service.name,
          staffName: appt.staff.name,
          date: appt.date,
          time: appt.time,
        });
        console.log(`[CRON] Reminder sent to ${appt.user.email}`);
      } catch (emailErr) {
        console.error(
          `[CRON] Failed to send to ${appt.user.email}:`,
          emailErr.message,
        );
      }
    }

    console.log(
      `[CRON] Reminder job complete — ${appointments.length} emails sent`,
    );
  } catch (error) {
    console.error("[CRON] Job failed:", error.message);
  }
});

module.exports = {};
