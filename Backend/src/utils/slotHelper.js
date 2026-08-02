const { Appointment, Service, Staff, Setting } = require("../models");
const { redis } = require("../config/redis");

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 18;
const SLOT_INTERVAL_MINS = 30;
const CACHE_TTL = 60; // seconds

const generateAllSlots = (startHour, endHour) => {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
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

const getAvailableSlots = async (date, staffId, serviceId, options = {}) => {
  const { skipCache = false, transaction = null } = options;
  const cacheKey = `slots:${date}:${staffId}:${serviceId}`;

  // Try Redis cache first (bypassed for the authoritative check at booking time)
  if (!skipCache) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Redis unavailable, skip cache
    }
  }

  const service = await Service.findByPk(serviceId, { transaction });
  if (!service) throw new Error("Service not found");

  const staff = await Staff.findByPk(staffId, { transaction });
  if (!staff) throw new Error("Staff not found");

  // Check if staff works on the requested day
  if (staff.workingDays) {
    const dayName = DAY_NAMES[new Date(date).getDay()];
    const workingDays = staff.workingDays.split(",").map(d => d.trim());
    if (!workingDays.includes(dayName)) {
      return []; // Staff doesn't work this day
    }
  }

  const settingsRows = await Setting.findAll({ transaction });
  const settings = {};
  settingsRows.forEach((r) => {
    if (r.key === "workingStartHour" || r.key === "workingEndHour") {
      settings[r.key] = parseInt(r.value, 10);
    }
  });

  const startHour = settings.workingStartHour || DEFAULT_START_HOUR;
  const endHour = settings.workingEndHour || DEFAULT_END_HOUR;
  const slotsNeeded = Math.ceil(service.duration / SLOT_INTERVAL_MINS);

  const existingBookings = await Appointment.findAll({
    where: {
      staffId,
      date,
      status: ["pending_payment", "confirmed", "rescheduled"],
    },
    include: [{ model: Service, as: "service", attributes: ["duration"] }],
    transaction,
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

  const allSlots = generateAllSlots(startHour, endHour);
  const closingMin = endHour * 60;

  const available = allSlots.filter((slot) => {
    const startMin = toMinutes(slot);
    for (let i = 0; i < slotsNeeded; i++) {
      const checkMin = startMin + i * SLOT_INTERVAL_MINS;
      if (blockedMinutes.has(checkMin)) return false;
      if (checkMin >= closingMin) return false;
    }
    return true;
  });

  // Cache the result (never cache the transaction-scoped authoritative read)
  if (!skipCache) {
    try {
      await redis.set(cacheKey, JSON.stringify(available), "EX", CACHE_TTL);
    } catch {
      // ignore
    }
  }

  return available;
};

// Invalidate slot cache when an appointment is created, cancelled, or rescheduled.
// Clears every service's cached slots for this staff/date, because availability
// for one service depends on the staff's bookings across ALL services (a longer
// booking blocks slots that shorter services would otherwise offer).
const invalidateSlotCache = async (date, staffId) => {
  try {
    const keys = await redis.keys(`slots:${date}:${staffId}:*`);
    if (keys.length) await redis.del(...keys);
  } catch {
    // ignore
  }
};

module.exports = { getAvailableSlots, invalidateSlotCache };
