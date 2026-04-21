import mongoose from "mongoose";
import Department from "../models/Department.js";
import ClassModel from "../models/Class.js";
import Notice from "../models/Notice.js";
import Election from "../models/Election.js";
import Candidate from "../models/Candidate.js";
import User from "../models/User.js";
import { getMessage, getValidationMessage } from "../utils/messages.js";
import { sendRegistrationEmail, sendAccountDeletionEmail } from "./authController.js";

// Password validation function (same as frontend and authController)
function validatePassword(password) {
  if (!password || password.length < 6) {
    return { isValid: false, error: getMessage('error', 'INVALID_PASSWORD_FORMAT') };
  }
  
  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { isValid: false, error: getMessage('error', 'INVALID_PASSWORD_FORMAT') };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: getMessage('error', 'INVALID_PASSWORD_FORMAT') };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: getMessage('error', 'INVALID_PASSWORD_FORMAT') };
  }
  
  return { isValid: true };
}

export async function registerAdmin(req, res) {
  try {
    const { name, email, password, phone, avatarUrl } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: getValidationMessage('email', 'required') });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    // Only allow configured admin email to be admin
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    if (!ADMIN_EMAIL || normalizedEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ error: getMessage('error', 'ACCESS_DENIED') });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Send registration email to admin BEFORE saving (so we have the plain password)
    try {
      await sendRegistrationEmail(normalizedEmail, String(name).trim(), password, 'admin');
      console.log(`Registration email sent to admin: ${normalizedEmail}`);
    } catch (emailError) {
      console.error(`Failed to send registration email to admin ${normalizedEmail}:`, emailError);
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
    return res.status(500).json({ error: getMessage('error', 'SERVER_ERROR') });
  }
}

export async function registerStudent(req, res) {
  try {
    const { name, enrollmentId, email, phone, tempPassword, department, class: classId } = req.body || {};
    console.log("registerStudent API - input:", { name, enrollmentId, email, department, class: classId, userRole: req.user?.role });
    
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
      return res.status(409).json({ error: "Email already registered" });
    }

    if (enrollmentId) {
      const existingId = await User.findOne({ studentId: String(enrollmentId).trim() });
      if (existingId) return res.status(409).json({ error: "Enrollment ID already registered" });
    }

    // Send registration email to student BEFORE saving (so we have the plain password)
    try {
      await sendRegistrationEmail(normalizedEmail, String(name).trim(), tempPassword, 'student');
      console.log(`Registration email sent to student: ${normalizedEmail}`);
    } catch (emailError) {
      console.error(`Failed to send registration email to student ${normalizedEmail}:`, emailError);
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
    
    console.log("registerStudent API - created new student:", { _id: user._id, class: user.class, department: user.department });
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

// Register HOD (by admin only)
export async function registerHOD(req, res) {
  try {
    const { name, email, password, phone, departmentId } = req.body;

    if (!name || !email || !password || !departmentId) {
      return res.status(400).json({ error: "name, email, password and departmentId are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Verify department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Send registration email to HOD BEFORE saving (so we have the plain password)
    try {
      await sendRegistrationEmail(normalizedEmail, String(name).trim(), password, 'hod');
      console.log(`Registration email sent to HOD: ${normalizedEmail}`);
    } catch (emailError) {
      console.error(`Failed to send registration email to HOD ${normalizedEmail}:`, emailError);
    }

    // Create HOD
    const hod = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      phone: phone ? String(phone).trim() : '',
      role: 'hod',
      department: departmentId,
      assignedDepartment: departmentId
    });

    // Update department with HOD
    department.hod = hod._id;
    await department.save();

    res.status(201).json({
      message: 'HOD registered successfully',
      hod: {
        id: hod._id,
        name: hod.name,
        email: hod.email,
        role: hod.role,
        department: departmentId,
        assignedDepartment: departmentId,
        departmentName: department.name
      }
    });
  } catch (err) {
    console.error("registerHOD error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// Register Teacher (by admin only)
export async function registerTeacher(req, res) {
  try {
    const { name, email, password, phone, classId } = req.body;

    if (!name || !email || !password || !classId) {
      return res.status(400).json({ error: "name, email, password and classId are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Verify class exists
    const classObj = await ClassModel.findById(classId).populate('department');
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Send registration email to Teacher BEFORE saving (so we have the plain password)
    try {
      await sendRegistrationEmail(normalizedEmail, String(name).trim(), password, 'teacher');
      console.log(`Registration email sent to teacher: ${normalizedEmail}`);
    } catch (emailError) {
      console.error(`Failed to send registration email to teacher ${normalizedEmail}:`, emailError);
    }

    // Create Teacher
    const teacher = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      phone: phone ? String(phone).trim() : '',
      role: 'teacher',
      assignedClass: classId,
      assignedDepartment: classObj.department._id
    });

    // Update class with class teacher
    classObj.classTeacher = teacher._id;
    await classObj.save();

    res.status(201).json({
      message: 'Teacher registered successfully',
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        assignedClass: classId,
        assignedDepartment: classObj.department._id,
        className: classObj.name,
        departmentName: classObj.department.name
      }
    });
  } catch (err) {
    console.error("registerTeacher error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listStudents(req, res) {
  try {
    const filter = { role: "student", isDeleted: { $ne: true } };
    if (req.query.department) {
      filter.department = req.query.department;
    }
    if (req.query.class) {
      filter.class = req.query.class;
    }
    console.log("listStudents API - filter:", filter);
    console.log("listStudents API - user role:", req.user?.role);
    const items = await User.find(filter).select("-password").populate("department class");
    console.log("listStudents API - found students:", items.length);
    res.json(items);
  } catch (err) {
    console.error("listStudents error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function updateStudent(req, res) {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    const { name, email, studentId, phone, department, class: classId } = req.body || {};

    // Find the student
    const student = await User.findById(id);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (student.role !== "student") {
      return res.status(400).json({ error: "User is not a student" });
    }

    // Check for email uniqueness (if email is being changed)
    if (email && email !== student.email) {
      const normalizedNewEmail = String(email).trim().toLowerCase();
      const existingEmail = await User.findOne({ email: normalizedNewEmail, _id: { $ne: id } });
      if (existingEmail) {
        return res.status(409).json({ error: "Email already in use by another user" });
      }
      student.email = normalizedNewEmail;
    }

    // Check for studentId uniqueness (if studentId is being changed)
    if (studentId && studentId !== student.studentId) {
      const normalizedStudentId = String(studentId).trim();
      const existingStudentId = await User.findOne({ studentId: normalizedStudentId, _id: { $ne: id } });
      if (existingStudentId) {
        return res.status(409).json({ error: "Student ID already in use by another student" });
      }
      student.studentId = normalizedStudentId;
    }

    // Update other fields
    if (name !== undefined) student.name = String(name).trim();
    if (phone !== undefined) student.phone = phone ? String(phone).trim() : "";
    if (department !== undefined) student.department = department || undefined;
    if (classId !== undefined) student.class = classId || undefined;

    await student.save();

    const { password: _p, ...safeStudent } = student.toObject();
    const populatedStudent = await User.findById(id).select("-password").populate("department class");

    res.json(populatedStudent);
  } catch (err) {
    console.error("updateStudent error:", err);
    if (err?.name === "ValidationError") {
      const messages = Object.values(err.errors || {}).map((e) => e.message);
      const msg = messages[0] || "Invalid data";
      return res.status(400).json({ error: msg });
    }
    res.status(500).json({ error: "Server error updating student" });
  }
}

export async function listDepartments(req, res) {
  try {
    const items = await Department.find().populate('hod', 'name email');
    res.json(items);
  } catch (err) {
    console.error("listDepartments error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function createDepartment(req, res) {
  try {
    const { name, hod, hodEmail, hodPassword, hodPhone } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: getValidationMessage('name', 'required') });
    
    let hodId = null;
    let createdHod = null;
    
    // Option 1: Create new HOD with email/password (takes priority)
    if (hodEmail && hodPassword) {
      // Validate password
      const passwordValidation = validatePassword(hodPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ error: passwordValidation.error });
      }
      
      // Check if HOD with this email already exists
      const existingHod = await User.findOne({ email: hodEmail.toLowerCase().trim() });
      if (existingHod) {
        return res.status(400).json({ error: getMessage('error', 'USER_ALREADY_EXISTS') });
      }
      
      // Create new HOD user
      createdHod = new User({
        name: hod || `HOD of ${name}`,
        email: hodEmail.toLowerCase().trim(),
        password: hodPassword,
        phone: hodPhone || '',
        role: 'hod'
      });
      
      await createdHod.save();
      hodId = createdHod._id;
    }
    // Option 2: Use existing HOD by ID (only if not creating new HOD)
    else if (hod) {
      if (!mongoose.Types.ObjectId.isValid(hod)) {
        return res.status(400).json({ error: getMessage('error', 'INVALID_REQUEST') });
      }
      // Verify HOD exists and has hod role
      const hodUser = await User.findById(hod);
      if (!hodUser || hodUser.role !== 'hod') {
        return res.status(400).json({ error: getMessage('error', 'INVALID_USER_ROLE') });
      }
      hodId = hod;
    }
    
    // Create department
    const department = await Department.create({ 
      name: String(name).trim(), 
      hod: hodId 
    });
    
    // If we created a new HOD, update their department fields
    if (createdHod) {
      createdHod.department = department._id;        // Where HOD was registered
      createdHod.assignedDepartment = department._id; // Where HOD is assigned
      await createdHod.save();
    }
    
    // Populate and return response
    const populatedDepartment = await Department.findById(department._id)
      .populate('hod', 'name email');
    
    res.status(201).json({
      department: populatedDepartment,
      hod: createdHod ? {
        id: createdHod._id,
        name: createdHod.name,
        email: createdHod.email,
        role: createdHod.role
      } : null
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: getMessage('error', 'DEPARTMENT_ALREADY_EXISTS') });
    console.error("createDepartment error:", err);
    res.status(500).json({ error: getMessage('error', 'SERVER_ERROR') });
  }
}

export async function getDepartment(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const d = await Department.findById(req.params.id).populate('hod');
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
    const items = await ClassModel.find(filter)
      .populate("department")
      .populate("classTeacher", "name email");
    res.json(items);
  } catch (err) {
    console.error("listClasses error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listAvailableClasses(req, res) {
  try {
    const filter = req.query.department ? { department: req.query.department } : {};
    // Only return classes that don't have a classTeacher assigned
    const items = await ClassModel.find({ ...filter, classTeacher: { $exists: false } })
      .populate("department");
    res.json(items);
  } catch (err) {
    console.error("listAvailableClasses error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function createClass(req, res) {
  try {
    const { name, department, year, teacher, teacherEmail, teacherPassword, teacherPhone } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Class name is required" });
    if (!department) return res.status(400).json({ error: "Department is required" });
    
    // Validate department ObjectId
    if (!mongoose.Types.ObjectId.isValid(department)) {
      return res.status(400).json({ error: "Invalid department ID format" });
    }
    
    // Verify department exists
    const departmentObj = await Department.findById(department);
    if (!departmentObj) {
      return res.status(404).json({ error: "Department not found" });
    }
    
    let teacherId = null;
    let createdTeacher = null;
    
    // Option 1: Create new teacher with email/password (takes priority)
    if (teacherEmail && teacherPassword) {
      // Check if teacher with this email already exists
      const existingTeacher = await User.findOne({ email: teacherEmail.toLowerCase().trim() });
      if (existingTeacher) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      // Send registration email to teacher BEFORE saving (so we have the plain password)
      try {
        await sendRegistrationEmail(teacherEmail.toLowerCase().trim(), String(teacherName).trim(), teacherPassword, 'teacher');
        console.log(`Registration email sent to teacher: ${teacherEmail.toLowerCase().trim()}`);
      } catch (emailError) {
        console.error(`Failed to send registration email to teacher ${teacherEmail.toLowerCase().trim()}:`, emailError);
        // Continue even if email fails
      }
      
      createdTeacher = await User.create({
        name: String(teacherName).trim(),
        email: teacherEmail.toLowerCase().trim(),
        password: teacherPassword,
        phone: teacherPhone || '',
        role: 'teacher',
        assignedDepartment: department
      });
      
      teacherId = createdTeacher._id;
    }
    // Option 2: Use existing teacher by ID (only if not creating new teacher)
    else if (teacher) {
      if (!mongoose.Types.ObjectId.isValid(teacher)) {
        return res.status(400).json({ error: "Invalid teacher ID format" });
      }
      // Verify teacher exists and has teacher role
      const teacherUser = await User.findById(teacher);
      if (!teacherUser || teacherUser.role !== 'teacher') {
        return res.status(400).json({ error: "Invalid teacher user" });
      }
      teacherId = teacher;
    }
    
    // Create class
    const classObj = await ClassModel.create({
      name: String(name).trim(),
      department: department,
      year: year ? String(year).trim() : undefined,
      classTeacher: teacherId
    });
    
    // If we created a new teacher, update their assignedClass
    if (createdTeacher) {
      createdTeacher.assignedClass = classObj._id;
      await createdTeacher.save();
    }
    
    // Populate and return response
    const populatedClass = await ClassModel.findById(classObj._id)
      .populate('department', 'name')
      .populate('classTeacher', 'name email');
    
    res.status(201).json({
      class: populatedClass,
      teacher: createdTeacher ? {
        id: createdTeacher._id,
        name: createdTeacher.name,
        email: createdTeacher.email,
        role: createdTeacher.role
      } : null
    });
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
    const filter = {};
    
    // For HOD routes, show both global notices and their department notices
    if (req.user.role === 'hod') {
      const departmentId = req.user.department || req.user.assignedDepartment;
      console.log("HOD Notices API - Filtering for department:", departmentId);
      
      filter.$or = [
        // Global notices that HODs can see
        { audience: "all" },
        { audience: "student" },
        { audience: "students" },
        { audience: "admins" },
        // Department-specific notices for their department
        { 
          audience: "department_students",
          targetDepartment: departmentId
        }
      ];
      console.log("HOD notice filter:", filter);
    }
    // For Teacher routes, show global notices, department notices, and their class notices
    else if (req.user.role === 'teacher') {
      const classId = req.user.assignedClass;
      console.log("Teacher Notices API - Filtering for class:", classId);
      
      // Get teacher's department (from their assigned class)
      const Class = (await import('../models/Class.js')).default;
      const teacherClass = await Class.findById(classId).populate('department');
      const departmentId = teacherClass?.department?._id || teacherClass?.department;
      
      console.log("Teacher department:", departmentId);
      
      filter.$or = [
        // Global notices that Teachers can see
        { audience: "all" },
        { audience: "student" },
        { audience: "students" },
        { audience: "admins" },
        // Department-specific notices for their department
        { 
          audience: "department_students",
          targetDepartment: departmentId
        },
        // Class-specific notices for their class
        { 
          audience: "class_students",
          targetClass: classId
        }
      ];
      console.log("Teacher notice filter:", filter);
    }
    // For admin routes, exclude department-specific notices (only show global notices)
    else if (req.user.role === 'admin') {
      filter.$or = [
        { audience: "all" },
        { audience: "student" },
        { audience: "students" },
        { audience: "admins" }
      ];
      // Exclude department_students and class_students audience from admin view
      filter.audience = { $nin: ["department_students", "class_students"] };
      console.log("Admin view - excluding department and class-specific notices");
    }
    
    // If department query parameter is provided (for admin filtering), also apply it
    if (req.query.department && req.user.role === 'admin') {
      filter.department = req.query.department;
      console.log("Filtering notices by department:", req.query.department);
    }
    
    const items = await Notice.find(filter).sort({ createdAt: -1 });
    console.log(`Found ${items.length} notices with filter:`, filter);
    res.json(items);
  } catch (err) {
    console.error("listNotices error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listNoticesForStudent(req, res) {
  try {
    const student = req.user;
    console.log("Fetching notices for student:", student.email, "department:", student.department, "class:", student.class);
    console.log("Student full data:", JSON.stringify(student, null, 2));
    
    const filter = {
      $or: [
        // Global notices for all students
        { audience: "all" },
        { audience: "student" },
        { audience: "students" },
        // Department-specific notices for this student's department
        { 
          audience: "department_students",
          targetDepartment: student.department
        },
        // Class-specific notices for this student's class
        { 
          audience: "class_students",
          targetClass: student.class
        }
      ]
    };
    
    console.log("Student notice filter:", JSON.stringify(filter, null, 2));
    
    // Exclude notices from other departments and classes (unless they are global)
    const items = await Notice.find(filter).sort({ createdAt: -1 });
    console.log(`Found ${items.length} notices for student ${student.email} in department ${student.department}, class ${student.class}`);
    
    // Log each notice found
    items.forEach((notice, index) => {
      console.log(`Notice ${index + 1}:`, {
        title: notice.title,
        audience: notice.audience,
        targetClass: notice.targetClass,
        targetDepartment: notice.targetDepartment
      });
    });
    
    res.json(items);
  } catch (err) {
    console.error("listNoticesForStudent error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function createNotice(req, res) {
  try {
    const { title, body, audience, attachment } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "Notice title is required" });
    
    // For HOD routes, set audience to department_students and assign targetDepartment
    let noticeData = {
      title: String(title).trim(),
      body: body ? String(body).trim() : "",
      audience: "all", // Default for admin
      attachment: attachment || undefined,
    };
    
    // Add department if user is HOD and has department access
    if (req.user.role === 'hod' && (req.user.department || req.user.assignedDepartment)) {
      const departmentId = req.user.department || req.user.assignedDepartment;
      noticeData = {
        title: String(title).trim(),
        body: body ? String(body).trim() : "",
        audience: "department_students", // HOD notices are only for department students
        attachment: attachment || undefined,
        department: departmentId,
        targetDepartment: departmentId, // Explicitly set target department
        createdBy: req.user._id,
      };
      console.log("Creating HOD notice for department:", departmentId);
    }
    // Add class if user is Teacher and has class access
    else if (req.user.role === 'teacher' && req.user.assignedClass) {
      const classId = req.user.assignedClass;
      console.log("Teacher creating notice - User ID:", req.user._id, "Assigned Class:", classId);
      console.log("Teacher user data:", JSON.stringify(req.user, null, 2));
      
      noticeData = {
        title: String(title).trim(),
        body: body ? String(body).trim() : "",
        audience: "class_students", // Teacher notices are only for class students
        attachment: attachment || undefined,
        class: classId,
        targetClass: classId, // Explicitly set target class
        createdBy: req.user._id,
      };
      console.log("Creating Teacher notice for class:", classId, "with data:", noticeData);
    } else if (req.user.role === 'teacher') {
      console.log("Teacher without assigned class trying to create notice:", req.user._id);
      return res.status(403).json({ error: "Teacher must be assigned to a class to create notices" });
    }
    
    const n = await Notice.create(noticeData);
    console.log("Notice created:", n);
    res.status(201).json(n);
  } catch (err) {
    console.error("createNotice error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function listElections(req, res) {
  try {
    const filter = {};
    
    // According to requirements: each role sees only their specific level elections
    if (req.user.role === 'hod') {
      // HODs only see department-level elections for their department
      const departmentId = req.user.department || req.user.assignedDepartment;
      console.log("HOD Elections API - Filtering for department:", departmentId);
      
      filter.level = "department";
      filter.department = departmentId;
      console.log("HOD election filter:", filter);
    }
    else if (req.user.role === 'teacher') {
      // Teachers only see class-level elections for their class
      const classId = req.user.assignedClass;
      console.log("Teacher Elections API - Filtering for class:", classId);
      console.log("Teacher user data:", {
        _id: req.user._id,
        email: req.user.email,
        assignedClass: req.user.assignedClass,
        assignedClassType: typeof req.user.assignedClass
      });
      
      if (classId) {
        filter.level = "class";
        filter.class = classId;
      } else {
        console.log("Teacher has no assigned class - returning empty filter");
        filter.level = "class";
        filter.class = null; // This will return no results
      }
      console.log("Teacher election filter:", filter);
    }
    else if (req.user.role === 'admin') {
      // Admins see all college-level (global) elections only
      console.log("Admin view - showing college-level elections only");
      filter.level = "global";
    }
    
    const elections = await Election.find(filter)
      .sort({ createdAt: -1 })
      .populate("department class");

    const items = await Promise.all(
      elections.map(async (e) => {
        const candidates = await Candidate.find({ election: e._id })
          .populate("student", "name email studentId");
        
        return {
          ...e.toObject(),
          candidates: candidates,
          candidateCount: candidates.length,
        };
      })
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

    let normalizedLevel = level;
    let deptRef;
    let classRef;

    // Set level and validate based on user role according to requirements
    if (req.user.role === 'teacher') {
      // Teachers can only create class-level elections for their assigned class
      normalizedLevel = "class";
      classRef = req.user.assignedClass;
      console.log("Teacher creating class-level election for class:", classRef);
    } else if (req.user.role === 'hod') {
      // HODs can only create department-level elections for their department
      normalizedLevel = "department";
      deptRef = req.user.department || req.user.assignedDepartment;
      console.log("HOD creating department-level election for department:", deptRef);
    } else if (req.user.role === 'admin') {
      // Admins can only create college-level (global) elections
      normalizedLevel = "global";
      console.log("Admin creating college-level election");
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

export async function updateElection(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid election ID" });

    const election = await Election.findById(id);
    if (!election) return res.status(404).json({ error: "Election not found" });

    const { title, description, startDate, endDate } = req.body || {};

    // Update fields if provided
    if (title !== undefined) election.title = String(title).trim();
    if (description !== undefined) election.description = description ? String(description).trim() : "";
    if (startDate !== undefined) election.startDate = startDate ? new Date(startDate) : undefined;
    if (endDate !== undefined) election.endDate = endDate ? new Date(endDate) : undefined;

    await election.save();
    res.json(election);
  } catch (err) {
    console.error("updateElection error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function addCandidate(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid election ID" });

    const election = await Election.findById(id);
    if (!election) return res.status(404).json({ error: "Election not found" });

    // Access control for teachers
    if (req.user.role === 'teacher') {
      // Teachers can only add candidates to their class's elections
      if (election.level === "class" && election.class.toString() !== req.user.assignedClass.toString()) {
        return res.status(403).json({ error: "Access denied. You can only add candidates to your class's elections." });
      }
      // Teachers cannot add candidates to department or global elections
      if (election.level !== "class") {
        return res.status(403).json({ error: "Teachers can only add candidates to class-level elections." });
      }
    }

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
    console.error("addCandidate error:", err);
    if (err?.code === 11000) {
      return res.status(409).json({ error: "This student is already registered as a candidate for this election" });
    }
    res.status(500).json({ error: "Server error" });
  }
}

export async function deleteCandidate(req, res) {
  try {
    const { id, candidateId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid election ID" });
    if (!mongoose.Types.ObjectId.isValid(candidateId)) return res.status(400).json({ error: "Invalid candidate ID" });

    const election = await Election.findById(id);
    if (!election) return res.status(404).json({ error: "Election not found" });

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    // Verify candidate belongs to this election
    if (candidate.election.toString() !== id) {
      return res.status(400).json({ error: "Candidate does not belong to this election" });
    }

    await Candidate.findByIdAndDelete(candidateId);
    res.json({ message: "Candidate removed successfully" });
  } catch (err) {
    console.error("deleteCandidate error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function deleteElection(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid election ID" });

    const election = await Election.findById(id);
    if (!election) return res.status(404).json({ error: "Election not found" });

    // Check if user has permission to delete this election
    if (req.user.role === 'teacher') {
      // Teachers can only delete their own class elections
      if (!election.class || election.class.toString() !== req.user.assignedClass.toString()) {
        return res.status(403).json({ error: "You can only delete elections for your assigned class" });
      }
    } else if (req.user.role === 'hod') {
      // HODs can only delete their own department elections
      if (!election.department || election.department.toString() !== (req.user.department || req.user.assignedDepartment).toString()) {
        return res.status(403).json({ error: "You can only delete elections for your assigned department" });
      }
    }
    // Admins can delete any election

    // Check if election has already started or has votes
    if (election.startDate && new Date(election.startDate) <= new Date()) {
      return res.status(400).json({ error: "Cannot delete election that has already started" });
    }

    // Check if election has candidates with votes
    const candidates = await Candidate.find({ election: id });
    const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
    if (totalVotes > 0) {
      return res.status(400).json({ error: "Cannot delete election that already has votes" });
    }

    await Election.findByIdAndDelete(id);
    res.json({ message: "Election deleted successfully" });
  } catch (err) {
    console.error("deleteElection error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function electionResults(req, res) {
  try {
    const { electionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(electionId)) return res.status(400).json({ error: "Invalid election ID" });

    const election = await Election.findById(electionId).populate("department class");
    if (!election) return res.status(404).json({ error: "Election not found" });

    // Access control based on user role
    if (req.user.role === 'teacher') {
      // Teachers can only view results for their class's elections or global elections
      if (election.level === "class" && election.class._id.toString() !== req.user.assignedClass.toString()) {
        return res.status(403).json({ error: "Access denied. You can only view results for your class's elections." });
      }
    } else if (req.user.role === 'hod') {
      // HODs can only view results for their department's elections or global elections
      if (election.level === "department" && election.department._id.toString() !== (req.user.department || req.user.assignedDepartment).toString()) {
        return res.status(403).json({ error: "Access denied. You can only view results for your department's elections." });
      }
    }

    const candidates = await Candidate.find({ election: electionId })
      .sort({ votes: -1 })
      .populate("student", "name email studentId department class");

    let winner = null;
    let isDraw = false;
    let tiedCandidates = [];

    if (candidates.length > 0) {
      const topVotes = candidates[0].votes;
      
      // Check if there's a tie for first place
      const topCandidates = candidates.filter(candidate => candidate.votes === topVotes);
      
      if (topCandidates.length > 1 && topVotes > 0) {
        // It's a draw
        isDraw = true;
        tiedCandidates = topCandidates;
        winner = null;
      } else if (topVotes > 0) {
        // Clear winner
        winner = candidates[0];
        isDraw = false;
      }
    }

    // Calculate voting statistics
    let totalVotes = 0;
    let studentsWhoVoted = 0;
    let studentsWhoDidNotVote = 0;

    console.log("Calculating voting stats for election:", electionId);
    console.log("Election level:", election.level);

    if (election.level === "global") {
      // For global elections, count all students
      const allStudents = await User.countDocuments({ role: "student", isDeleted: { $ne: true } });
      const studentsWithVotes = await User.countDocuments({ 
        role: "student", 
        isDeleted: { $ne: true },
        votedElections: { $in: [new mongoose.Types.ObjectId(electionId)] }
      });
      
      totalVotes = allStudents; // Total eligible students, not just votes received
      studentsWhoVoted = studentsWithVotes;
      studentsWhoDidNotVote = allStudents - studentsWithVotes;
      
      console.log("Global election stats:", { allStudents, studentsWithVotes, totalVotes });
    } else if (election.level === "department") {
      // For department elections, count students in that department
      const allStudents = await User.countDocuments({ 
        role: "student", 
        isDeleted: { $ne: true },
        $or: [
          { department: election.department._id },
          { assignedDepartment: election.department._id }
        ]
      });
      const studentsWithVotes = await User.countDocuments({ 
        role: "student",
        isDeleted: { $ne: true },
        $or: [
          { department: election.department._id },
          { assignedDepartment: election.department._id }
        ],
        votedElections: { $in: [new mongoose.Types.ObjectId(electionId)] }
      });
      
      totalVotes = allStudents; // Total eligible students, not just votes received
      studentsWhoVoted = studentsWithVotes;
      studentsWhoDidNotVote = allStudents - studentsWithVotes;
      
      console.log("Department election stats:", { allStudents, studentsWithVotes, totalVotes, deptId: election.department._id });
    } else if (election.level === "class") {
      // For class elections, count students in that class
      const allStudents = await User.countDocuments({ 
        role: "student", 
        isDeleted: { $ne: true },
        $or: [
          { class: election.class._id },
          { assignedClass: election.class._id }
        ]
      });
      const studentsWithVotes = await User.countDocuments({ 
        role: "student",
        isDeleted: { $ne: true },
        $or: [
          { class: election.class._id },
          { assignedClass: election.class._id }
        ],
        votedElections: { $in: [new mongoose.Types.ObjectId(electionId)] }
      });
      
      totalVotes = allStudents; // Total eligible students, not just votes received
      studentsWhoVoted = studentsWithVotes;
      studentsWhoDidNotVote = allStudents - studentsWithVotes;
      
      console.log("Class election stats:", { allStudents, studentsWithVotes, totalVotes, classId: election.class._id });
    }

    res.json({ 
      election, 
      candidates, 
      winner, 
      isDraw, 
      tiedCandidates,
      votingStats: {
        totalVotes,
        studentsWhoVoted,
        studentsWhoDidNotVote
      },
      message: isDraw ? "Election resulted in a draw - no winner declared" : winner ? "Winner declared" : "No votes cast"
    });
  } catch (err) {
    console.error("electionResults error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getDashboardStats(req, res) {
  try {
    console.log("Getting dashboard stats...");
    const now = new Date();
    const [deptCount, studentCount, allElections] = await Promise.all([
      Department.countDocuments(),
      User.countDocuments({ role: "student", isDeleted: { $ne: true } }),
      Election.find(),
    ]);
    const activeElections = allElections.filter(
      (e) =>
        (!e.startDate || new Date(e.startDate) <= now) &&
        (!e.endDate || new Date(e.endDate) >= now)
    ).length;
    
    console.log("Stats calculated:", { deptCount, studentCount, activeElections });
    res.json({ deptCount, studentCount, activeElections });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function updateDepartment(req, res) {
  try {
    const { id } = req.params;
    const { name, hodEmail, hodPassword, hodPhone, hodName, removeHod } = req.body || {};
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid department ID" });
    }

    // Check if department exists
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    let hodId = department.hod; // Keep existing HOD by default
    let createdHod = null;

    // Update department name if provided
    if (name && String(name).trim()) {
      department.name = String(name).trim();
    }

    // Handle HOD removal
    if (removeHod === true && department.hod) {
      // Get HOD info before deletion for email
      const hodToRemove = await User.findById(department.hod);
      
      // Remove HOD reference from department
      await User.updateMany(
        { _id: department.hod },
        { $unset: { department: 1, assignedDepartment: 1 } }
      );
      
      // Delete the HOD user account
      await User.findByIdAndDelete(department.hod);
      
      // Send deletion email to removed HOD
      if (hodToRemove) {
        try {
          await sendAccountDeletionEmail(
            hodToRemove.email, 
            hodToRemove.name, 
            'hod', 
            `${req.user.role} (${req.user.name})`
          );
          console.log(`Deletion email sent to removed HOD: ${hodToRemove.email}`);
        } catch (emailError) {
          console.error(`Failed to send deletion email to HOD ${hodToRemove.email}:`, emailError);
        }
      }
      
      hodId = null;
      console.log("Removed HOD from department and deleted HOD account");
    }
    // Handle HOD updates/registration
    else if (hodEmail && hodPassword) {
      // Create new HOD with email/password
      const passwordValidation = validatePassword(hodPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ error: `HOD password: ${passwordValidation.error}` });
      }
      
      // Check if HOD with this email already exists
      const existingHod = await User.findOne({ email: hodEmail.toLowerCase().trim() });
      if (existingHod) {
        return res.status(400).json({ error: "HOD with this email already exists" });
      }
      
      // Create new HOD user
      createdHod = new User({
        name: hodName || `HOD of ${department.name}`,
        email: hodEmail.toLowerCase().trim(),
        password: hodPassword,
        phone: hodPhone || '',
        role: 'hod',
        department: department._id,
        assignedDepartment: department._id
      });
      
      // Send registration email to new HOD BEFORE saving (so we have the plain password)
      try {
        await sendRegistrationEmail(createdHod.email, createdHod.name, hodPassword, 'hod');
        console.log(`Registration email sent to new HOD: ${createdHod.email}`);
      } catch (emailError) {
        console.error(`Failed to send registration email to HOD ${createdHod.email}:`, emailError);
      }
      
      await createdHod.save();
      hodId = createdHod._id;
      
      // Update old HOD to remove department references
      if (department.hod) {
        await User.updateMany(
          { _id: department.hod },
          { $unset: { department: 1, assignedDepartment: 1 } }
        );
      }
    } else if (hodEmail && !hodPassword) {
      return res.status(400).json({ error: "HOD password is required when updating HOD email" });
    }

    // Update department HOD reference
    department.hod = hodId;
    await department.save();

    // Populate and return response
    const populatedDepartment = await Department.findById(department._id)
      .populate('hod', 'name email');
    
    res.json({
      department: populatedDepartment,
      hod: createdHod ? {
        id: createdHod._id,
        name: createdHod.name,
        email: createdHod.email,
        role: createdHod.role
      } : null
    });
  } catch (err) {
    console.error("updateDepartment error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ error: "Department name already exists" });
    }
    res.status(500).json({ error: "Server error updating department" });
  }
}

export async function deleteDepartment(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid department ID" });
    }

    console.log("Deleting department:", id);

    // Check if department exists
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Find all classes in this department
    const classesInDepartment = await ClassModel.find({ department: id });
    console.log(`Found ${classesInDepartment.length} classes in department`);
    
    const classIds = classesInDepartment.map(c => c._id);

    // Find all users in this department before deletion
    const studentsInDept = await User.find({ 
      role: "student",
      class: { $in: classIds }
    });
    
    const teachersInDept = await User.find({ 
      role: "teacher",
      $or: [{ department: id }, { assignedDepartment: id }]
    });
    
    const hodsInDept = await User.find({ 
      role: "hod",
      $or: [{ department: id }, { assignedDepartment: id }]
    });

    // Delete all students in these classes
    const deletedStudents = await User.deleteMany({ 
      role: "student",
      class: { $in: classIds }
    });
    console.log(`Deleted ${deletedStudents.deletedCount} students in department classes`);

    // Remove students from any candidates
    await Candidate.deleteMany({ student: { $in: classIds } });

    // Delete all classes in this department
    const deletedClasses = await ClassModel.deleteMany({ department: id });
    console.log(`Deleted ${deletedClasses.deletedCount} classes in department`);

    // Update any remaining students to remove department reference
    await User.updateMany(
      { department: id },
      { $unset: { department: 1 } }
    );
    console.log("Updated remaining students to remove department reference");

    // Find and delete all teachers assigned to this department
    const deletedTeachers = await User.deleteMany({ 
      role: "teacher",
      $or: [{ department: id }, { assignedDepartment: id }]
    });
    console.log(`Deleted ${deletedTeachers.deletedCount} teachers in department`);

    // Find and delete the HOD assigned to this department
    const deletedHod = await User.deleteMany({ 
      role: "hod",
      $or: [{ department: id }, { assignedDepartment: id }]
    });
    console.log(`Deleted ${deletedHod.deletedCount} HODs in department`);

    // Send deletion notification emails
    const deletedBy = `${req.user.role} (${req.user.name})`;
    
    // Send to deleted students
    for (const student of studentsInDept) {
      try {
        await sendAccountDeletionEmail(student.email, student.name, 'student', deletedBy);
        console.log(`Deletion email sent to student: ${student.email}`);
      } catch (emailError) {
        console.error(`Failed to send deletion email to student ${student.email}:`, emailError);
      }
    }
    
    // Send to deleted teachers
    for (const teacher of teachersInDept) {
      try {
        await sendAccountDeletionEmail(teacher.email, teacher.name, 'teacher', deletedBy);
        console.log(`Deletion email sent to teacher: ${teacher.email}`);
      } catch (emailError) {
        console.error(`Failed to send deletion email to teacher ${teacher.email}:`, emailError);
      }
    }
    
    // Send to deleted HODs
    for (const hod of hodsInDept) {
      try {
        await sendAccountDeletionEmail(hod.email, hod.name, 'hod', deletedBy);
        console.log(`Deletion email sent to HOD: ${hod.email}`);
      } catch (emailError) {
        console.error(`Failed to send deletion email to HOD ${hod.email}:`, emailError);
      }
    }

    // Delete the department
    await Department.findByIdAndDelete(id);
    console.log("Department deleted successfully:", id);

    res.json({ 
      message: "Department deleted successfully",
      deletedClasses: deletedClasses.deletedCount,
      deletedStudents: deletedStudents.deletedCount,
      deletedTeachers: deletedTeachers.deletedCount,
      deletedHod: deletedHod.deletedCount
    });
  } catch (err) {
    console.error("deleteDepartment error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function updateClass(req, res) {
  try {
    const { id } = req.params;
    const { name, year, teacherEmail, teacherPassword, teacherPhone, teacherName, removeTeacher } = req.body || {};
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid class ID" });
    }

    // Check if class exists
    const classObj = await ClassModel.findById(id).populate('department');
    if (!classObj) {
      return res.status(404).json({ error: "Class not found" });
    }

    let teacherId = classObj.classTeacher; // Keep existing teacher by default
    let createdTeacher = null;

    // Update class name if provided
    if (name && String(name).trim()) {
      classObj.name = String(name).trim();
    }

    // Update year if provided
    if (year !== undefined) {
      classObj.year = year ? String(year).trim() : undefined;
    }

    // Handle teacher removal
    if (removeTeacher === true && classObj.classTeacher) {
      // Get teacher info before deletion for email
      const teacherToRemove = await User.findById(classObj.classTeacher);
      
      // Delete the teacher account from database
      await User.findByIdAndDelete(classObj.classTeacher);
      
      // Send deletion email to removed teacher
      if (teacherToRemove) {
        try {
          await sendAccountDeletionEmail(
            teacherToRemove.email, 
            teacherToRemove.name, 
            'teacher', 
            `${req.user.role} (${req.user.name})`
          );
          console.log(`Deletion email sent to removed teacher: ${teacherToRemove.email}`);
        } catch (emailError) {
          console.error(`Failed to send deletion email to teacher ${teacherToRemove.email}:`, emailError);
        }
      }
      
      teacherId = null;
      console.log("Removed teacher from class and deleted teacher account from database");
    }
    // Handle teacher updates/registration
    else if (teacherEmail && teacherPassword) {
      // Create new teacher with email/password
      const passwordValidation = validatePassword(teacherPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ error: `Teacher password: ${passwordValidation.error}` });
      }
      
      // Check if teacher with this email already exists
      const existingTeacher = await User.findOne({ email: teacherEmail.toLowerCase().trim() });
      if (existingTeacher) {
        return res.status(400).json({ error: "Teacher with this email already exists" });
      }
      
      // Create new teacher user
      createdTeacher = new User({
        name: teacherName || `Teacher of ${classObj.name}`,
        email: teacherEmail.toLowerCase().trim(),
        password: teacherPassword,
        phone: teacherPhone || '',
        role: 'teacher',
        assignedClass: classObj._id,
        assignedDepartment: classObj.department._id
      });
      
      // Send registration email to teacher BEFORE saving (so we have the plain password)
      try {
        await sendRegistrationEmail(createdTeacher.email, createdTeacher.name, teacherPassword, 'teacher');
        console.log(`Registration email sent to teacher: ${createdTeacher.email}`);
      } catch (emailError) {
        console.error(`Failed to send registration email to teacher ${createdTeacher.email}:`, emailError);
        // Continue even if email fails
      }
      
      await createdTeacher.save();
      teacherId = createdTeacher._id;
      
      // Update old teacher to remove class reference
      if (classObj.classTeacher) {
        await User.updateMany(
          { _id: classObj.classTeacher },
          { $unset: { assignedClass: 1 } }
        );
      }
    } else if (teacherEmail && !teacherPassword) {
      return res.status(400).json({ error: "Teacher password is required when updating teacher email" });
    }

    // Update class teacher reference
    classObj.classTeacher = teacherId;
    await classObj.save();

    // Populate and return response
    const populatedClass = await ClassModel.findById(classObj._id)
      .populate('department', 'name')
      .populate('classTeacher', 'name email');
    
    res.json({
      class: populatedClass,
      teacher: createdTeacher ? {
        id: createdTeacher._id,
        name: createdTeacher.name,
        email: createdTeacher.email,
        role: createdTeacher.role
      } : null
    });
  } catch (err) {
    console.error("updateClass error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ error: "Class name already exists in this department" });
    }
    res.status(500).json({ error: "Server error updating class" });
  }
}

export async function deleteClass(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid class ID" });
    }

    console.log("Deleting class:", id);

    // Check if class exists
    const classItem = await ClassModel.findById(id);
    if (!classItem) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Find all users in this class before deletion
    const studentsInClass = await User.find({ 
      role: "student",
      class: id 
    });
    
    const teachersInClass = await User.find({ 
      role: "teacher",
      assignedClass: id
    });

    // Delete all students in this class (complete deletion from database)
    const deletedStudents = await User.deleteMany({ 
      role: "student",
      class: id 
    });
    console.log(`Deleted ${deletedStudents.deletedCount} students in class`);

    // Remove these students from any candidates
    await Candidate.deleteMany({ student: { $in: deletedStudents.deletedCount > 0 ? id : [] } });

    // Send deletion notification emails
    const deletedBy = `${req.user.role} (${req.user.name})`;
    
    // Send to deleted students
    for (const student of studentsInClass) {
      try {
        await sendAccountDeletionEmail(student.email, student.name, 'student', deletedBy);
        console.log(`Deletion email sent to student: ${student.email}`);
      } catch (emailError) {
        console.error(`Failed to send deletion email to student ${student.email}:`, emailError);
      }
    }
    
    // Send to deleted teachers
    for (const teacher of teachersInClass) {
      try {
        await sendAccountDeletionEmail(teacher.email, teacher.name, 'teacher', deletedBy);
        console.log(`Deletion email sent to teacher: ${teacher.email}`);
      } catch (emailError) {
        console.error(`Failed to send deletion email to teacher ${teacher.email}:`, emailError);
      }
    }

    // Delete the class (teachers are already deleted above via User.deleteMany)
    await ClassModel.findByIdAndDelete(id);
    console.log("Class deleted successfully:", id);

    res.json({ 
      message: "Class deleted successfully",
      deletedStudents: deletedStudents.deletedCount,
      deletedTeacher: teachersInClass.length
    });
  } catch (err) {
    console.error("deleteClass error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

export async function deleteStudent(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    console.log("Deleting student:", id);

    // Check if student exists and is actually a student
    const student = await User.findOne({ _id: id, role: "student" });
    if (!student) {
      console.log(`❌ Student not found with ID: ${id}`);
      return res.status(404).json({ error: "Student not found" });
    }

    console.log(`✅ Found student: ${student.name} (${student.email})`);

    // Remove student from any candidates
    await Candidate.deleteMany({ student: id });
    console.log("Removed student from candidates");

    // Store student info for email before deletion
    const studentInfo = {
      email: student.email,
      name: student.name,
      role: student.role
    };

    // Delete the student
    const deletedStudent = await User.findByIdAndDelete(id);
    console.log(`✅ Student deleted successfully: ${studentInfo.name} (${studentInfo.email})`);
    
    // Send deletion notification email with enhanced logging
    try {
      console.log(`📧 Attempting to send deletion email to: ${studentInfo.email}`);
      
      await sendAccountDeletionEmail(
        studentInfo.email, 
        studentInfo.name, 
        'student', 
        `${req.user.role} (${req.user.name})`
      );
      
      console.log(`✅ Deletion email sent successfully to: ${studentInfo.email}`);
      
      // Log for audit trail
      console.log(`📋 AUDIT LOG: Student ${studentInfo.name} (${studentInfo.email}) deleted by ${req.user.role} (${req.user.name}) at ${new Date().toISOString()}`);
      
    } catch (emailError) {
      console.error(`❌ Failed to send deletion email to student ${studentInfo.email}:`, emailError);
      
      // Enhanced error logging
      console.error(`📋 EMAIL ERROR DETAILS:`, {
        studentEmail: studentInfo.email,
        studentName: studentInfo.name,
        deletedBy: `${req.user.role} (${req.user.name})`,
        error: emailError.message,
        timestamp: new Date().toISOString()
      });
      
      // Continue even if email fails, but log the issue
      console.log(`⚠️ Student deletion completed but email notification failed`);
    }

    res.json({ 
      message: "Student deleted successfully",
      student: {
        name: studentInfo.name,
        email: studentInfo.email,
        deletionEmailSent: true
      }
    });
  } catch (err) {
    console.error("deleteStudent error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// Delete HOD (by admin only)
export async function deleteHOD(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid HOD ID" });
    }

    console.log("Deleting HOD:", id);

    // Check if HOD exists and is actually a HOD
    const hod = await User.findOne({ _id: id, role: "hod" });
    if (!hod) {
      console.log(`❌ HOD not found with ID: ${id}`);
      return res.status(404).json({ error: "HOD not found" });
    }

    console.log(`✅ Found HOD: ${hod.name} (${hod.email})`);

    // Store HOD info for email
    const hodInfo = {
      name: hod.name,
      email: hod.email,
      role: hod.role
    };

    // Remove HOD from department
    if (hod.department) {
      await Department.findByIdAndUpdate(hod.department, { $unset: { hod: 1 } });
    }

    // Delete the HOD
    const deletedHOD = await User.findByIdAndDelete(id);
    console.log(`✅ HOD deleted successfully: ${hodInfo.name} (${hodInfo.email})`);
    
    // Send deletion notification email with enhanced logging
    try {
      console.log(`📧 Attempting to send deletion email to: ${hodInfo.email}`);
      
      await sendAccountDeletionEmail(
        hodInfo.email, 
        hodInfo.name, 
        'hod', 
        `${req.user.role} (${req.user.name})`
      );
      
      console.log(`✅ Deletion email sent successfully to: ${hodInfo.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send deletion email to HOD ${hodInfo.email}:`, emailError);
      console.log(`⚠️ HOD deletion completed but email notification failed`);
    }

    res.json({ 
      message: "HOD deleted successfully",
      hod: {
        name: hodInfo.name,
        email: hodInfo.email,
        deletionEmailSent: true
      }
    });
  } catch (err) {
    console.error("deleteHOD error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// Delete Teacher (by admin only)
export async function deleteTeacher(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid teacher ID" });
    }

    console.log("Deleting teacher:", id);

    // Check if teacher exists and is actually a teacher
    const teacher = await User.findOne({ _id: id, role: "teacher" });
    if (!teacher) {
      console.log(`❌ Teacher not found with ID: ${id}`);
      return res.status(404).json({ error: "Teacher not found" });
    }

    console.log(`✅ Found teacher: ${teacher.name} (${teacher.email})`);

    // Store teacher info for email
    const teacherInfo = {
      name: teacher.name,
      email: teacher.email,
      role: teacher.role
    };

    // Remove teacher from class
    if (teacher.assignedClass) {
      await ClassModel.findByIdAndUpdate(teacher.assignedClass, { $unset: { classTeacher: 1 } });
    }

    // Delete the teacher
    const deletedTeacher = await User.findByIdAndDelete(id);
    console.log(`✅ Teacher deleted successfully: ${teacherInfo.name} (${teacherInfo.email})`);
    
    // Send deletion notification email with enhanced logging
    try {
      console.log(`📧 Attempting to send deletion email to: ${teacherInfo.email}`);
      
      await sendAccountDeletionEmail(
        teacherInfo.email, 
        teacherInfo.name, 
        'teacher', 
        `${req.user.role} (${req.user.name})`
      );
      
      console.log(`✅ Deletion email sent successfully to: ${teacherInfo.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send deletion email to teacher ${teacherInfo.email}:`, emailError);
      console.log(`⚠️ Teacher deletion completed but email notification failed`);
    }

    res.json({ 
      message: "Teacher deleted successfully",
      teacher: {
        name: teacherInfo.name,
        email: teacherInfo.email,
        deletionEmailSent: true
      }
    });
  } catch (err) {
    console.error("deleteTeacher error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
