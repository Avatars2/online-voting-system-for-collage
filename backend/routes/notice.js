import express from 'express';
import { protect } from '../middleware/roleAuth.js';
import Notice from '../models/Notice.js';

const router = express.Router();

// Protected list - requires authentication
router.get('/', protect, async (req, res) => {
  try {
    // Only allow authenticated users to see notices
    // Apply basic filtering based on user role
    let filter = {};
    
    if (req.user.role === 'student') {
      // Students see only relevant notices (global + their department + their class)
      filter = {
        $or: [
          // Global notices for all students
          { audience: "all" },
          { audience: "student" },
          { audience: "students" },
          // Department-specific notices for this student's department
          { 
            audience: "department_students",
            targetDepartment: req.user.department
          },
          // Class-specific notices for this student's class
          { 
            audience: "class_students",
            targetClass: req.user.class
          }
        ]
      };
      console.log("Student filter in general notices endpoint:", filter);
    } else if (req.user.role === 'teacher') {
      // Teachers see global notices, department notices, and their class notices
      // Get teacher's department (from their assigned class)
      const Class = (await import('../models/Class.js')).default;
      const teacherClass = await Class.findById(req.user.assignedClass).populate('department');
      const departmentId = teacherClass?.department?._id || teacherClass?.department;
      
      console.log("Teacher department in general notices endpoint:", departmentId);
      
      filter = {
        $or: [
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
            targetClass: req.user.assignedClass
          }
        ]
      };
      console.log("Teacher filter in general notices endpoint:", filter);
    } else if (req.user.role === 'hod') {
      // HODs see global and their department notices
      const departmentId = req.user.department || req.user.assignedDepartment;
      filter = {
        $or: [
          { audience: "all" },
          { audience: "student" },
          { audience: "students" },
          { audience: "department_students", targetDepartment: departmentId }
        ]
      };
    } else if (req.user.role === 'admin') {
      // Admins see only global notices
      filter = {
        $or: [
          { audience: "all" },
          { audience: "student" },
          { audience: "students" },
          { audience: "admins" }
        ]
      };
    }
    
    const notices = await Notice.find(filter).sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    console.error('list notices error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
