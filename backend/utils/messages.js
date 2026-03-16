// Professional Messages Utility
// Centralized message constants for consistent and professional communication

export const SUCCESS_MESSAGES = {
  // Department Messages
  DEPARTMENT_CREATED: "Department has been successfully created and added to the system.",
  DEPARTMENT_UPDATED: "Department information has been updated successfully.",
  DEPARTMENT_DELETED: "Department and all associated data have been permanently removed.",
  DEPARTMENT_HOD_ASSIGNED: "HOD has been successfully assigned to the department.",
  DEPARTMENT_HOD_REMOVED: "HOD has been removed from the department successfully.",
  
  // Class Messages
  CLASS_CREATED: "Class has been successfully created and added to the department.",
  CLASS_UPDATED: "Class information has been updated successfully.",
  CLASS_DELETED: "Class and all associated data have been permanently removed.",
  CLASS_TEACHER_ASSIGNED: "Teacher has been successfully assigned to the class.",
  CLASS_TEACHER_REMOVED: "Teacher has been removed from the class successfully.",
  
  // User Registration Messages
  ADMIN_REGISTERED: "Administrator account has been successfully created.",
  HOD_REGISTERED: "HOD account has been successfully created and assigned to the department.",
  TEACHER_REGISTERED: "Teacher account has been successfully created and assigned to the class.",
  STUDENT_REGISTERED: "Student account has been successfully created and enrolled.",
  
  // User Update Messages
  PROFILE_UPDATED: "Profile information has been updated successfully.",
  PASSWORD_CHANGED: "Password has been changed successfully.",
  
  // Election Messages
  ELECTION_CREATED: "Election has been successfully created and scheduled.",
  ELECTION_UPDATED: "Election details have been updated successfully.",
  ELECTION_DELETED: "Election and all associated data have been permanently removed.",
  CANDIDATE_REGISTERED: "Candidate has been successfully registered for the election.",
  CANDIDATE_REMOVED: "Candidate has been removed from the election successfully.",
  
  // Notice Messages
  NOTICE_CREATED: "Notice has been successfully published.",
  NOTICE_UPDATED: "Notice has been updated successfully.",
  NOTICE_DELETED: "Notice has been permanently removed.",
  
  // General Messages
  OPERATION_SUCCESSFUL: "Operation completed successfully.",
  DATA_SAVED: "All changes have been saved successfully.",
  LOGIN_SUCCESSFUL: "You have been successfully logged in.",
  LOGOUT_SUCCESSFUL: "You have been successfully logged out."
};

export const ERROR_MESSAGES = {
  // Authentication Errors
  INVALID_CREDENTIALS: "The email or password you entered is incorrect. Please try again.",
  ACCOUNT_NOT_FOUND: "No account found with this email address.",
  ACCOUNT_LOCKED: "Your account has been temporarily locked. Please contact administrator.",
  SESSION_EXPIRED: "Your session has expired. Please login again.",
  ACCESS_DENIED: "You do not have permission to perform this action.",
  
  // Validation Errors
  REQUIRED_FIELD_MISSING: "This field is required. Please provide the missing information.",
  INVALID_EMAIL_FORMAT: "Please enter a valid email address.",
  INVALID_PASSWORD_FORMAT: "Password must be at least 6 characters long and contain letters, numbers, and special characters.",
  INVALID_PHONE_FORMAT: "Please enter a valid phone number.",
  PASSWORDS_DO_NOT_MATCH: "The passwords you entered do not match.",
  
  // Department Errors
  DEPARTMENT_NOT_FOUND: "Department not found in the system.",
  DEPARTMENT_ALREADY_EXISTS: "A department with this name already exists.",
  DEPARTMENT_DELETE_FAILED: "Unable to delete department. Please ensure all associated data is properly handled.",
  DEPARTMENT_UPDATE_FAILED: "Unable to update department. Please try again later.",
  
  // Class Errors
  CLASS_NOT_FOUND: "Class not found in the system.",
  CLASS_ALREADY_EXISTS: "A class with this name already exists in this department.",
  CLASS_DELETE_FAILED: "Unable to delete class. Please ensure all associated data is properly handled.",
  CLASS_UPDATE_FAILED: "Unable to update class. Please try again later.",
  
  // User Registration Errors
  ADMIN_ALREADY_EXISTS: "An administrator account already exists in the system.",
  USER_ALREADY_EXISTS: "An account with this email address already exists.",
  REGISTRATION_FAILED: "Unable to create account. Please check your information and try again.",
  INVALID_USER_ROLE: "Invalid user role specified.",
  
  // Election Errors
  ELECTION_NOT_FOUND: "Election not found in the system.",
  ELECTION_ALREADY_EXISTS: "An election with these details already exists.",
  ELECTION_DATE_INVALID: "Please provide valid start and end dates for the election.",
  CANDIDATE_ALREADY_REGISTERED: "This candidate is already registered for this election.",
  
  // System Errors
  DATABASE_ERROR: "A database error occurred. Please try again later.",
  NETWORK_ERROR: "Network connection error. Please check your internet connection.",
  SERVER_ERROR: "An unexpected error occurred on the server. Please try again later.",
  FILE_UPLOAD_ERROR: "Unable to upload file. Please check the file format and size.",
  
  // General Errors
  OPERATION_FAILED: "Operation could not be completed. Please try again.",
  INVALID_REQUEST: "Invalid request format. Please check your input.",
  PERMISSION_DENIED: "You don't have sufficient permissions to perform this action.",
  RESOURCE_NOT_FOUND: "The requested resource was not found."
};

export const WARNING_MESSAGES = {
  // Deletion Warnings
  DELETE_DEPARTMENT_WARNING: "This will permanently delete the department and all associated data including classes, students, teachers, and HOD accounts. This action cannot be undone.",
  DELETE_CLASS_WARNING: "This will permanently delete the class and all associated data including students and teacher accounts. This action cannot be undone.",
  DELETE_USER_WARNING: "This will permanently delete the user account and all associated data. This action cannot be undone.",
  
  // Confirmation Warnings
  UNSAVED_CHANGES_WARNING: "You have unsaved changes. Are you sure you want to continue?",
  LOGOUT_WARNING: "Are you sure you want to logout?",
  
  // General Warnings
  ACTION_IRREVERSIBLE: "This action cannot be reversed. Please proceed with caution."
};

export const INFO_MESSAGES = {
  // Help Messages
  PASSWORD_REQUIREMENTS: "Password must be at least 6 characters long and contain letters, numbers, and special characters.",
  EMAIL_FORMAT_HELP: "Please enter a valid email address (e.g., user@example.com).",
  PHONE_FORMAT_HELP: "Please enter a valid phone number with country code if applicable.",
  
  // Status Messages
  LOADING: "Processing your request...",
  SAVING: "Saving your changes...",
  UPDATING: "Updating information...",
  DELETING: "Removing data...",
  
  // General Info
  NO_DATA_AVAILABLE: "No data available at this time.",
  OPERATION_COMPLETE: "Operation has been completed successfully."
};

// Helper function to get appropriate message
export function getMessage(messageType, key, customMessage = null) {
  if (customMessage) {
    return customMessage;
  }
  
  const messages = {
    success: SUCCESS_MESSAGES,
    error: ERROR_MESSAGES,
    warning: WARNING_MESSAGES,
    info: INFO_MESSAGES
  };
  
  return messages[messageType]?.[key] || "An unexpected error occurred. Please try again.";
}

// Helper function for validation errors
export function getValidationMessage(fieldName, errorType) {
  const fieldNames = {
    name: "Name",
    email: "Email address",
    password: "Password",
    phone: "Phone number",
    department: "Department",
    class: "Class",
    year: "Year"
  };
  
  const errorTypes = {
    required: `${fieldNames[fieldName] || fieldName} is required. Please provide this information.`,
    invalid: `Please enter a valid ${fieldNames[fieldName]?.toLowerCase() || fieldName}.`,
    duplicate: `A ${fieldNames[fieldName]?.toLowerCase() || fieldName} with this value already exists.`
  };
  
  return errorTypes[errorType] || `Invalid ${fieldNames[fieldName]?.toLowerCase() || fieldName}.`;
}
