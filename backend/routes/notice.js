import express from 'express';
import { protect } from '../middleware/roleAuth.js';
import Notice from '../models/Notice.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for PDF uploads using memory storage for Vercel compatibility
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

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

// PDF upload endpoint
router.post('/upload', protect, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    
    // Convert file to base64 for storage in database
    const base64Data = req.file.buffer.toString('base64');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'pdf-' + uniqueSuffix + '-' + req.file.originalname;
    
    console.log('PDF uploaded successfully:', filename);
    
    res.json({ 
      success: true, 
      filename: filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      base64Data: base64Data // Store base64 data for database storage
    });
  } catch (err) {
    console.error('PDF upload error:', err);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// PDF download endpoint - public access for published notices
router.get('/download/:noticeId', async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.noticeId);
    
    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }
    
    // Handle both legacy attachment and new pdfData
    if (notice.pdfData && notice.pdfData.base64Data) {
      // New format: PDF stored as base64 in database
      const pdfBuffer = Buffer.from(notice.pdfData.base64Data, 'base64');
      res.setHeader('Content-Type', notice.pdfData.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${notice.pdfData.originalName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
      return;
    }
    
    if (notice.attachment) {
      // Legacy format: Check if attachment exists (though this won't work in Vercel)
      return res.status(404).json({ 
        error: 'Legacy PDF format not supported in serverless environment',
        message: 'Please re-upload the PDF to use the new storage format'
      });
    }
    
    // No PDF found
    return res.status(404).json({ error: 'PDF not found for this notice' });
  } catch (err) {
    console.error('PDF download error:', err);
    res.status(500).json({ error: 'Failed to download PDF' });
  }
});

export default router;
