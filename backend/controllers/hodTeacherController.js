import mongoose from 'mongoose';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Class from '../models/Class.js';
import bcrypt from 'bcryptjs';
import emailValidationService from '../services/emailValidationService.js';

// Register HOD (by admin only)
export const registerHOD = async (req, res) => {
  try {
    const { name, email, password, phone, departmentId } = req.body;

    // Enhanced email validation using Google-like validation
    const emailValidation = await emailValidationService.fullValidate(email.trim());
    if (!emailValidation.isValid) {
      return res.status(400).json({ 
        error: emailValidation.message,
        suggestions: emailValidation.suggestions || []
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Verify department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Create HOD
    const hod = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone ? phone.trim() : '',
      role: 'hod',
      department: departmentId,        // Where HOD was registered
      assignedDepartment: departmentId // Where HOD is assigned (same for now)
    });

    await hod.save();

    // Update department with HOD
    department.hod = hod._id;
    await department.save();

    // Send registration email
    try {
      const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
      const { sendRegistrationEmail } = await import('./authController.js');
      await sendRegistrationEmail(normalizedEmail, name.trim(), 'hod', loginLink);
      console.log(`Registration email sent to HOD: ${normalizedEmail}`);
    } catch (emailError) {
      console.error('Failed to send registration email to HOD:', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      message: 'HOD registered successfully',
      hod: {
        id: hod._id,
        name: hod.name,
        email: hod.email,
        role: hod.role,
        department: departmentId,        // Where HOD was registered
        assignedDepartment: departmentId, // Where HOD is assigned
        departmentName: department.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register Teacher (by HOD or admin)
export const registerTeacher = async (req, res) => {
  try {
    const { name, email, password, phone, classId } = req.body;

    // Enhanced email validation using Google-like validation
    const emailValidation = await emailValidationService.fullValidate(email.trim());
    if (!emailValidation.isValid) {
      return res.status(400).json({ 
        error: emailValidation.message,
        suggestions: emailValidation.suggestions || []
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Verify class exists
    const classObj = await Class.findById(classId).populate('department');
    if (!classObj) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Create Teacher
    const teacher = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone ? phone.trim() : '',
      role: 'teacher',
      assignedClass: classId,
      assignedDepartment: classObj.department._id
    });

    await teacher.save();

    // Update class with class teacher
    classObj.classTeacher = teacher._id;
    await classObj.save();

    // Send registration email
    try {
      const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
      const { sendRegistrationEmail } = await import('./authController.js');
      await sendRegistrationEmail(normalizedEmail, name.trim(), 'teacher', loginLink);
      console.log(`Registration email sent to Teacher: ${normalizedEmail}`);
    } catch (emailError) {
      console.error('Failed to send registration email to Teacher:', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      message: 'Teacher registered successfully',
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        class: classObj.name,
        department: classObj.department.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get HOD dashboard data
export const getHODDashboard = async (req, res) => {
  try {
    const hod = req.user;
    
    // Get department details
    const department = await Department.findById(hod.assignedDepartment)
      .populate('hod', 'name email');

    // Get all classes in this department
    const classes = await Class.find({ department: hod.assignedDepartment })
      .populate('classTeacher', 'name email');

    // Get all students in department
    const students = await User.find({ 
      role: 'student',
      department: hod.assignedDepartment 
    }).populate('class', 'name year');

    // Get teachers in department
    const teachers = await User.find({ 
      role: 'teacher',
      assignedDepartment: hod.assignedDepartment 
    }).populate('assignedClass', 'name year');

    res.json({
      department,
      classes,
      students,
      teachers,
      stats: {
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalClasses: classes.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Teacher dashboard data
export const getTeacherDashboard = async (req, res) => {
  try {
    const teacher = req.user;
    
    // Get class details
    const classObj = await Class.findById(teacher.assignedClass)
      .populate('department', 'name')
      .populate('classTeacher', 'name email');

    // Get students in teacher's class
    const students = await User.find({ 
      role: 'student',
      class: teacher.assignedClass 
    });

    res.json({
      class: classObj,
      students,
      stats: {
        totalStudents: students.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all HODs (admin only)
export const getAllHODs = async (req, res) => {
  try {
    const hods = await User.find({ role: 'hod' })
      .populate('assignedDepartment', 'name')
      .select('-password');

    res.json(hods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all Teachers (admin and HOD)
// Register Student (by HOD or Teacher)
export const registerStudent = async (req, res) => {
  try {
    const { name, enrollmentId, email, phone, tempPassword, class: classId } = req.body || {};
    console.log("HOD/Teacher registerStudent API - input:", { name, enrollmentId, email, class: classId, userRole: req.user?.role });
    
    if (!name || !email || !tempPassword) {
      return res.status(400).json({ error: "name, email and tempPassword are required" });
    }

    // Enhanced email validation using Google-like validation
    const emailValidation = await emailValidationService.fullValidate(email.trim());
    if (!emailValidation.isValid) {
      return res.status(400).json({ 
        error: emailValidation.message,
        suggestions: emailValidation.suggestions || []
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Password validation
    if (!tempPassword || tempPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.role === "admin" || existing.is_admin === true) {
        return res.status(409).json({ error: "This email is already used by admin account" });
      }
      return res.status(409).json({ error: "Student with this email already exists" });
    }

    // Check enrollment ID uniqueness
    if (enrollmentId) {
      const existingId = await User.findOne({ studentId: String(enrollmentId).trim() });
      if (existingId) return res.status(409).json({ error: "Enrollment ID already registered" });
    }

    // Get department and class info
    let departmentId, departmentObj;
    if (req.user.role === 'hod') {
      departmentId = req.user.assignedDepartment;
      departmentObj = await Department.findById(departmentId);
    } else if (req.user.role === 'teacher') {
      // Teacher can only register students for their assigned class
      if (!classId || classId !== req.user.assignedClass.toString()) {
        return res.status(403).json({ error: 'Teachers can only register students for their assigned class' });
      }
      const classObj = await Class.findById(classId).populate('department');
      if (!classObj) {
        return res.status(404).json({ error: 'Class not found' });
      }
      departmentId = classObj.department._id;
      departmentObj = classObj.department;
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      studentId: enrollmentId ? String(enrollmentId).trim() : undefined,
      password: tempPassword,
      phone: phone ? String(phone).trim() : undefined,
      department: departmentId,
      class: classId || undefined,
      role: "student",
      is_admin: false,
    });
    
    console.log("HOD/Teacher registerStudent API - created new student:", { _id: user._id, class: user.class, department: user.department });
    const { password: _, ...safe } = user.toObject();

    // Send registration email
    try {
      const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
      const { sendRegistrationEmail } = await import('./authController.js');
      await sendRegistrationEmail(normalizedEmail, String(name).trim(), 'student', loginLink);
      console.log(`Registration email sent to Student: ${normalizedEmail}`);
    } catch (emailError) {
      console.error('Failed to send registration email to Student:', emailError);
      // Continue even if email fails
    }
    
    res.status(201).json({
      message: 'Student registered successfully',
      student: {
        ...safe,
        departmentName: departmentObj?.name,
        className: (await Class.findById(classId))?.name
      }
    });
  } catch (error) {
    console.error("HOD/Teacher registerStudent error:", error);
    if (error?.name === "ValidationError") {
      const messages = Object.values(error.errors || {}).map((e) => e.message);
      const msg = messages[0] || "Invalid data";
      return res.status(400).json({ error: msg });
    }
    if (error?.code === 11000) {
      const pattern = error.keyPattern || {};
      if (pattern.email) {
        return res.status(409).json({ error: "Email already registered" });
      }
      if (pattern.studentId) {
        return res.status(409).json({ error: "Enrollment ID already registered" });
      }
      return res.status(409).json({ error: "Duplicate field value already exists" });
    }
    res.status(500).json({ error: error.message });
  }
};

// Get students list (for HOD and Teacher)
export const getStudents = async (req, res) => {
  try {
    const filter = { role: "student" };
    
    console.log("getStudents API - user:", {
      role: req.user?.role,
      assignedClass: req.user?.assignedClass,
      assignedDepartment: req.user?.assignedDepartment,
      queryClass: req.query.class
    });
    
    if (req.user.role === 'hod') {
      // HOD can see all students in their department
      const departmentId = req.user.assignedDepartment || req.user.department;
      console.log("HOD using department ID:", departmentId);
      console.log("HOD user fields:", {
        assignedDepartment: req.user.assignedDepartment,
        department: req.user.department,
        _id: req.user._id
      });
      
      if (departmentId) {
        filter.department = departmentId;
      } else {
        console.log("HOD has no department assigned, returning all students");
        // If no department assigned, return all students (fallback)
      }
    } else if (req.user.role === 'teacher') {
      // Teacher can only see students in their assigned class
      filter.class = req.user.assignedClass;
      console.log("Teacher using assigned class:", req.user.assignedClass);
    }

    // Additional filters from query params for non-teachers
    if (req.query.department && req.user.role === 'admin') {
      filter.department = req.query.department;
    }
    if (req.query.class && req.user.role !== 'teacher') {
      filter.class = req.query.class;
    }

    console.log("HOD/Teacher getStudents API - filter:", filter);
    
    const items = await User.find(filter)
      .select("-password")
      .populate("department class");
    
    console.log("HOD/Teacher getStudents API - found students:", items.length);
    res.json(items);
  } catch (error) {
    console.error("HOD/Teacher getStudents error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllTeachers = async (req, res) => {
  try {
    let query = { role: 'teacher' };
    
    // If HOD, only show teachers from their department
    if (req.user.role === 'hod') {
      query.assignedDepartment = req.user.assignedDepartment;
    }

    const teachers = await User.find(query)
      .populate('assignedDepartment', 'name')
      .populate('assignedClass', 'name year')
      .select('-password');

    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    // Find the student first
    const student = await User.findById(id);
    
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (student.role !== 'student') {
      return res.status(400).json({ error: "User is not a student" });
    }

    // For teachers, check if the student belongs to their assigned class
    if (req.user.role === 'teacher') {
      if (!student.class || student.class.toString() !== req.user.assignedClass.toString()) {
        return res.status(403).json({ error: "Access denied. You can only delete students from your assigned class." });
      }
    }

    // Delete the student
    await User.findByIdAndDelete(id);
    
    console.log(`Student ${student.name} deleted by ${req.user.role} ${req.user.name}`);
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("deleteStudent error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params; // Election ID
    const { candidateId } = req.params; // Candidate ID
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid election ID" });
    }
    
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ error: "Invalid candidate ID" });
    }

    // Find the election first
    const Election = mongoose.model('Election');
    const election = await Election.findById(id).populate('class');
    
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }

    // For teachers, check if the election belongs to their assigned class
    if (req.user.role === 'teacher') {
      if (!election.class || election.class._id.toString() !== req.user.assignedClass.toString()) {
        return res.status(403).json({ error: "Access denied. You can only delete candidates from elections in your assigned class." });
      }
    }

    // Find and delete the candidate from the Candidate collection
    const Candidate = mongoose.model('Candidate');
    const candidate = await Candidate.findById(candidateId);
    
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Verify candidate belongs to this election
    if (candidate.election.toString() !== id) {
      return res.status(400).json({ error: "Candidate does not belong to this election" });
    }

    await Candidate.findByIdAndDelete(candidateId);
    
    console.log(`Candidate deleted from election ${election.title} by ${req.user.role} ${req.user.name}`);
    res.json({ message: "Candidate deleted successfully" });
  } catch (error) {
    console.error("deleteCandidate error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const addCandidate = async (req, res) => {
  try {
    const { id } = req.params; // Election ID
    const { userId } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid election ID" });
    }
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Find the election first
    const Election = mongoose.model('Election');
    const election = await Election.findById(id).populate('class');
    
    if (!election) {
      return res.status(404).json({ error: "Election not found" });
    }

    // For teachers, check if the election belongs to their assigned class
    if (req.user.role === 'teacher') {
      if (!election.class || election.class._id.toString() !== req.user.assignedClass.toString()) {
        return res.status(403).json({ error: "Access denied. You can only add candidates to elections in your assigned class." });
      }
    }

    // Find the candidate user
    const candidate = await User.findById(userId);
    
    if (!candidate) {
      return res.status(404).json({ error: "Candidate user not found" });
    }

    if (candidate.role !== 'student') {
      return res.status(400).json({ error: "Only students can be added as candidates" });
    }

    // For teachers, check if the candidate belongs to their assigned class
    if (req.user.role === 'teacher') {
      if (!candidate.class || candidate.class.toString() !== req.user.assignedClass.toString()) {
        return res.status(403).json({ error: "Access denied. You can only add students from your assigned class as candidates." });
      }
    }

    // Check if candidate already exists in the Candidate collection
    const Candidate = mongoose.model('Candidate');
    const existingCandidate = await Candidate.findOne({ 
      election: id, 
      student: candidate._id 
    });
    
    if (existingCandidate) {
      return res.status(400).json({ error: "This student is already registered as a candidate for this election" });
    }

    // Create candidate in the Candidate collection (same as admin controller)
    const newCandidate = await Candidate.create({
      election: id,
      student: candidate._id,
      name: candidate.name,
      position: req.body.position || "Candidate",
    });
    
    console.log(`Candidate ${candidate.name} added to election ${election.title} by ${req.user.role} ${req.user.name}`);
    res.status(201).json(newCandidate);
  } catch (error) {
    console.error("addCandidate error:", error);
    if (error?.code === 11000) {
      return res.status(409).json({ error: "This student is already registered as a candidate for this election" });
    }
    res.status(500).json({ error: "Server error" });
  }
};
