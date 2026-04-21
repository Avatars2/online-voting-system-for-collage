import crypto from 'crypto';
import redisService from '../config/redis.js';

class OTPService {
  constructor() {
    this.OTP_EXPIRY = 5 * 60; // 5 minutes
    this.MAX_ATTEMPTS = 3; // Maximum OTP verification attempts
    this.OTP_LENGTH = 6; // 6-digit OTP
  }

  // Generate OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP in Redis
  async storeOTP(email, otp, purpose = 'login') {
    const key = `otp:${purpose}:${email.toLowerCase()}`;
    const attemptsKey = `otp_attempts:${purpose}:${email.toLowerCase()}`;
    
    try {
      // Store OTP with expiration
      await redisService.set(key, {
        otp,
        email: email.toLowerCase(),
        purpose,
        createdAt: new Date().toISOString(),
        attempts: 0
      }, this.OTP_EXPIRY);

      // Reset attempts counter
      await redisService.del(attemptsKey);

      console.log(`[OTP] Stored for ${email} (${purpose}): ${otp}`);
      return true;
    } catch (error) {
      console.error('Error storing OTP:', error);
      return false;
    }
  }

  // Verify OTP
  async verifyOTP(email, inputOTP, purpose = 'login') {
    const key = `otp:${purpose}:${email.toLowerCase()}`;
    const attemptsKey = `otp_attempts:${purpose}:${email.toLowerCase()}`;
    
    try {
      // Get OTP data
      const otpData = await redisService.get(key);
      
      if (!otpData) {
        return {
          success: false,
          message: 'OTP has expired or does not exist',
          code: 'OTP_EXPIRED'
        };
      }

      // Check attempts
      const attempts = await redisService.get(attemptsKey) || 0;
      if (attempts >= this.MAX_ATTEMPTS) {
        await redisService.del(key); // Delete OTP after max attempts
        return {
          success: false,
          message: 'Too many verification attempts. Please request a new OTP.',
          code: 'MAX_ATTEMPTS'
        };
      }

      // Increment attempts
      await redisService.set(attemptsKey, attempts + 1, this.OTP_EXPIRY);

      // Verify OTP
      if (otpData.otp === inputOTP) {
        await redisService.del(key); // Delete OTP on successful verification
        await redisService.del(attemptsKey); // Reset attempts
        
        console.log(`[OTP] Verified for ${email} (${purpose})`);
        return {
          success: true,
          message: 'OTP verified successfully',
          code: 'OTP_VERIFIED'
        };
      } else {
        const remainingAttempts = this.MAX_ATTEMPTS - (attempts + 1);
        
        return {
          success: false,
          message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
          code: 'OTP_INVALID',
          remainingAttempts
        };
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Server error during OTP verification',
        code: 'SERVER_ERROR'
      };
    }
  }

  // Check if OTP exists and is valid
  async checkOTP(email, purpose = 'login') {
    const key = `otp:${purpose}:${email.toLowerCase()}`;
    
    try {
      const exists = await redisService.exists(key);
      const ttl = await redisService.ttl(key);
      
      return {
        exists,
        remainingTime: ttl > 0 ? ttl : 0
      };
    } catch (error) {
      console.error('Error checking OTP:', error);
      return {
        exists: false,
        remainingTime: 0
      };
    }
  }

  // Delete OTP
  async deleteOTP(email, purpose = 'login') {
    const key = `otp:${purpose}:${email.toLowerCase()}`;
    const attemptsKey = `otp_attempts:${purpose}:${email.toLowerCase()}`;
    
    try {
      await redisService.del(key);
      await redisService.del(attemptsKey);
      
      console.log(`[OTP] Deleted for ${email} (${purpose})`);
      return true;
    } catch (error) {
      console.error('Error deleting OTP:', error);
      return false;
    }
  }

  // Get OTP statistics
  async getOTPStats(email, purpose = 'login') {
    const key = `otp:${purpose}:${email.toLowerCase()}`;
    const attemptsKey = `otp_attempts:${purpose}:${email.toLowerCase()}`;
    
    try {
      const otpData = await redisService.get(key);
      const attempts = await redisService.get(attemptsKey) || 0;
      const ttl = await redisService.ttl(key);
      
      return {
        exists: !!otpData,
        createdAt: otpData?.createdAt,
        attempts,
        maxAttempts: this.MAX_ATTEMPTS,
        remainingTime: ttl > 0 ? ttl : 0,
        remainingAttempts: Math.max(0, this.MAX_ATTEMPTS - attempts)
      };
    } catch (error) {
      console.error('Error getting OTP stats:', error);
      return null;
    }
  }

  // Rate limiting for OTP requests
  async canRequestOTP(email, purpose = 'login') {
    const rateLimitKey = `otp_rate_limit:${purpose}:${email.toLowerCase()}`;
    const cooldownPeriod = 60; // 1 minute between OTP requests
    
    try {
      const lastRequest = await redisService.get(rateLimitKey);
      
      if (lastRequest) {
        const timeSinceLastRequest = Date.now() - new Date(lastRequest).getTime();
        const remainingCooldown = cooldownPeriod - Math.ceil(timeSinceLastRequest / 1000);
        
        if (remainingCooldown > 0) {
          return {
            canRequest: false,
            remainingCooldown,
            message: `Please wait ${remainingCooldown} seconds before requesting another OTP.`
          };
        }
      }

      // Set rate limit
      await redisService.set(rateLimitKey, new Date().toISOString(), cooldownPeriod);
      
      return {
        canRequest: true,
        message: 'OTP request allowed'
      };
    } catch (error) {
      console.error('Error checking OTP rate limit:', error);
      // Allow request if Redis fails
      return {
        canRequest: true,
        message: 'OTP request allowed (fallback mode)'
      };
    }
  }

  // Generate secure token for email verification
  generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Store email verification token
  async storeEmailVerificationToken(email, token) {
    const key = `email_verification:${email.toLowerCase()}`;
    const expiry = 10 * 60; // 10 minutes
    
    try {
      await redisService.set(key, {
        token,
        email: email.toLowerCase(),
        createdAt: new Date().toISOString()
      }, expiry);
      
      console.log(`[EMAIL_VERIFICATION] Token stored for ${email}`);
      return true;
    } catch (error) {
      console.error('Error storing email verification token:', error);
      return false;
    }
  }

  // Verify email verification token
  async verifyEmailToken(email, token) {
    const key = `email_verification:${email.toLowerCase()}`;
    
    try {
      const tokenData = await redisService.get(key);
      
      if (!tokenData) {
        return {
          success: false,
          message: 'Verification token has expired or is invalid',
          code: 'TOKEN_EXPIRED'
        };
      }

      if (tokenData.token === token) {
        await redisService.del(key);
        
        console.log(`[EMAIL_VERIFICATION] Verified for ${email}`);
        return {
          success: true,
          message: 'Email verified successfully',
          code: 'EMAIL_VERIFIED'
        };
      } else {
        return {
          success: false,
          message: 'Invalid verification token',
          code: 'TOKEN_INVALID'
        };
      }
    } catch (error) {
      console.error('Error verifying email token:', error);
      return {
        success: false,
        message: 'Server error during email verification',
        code: 'SERVER_ERROR'
      };
    }
  }

  // Store password reset token
  async storePasswordResetToken(email, token) {
    const key = `password_reset:${email.toLowerCase()}`;
    const expiry = 10 * 60; // 10 minutes
    
    try {
      await redisService.set(key, {
        token,
        email: email.toLowerCase(),
        createdAt: new Date().toISOString()
      }, expiry);
      
      console.log(`[PASSWORD_RESET] Token stored for ${email}`);
      return true;
    } catch (error) {
      console.error('Error storing password reset token:', error);
      return false;
    }
  }

  // Verify password reset token
  async verifyPasswordResetToken(email, token) {
    const key = `password_reset:${email.toLowerCase()}`;
    
    try {
      const tokenData = await redisService.get(key);
      
      if (!tokenData) {
        return {
          success: false,
          message: 'Reset token has expired or is invalid',
          code: 'TOKEN_EXPIRED'
        };
      }

      if (tokenData.token === token) {
        console.log(`[PASSWORD_RESET] Verified for ${email}`);
        return {
          success: true,
          message: 'Reset token verified successfully',
          code: 'TOKEN_VERIFIED'
        };
      } else {
        return {
          success: false,
          message: 'Invalid reset token',
          code: 'TOKEN_INVALID'
        };
      }
    } catch (error) {
      console.error('Error verifying password reset token:', error);
      return {
        success: false,
        message: 'Server error during token verification',
        code: 'SERVER_ERROR'
      };
    }
  }

  // Delete password reset token
  async deletePasswordResetToken(email) {
    const key = `password_reset:${email.toLowerCase()}`;
    
    try {
      await redisService.del(key);
      console.log(`[PASSWORD_RESET] Token deleted for ${email}`);
      return true;
    } catch (error) {
      console.error('Error deleting password reset token:', error);
      return false;
    }
  }
  
  // Check forgot password rate limit
  async checkForgotPasswordRateLimit(email) {
    const rateLimitKey = `forgot_password_limit:${email.toLowerCase()}`;
    const today = new Date().toDateString();
    
    try {
      const rateLimitData = await redisService.get(rateLimitKey);
      
      if (rateLimitData && rateLimitData.date === today) {
        return {
          allowed: rateLimitData.count < 10,
          count: rateLimitData.count,
          maxCount: 10,
          remaining: Math.max(0, 10 - rateLimitData.count),
          resetTime: 'tomorrow'
        };
      }
      
      return {
        allowed: true,
        count: 0,
        maxCount: 10,
        remaining: 10,
        resetTime: 'tomorrow'
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: true }; // Allow if rate limiting fails
    }
  }
  
  // Update forgot password rate limit
  async updateForgotPasswordRateLimit(email) {
    const rateLimitKey = `forgot_password_limit:${email.toLowerCase()}`;
    const today = new Date().toDateString();
    
    try {
      const rateLimitData = await redisService.get(rateLimitKey);
      const newCount = rateLimitData && rateLimitData.date === today ? rateLimitData.count + 1 : 1;
      
      await redisService.set(rateLimitKey, {
        date: today,
        count: newCount,
        lastAttempt: new Date().toISOString()
      }, 24 * 60 * 60); // 24 hours expiry
      
      return newCount;
    } catch (error) {
      console.error('Error updating rate limit:', error);
      return 1;
    }
  }
}

// Create and export singleton instance
const otpService = new OTPService();

export default otpService;
