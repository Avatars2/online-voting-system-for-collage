import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Email Configuration Check');
console.log('============================');

// Check email configuration
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✓ Set' : '✗ NOT SET');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✓ Set' : '✗ NOT SET');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.log('\n❌ EMAIL NOT CONFIGURED');
  console.log('\n🔧 SOLUTION:');
  console.log('1. Create .env file in backend folder');
  console.log('2. Add these lines:');
  console.log('   EMAIL_USER=your-gmail@gmail.com');
  console.log('   EMAIL_PASS=your-16-digit-app-password');
  console.log('\n📝 STEPS:');
  console.log('1. Enable 2-factor authentication on Gmail');
  console.log('2. Go to: https://myaccount.google.com/apppasswords');
  console.log('3. Create App Password for "Mail"');
  console.log('4. Copy the 16-character password');
  console.log('5. Add to EMAIL_PASS in .env file');
} else {
  console.log('\n✅ Email configuration found');
  console.log('📧 Email User:', process.env.EMAIL_USER);
  console.log('🔑 Email Pass: [HIDDEN]');
  console.log('\n🧪 To test email service:');
  console.log('   node test-email.js');
}
