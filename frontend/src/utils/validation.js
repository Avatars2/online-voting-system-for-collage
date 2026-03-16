// Password validation function
export function validatePassword(password) {
  if (!password || password.length < 6) {
    return { isValid: false, error: "Password must be at least 6 characters" };
  }
  
  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one letter" };
  }
  
  // Check for at least one number
  if (!/\d/.test(password)) {
    return { isValid: false, error: "Password must contain at least one number" };
  }
  
  // Check for at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: "Password must contain at least one special character" };
  }
  
  return { isValid: true };
}

// Email validation function
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// Alias for validateEmail to maintain compatibility
export function isValidEmail(email) {
  return validateEmail(email);
}

// Required field validation
export function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

// Phone validation function (10-digit mobile number)
export function validatePhone(phone) {
  if (!phone || !phone.trim()) {
    return { isValid: true }; // Phone is optional
  }
  
  const phoneRegex = /^\d{10}$/;
  const cleanPhone = phone.trim().replace(/\s/g, ''); // Remove spaces
  
  if (!phoneRegex.test(cleanPhone)) {
    return { isValid: false, error: "Phone number must be exactly 10 digits" };
  }
  
  return { isValid: true };
}
