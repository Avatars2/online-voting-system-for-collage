import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';
import bodyParser from 'body-parser';
import compression from 'compression';

// Rate limiting configurations
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, 
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, 
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, 
  message: {
    error: 'Too many upload attempts, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Teacher-specific rate limiter (more lenient for development)
export const teacherLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 300 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// XSS Protection middleware
export const xssProtection = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    });
  }
  next();
};

// Security headers middleware with mobile optimizations
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:5001"],
    },
  },
  crossOriginEmbedderPolicy: false,
  // Mobile-specific headers
  permittedCrossDomainPolicies: false,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Input sanitization for MongoDB
export const sanitizeInput = (req, res, next) => {
  // Remove any MongoDB operators from input
  if (req.body) {
    mongoSanitize()(req, res, () => {});
  }
  if (req.query) {
    mongoSanitize()(req, res, () => {});
  }
  if (req.params) {
    mongoSanitize()(req, res, () => {});
  }
  next();
};

// CORS configuration for production
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Request size limiter to prevent large payload attacks
export const requestSizeLimiter = bodyParser.json({ limit: '10mb' });

// Response compression middleware for better performance
export const compressionMiddleware = compression();

// Suspicious IP blocking middleware
const suspiciousIPs = new Set(); // In production, use Redis or database

export const ipBlocker = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  // Block IP if it has too many failed attempts
  if (suspiciousIPs.has(ip)) {
    return res.status(429).json({
      error: 'Access temporarily blocked due to suspicious activity',
      retryAfter: '1 hour'
    });
  }
  
  next();
};

// Add IP to suspicious list (call this after multiple failed attempts)
export const markSuspiciousIP = (ip) => {
  suspiciousIPs.add(ip);
  // Auto-remove after 1 hour (in production, use proper TTL)
  setTimeout(() => suspiciousIPs.delete(ip), 3600000);
};

// Request logging for security monitoring
export const securityLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${ip} - User-Agent: ${userAgent}`);
  
  // Log suspicious activities
  if (req.path.includes('/admin') && ip !== '127.0.0.1' && ip !== '::1') {
    console.warn(`[SECURITY] Admin access attempt from external IP: ${ip}`);
  }
  
  next();
};
