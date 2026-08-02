require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const sequelize = require("../config/db");
const { User, Service, Staff, StaffService, Setting } = require("../models");
const bcrypt = require("bcryptjs");

const seed = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("DB synced");

    // ── 1. Create admin user ────────────────────────────────────────
    const adminExists = await User.findOne({
      where: { email: "admin@salon.com" },
    });
    if (!adminExists) {
      await User.create({
        name: "Salon Admin",
        email: "admin@salon.com",
        password: await bcrypt.hash("admin123", 10),
        role: "admin",
        phone: "9999999999",
      });
      console.log("✓ Admin user created: admin@salon.com / admin123");
    } else {
      console.log("Admin already exists, skipping");
    }

    // ── 2. Create services ──────────────────────────────────────────
    const servicesData = [
      {
        name: "Haircut & Style",
        duration: 45,
        price: 599,
        category: "Hair",
        description: "Classic cut and styling for all hair types",
        isActive: true,
      },
      {
        name: "Hair Coloring",
        duration: 90,
        price: 1499,
        category: "Hair",
        description: "Full hair coloring with premium products",
        isActive: true,
      },
      {
        name: "Keratin Treatment",
        duration: 120,
        price: 2999,
        category: "Hair",
        description: "Smoothing treatment for frizz-free hair",
        isActive: true,
      },
      {
        name: "Facial",
        duration: 60,
        price: 899,
        category: "Skin",
        description: "Deep cleansing and hydrating facial",
        isActive: true,
      },
      {
        name: "Manicure",
        duration: 30,
        price: 449,
        category: "Nails",
        description: "Classic manicure with nail polish",
        isActive: true,
      },
      {
        name: "Pedicure",
        duration: 45,
        price: 549,
        category: "Nails",
        description: "Relaxing pedicure treatment",
        isActive: true,
      },
      {
        name: "Eyebrow Threading",
        duration: 15,
        price: 149,
        category: "Brows",
        description: "Precise eyebrow shaping",
        isActive: true,
      },
      {
        name: "Full Body Massage",
        duration: 90,
        price: 1799,
        category: "Spa",
        description: "Relaxing full body Swedish massage",
        isActive: true,
      },
    ];

    const services = [];
    for (const svcData of servicesData) {
      const [svc] = await Service.findOrCreate({
        where: { name: svcData.name },
        defaults: svcData,
      });
      services.push(svc);
    }
    console.log(`${services.length} services ready`);

    // ── 2b. Create default settings ─────────────────────────────────
    const defaultSettings = [
      { key: "workingStartHour", value: "9" },
      { key: "workingEndHour", value: "18" },
      { key: "salonName", value: "GlowUp Salon" },
      { key: "cancellationPolicy", value: "Free cancellation up to 24 hours before appointment" },
    ];

    for (const s of defaultSettings) {
      await Setting.findOrCreate({ where: { key: s.key }, defaults: s });
    }
    console.log("Default settings created");

    // ── 3. Create staff ─────────────────────────────────────────────
    const staffData = [
      {
        name: "Priya Sharma",
        email: "priya@salon.com",
        phone: "9876543210",
        specialization: "Hair Stylist & Colorist",
        workingDays: "Mon,Tue,Wed,Thu,Fri,Sat",
        isActive: true,
      },
      {
        name: "Ravi Kumar",
        email: "ravi@salon.com",
        phone: "9876543211",
        specialization: "Nail Technician",
        workingDays: "Mon,Tue,Wed,Thu,Fri,Sat",
        isActive: true,
      },
      {
        name: "Meera Patel",
        email: "meera@salon.com",
        phone: "9876543212",
        specialization: "Skin & Spa Therapist",
        workingDays: "Mon,Tue,Wed,Thu,Fri",
        isActive: true,
      },
    ];

    const staffList = [];
    for (const stData of staffData) {
      const [st] = await Staff.findOrCreate({
        where: { email: stData.email },
        defaults: stData,
      });
      staffList.push(st);
    }
    console.log(`${staffList.length} staff members ready`);

    await staffList[0].setServices([services[0], services[1], services[2]]);
    console.log("Priya: Haircut, Coloring, Keratin");

    await staffList[1].setServices([services[4], services[5], services[6]]);
    console.log("Ravi: Manicure, Pedicure, Threading");

    await staffList[2].setServices([services[3], services[7], services[0]]);
    console.log("Meera: Facial, Massage, Haircut");

    console.log("\n Seed complete! Use these credentials:");
    console.log("   Admin: admin@salon.com / admin123");
    console.log("   Register a customer account at /register\n");

    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    console.error(err);
    process.exit(1);
  }
};

seed();
