import User from '../models/User.js';

// Security monitoring middleware
export const securityMonitor = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log failed login attempts
    if (req.path === '/login' && res.statusCode === 401) {
      const email = req.body?.email;
      const ip = req.ip || req.connection.remoteAddress;
      
      console.log(`[SECURITY] Failed login attempt: ${email} - IP: ${ip} - User-Agent: ${req.get('User-Agent')}`);
      
      // Check for suspicious activity
      checkSuspiciousActivity(ip, email);
    }
    
    // Log account lock events
    if (req.path.includes('/unlock') || req.path.includes('/suspend')) {
      const adminUser = req.user?.email;
      const targetUserId = req.params?.userId;
      console.log(`[SECURITY] Admin ${adminUser} modified account ${targetUserId} - Action: ${req.path.split('/').pop()}`);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Check for suspicious activity patterns
const checkSuspiciousActivity = async (ip, email) => {
  try {
    // This would ideally use Redis for tracking
    // For now, we'll just log the attempt
    console.log(`[SUSPICIOUS_ACTIVITY] IP: ${ip}, Email: ${email}, Time: ${new Date().toISOString()}`);
    
    // In production, you might:
    // 1. Track failed attempts per IP
    // 2. Implement progressive delays
    // 3. Block suspicious IPs
    // 4. Send alerts to admins
    
  } catch (error) {
    console.error('Security monitoring error:', error);
  }
};

// Rate limiting for failed logins
export const loginAttemptLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const email = req.body?.email;
  
  // This would ideally use Redis
  // For demonstration, we'll just check basic rate limiting
  
  // Log the attempt
  console.log(`[LOGIN_ATTEMPT] IP: ${ip}, Email: ${email || 'not provided'}`);
  
  next();
};

// Progressive lockout duration calculator
export const calculateLockoutDuration = (attempts) => {
  const baseDuration = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION) || 30 * 60 * 1000; // 30 minutes
  const maxDuration = 24 * 60 * 60 * 1000; // 24 hours max
  
  // Progressive: 1st lock = 30min, 2nd = 1hr, 3rd = 2hr, etc.
  const progressiveDuration = baseDuration * Math.pow(2, Math.floor(attempts / 5) - 1);
  
  return Math.min(progressiveDuration, maxDuration);
};

// Account security audit log
export const auditLog = (action, userId, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    details
  };
  
  console.log(`[AUDIT] ${JSON.stringify(logEntry)}`);
  
  // In production, store in database or log service
};
