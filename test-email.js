const { emailService } = require('./dist/services/emailService');

async function testEmailService() {
    console.log('📧 Testing Email Service Configuration...\n');

    try {
        // Test 1: Check configuration
        console.log('🔧 Email Configuration:');
        const config = emailService.getConfig();
        console.log(JSON.stringify(config, null, 2));
        console.log('');

        // Test 2: Test connection
        console.log('🔌 Testing SMTP Connection...');
        const connectionTest = await emailService.testConnection();
        if (connectionTest) {
            console.log('✅ SMTP connection successful!\n');
        } else {
            console.log('❌ SMTP connection failed!\n');
            return;
        }

        // Test 3: Send test OTP email
        console.log('📤 Sending Test OTP Email...');
        const testEmail = 'test@example.com'; // Change this to your test email
        const testOTP = '123456';
        
        const otpResult = await emailService.sendOtpEmail(testEmail, testOTP, 'verification');
        if (otpResult) {
            console.log('✅ OTP email sent successfully!');
            console.log(`   Check your inbox at: ${testEmail}`);
        } else {
            console.log('❌ Failed to send OTP email');
        }
        console.log('');

        // Test 4: Send test welcome email
        console.log('📤 Sending Test Welcome Email...');
        const welcomeResult = await emailService.sendWelcomeEmail(testEmail, 'Test User');
        if (welcomeResult) {
            console.log('✅ Welcome email sent successfully!');
            console.log(`   Check your inbox at: ${testEmail}`);
        } else {
            console.log('❌ Failed to send welcome email');
        }
        console.log('');

        console.log('🎉 Email service testing completed!');
        console.log('📧 Check your email inbox for the test emails.');
        
    } catch (error) {
        console.error('❌ Error during email testing:', error);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    console.log('🚀 Email Service Test Script');
    console.log('============================\n');
    
    // Check if dist folder exists
    const fs = require('fs');
    if (!fs.existsSync('./dist')) {
        console.log('⚠️  Build folder not found. Building the project first...');
        const { execSync } = require('child_process');
        try {
            execSync('npm run build', { stdio: 'inherit' });
            console.log('✅ Build completed successfully!\n');
        } catch (error) {
            console.error('❌ Build failed:', error.message);
            console.log('\n💡 Try running: npm run build');
            process.exit(1);
        }
    }
    
    testEmailService();
}

module.exports = { testEmailService };
