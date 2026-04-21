import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

// Validate JWT Secret
const validateJWTSecret = () => {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    console.error('CRITICAL: JWT_SECRET environment variable is not set!');
    console.error('Please set JWT_SECRET in your .env file with a strong, unique key.');
    process.exit(1);
  }
  
  if (jwtSecret.length < 32) {
    console.warn('WARNING: JWT_SECRET should be at least 32 characters long for better security.');
  }
  
  if (jwtSecret === 'your-super-secret-jwt-key-change-this-in-production' || 
      jwtSecret === 'online_voting_system_secret') {
    console.error('CRITICAL: You are using a default JWT secret! Please change it immediately.');
    process.exit(1);
  }
  
  return jwtSecret;
};

const JWT_SECRET = validateJWTSecret();

// JWT Configuration
export const JWT_CONFIG = {
  secret: JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  issuer: 'online-voting-system',
  audience: 'voting-app-users'
};

// Generate JWT Token with proper configuration
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_CONFIG.expiresIn,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
    algorithm: 'HS256'
  });
};

// Verify JWT Token with proper configuration
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
    algorithms: ['HS256']
  });
};

export async function protect(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ 
        success: false, 
        message: "Access token required",
        code: "TOKEN_MISSING"
      });
    }

    const token = auth.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token format",
        code: "TOKEN_INVALID_FORMAT"
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });

    // Get user from database
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    // Check if user is active
    if (user.isLocked || user.isSuspended) {
      return res.status(423).json({ 
        success: false, 
        message: "Account is locked or suspended",
        code: "ACCOUNT_LOCKED"
      });
    }

    req.user = user;
    req.userId = decoded.id;
    req.token = token;
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    
    let errorMessage = "Authentication failed";
    let errorCode = "AUTH_FAILED";
    
    if (err.name === 'TokenExpiredError') {
      errorMessage = "Token has expired";
      errorCode = "TOKEN_EXPIRED";
    } else if (err.name === 'JsonWebTokenError') {
      errorMessage = "Invalid token";
      errorCode = "TOKEN_INVALID";
    } else if (err.name === 'NotBeforeError') {
      errorMessage = "Token not active";
      errorCode = "TOKEN_NOT_ACTIVE";
    }
    
    return res
      .status(401)
      .json({ 
        success: false, 
        message: errorMessage,
        code: errorCode,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
  }
}

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    next();
  };
}

// Middleware to check if user is admin
export async function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ 
        success: false, 
        message: "Access token required",
        code: "TOKEN_MISSING"
      });
    }

    const token = auth.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token format",
        code: "TOKEN_INVALID_FORMAT"
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });

    // Check if user is admin
    const isAdmin = decoded.is_admin === true || decoded.role === "admin";
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only administrators can access this resource",
        code: "INSUFFICIENT_PERMISSIONS"
      });
    }

    // Get full user details
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    req.user = user;
    req.userId = decoded.id;
    req.token = token;
    next();
  } catch (err) {
    console.error('Admin Auth Error:', err.message);
    
    let errorMessage = "Authentication failed";
    let errorCode = "AUTH_FAILED";
    
    if (err.name === 'TokenExpiredError') {
      errorMessage = "Token has expired";
      errorCode = "TOKEN_EXPIRED";
    } else if (err.name === 'JsonWebTokenError') {
      errorMessage = "Invalid token";
      errorCode = "TOKEN_INVALID";
    }
    
    return res
      .status(401)
      .json({ 
        success: false, 
        message: errorMessage,
        code: errorCode,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
  }
}
