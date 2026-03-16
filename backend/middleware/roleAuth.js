import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Class from '../models/Class.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Not authorized. Required role: ${roles.join(', ')}` 
      });
    }
    next();
  };
};

export const departmentAccess = async (req, res, next) => {
  try {
    // For HODs, check if they have access to the requested department
    if (req.user.role === 'hod') {
      // For class operations, check if the class belongs to HOD's department
      if (req.params.id && (req.route.path.includes('/classes/:id') || req.route.path.includes('/classes'))) {
        // This is a class operation, verify class belongs to HOD's department
        const classObj = await Class.findById(req.params.id).populate('department');
        
        if (!classObj) {
          return res.status(404).json({ error: 'Class not found' });
        }
        
        if (classObj.department._id.toString() !== req.user.assignedDepartment.toString()) {
          return res.status(403).json({ error: 'Access denied. You can only access classes in your department.' });
        }
      } else {
        // For department operations, check department access
        const requestedDeptId = req.params.departmentId || req.body.departmentId || req.body.department;
        if (requestedDeptId && requestedDeptId !== req.user.assignedDepartment.toString()) {
          return res.status(403).json({ error: 'Access denied. You can only access your assigned department.' });
        }
      }
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const classAccess = async (req, res, next) => {
  try {
    // For Teachers, check if they have access to the requested class
    if (req.user.role === 'teacher') {
      const requestedClassId = req.params.classId || req.params.id || req.body.classId || req.body.class || req.query.class;
      
      // For election operations, check if election belongs to teacher's class
      if (req.route.path.includes('/elections')) {
        if (req.params.id) {
          // This is an election operation, check if election belongs to teacher's class
          const Election = (await import('../models/Election.js')).default;
          const election = await Election.findById(req.params.id);
          
          if (!election) {
            return res.status(404).json({ error: 'Election not found' });
          }
          
          if (election.class && election.class.toString() !== req.user.assignedClass.toString()) {
            return res.status(403).json({ error: 'Access denied. You can only access elections for your assigned class.' });
          }
        } else {
          // This is a class operation, check direct class access
          if (requestedClassId && requestedClassId !== req.user.assignedClass.toString()) {
            return res.status(403).json({ error: 'Access denied. You can only access your assigned class.' });
          }
        }
      } else {
        // For other class operations, check direct class access
        if (requestedClassId && requestedClassId !== req.user.assignedClass.toString()) {
          return res.status(403).json({ error: 'Access denied. You can only access your assigned class.' });
        }
      }
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const studentAccess = async (req, res, next) => {
  try {
    // For Teachers, check if they have access to the requested student
    if (req.user.role === 'teacher') {
      const studentId = req.params.id || req.params.studentId;
      if (studentId) {
        const User = (await import('../models/User.js')).default;
        const student = await User.findById(studentId);
        
        if (!student) {
          return res.status(404).json({ error: 'Student not found' });
        }
        
        if (student.role !== 'student') {
          return res.status(400).json({ error: 'User is not a student' });
        }
        
        if (!student.class || student.class.toString() !== req.user.assignedClass.toString()) {
          return res.status(403).json({ error: 'Access denied. You can only access students from your assigned class.' });
        }
      }
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
