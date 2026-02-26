import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import ClassModel from "../models/Class.js";
import Election from "../models/Election.js";
import Candidate from "../models/Candidate.js";
import Notice from "../models/Notice.js";

dotenv.config();

async function seed() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    console.log("Clearing existing data...");
    await User.deleteMany();
    await Department.deleteMany();
    await ClassModel.deleteMany();
    await Election.deleteMany();
    await Candidate.deleteMany();
    await Notice.deleteMany();

    console.log("Creating departments...");
    const deptCS = await Department.create({ name: "Computer Science", hod: "Dr. Sharma" });
    const deptEng = await Department.create({ name: "Mechanical Eng.", hod: "Pending" });

    console.log("Creating classes...");
    const cls2024A = await ClassModel.create({ name: "FY-CS (A)", department: deptCS._id, year: "2026 27" });
    const cls2024B = await ClassModel.create({ name: "SY-CS (B)", department: deptCS._id, year: "2025 26" });
    const eng2024 = await ClassModel.create({ name: "ENG 2024", department: deptEng._id });

    console.log("Creating admin user...");
    // Only one admin allowed: avatars2610@gmail.com
    await User.create({ name: "Admin", email: "avatars2610@gmail.com", password: "123456", role: "admin", is_admin: true });

    console.log("Creating student users...");
    await User.create({
      name: "Alice Kumar",
      email: "alice@college.edu",
      studentId: "2026CS101",
      password: "student123",
      department: deptCS._id,
      class: cls2024A._id,
      role: "student",
      is_admin: false,
    });
    await User.create({
      name: "Bob Martinez",
      email: "bob@college.edu",
      studentId: "2026CS102",
      password: "student123",
      department: deptCS._id,
      class: cls2024B._id,
      role: "student",
      is_admin: false,
    });

    console.log("Creating election...");
    const election = await Election.create({
      title: "Student Council Elections 2026",
      description: "Annual elections",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    await Candidate.create({ election: election._id, name: "Alice Kumar", position: "President" });
    await Candidate.create({ election: election._id, name: "Charlie Brown", position: "Vice President" });

    console.log("Creating notices...");
    await Notice.create({ title: "Exam Postponed", body: "All exams are shifted to next week.", audience: "all" });

    console.log("\n" + "=".repeat(60));
    console.log("SEED COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log("\n📋 LOGIN (Email + Password):");
    console.log("  Admin: avatars2610@gmail.com / 123456");
    console.log("  Student: alice@college.edu / student123");
    console.log("\n✅ Login at http://localhost:5173");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
}

seed();
