import mongoose from 'mongoose';
import ElectionDataProtection from '../utils/electionDataProtection.js';
import { sendAccountDeletionEmail } from './authController.js';

/**
 * Safe User Deletion Controller
 * Replaces direct deletion with election-safe removal
 */

export async function safeDeleteStudent(req, res) {
  try {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    // Check if deletion is safe
    const safetyCheck = await ElectionDataProtection.checkDeletionSafety(id);
    
    if (!safetyCheck.safe) {
      return res.status(409).json({ 
        error: "Cannot delete student",
        reason: safetyCheck.reason,
        details: safetyCheck,
        recommendations: safetyCheck.recommendations
      });
    }

    // Get student info for email before deletion
    const studentInfo = safetyCheck.user;

    // Perform safe deletion
    const result = await ElectionDataProtection.safeUserRemoval(id, {
      deletedBy: `${req.user.role} (${req.user.name})`
    });

    // Send deletion notification email
    try {
      await sendAccountDeletionEmail(
        studentInfo.email, 
        studentInfo.name, 
        'student',
        `${req.user.role} (${req.user.name})`
      );
      console.log(`✅ Deletion email sent to student: ${studentInfo.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send deletion email:`, emailError);
    }

    // Create audit log
    await ElectionDataProtection.createAuditLog({
      userId: id,
      userName: studentInfo.name,
      userEmail: studentInfo.email,
      userRole: studentInfo.role,
      deletedBy: `${req.user.role} (${req.user.name})`,
      preservedData: result.preservedData,
      reason: 'Student account deletion'
    });

    res.json({
      message: "Student deleted successfully while preserving election data",
      preservedData: result.preservedData
    });

  } catch (error) {
    console.error("safeDeleteStudent error:", error);
    res.status(500).json({ 
      error: "Server error during student deletion",
      details: error.message 
    });
  }
}

export async function safeDeleteHOD(req, res) {
  try {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid HOD ID" });
    }

    // Check if deletion is safe
    const safetyCheck = await ElectionDataProtection.checkDeletionSafety(id);
    
    if (!safetyCheck.safe) {
      return res.status(409).json({ 
        error: "Cannot delete HOD",
        reason: safetyCheck.reason,
        details: safetyCheck,
        recommendations: safetyCheck.recommendations
      });
    }

    // Get HOD info for email before deletion
    const hodInfo = safetyCheck.user;

    // Perform safe deletion
    const result = await ElectionDataProtection.safeUserRemoval(id, {
      deletedBy: `${req.user.role} (${req.user.name})`
    });

    // Send deletion notification email
    try {
      await sendAccountDeletionEmail(
        hodInfo.email, 
        hodInfo.name, 
        'hod',
        `${req.user.role} (${req.user.name})`
      );
      console.log(`✅ Deletion email sent to HOD: ${hodInfo.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send deletion email:`, emailError);
    }

    // Create audit log
    await ElectionDataProtection.createAuditLog({
      userId: id,
      userName: hodInfo.name,
      userEmail: hodInfo.email,
      userRole: hodInfo.role,
      deletedBy: `${req.user.role} (${req.user.name})`,
      preservedData: result.preservedData,
      reason: 'HOD account deletion'
    });

    res.json({
      message: "HOD deleted successfully while preserving election data",
      preservedData: result.preservedData
    });

  } catch (error) {
    console.error("safeDeleteHOD error:", error);
    res.status(500).json({ 
      error: "Server error during HOD deletion",
      details: error.message 
    });
  }
}

export async function safeDeleteTeacher(req, res) {
  try {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid teacher ID" });
    }

    // Check if deletion is safe
    const safetyCheck = await ElectionDataProtection.checkDeletionSafety(id);
    
    if (!safetyCheck.safe) {
      return res.status(409).json({ 
        error: "Cannot delete teacher",
        reason: safetyCheck.reason,
        details: safetyCheck,
        recommendations: safetyCheck.recommendations
      });
    }

    // Get teacher info for email before deletion
    const teacherInfo = safetyCheck.user;

    // Perform safe deletion
    const result = await ElectionDataProtection.safeUserRemoval(id, {
      deletedBy: `${req.user.role} (${req.user.name})`
    });

    // Send deletion notification email
    try {
      await sendAccountDeletionEmail(
        teacherInfo.email, 
        teacherInfo.name, 
        'teacher',
        `${req.user.role} (${req.user.name})`
      );
      console.log(`✅ Deletion email sent to teacher: ${teacherInfo.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send deletion email:`, emailError);
    }

    // Create audit log
    await ElectionDataProtection.createAuditLog({
      userId: id,
      userName: teacherInfo.name,
      userEmail: teacherInfo.email,
      userRole: teacherInfo.role,
      deletedBy: `${req.user.role} (${req.user.name})`,
      preservedData: result.preservedData,
      reason: 'Teacher account deletion'
    });

    res.json({
      message: "Teacher deleted successfully while preserving election data",
      preservedData: result.preservedData
    });

  } catch (error) {
    console.error("safeDeleteTeacher error:", error);
    res.status(500).json({ 
      error: "Server error during teacher deletion",
      details: error.message 
    });
  }
}

export async function checkUserDeletionSafety(req, res) {
  try {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const safetyCheck = await ElectionDataProtection.checkDeletionSafety(id);
    
    res.json(safetyCheck);

  } catch (error) {
    console.error("checkUserDeletionSafety error:", error);
    res.status(500).json({ 
      error: "Server error checking deletion safety",
      details: error.message 
    });
  }
}
