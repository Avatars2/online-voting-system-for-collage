// Enhanced Email Validation Service with Google-like validation
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);
const dnsResolveMx = promisify(dns.resolveMx);

export class EmailValidationService {
  constructor() {
    this.gmailPatterns = {
      // Invalid Gmail patterns
      invalidChars: /[^\w.%+-]/,
      consecutiveDots: /\.{2,}/,
      startsOrEndsWithDot: /^\.|\.$/,
      invalidStart: /^[^a-zA-Z0-9]/,
      plusSignCount: /\+/g,
      maxLength: 30 // Gmail local part max length
    };
  }

  // Comprehensive email validation (accept all valid emails)
  async validateEmailAddress(email) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Basic format validation
      const basicValidation = this.basicEmailValidation(normalizedEmail);
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // DNS validation (check if domain exists)
      const dnsValidation = await this.dnsValidation(normalizedEmail);
      if (!dnsValidation.isValid) {
        return dnsValidation;
      }

      return {
        isValid: true,
        message: 'Valid email address',
        exists: 'verified',
        email: normalizedEmail,
        suggestions: []
      };

    } catch (error) {
      console.error('Email validation error:', error);
      return {
        isValid: false,
        message: 'Email validation failed',
        exists: false
      };
    }
  }

  // Basic email validation (accept all valid emails)
  basicEmailValidation(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        message: 'Please enter a valid email address'
      };
    }

    return { 
      isValid: true, 
      message: 'Valid email address format' 
    };
  }

  // Gmail-specific validation rules
  gmailSpecificValidation(email) {
    const [localPart, domain] = email.split('@');

    // Length validation
    if (localPart.length > this.gmailPatterns.maxLength) {
      return {
        isValid: false,
        message: `Gmail username must be ${this.gmailPatterns.maxLength} characters or less`
      };
    }

    // Invalid characters
    if (this.gmailPatterns.invalidChars.test(localPart)) {
      return {
        isValid: false,
        message: 'Gmail addresses can only contain letters, numbers, dots, underscores, and hyphens'
      };
    }

    // Consecutive dots
    if (this.gmailPatterns.consecutiveDots.test(localPart)) {
      return {
        isValid: false,
        message: 'Gmail addresses cannot contain consecutive dots'
      };
    }

    // Starts or ends with dot
    if (this.gmailPatterns.startsOrEndsWithDot.test(localPart)) {
      return {
        isValid: false,
        message: 'Gmail addresses cannot start or end with a dot'
      };
    }

    // Invalid start character
    if (this.gmailPatterns.invalidStart.test(localPart)) {
      return {
        isValid: false,
        message: 'Gmail addresses must start with a letter or number'
      };
    }

    // Plus sign validation (Gmail allows but with rules)
    const plusMatches = localPart.match(this.gmailPatterns.plusSignCount);
    if (plusMatches && plusMatches.length > 1) {
      return {
        isValid: false,
        message: 'Gmail addresses can contain at most one plus sign'
      };
    }

    return { isValid: true, message: 'Gmail format valid' };
  }

  // DNS validation to check if domain exists
  async dnsValidation(email) {
    try {
      const [localPart, domain] = email.split('@');

      // Check if gmail.com has MX records
      const mxRecords = await dnsResolveMx(domain);
      
      if (!mxRecords || mxRecords.length === 0) {
        return {
          isValid: false,
          message: 'Gmail domain is not valid'
        };
      }

      return { isValid: true, message: 'DNS validation passed' };

    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        return {
          isValid: false,
          message: 'Gmail domain does not exist'
        };
      }
      
      // DNS lookup failed but format is valid
      return { 
        isValid: true, 
        message: 'Format valid (DNS check failed)',
        dnsError: true
      };
    }
  }

  // Quick validation for real-time feedback (no async operations)
  quickValidate(email) {
    return this.basicEmailValidation(email);
  }

  // Full validation with DNS check
  fullValidate(email) {
    return this.validateEmailAddress(email);
  }

  // Generate suggestions for common Gmail mistakes
  generateSuggestions(email) {
    const suggestions = [];
    const normalizedEmail = email.trim().toLowerCase();

    // Common typos
    const commonTypos = {
      'gmaill.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'gmail.con': 'gmail.com',
      'gnail.com': 'gmail.com',
      'gamil.com': 'gmail.com',
      'gmailcom': 'gmail.com'
    };

    Object.entries(commonTypos).forEach(([wrong, correct]) => {
      if (normalizedEmail.includes(wrong)) {
        suggestions.push(normalizedEmail.replace(wrong, correct));
      }
    });

    return suggestions;
  }
}

export default new EmailValidationService();
