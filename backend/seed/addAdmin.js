import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

async function addAdmin() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    const email = "avatars2610@gmail.com";
    const password = "123456";

    // Remove any other admins (only one admin allowed)
    await User.updateMany(
      { email: { $ne: email }, role: "admin" },
      { role: "student", is_admin: false }
    );
    console.log("✅ Ensured only one admin exists");

    const existing = await User.findOne({ email });
    if (existing) {
      existing.password = password;
      existing.role = "admin";
      existing.is_admin = true;
      existing.name = existing.name || "Admin";
      await existing.save();
      console.log("✅ Updated existing user to admin:", email);
    } else {
      await User.create({
        name: "Admin",
        email,
        password,
        role: "admin",
        is_admin: true,
      });
      console.log("✅ Admin user created:", email);
    }

    console.log("\n📋 LOGIN CREDENTIALS (Email + Password):");
    console.log("   Email:", email);
    console.log("   Password:", password);
    console.log("\nYou can now login at http://localhost:5173");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

addAdmin();
