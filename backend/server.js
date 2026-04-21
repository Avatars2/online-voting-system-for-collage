import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import { fileURLToPath } from 'url';

// Import security middlewares
import { 
  securityHeaders, 
  compressionMiddleware, 
  requestSizeLimiter, 
  ipBlocker,
  authLimiter,
  generalLimiter,
  sanitizeInput,
  securityLogger
} from './middleware/security.js';

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import hodRoutes from './routes/hod.js';
import teacherRoutes from './routes/teacher.js';
import studentRoutes from './routes/student.js';
import noticeRoutes from './routes/notice.js';

// Import validation controller
import { quickValidateEmail, fullValidateEmail } from './controllers/validationController.js';

// Import database connection
import connectDB from './config/db.js';

// Import security monitoring
import { securityMonitor, loginAttemptLimiter } from './middleware/securityMonitor.js';

// Import WebSocket service
import websocketService from './services/websocketService.js';

// Configure dotenv
dotenv.config();

// Create Express app
const app = express();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
connectDB();

// Enhanced security middleware
app.use(securityHeaders);
app.use(compressionMiddleware);
app.use(requestSizeLimiter);
app.use(ipBlocker);
app.use(sanitizeInput);
app.use(securityLogger);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', generalLimiter, adminRoutes);
app.use('/api/hod', generalLimiter, hodRoutes);
app.use('/api/teacher', generalLimiter, teacherRoutes);
app.use('/api/student', generalLimiter, studentRoutes);
app.use('/api/notices', generalLimiter, noticeRoutes);

// Email validation routes
app.post('/api/validate/email-quick', quickValidateEmail);
app.post('/api/validate/email-full', fullValidateEmail);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  console.log(` Server running in ${NODE_ENV} mode on port ${PORT}`);
});

// Initialize WebSocket service
websocketService.initialize(server);

export default app;
