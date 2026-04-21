import mongoose from 'mongoose';
import SoftDeleteService from '../utils/softDeleteService.js';
import { sendAccountDeletionEmail } from './authController.js';

/**
 * Soft Delete Controller
 * Implements soft delete with system consistency
 */

export async function softDeleteStudent(req, res) {
  try {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    // Check if soft delete is safe
    const safetyCheck = await SoftDeleteService.checkSoftDeleteSafety(id);
    
    if (!safetyCheck.safe) {
      return res.status(409).json({ 
        error: "Cannot soft delete student",
        reason: safetyCheck.reason,
        details: safetyCheck,
        recommendations: safetyCheck.recommendations
      });
    }

    // Get student info for email before soft deletion
    const studentInfo = safetyCheck.user;

    // Perform soft deletion
    const result = await SoftDeleteService.softDeleteUser(id, {
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
      console.log(`✅ Soft deletion email sent to student: ${studentInfo.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send soft deletion email:`, emailError);
    }

    res.json({
      message: "Student soft deleted successfully - User ID preserved for system consistency",
      userId: result.userId, // User ID still exists
      preservedData: result.preservedData,
      systemIntegrity: "All references maintained"
    });

  } catch (error) {
    console.error("softDeleteStudent error:", error);
    res.status(500).json({ 
      error: "Server error during student soft deletion",
      details: error.message 
    });
  }
}

export async function softDeleteHOD(req, res) {
  try {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid HOD ID" });
    }

    // Check if soft delete is safe
    const safetyCheck = await SoftDeleteService.checkSoftDeleteSafety(id);
    
    if (!safetyCheck.safe) {
      return res.status(409).json({ 
        error: "Cannot soft delete HOD",
        reason: safetyCheck.reason,
        details: safetyCheck,
        recommendations: safetyCheck.recommendations
      });
    }

    // Get HOD info for email before soft deletion
    const hodInfo = safetyCheck.user;

    // Perform soft deletion
    const result = await SoftDeleteService.softDeleteUser(id, {
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
      console.log(`✅ Soft deletion email sent to HOD: ${hodInfo.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send soft deletion email:`, emailError);
    }

    res.json({
      message: "HOD soft deleted successfully - User ID preserved for system consistency",
      userId: result.userId, // User ID still exists
      preservedData: result.preservedData,
      systemIntegrity: "All references maintained"
    });

  } catch (error) {
    console.error("softDeleteHOD error:", error);
    res.status(500).json({ 
      error: "Server error during HOD soft deletion",
      details: error.message 
    });
  }
}

export async function softDeleteTeacher(req, res) {
  try {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid teacher ID" });
    }

    // Check if soft delete is safe
    const safetyCheck = await SoftDeleteService.checkSoftDeleteSafety(id);
    
    if (!safetyCheck.safe) {
      return res.status(409).json({ 
        error: "Cannot soft delete teacher",
        reason: safetyCheck.reason,
        details: safetyCheck,
        recommendations: safetyCheck.recommendations
      });
    }

    // Get teacher info for email before soft deletion
    const teacherInfo = safetyCheck.user;

    // Perform soft deletion
    const result = await SoftDeleteService.softDeleteUser(id, {
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
      console.log(`✅ Soft deletion email sent to teacher: ${teacherInfo.email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send soft deletion email:`, emailError);
    }

    res.json({
      message: "Teacher soft deleted successfully - User ID preserved for system consistency",
      userId: result.userId, // User ID still exists
      preservedData: result.preservedData,
      systemIntegrity: "All references maintained"
    });

  } catch (error) {
    console.error("softDeleteTeacher error:", error);
    res.status(500).json({ 
      error: "Server error during teacher soft deletion",
      details: error.message 
    });
  }
}

export async function checkSoftDeleteSafety(req, res) {
  try {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const safetyCheck = await SoftDeleteService.checkSoftDeleteSafety(id);
    
    res.json(safetyCheck);

  } catch (error) {
    console.error("checkSoftDeleteSafety error:", error);
    res.status(500).json({ 
      error: "Server error checking soft delete safety",
      details: error.message 
    });
  }
}

export async function getSoftDeletedUsers(req, res) {
  try {
    const deletedUsers = await SoftDeleteService.getSoftDeletedUsers();
    
    res.json({
      message: "Soft deleted users retrieved successfully",
      users: deletedUsers,
      count: deletedUsers.length
    });

  } catch (error) {
    console.error("getSoftDeletedUsers error:", error);
    res.status(500).json({ 
      error: "Server error retrieving soft deleted users",
      details: error.message 
    });
  }
}

export async function restoreUser(req, res) {
  try {
    const { id } = req.params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const result = await SoftDeleteService.restoreUser(id, {
      restoredBy: `${req.user.role} (${req.user.name})`
    });

    res.json({
      message: "User restored successfully",
      user: result.user
    });

  } catch (error) {
    console.error("restoreUser error:", error);
    res.status(500).json({ 
      error: "Server error restoring user",
      details: error.message 
    });
  }
}
