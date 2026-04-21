import User from "../models/User.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { JWT_CONFIG } from "../middleware/auth.js";
import otpService from "../services/otpService.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import redisService from "../config/redis.js";
import { createTransporter } from "../config/email.js";
import { securityMonitor } from "../middleware/securityMonitor.js";
import websocketService from "../services/websocketService.js";

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

// Email transporter configuration (only if email credentials are provided)
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} else {
  console.warn('Email credentials not provided. OTP functionality will be disabled.');
}

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send registration email with professional template
async function sendRegistrationEmail(email, name, password, role) {
  if (!transporter) {
    console.log(`Registration details for ${email}: Name: ${name}, Role: ${role}, Password: ${password} (Email not configured - showing in console)`);
    return;
  }

  console.log(`sendRegistrationEmail: Sending professional welcome email to ${email}`);
  
  const roleInfo = {
    student: {
      title: 'Student',
      features: [
        'Participate in elections for your class',
        'View election results in real-time',
        'Manage your profile and voting history',
        'Access class-specific voting platforms'
      ]
    },
    teacher: {
      title: 'Teacher', 
      features: [
        'Create and manage elections for your class',
        'Monitor student participation',
        'Generate comprehensive election reports',
        'Manage class roster and voting data'
      ]
    },
    hod: {
      title: 'Head of Department',
      features: [
        'Oversee all department elections',
        'Manage departmental voting activities',
        'Generate department-wide reports',
        'Supervise teachers and coordinate elections'
      ]
    }
  };

  const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  
  const mailOptions = {
    from: `"Online Voting System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Welcome to Online Voting System - ${roleInfo[role].title} Account Created`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Online Voting System</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
        
        <!-- Header with Logo -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
          <div style="max-width: 600px; margin: 0 auto;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <div style="width: 50px; height: 50px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <div style="width: 35px; height: 35px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">OVS</div>
              </div>
              <div style="text-align: left;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Online Voting System</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Secure Digital Democracy Platform</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
          
          <!-- Welcome Section -->
          <div style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #f8f9ff 0%, #e8f0ff 100%);">
            <div style="display: inline-block; background: #667eea; color: white; padding: 15px 25px; border-radius: 50px; margin-bottom: 20px;">
              <span style="font-size: 24px;">🎉</span>
            </div>
            <h2 style="color: #333; margin: 0 0 10px 0; font-size: 28px; font-weight: 600;">Welcome, ${name}!</h2>
            <p style="color: #666; margin: 0; font-size: 16px;">Your ${roleInfo[role].title} account has been successfully created</p>
            <div style="display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 10px;">
              ACCOUNT ACTIVE
            </div>
          </div>

          <!-- Account Details -->
          <div style="padding: 30px; border-bottom: 1px solid #e9ecef;">
            <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center;">
              <span style="margin-right: 10px;">🔐</span> Your Account Credentials
            </h3>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
              <div style="display: grid; grid-template-columns: 120px 1fr; gap: 15px; align-items: center;">
                <span style="color: #666; font-weight: 600; font-size: 14px;">EMAIL ADDRESS:</span>
                <span style="color: #333; font-family: 'Courier New', monospace; font-size: 14px;">${email}</span>
              </div>
              <div style="display: grid; grid-template-columns: 120px 1fr; gap: 15px; align-items: center; margin-top: 15px;">
                <span style="color: #666; font-weight: 600; font-size: 14px;">TEMPORARY PASSWORD:</span>
                <span style="color: #333; font-family: 'Courier New', monospace; font-size: 14px; font-weight: 600;">${password}</span>
              </div>
              <div style="display: grid; grid-template-columns: 120px 1fr; gap: 15px; align-items: center; margin-top: 15px;">
                <span style="color: #666; font-weight: 600; font-size: 14px;">ACCOUNT TYPE:</span>
                <span style="color: #333; font-size: 14px; font-weight: 600; text-transform: uppercase;">${roleInfo[role].title}</span>
              </div>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-top: 20px;">
              <p style="margin: 0; color: #856404; font-size: 13px; display: flex; align-items: center;">
                <span style="margin-right: 8px;">⚠️</span>
                <strong>Security Notice:</strong> Please change your password after first login for account security.
              </p>
            </div>
          </div>

          <!-- Features Section -->
          <div style="padding: 30px; border-bottom: 1px solid #e9ecef;">
            <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center;">
              <span style="margin-right: 10px;">✨</span> What You Can Do
            </h3>
            <div style="space-y: 15px;">
              ${roleInfo[role].features.map((feature, index) => `
                <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
                  <div style="background: #667eea; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 15px; flex-shrink: 0;">
                    ${index + 1}
                  </div>
                  <div style="flex: 1;">
                    <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.5;">${feature}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Action Section -->
          <div style="padding: 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <h3 style="color: white; margin: 0 0 20px 0; font-size: 18px;">Ready to Get Started?</h3>
            <p style="color: rgba(255,255,255,0.9); margin: 0 0 25px 0; font-size: 15px;">Click the button below to access your account</p>
            
            <a href="${loginLink}" 
               style="background: white; color: #667eea; padding: 18px 40px; text-decoration: none; 
                      border-radius: 50px; font-weight: 600; font-size: 16px; display: inline-block;
                      transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
              🚀 Login to Your Account
            </a>
            
            <p style="color: rgba(255,255,255,0.8); margin: 20px 0 0 0; font-size: 13px;">
              Or copy this link: <span style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 4px; font-family: 'Courier New', monospace;">${loginLink}</span>
            </p>
          </div>

          <!-- Footer -->
          <div style="padding: 30px; text-align: center; background: #f8f9fa;">
            <div style="margin-bottom: 20px;">
              <p style="color: #666; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">Need Help?</p>
              <p style="color: #888; margin: 0; font-size: 13px;">Contact our support team for any assistance</p>
            </div>
            
            <div style="border-top: 1px solid #e9ecef; padding-top: 20px;">
              <p style="color: #999; margin: 0; font-size: 12px;">© 2026 Online Voting System. All rights reserved.</p>
              <p style="color: #bbb; margin: 5px 0 0 0; font-size: 11px;">Secure Digital Democracy Platform</p>
            </div>
          </div>
        </div>

        <!-- Mobile Responsive Styles -->
        <style>
          @media only screen and (max-width: 600px) {
            body { padding: 10px !important; }
            div[style*="max-width: 600px"] { 
              margin: 0 !important; 
              border-radius: 8px !important; 
            }
            div[style*="padding: 40px 30px"] { 
              padding: 25px 20px !important; 
            }
            a[href*="login"] { 
              padding: 15px 30px !important; 
              font-size: 14px !important; 
            }
          }
        </style>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`sendRegistrationEmail: Professional welcome email sent successfully to ${email}`);
    
    // Send real-time notification
    try {
      const notificationResult = websocketService.notifyUserRegistration({
        name,
        email,
        role
      });
      console.log(`📡 Real-time registration notification sent: ${JSON.stringify(notificationResult)}`);
    } catch (wsError) {
      console.error(`❌ Failed to send real-time notification:`, wsError);
    }
    
  } catch (error) {
    console.error(`sendRegistrationEmail: Failed to send welcome email to ${email}:`, error);
    throw error;
  }
}

// Export the registration email function
export { sendRegistrationEmail, sendAccountDeletionEmail };

// Send account deletion notification email with professional template
async function sendAccountDeletionEmail(email, name, role, deletedBy) {
  if (!transporter) {
    console.log(`Account deletion notification for ${email}: Your account has been deleted (Email not configured - showing in console)`);
    return;
  }

  console.log(`sendAccountDeletionEmail: Sending professional deletion notification to ${email}`);
  
  const mailOptions = {
    from: `"Online Voting System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Account Deletion Notice - Online Voting System`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Deletion Notice</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
        
        <!-- Header with Logo -->
        <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px 20px; text-align: center;">
          <div style="max-width: 600px; margin: 0 auto;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom:20px;">
              <div style="width: 50px; height: 50px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <div style="width: 35px; height: 35px; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">OVS</div>
              </div>
              <div style="text-align: left;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Online Voting System</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Secure Digital Democracy Platform</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
          
          <!-- Deletion Notice -->
          <div style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%);">
            <div style="display: inline-block; background: #dc3545; color: white; padding: 15px 25px; border-radius: 50px; margin-bottom: 20px;">
              <span style="font-size: 24px;">🔒</span>
            </div>
            <h2 style="color: #dc3545; margin: 0 0 10px 0; font-size: 28px; font-weight: 600;">Account Deletion Notice</h2>
            <p style="color: #666; margin: 0; font-size: 16px;">Your ${role.charAt(0).toUpperCase() + role.slice(1)} account has been permanently deleted</p>
            <div style="display: inline-block; background: #dc3545; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 10px;">
              ACCOUNT TERMINATED
            </div>
          </div>

          <!-- Account Details -->
          <div style="padding: 30px; border-bottom: 1px solid #e9ecef;">
            <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center;">
              <span style="margin-right: 10px;">📋</span> Deletion Details
            </h3>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545;">
              <div style="display: grid; grid-template-columns: 140px 1fr; gap: 15px; align-items: center;">
                <span style="color: #666; font-weight: 600; font-size: 14px;">ACCOUNT TYPE:</span>
                <span style="color: #333; font-size: 14px; font-weight: 600; text-transform: uppercase;">${role.charAt(0).toUpperCase() + role.slice(1)}</span>
              </div>
              <div style="display: grid; grid-template-columns: 140px 1fr; gap: 15px; align-items: center; margin-top: 15px;">
                <span style="color: #666; font-weight: 600; font-size: 14px;">EMAIL ADDRESS:</span>
                <span style="color: #333; font-family: 'Courier New', monospace; font-size: 14px;">${email}</span>
              </div>
              <div style="display: grid; grid-template-columns: 140px 1fr; gap: 15px; align-items: center; margin-top: 15px;">
                <span style="color: #666; font-weight: 600; font-size: 14px;">DELETED BY:</span>
                <span style="color: #333; font-size: 14px;">${deletedBy}</span>
              </div>
              <div style="display: grid; grid-template-columns: 140px 1fr; gap: 15px; align-items: center; margin-top: 15px;">
                <span style="color: #666; font-weight: 600; font-size: 14px;">DELETION DATE:</span>
                <span style="color: #333; font-size: 14px;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <!-- Important Notice -->
          <div style="padding: 30px; border-bottom: 1px solid #e9ecef;">
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px;">
              <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
                <span style="font-size: 20px; margin-right: 15px; color: #dc3545;">⚠️</span>
                <div>
                  <h4 style="color: #721c24; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">Important Notice</h4>
                  <p style="margin: 0; color: #721c24; font-size: 14px; line-height: 1.5;">
                    This action is <strong>permanent</strong> and cannot be undone. All your data, including voting history, personal information, and account settings has been <strong>permanently removed</strong> from our system.
                  </p>
                </div>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-top: 15px;">
                <p style="margin: 0; color: #856404; font-size: 13px; display: flex; align-items: center;">
                  <span style="margin-right: 8px;">💡</span>
                  <strong>What this means:</strong> You will no longer be able to access your account or any associated services.
                </p>
              </div>
            </div>
          </div>

          <!-- Contact Section -->
          <div style="padding: 30px; text-align: center; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);">
            <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center;">
              <span style="margin-right: 10px;">📞</span> Need Assistance?
            </h3>
            <p style="color: #666; margin: 0 0 15px 0; font-size: 15px;">If you believe this deletion was made in error or have any questions about your account</p>
            
            <div style="background: white; border-radius: 50px; padding: 20px; margin: 20px 0; border: 1px solid #e9ecef;">
              <p style="margin: 0; color: #667eea; font-weight: 600; font-size: 14px;">Contact System Administrator</p>
              <p style="margin: 5px 0 0 0; color: #888; font-size: 13px;">• Email: ${process.env.EMAIL_USER}</p>
              <p style="margin: 0; color: #888; font-size: 13px;">• Response Time: Within 24-48 hours</p>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 30px; text-align: center; background: #f8f9fa;">
            <div style="border-top: 1px solid #e9ecef; padding-top: 20px;">
              <p style="color: #999; margin: 0 0 10px 0; font-size: 12px;">© 2026 Online Voting System. All rights reserved.</p>
              <p style="color: #bbb; margin: 0; font-size: 11px;">Secure Digital Democracy Platform</p>
              <p style="color: #ddd; margin: 5px 0 0 0; font-size: 10px;">This is an automated notification. Please do not reply to this email.</p>
            </div>
          </div>
        </div>

        <!-- Mobile Responsive Styles -->
        <style>
          @media only screen and (max-width: 600px) {
            body { padding: 10px !important; }
            div[style*="max-width: 600px"] { 
              margin: 0 !important; 
              border-radius: 8px !important; 
            }
            div[style*="padding: 40px 30px"] { 
              padding: 25px 20px !important; 
            }
            div[style*="grid-template-columns"] { 
              grid-template-columns: 1fr !important; 
              gap: 10px !important; 
            }
          }
        </style>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`sendAccountDeletionEmail: Professional deletion notification sent successfully to ${email}`);
    
    // Send real-time notification
    try {
      const notificationResult = websocketService.notifyUserDeletion({
        name,
        email,
        role,
        deletedBy
      });
      console.log(`📡 Real-time deletion notification sent: ${JSON.stringify(notificationResult)}`);
    } catch (wsError) {
      console.error(`❌ Failed to send real-time deletion notification:`, wsError);
    }
    
  } catch (error) {
    console.error(`sendAccountDeletionEmail: Failed to send deletion notification to ${email}:`, error);
    throw error;
  }
}

// Send OTP email
async function sendOTPEmail(email, otp) {
  if (!transporter) {
    console.log(`OTP for ${email}: ${otp} (Email not configured - showing in console)`);
    return;
  }

  console.log(`sendOTPEmail: Sending email to ${email}`);
  
  const mailOptions = {
    from: `"Online Voting System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'OTP for Voting Verification - Online Voting System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; color: white;">
          <div style="max-width: 600px; margin: 0 auto;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <div style="width: 50px; height: 50px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <div style="width: 35px; height: 35px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">OVS</div>
              </div>
              <div style="text-align: left;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Online Voting System</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Secure Digital Democracy Platform</p>
              </div>
            </div>
          </div>
          <h1 style="margin: 20px 0 0 0; font-size: 32px;">🔐 OTP Verification</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin: 20px 0;">
          <h2 style="color: #333; margin-bottom: 20px;">Your One-Time Password</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 2px dashed #667eea;">
            <span style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px;">${otp}</span>
          </div>
          <p style="color: #666; margin-top: 20px; font-size: 14px;">
            This OTP will expire in <strong>5 minutes</strong>.
          </p>
        </div>
        
        <div style="text-align: center; color: #888; font-size: 12px;">
          <p>If you didn't request this OTP, please ignore this email.</p>
          <p>Do not share this OTP with anyone for security reasons.</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`sendOTPEmail: Email sent successfully to ${email}`);
  } catch (error) {
    console.error(`sendOTPEmail: Failed to send email to ${email}:`, error);
    throw error;
  }
}

// Password validation function (same as frontend)
function validatePassword(password) {
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

export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email and password are required",
        code: "MISSING_CREDENTIALS"
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ 
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS"
      });
    }

    // Check if account is suspended
    if (user.isSuspendedAccount()) {
      return res.status(423).json({ 
        error: `Account suspended: ${user.suspensionReason}`,
        code: "ACCOUNT_SUSPENDED",
        suspensionReason: user.suspensionReason,
        suspendedUntil: user.suspendedUntil
      });
    }

    const isValid = await user.comparePassword(password);
    
    if (!isValid) {
      return res.status(401).json({ 
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS"
      });
    }

    const isAdmin = user.is_admin === true || user.role === "admin";
    const role = user.role || (isAdmin ? "admin" : "student");
    
    // Determine redirect based on role
    let redirect;
    switch (role) {
      case "admin":
        redirect = "/admin/dashboard";
        break;
      case "hod":
        redirect = "/hod/dashboard";
        break;
      case "teacher":
        redirect = "/teacher/dashboard";
        break;
      default:
        redirect = "/student/dashboard";
    }

    const token = jwt.sign(
      { id: user._id, role, is_admin: isAdmin },
      JWT_SECRET,
      { expiresIn: JWT_CONFIG.expiresIn }
    );

    // Log successful login (for security monitoring)
    console.log(`[LOGIN_SUCCESS] ${normalizedEmail} - IP: ${req.ip} - Role: ${role}`);

    return res.status(200).json({ 
      role, 
      redirect, 
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ 
      error: "Server error during login",
      code: "SERVER_ERROR"
    });
  }
}

export async function logout(req, res) {
  return res.status(200).json({ message: "Logged out" });
}

// Account Management Functions
export async function unlockAccount(req, res) {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    await user.unlockAccount();
    return res.status(200).json({ message: "Account unlocked successfully" });
  } catch (err) {
    console.error("Unlock account error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function suspendAccount(req, res) {
  try {
    const { userId } = req.params;
    const { reason, duration } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    await user.suspendAccount(reason, duration);
    return res.status(200).json({ message: "Account suspended successfully" });
  } catch (err) {
    console.error("Suspend account error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function getAccountStatus(req, res) {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const status = {
      isLocked: user.isLockedAccount(),
      lockUntil: user.lockUntil,
      remainingLockTime: user.getRemainingLockTime(),
      loginAttempts: user.loginAttempts,
      isSuspended: user.isSuspendedAccount(),
      suspensionReason: user.suspensionReason,
      suspendedUntil: user.suspendedUntil,
      lastLoginAttempt: user.lastLoginAttempt
    };
    
    return res.status(200).json(status);
  } catch (err) {
    console.error("Get account status error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function verifyToken(req, res) {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const user = await User.findById(userId).select("-password")
      .populate("department class")
      .populate("assignedDepartment", "name")
      .populate("assignedClass", "name year department")
      .populate({
        path: "assignedClass",
        populate: {
          path: "department",
          select: "name"
        }
      });
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ user });
  } catch (err) {
    console.error("verifyToken error:", err);
    return res.status(500).json({ error: "Server error verifying token" });
  }
}

export async function changePassword(req, res) {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "oldPassword and newPassword are required" });
    }

    // Validate new password using same validation as login
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isValid = await user.comparePassword(oldPassword);
    if (!isValid) return res.status(401).json({ error: "Current password is incorrect" });

    // Check if new password is same as old password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({ error: "New password must be different from current password" });
    }

    user.password = String(newPassword);
    await user.save();

    return res.status(200).json({ ok: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ error: "Server error changing password" });
  }
}

export async function updateMe(req, res) {
  try {
    const userId = req.userId || req.user?._id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const { name, phone, avatarUrl } = req.body || {};
    const updates = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : "";
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl ? String(avatarUrl).trim() : "";

    const user = await User.findByIdAndUpdate(userId, updates, { new: true })
      .select("-password")
      .populate("department class")
      .populate("assignedDepartment", "name")
      .populate("assignedClass", "name year department")
      .populate({
        path: "assignedClass",
        populate: {
          path: "department",
          select: "name"
        }
      });
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ ok: true, user });
  } catch (err) {
    console.error("updateMe error:", err);
    return res.status(500).json({ error: "Server error updating profile" });
  }
}

// Forgot Password Function
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required',
        code: 'EMAIL_REQUIRED'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address',
        code: 'INVALID_EMAIL'
      });
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check rate limiting: max 10 forgot password attempts per day
    const rateLimitCheck = await otpService.checkForgotPasswordRateLimit(normalizedEmail);
    
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ 
        error: 'Too many password reset requests. Please try again tomorrow.',
        code: 'RATE_LIMIT_EXCEEDED',
        attempts: rateLimitCheck.count,
        maxAttempts: rateLimitCheck.maxCount,
        remaining: rateLimitCheck.remaining,
        resetTime: rateLimitCheck.resetTime
      });
    }
    
    // Update rate limit counter
    const newCount = await otpService.updateForgotPasswordRateLimit(normalizedEmail);
    console.log(`[RATE_LIMIT] Forgot password attempt ${newCount}/10 for ${normalizedEmail}`);
    
    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ 
        error: 'No account found with this email address',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Generate secure reset token
    const resetToken = otpService.generateSecureToken();
    
    // Store token in Redis
    const stored = await otpService.storePasswordResetToken(normalizedEmail, resetToken);
    
    if (!stored) {
      return res.status(500).json({ 
        error: 'Failed to generate reset token',
        code: 'STORAGE_ERROR'
      });
    }
    
    // Create reset link with token and email
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;
    
    // Log reset link for development
    console.log(`Password reset link for ${normalizedEmail}: ${resetLink}`);
    
    // Send reset email
    if (transporter) {
      try {
        const mailOptions = {
          from: `"Online Voting System" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Password Reset Request - Online Voting System',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; color: white;">
                <div style="max-width: 600px; margin: 0 auto;">
                  <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                    <div style="width: 50px; height: 50px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                      <div style="width: 35px; height: 35px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">OVS</div>
                    </div>
                    <div style="text-align: left;">
                      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Online Voting System</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 14px;">Secure Digital Democracy Platform</p>
                    </div>
                  </div>
                </div>
                <h1 style="margin: 20px 0 0 0; font-size: 32px;">🔐 Password Reset</h1>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin: 20px 0;">
                <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
                <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
                  Dear <strong>${user.name}</strong>,<br><br>
                  We received a request to reset your password. Click the button below to reset your password:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" 
                     style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; 
                            border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                    Reset Password
                  </a>
                </div>
                
                <p style="color: #666; margin-top: 20px; font-size: 14px;">
                  Or copy and paste this link in your browser:<br>
                  <span style="word-break: break-all; color: #667eea;">${resetLink}</span>
                </p>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                  <p style="margin: 0; color: #856404; font-size: 14px;">
                    <strong>Security Notice:</strong> This link will expire in 10 minutes. If you didn't request this reset, please ignore this email.
                  </p>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                <p>&copy; 2026 Online Voting System. All rights reserved.</p>
              </div>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${normalizedEmail}`);
        
        res.status(200).json({ 
          message: 'Password reset link sent to your email',
          email: normalizedEmail,
          expiresIn: 10 * 60 // 10 minutes in seconds
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Fallback: return token for development
        res.status(200).json({ 
          message: 'Password reset link generated (email failed - check console)',
          resetToken: resetToken,
          resetLink: resetLink,
          email: normalizedEmail,
          expiresIn: 10 * 60 // 10 minutes
        });
      }
    } else {
      // No email configuration - return token for development
      console.log(`Password reset link for ${normalizedEmail}: ${resetLink}`);
      res.status(200).json({ 
        message: 'Password reset link generated (email not configured)',
        resetToken: resetToken,
        resetLink: resetLink,
        email: normalizedEmail,
        expiresIn: 10 * 60 // 10 minutes
      });
    }
    
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ 
      error: 'Failed to process password reset request',
      code: 'SERVER_ERROR'
    });
  }
}

// Reset Password with Token
export async function resetPasswordWithToken(req, res) {
  try {
    const { token, newPassword, email } = req.body || {};
    
    if (!token || !newPassword || !email) {
      return res.status(400).json({ 
        error: "Token, new password, and email are required",
        code: "MISSING_CREDENTIALS"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify reset token using Redis service
    const tokenVerification = await otpService.verifyPasswordResetToken(normalizedEmail, token);
    
    if (!tokenVerification.success) {
      let statusCode = 400;
      
      switch (tokenVerification.code) {
        case 'TOKEN_EXPIRED':
          statusCode = 400;
          break;
        case 'TOKEN_INVALID':
          statusCode = 401;
          break;
        default:
          statusCode = 500;
      }

      return res.status(statusCode).json({
        error: tokenVerification.message,
        code: tokenVerification.code
      });
    }

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ 
        error: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: passwordValidation.error,
        code: "INVALID_PASSWORD"
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Delete the reset token
    await otpService.deletePasswordResetToken(normalizedEmail);

    console.log(`[PASSWORD_RESET] ${normalizedEmail} - Password reset successful`);

    return res.status(200).json({
      message: "Password reset successfully",
      code: "PASSWORD_RESET_SUCCESS"
    });
    
  } catch (err) {
    console.error("resetPasswordWithToken error:", err);
    return res.status(500).json({ 
      error: "Failed to reset password",
      code: "SERVER_ERROR"
    });
  }
}

// Reset Password (existing OTP-based)
export async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body || {};
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP, and new password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    
    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Update user password
    user.password = newPassword;
    await user.save();

    console.log(`resetPassword: Password reset successfully for ${normalizedEmail}`);

    return res.status(200).json({ 
      message: "Password reset successfully"
    });
    
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }
}

// Send OTP
export async function sendOTP(req, res) {
  try {
    const { email } = req.body || {};
    
    if (!email) {
      console.log("sendOTP: Email is required");
      return res.status(400).json({ 
        error: "Email is required",
        code: "EMAIL_REQUIRED"
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    console.log(`sendOTP: Processing request for email: ${normalizedEmail}`);
    
    // Check rate limiting
    const rateLimitCheck = await otpService.canRequestOTP(normalizedEmail);
    if (!rateLimitCheck.canRequest) {
      return res.status(429).json({ 
        error: rateLimitCheck.message,
        code: "RATE_LIMITED",
        remainingCooldown: rateLimitCheck.remainingCooldown
      });
    }
    
    // Check if user exists
    let user = await User.findOne({ email: normalizedEmail });
    
    // For development: create a test user if not found
    if (!user && normalizedEmail === "test@student.com") {
      console.log(`sendOTP: Creating test user for ${normalizedEmail}`);
      try {
        user = new User({
          name: "Test Student",
          email: normalizedEmail,
          password: "test123",
          role: "student"
        });
        await user.save();
        console.log(`sendOTP: Test user created successfully`);
      } catch (createErr) {
        console.error(`sendOTP: Failed to create test user:`, createErr);
      }
    }
    
    if (!user) {
      console.log(`sendOTP: User not found for email: ${normalizedEmail}`);
      return res.status(404).json({ 
        error: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    console.log(`sendOTP: User found: ${user.name} (${user.role})`);

    // Generate and store OTP using Redis service
    const otp = otpService.generateOTP();
    const stored = await otpService.storeOTP(normalizedEmail, otp, 'login');
    
    if (!stored) {
      return res.status(500).json({ 
        error: "Failed to store OTP",
        code: "STORAGE_ERROR"
      });
    }

    console.log(`sendOTP: Generated OTP: ${otp} for ${normalizedEmail}`);

    // Send OTP email
    try {
      await sendOTPEmail(normalizedEmail, otp);
      console.log(`sendOTP: Email sent successfully to ${normalizedEmail}`);
    } catch (emailError) {
      console.log(`sendOTP: Email failed, but OTP stored: ${emailError.message}`);
      // Continue even if email fails - OTP is stored for console testing
    }

    return res.status(200).json({ 
      message: "OTP sent successfully",
      email: normalizedEmail,
      expiresIn: 5 * 60 // 5 minutes in seconds
    });
    
  } catch (err) {
    console.error("sendOTP error:", err);
    return res.status(500).json({ 
      error: "Failed to send OTP",
      code: "SERVER_ERROR"
    });
  }
}

export async function verifyOTP(req, res) {
  try {
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ 
        error: "Email and OTP are required",
        code: "MISSING_CREDENTIALS"
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Verify OTP using Redis service
    const verificationResult = await otpService.verifyOTP(normalizedEmail, String(otp).trim(), 'login');

    if (!verificationResult.success) {
      let statusCode = 400;
      
      switch (verificationResult.code) {
        case 'OTP_EXPIRED':
          statusCode = 400;
          break;
        case 'MAX_ATTEMPTS':
          statusCode = 429;
          break;
        case 'OTP_INVALID':
          statusCode = 401;
          break;
        default:
          statusCode = 500;
      }

      return res.status(statusCode).json({
        error: verificationResult.message,
        code: verificationResult.code,
        remainingAttempts: verificationResult.remainingAttempts
      });
    }

    // OTP is valid, get user details
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ 
        error: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    // Generate JWT token for automatic login
    const isAdmin = user.is_admin === true || user.role === "admin";
    const role = user.role || (isAdmin ? "admin" : "student");
    
    const token = jwt.sign(
      { id: user._id, role, is_admin: isAdmin },
      JWT_SECRET,
      { expiresIn: JWT_CONFIG.expiresIn }
    );

    // Determine redirect based on role
    let redirect;
    switch (role) {
      case "admin":
        redirect = "/admin/dashboard";
        break;
      case "hod":
        redirect = "/hod/dashboard";
        break;
      case "teacher":
        redirect = "/teacher/dashboard";
        break;
      default:
        redirect = "/student/dashboard";
    }

    console.log(`[OTP_LOGIN] ${normalizedEmail} - Role: ${role}`);

    return res.status(200).json({
      message: "OTP verified successfully",
      email: normalizedEmail,
      role,
      redirect,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("verifyOTP error:", err);
    return res.status(500).json({ 
      error: "Failed to verify OTP",
      code: "SERVER_ERROR"
    });
  }
}
