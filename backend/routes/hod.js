import express from 'express';
import { protect, authorize, departmentAccess } from '../middleware/roleAuth.js';
import { 
  registerTeacher, 
  getHODDashboard, 
  getAllTeachers,
  registerStudent,
  getStudents
} from '../controllers/hodTeacherController.js';
import * as adminCtrl from '../controllers/adminController.js';
import { verifyToken, updateMe, changePassword } from '../controllers/authController.js';
import Department from '../models/Department.js';

const router = express.Router();

// All routes require HOD role
router.use(protect);
router.use(authorize('hod'));

// HOD Dashboard
router.get('/dashboard', getHODDashboard);

// Get HOD's department info
router.get('/department', async (req, res) => {
  try {
    const hod = req.user;
    
    // Get the department where this HOD was registered (based on email)
    // Use department field first (where registered), fallback to assignedDepartment
    const departmentId = hod.department || hod.assignedDepartment;
    
    console.log("HOD department lookup:");
    console.log("- HOD email:", hod.email);
    console.log("- HOD department (registered):", hod.department);
    console.log("- HOD assignedDepartment:", hod.assignedDepartment);
    console.log("- Using departmentId:", departmentId);
    
    const department = await Department.findById(departmentId).populate('hod', 'name email');
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    console.log("Found department:", department.name);
    res.json([department]); // Return as array for consistency
  } catch (error) {
    console.error("Department API error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Profile Management
router.get('/profile', verifyToken);
router.put('/profile', updateMe);
router.put('/change-password', changePassword);

// Class Management (HOD can create classes in their department)
router.post('/classes', departmentAccess, adminCtrl.createClass);
router.get('/classes', departmentAccess, (req, res, next) => {
  // Automatically filter by HOD's department
  req.query.department = req.user.assignedDepartment;
  next();
}, adminCtrl.listClasses);
router.get('/classes/available', departmentAccess, (req, res, next) => {
  // Automatically filter by HOD's department and only show classes without teachers
  req.query.department = req.user.assignedDepartment;
  next();
}, adminCtrl.listAvailableClasses);
router.put('/classes/:id', departmentAccess, adminCtrl.updateClass);
router.delete('/classes/:id', departmentAccess, adminCtrl.deleteClass);

// Teacher management (HOD can register teachers for their department)
router.post('/register-teacher', departmentAccess, registerTeacher);
router.get('/teachers', getAllTeachers);

// Student Management (HOD can register students for their department)
router.post('/register-student', departmentAccess, registerStudent);
router.get('/students', getStudents);
router.delete('/students/:id', departmentAccess, adminCtrl.deleteStudent);

// Notice Management (HOD can create notices for their department and see global notices)
router.post('/notices', departmentAccess, adminCtrl.createNotice);
router.get('/notices', departmentAccess, adminCtrl.listNotices);

// Election Management (HOD can create elections for their department)
router.post('/elections', departmentAccess, adminCtrl.createElection);
router.put('/elections/:id', departmentAccess, adminCtrl.updateElection);
router.get('/elections', departmentAccess, (req, res, next) => {
  // Automatically filter by HOD's department - try both department fields
  const departmentId = req.user.department || req.user.assignedDepartment;
  console.log("HOD Elections API - Filtering by department:", departmentId);
  console.log("HOD user data:", { 
    department: req.user.department, 
    assignedDepartment: req.user.assignedDepartment,
    email: req.user.email 
  });
  if (departmentId) {
    req.query.department = departmentId;
  }
  next();
}, adminCtrl.listElections);
router.delete('/elections/:id', departmentAccess, adminCtrl.deleteElection);
router.post('/elections/:id/candidates', departmentAccess, adminCtrl.addCandidate);
router.delete('/elections/:id/candidates/:candidateId', departmentAccess, adminCtrl.deleteCandidate);

// Results (HOD can view results for their department elections)
router.get('/results/:electionId', departmentAccess, adminCtrl.electionResults);

export default router;
