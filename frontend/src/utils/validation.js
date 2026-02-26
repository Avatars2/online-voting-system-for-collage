// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  // Case-insensitive validation - check if any character exists regardless of case
  const lowerPassword = password.toLowerCase();
  
  if (!/(?=.*[a-z])/.test(lowerPassword)) {
    errors.push('Password must contain at least one letter');
  }
  
  if (!/(?=.*\d)/.test(lowerPassword)) {
    errors.push('Password must contain at least one number');
  }
  
  // Optional: Check for special characters (case-insensitive)
  if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Election validation
export const validateElection = (election) => {
  const errors = [];
  
  if (!election.title || election.title.trim().length === 0) {
    errors.push('Election title is required');
  } else if (election.title.trim().length < 3) {
    errors.push('Election title must be at least 3 characters long');
  } else if (election.title.trim().length > 100) {
    errors.push('Election title must be less than 100 characters');
  }
  
  if (election.description && election.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }
  
  if (election.startDate) {
    const startDate = new Date(election.startDate);
    const now = new Date();
    if (startDate <= now) {
      errors.push('Start date must be in the future');
    }
  }
  
  if (election.endDate && election.startDate) {
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);
    if (endDate <= startDate) {
      errors.push('End date must be after start date');
    }
  }
  
  if (election.level === 'department' && !election.department) {
    errors.push('Department is required for department-level elections');
  }
  
  if (election.level === 'class' && (!election.department || !election.class)) {
    errors.push('Department and class are required for class-level elections');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Student validation
export const validateStudent = (student) => {
  const errors = [];
  
  if (!student.name || student.name.trim().length === 0) {
    errors.push('Student name is required');
  } else if (student.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  } else if (student.name.trim().length > 50) {
    errors.push('Name must be less than 50 characters');
  }
  
  if (!student.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(student.email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (student.studentId && student.studentId.length > 20) {
    errors.push('Student ID must be less than 20 characters');
  }
  
  if (student.department && student.department.length > 50) {
    errors.push('Department name must be less than 50 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Department validation
export const validateDepartment = (department) => {
  const errors = [];
  
  if (!department.name || department.name.trim().length === 0) {
    errors.push('Department name is required');
  } else if (department.name.trim().length < 2) {
    errors.push('Department name must be at least 2 characters long');
  } else if (department.name.trim().length > 50) {
    errors.push('Department name must be less than 50 characters');
  }
  
  if (department.hodName && department.hodName.trim().length > 50) {
    errors.push('HOD name must be less than 50 characters');
  }
  
  if (department.hodEmail && !isValidEmail(department.hodEmail)) {
    errors.push('Please enter a valid HOD email address');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Notice validation
export const validateNotice = (notice) => {
  const errors = [];
  
  if (!notice.title || notice.title.trim().length === 0) {
    errors.push('Notice title is required');
  } else if (notice.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters long');
  } else if (notice.title.trim().length > 100) {
    errors.push('Title must be less than 100 characters');
  }
  
  if (!notice.content || notice.content.trim().length === 0) {
    errors.push('Notice content is required');
  } else if (notice.content.trim().length < 10) {
    errors.push('Content must be at least 10 characters long');
  } else if (notice.content.trim().length > 2000) {
    errors.push('Content must be less than 2000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

// Generic required field validation
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    return `${fieldName} is required`;
  }
  return null;
};

// Length validation
export const validateLength = (value, min, max, fieldName) => {
  if (value && (value.length < min || value.length > max)) {
    return `${fieldName} must be between ${min} and ${max} characters`;
  }
  return null;
};
