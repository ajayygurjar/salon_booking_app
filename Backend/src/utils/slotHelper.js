const { Appointment, Service } = require("../models");

const WORKING_START_HOUR = 9; // 9:00 AM
const WORKING_END_HOUR = 18; // 6:00 PM
const SLOT_INTERVAL_MINS = 30; // every 30 minutes

const generateAllSlots = () => {
  const slots = [];
  for (let h = WORKING_START_HOUR; h < WORKING_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_INTERVAL_MINS) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
};

const toMinutes = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const getAvailableSlots = async (date, staffId, serviceId) => {
  const service = await Service.findByPk(serviceId);
  if (!service) throw new Error("Service not found");

  const slotsNeeded = Math.ceil(service.duration / SLOT_INTERVAL_MINS);

  const existingBookings = await Appointment.findAll({
    where: {
      staffId,
      date,
      status: ["pending_payment", "confirmed", "rescheduled"],
    },
    include: [{ model: Service, as: "service", attributes: ["duration"] }],
  });

  const blockedMinutes = new Set();

  for (const booking of existingBookings) {
    const startMin = toMinutes(booking.time);
    const bookedDuration = booking.service?.duration || 30;
    const bookedSlots = Math.ceil(bookedDuration / SLOT_INTERVAL_MINS);

    for (let i = 0; i < bookedSlots; i++) {
      blockedMinutes.add(startMin + i * SLOT_INTERVAL_MINS);
    }
  }

  const allSlots = generateAllSlots();
  const closingMin = WORKING_END_HOUR * 60;

  const available = allSlots.filter((slot) => {
    const startMin = toMinutes(slot);

    for (let i = 0; i < slotsNeeded; i++) {
      const checkMin = startMin + i * SLOT_INTERVAL_MINS;

      if (blockedMinutes.has(checkMin)) return false;

      if (checkMin >= closingMin) return false;
    }

    return true;
  });

  return available;
};

module.exports = { getAvailableSlots };
