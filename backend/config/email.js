import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create email transporter with enhanced configuration
export function createTransporter() {
  // Check if email credentials are provided
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || 
      process.env.EMAIL_USER === 'your-email@gmail.com' || 
      process.env.EMAIL_PASS === 'your-app-password') {
    console.warn('⚠️ Email credentials not configured or using placeholder values');
    console.warn('   EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
    console.warn('   EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
    return null;
  }

  // Create transporter with Gmail configuration
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates
    },
    pool: true, // Use connection pooling
    maxConnections: 5, // Maximum number of connections
    maxMessages: 100, // Maximum number of messages per connection
    rateDelta: 1000, // Time between messages in milliseconds
    rateLimit: 5, // Maximum number of messages per rateDelta
    // Enhanced configuration for better from name handling
    displayName: 'Online Voting System',
  });

  // Verify transporter configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email transporter configuration error:', error);
    } else {
      console.log('✅ Email transporter is ready to send messages');
    }
  });

  return transporter;
}

// Create global transporter instance
let transporter = null;

// Initialize transporter
function initializeTransporter() {
  transporter = createTransporter();
  return transporter;
}

// Get transporter instance
export function getTransporter() {
  if (!transporter) {
    transporter = initializeTransporter();
  }
  return transporter;
}

// Test email configuration
export async function testEmailConfiguration() {
  try {
    const testTransporter = getTransporter();
    if (!testTransporter) {
      return { success: false, error: 'Email not configured' };
    }

    // Verify connection
    await testTransporter.verify();
    
    // Send test email
    const testMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send test email to self
      subject: 'Email Configuration Test - Online Voting System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">✅ Email Configuration Test Successful</h2>
          <p>Your email configuration is working correctly!</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Test Details:</h3>
            <ul>
              <li><strong>From:</strong> ${process.env.EMAIL_USER}</li>
              <li><strong>To:</strong> ${process.env.EMAIL_USER}</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Service:</strong> Gmail SMTP</li>
            </ul>
          </div>
          <p style="color: #666; font-size: 14px;">
            This is an automated test message from the Online Voting System.
          </p>
        </div>
      `
    };

    await testTransporter.sendMail(testMailOptions);
    
    return { 
      success: true, 
      message: 'Test email sent successfully',
      details: {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        service: 'Gmail SMTP'
      }
    };
    
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    return { 
      success: false, 
      error: error.message,
      details: {
        emailUser: process.env.EMAIL_USER,
        emailPass: process.env.EMAIL_PASS ? 'SET' : 'NOT SET'
      }
    };
  }
}

// Get email configuration status
export function getEmailConfigStatus() {
  return {
    configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    emailUser: process.env.EMAIL_USER,
    emailPassSet: !!process.env.EMAIL_PASS,
    service: 'Gmail SMTP',
    port: 587,
    secure: false
  };
}

// Export default transporter for backward compatibility
export { transporter };

// Initialize on module load
initializeTransporter();
