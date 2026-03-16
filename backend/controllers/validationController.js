import emailValidationService from '../services/emailValidationService.js';

// Quick email validation (for real-time feedback)
export const quickValidateEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const validation = emailValidationService.quickValidate(email);
    
    res.json({
      isValid: validation.isValid,
      message: validation.message,
      suggestions: emailValidationService.generateSuggestions(email)
    });
    
  } catch (error) {
    console.error('Quick email validation error:', error);
    res.status(500).json({ error: 'Email validation failed' });
  }
};

// Full email validation (for final submission)
export const fullValidateEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const validation = await emailValidationService.fullValidate(email);
    
    res.json({
      isValid: validation.isValid,
      message: validation.message,
      exists: validation.exists,
      suggestions: validation.suggestions || []
    });
    
  } catch (error) {
    console.error('Full email validation error:', error);
    res.status(500).json({ error: 'Email validation failed' });
  }
};
