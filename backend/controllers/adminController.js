import mongoose from "mongoose";
import Department from "../models/Department.js";
import ClassModel from "../models/Class.js";
import Notice from "../models/Notice.js";
import Election from "../models/Election.js";
import Candidate from "../models/Candidate.js";
import User from "../models/User.js";

// Password validation function (same as frontend and authController)
function validatePassword(password) {
  if (!password || password.length < 6) {
    return { isValid: false, error: "Password must be at least 6 characters" };
  }
  
  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one letter" };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: "Password must contain at least one number" };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one special character" };
  }
  
  return { isValid: true };
}

export async function registerAdmin(req, res) {
  try {
    const { name, email, password, phone, avatarUrl } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    // Only allow avatars2610@gmail.com to be admin
    const ADMIN_EMAIL = "avatars2610@gmail.com";
    if (normalizedEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "Only the designated admin email can be registered as admin" });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      return res.status(409).json({ error: "Admin already exists. Only one admin is allowed." });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      phone: phone ? String(phone).trim() : undefined,
      avatarUrl: avatarUrl ? String(avatarUrl).trim() : undefined,
      role: "admin",
      is_admin: true,
    });
    return res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error("registerAdmin error:", err);
    return res.status(500).json({ error: "Server error creating admin" });
  }
}

export async function registerStudent(req, res) {
  try {
    const { name, enrollmentId, email, phone, tempPassword, department, class: classId } = req.body || {};
    if (!name || !email || !tempPassword) {
      return res.status(400).json({ error: "name, email and tempPassword are required" });
    }

    // Validate password using same validation as login
    const passwordValidation = validatePassword(tempPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // If a student with this email already exists, update their details instead of failing
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.role === "admin" || existing.is_admin === true) {
        return res.status(409).json({ error: "This email is already used by the admin account" });
      }
      // Optional: prevent enrollmentId collision with another user
      if (enrollmentId) {
        const enrollmentValue = String(enrollmentId).trim();
        const other = await User.findOne({ studentId: enrollmentValue, _id: { $ne: existing._id } });
        if (other) {
          return res.status(409).json({ error: "Enrollment ID already registered" });
        }
        existing.studentId = enrollmentValue;
      }
      existing.name = String(name).trim();
      existing.phone = phone ? String(phone).trim() : existing.phone;
      existing.department = department || existing.department;
      existing.class = classId || existing.class;
      if (tempPassword) {
        existing.password = tempPassword;
      }
      await existing.save();
      const { password: _p, ...safeExisting } = existing.toObject();
      return res.status(200).json(safeExisting);
    }

    if (enrollmentId) {
      const existingId = await User.findOne({ studentId: String(enrollmentId).trim() });
      if (existingId) return res.status(409).json({ error: "Enrollment ID already registered" });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      studentId: enrollmentId ? String(enrollmentId).trim() : undefined,
      password: tempPassword,
      phone: phone ? String(phone).trim() : undefined,
      department: department || undefined,
      class: classId || undefined,
      role: "student",
      is_admin: false,
    });
    const { password: _, ...safe } = user.toObject();
    return res.status(201).json(safe);
  } catch (err) {
    console.error("registerStudent error:", err);
    if (err?.name === "ValidationError") {
      const messages = Object.values(err.errors || {}).map((e) => e.message);
      const msg = messages[0] || "Invalid data";
      return res.status(400).json({ error: msg });
    }
    if (err?.code === 11000) {
      const pattern = err.keyPattern || {};
      if (pattern.email) {
        return res.status(409).json({ error: "Email already registered" });
      }
      if (pattern.studentId) {
        return res.status(409).json({ error: "Enrollment ID already registered" });
      }
      return res.status(409).json({ error: "Duplicate field value already exists" });
    }
    return res.status(500).json({ error: "Server error creating student" });
  }
}

export async function listStudents(req, res) {
  try {
    const items = await User.find({ role: "student" }).select("-password").populate("department class");
    res.json(items);
  } catch (err) {
    console.error("listStudents error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listDepartments(req, res) {
  try {
    const items = await Department.find();
    res.json(items);
  } catch (err) {
    console.error("listDepartments error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function createDepartment(req, res) {
  try {
    const { name, hod } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Department name is required" });
    const d = await Department.create({ name: String(name).trim(), hod: hod ? String(hod).trim() : undefined });
    res.status(201).json(d);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Department already exists" });
    console.error("createDepartment error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getDepartment(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const d = await Department.findById(req.params.id);
    if (!d) return res.status(404).json({ error: "Department not found" });
    res.json(d);
  } catch (err) {
    console.error("getDepartment error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listClasses(req, res) {
  try {
    const filter = req.query.department ? { department: req.query.department } : {};
    const items = await ClassModel.find(filter).populate("department");
    res.json(items);
  } catch (err) {
    console.error("listClasses error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function createClass(req, res) {
  try {
    const { name, department, year } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Class name is required" });
    const c = await ClassModel.create({
      name: String(name).trim(),
      department: department || undefined,
      year: year ? String(year).trim() : undefined,
    });
    res.status(201).json(c);
  } catch (err) {
    console.error("createClass error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getClass(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const c = await ClassModel.findById(req.params.id).populate("department");
    if (!c) return res.status(404).json({ error: "Class not found" });
    const studentCount = await User.countDocuments({ class: c._id });
    res.json({ ...c.toObject(), studentCount });
  } catch (err) {
    console.error("getClass error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listNotices(req, res) {
  try {
    const items = await Notice.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error("listNotices error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function createNotice(req, res) {
  try {
    const { title, body, audience, attachment } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "Notice title is required" });
    const validAudience = ["all", "student", "students", "admins"].includes(audience) ? audience : "all";
    const n = await Notice.create({
      title: String(title).trim(),
      body: body ? String(body).trim() : "",
      audience: validAudience,
      attachment: attachment || undefined,
    });
    res.status(201).json(n);
  } catch (err) {
    console.error("createNotice error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listElections(req, res) {
  try {
    const elections = await Election.find()
      .sort({ createdAt: -1 })
      .populate("department class");

    const items = await Promise.all(
      elections.map(async (e) => ({
        ...e.toObject(),
        candidateCount: await Candidate.countDocuments({ election: e._id }),
      }))
    );

    res.json(items);
  } catch (err) {
    console.error("listElections error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function createElection(req, res) {
  try {
    const { title, description, startDate, endDate, level, department, class: classId } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "Election title is required" });

    const normalizedLevel = ["global", "department", "class"].includes(level) ? level : "global";

    let deptRef;
    let classRef;

    if (normalizedLevel === "department") {
      if (!department || !mongoose.Types.ObjectId.isValid(department)) {
        return res.status(400).json({ error: "Valid department is required for department-level elections" });
      }
      deptRef = department;
    }

    if (normalizedLevel === "class") {
      if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({ error: "Valid class is required for class-level elections" });
      }
      classRef = classId;
    }

    const e = await Election.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : "",
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      level: normalizedLevel,
      department: deptRef,
      class: classRef,
    });
    res.status(201).json(e);
  } catch (err) {
    console.error("createElection error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function addCandidate(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid election ID" });

    const election = await Election.findById(id);
    if (!election) return res.status(404).json({ error: "Election not found" });

    const { userId, studentId, position } = req.body || {};
    if (!userId && !studentId) {
      return res.status(400).json({ error: "userId or studentId is required to register candidate" });
    }

    let studentUser = null;
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: "Invalid userId" });
      studentUser = await User.findById(userId);
    } else {
      studentUser = await User.findOne({ studentId: String(studentId).trim() });
    }

    if (!studentUser) return res.status(404).json({ error: "Student not found" });
    if (studentUser.role !== "student") return res.status(400).json({ error: "Only student users can be candidates" });

    // Eligibility check based on election level
    if (election.level === "department") {
      if (!studentUser.department || studentUser.department.toString() !== String(election.department)) {
        return res.status(400).json({ error: "Student is not in the required department for this election" });
      }
    }
    if (election.level === "class") {
      if (!studentUser.class || studentUser.class.toString() !== String(election.class)) {
        return res.status(400).json({ error: "Student is not in the required class for this election" });
      }
    }

    const candidate = await Candidate.create({
      election: id,
      student: studentUser._id,
      name: studentUser.name,
      position: position ? String(position).trim() : "",
    });
    res.status(201).json(candidate);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: "This student is already registered as a candidate for this election" });
    }
    console.error("addCandidate error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function electionResults(req, res) {
  try {
    const { electionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(electionId)) return res.status(400).json({ error: "Invalid election ID" });

    const election = await Election.findById(electionId).populate("department class");
    if (!election) return res.status(404).json({ error: "Election not found" });

    const candidates = await Candidate.find({ election: electionId })
      .sort({ votes: -1 })
      .populate("student", "name email studentId department class");

    const winner = candidates.length > 0 ? candidates[0] : null;
    res.json({ election, candidates, winner });
  } catch (err) {
    console.error("electionResults error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getDashboardStats(req, res) {
  try {
    const now = new Date();
    const [deptCount, studentCount, allElections] = await Promise.all([
      Department.countDocuments(),
      User.countDocuments({ role: "student" }),
      Election.find(),
    ]);
    const activeElections = allElections.filter(
      (e) =>
        (!e.startDate || new Date(e.startDate) <= now) &&
        (!e.endDate || new Date(e.endDate) >= now)
    ).length;
    res.json({ deptCount, studentCount, activeElections });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
