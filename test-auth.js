const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';
const TEST_FIRST_NAME = 'Test';
const TEST_LAST_NAME = 'User';

// Test user data
let testUser = null;
let authToken = null;
let verificationOTP = null;

// Helper function to log results
const logResult = (testName, success, message, data = null) => {
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}: ${message}`);
    if (data) {
        console.log('   Data:', JSON.stringify(data, null, 2));
    }
    console.log('');
};

// Helper function to make API calls
const makeRequest = async (method, endpoint, data = null, headers = {}) => {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || error.message,
            status: error.response?.status || 500
        };
    }
};

// Test 1: User Signup
const testSignup = async () => {
    console.log('🧪 Testing User Signup...');
    
    const signupData = {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        firstName: TEST_FIRST_NAME,
        lastName: TEST_LAST_NAME,
        role: 'user'
    };

    const result = await makeRequest('POST', '/auth/signup', signupData);
    
    if (result.success && result.data.success) {
        testUser = result.data.data;
        logResult('User Signup', true, 'User created successfully', testUser);
        return true;
    } else {
        logResult('User Signup', false, result.message || 'Signup failed');
        return false;
    }
};

// Test 2: Login (should fail - email not verified)
const testLoginBeforeVerification = async () => {
    console.log('🧪 Testing Login Before Email Verification...');
    
    const loginData = {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    };

    const result = await makeRequest('POST', '/auth/login', loginData);
    
    if (!result.success && result.status === 403) {
        logResult('Login Before Verification', true, 'Login correctly blocked - email not verified');
        return true;
    } else {
        logResult('Login Before Verification', false, 'Login should have been blocked');
        return false;
    }
};

// Test 3: Resend OTP
const testResendOTP = async () => {
    console.log('🧪 Testing OTP Resend...');
    
    const resendData = {
        email: TEST_EMAIL,
        purpose: 'verification'
    };

    const result = await makeRequest('POST', '/auth/resend-otp', resendData);
    
    if (result.success && result.data.success) {
        logResult('OTP Resend', true, 'OTP resent successfully');
        return true;
    } else {
        logResult('OTP Resend', false, result.message || 'OTP resend failed');
        return false;
    }
};

// Test 4: Verify OTP (this will get the OTP from console logs)
const testVerifyOTP = async () => {
    console.log('🧪 Testing OTP Verification...');
    console.log('   Note: Check console logs for OTP in development mode');
    
    // In development mode, OTP is logged to console
    // You'll need to manually check the server console and enter the OTP here
    console.log('   Please check your server console for the OTP and update the verificationOTP variable');
    
    if (!verificationOTP) {
        console.log('   ⚠️  Set verificationOTP variable with the OTP from server console');
        return false;
    }

    const verifyData = {
        email: TEST_EMAIL,
        otp: verificationOTP
    };

    const result = await makeRequest('POST', '/auth/verify-otp', verifyData);
    
    if (result.success && result.data.success) {
        logResult('OTP Verification', true, 'Email verified successfully');
        return true;
    } else {
        logResult('OTP Verification', false, result.message || 'OTP verification failed');
        return false;
    }
};

// Test 5: Login (should succeed - email verified)
const testLoginAfterVerification = async () => {
    console.log('🧪 Testing Login After Email Verification...');
    
    const loginData = {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
    };

    const result = await makeRequest('POST', '/auth/login', loginData);
    
    if (result.success && result.data.success) {
        authToken = result.data.data.token;
        logResult('Login After Verification', true, 'Login successful', { token: authToken.substring(0, 20) + '...' });
        return true;
    } else {
        logResult('Login After Verification', false, result.message || 'Login failed');
        return false;
    }
};

// Test 6: Forgot Password
const testForgotPassword = async () => {
    console.log('🧪 Testing Forgot Password...');
    
    const forgotData = {
        email: TEST_EMAIL
    };

    const result = await makeRequest('POST', '/auth/forgot-password', forgotData);
    
    if (result.success && result.data.success) {
        logResult('Forgot Password', true, 'Password reset OTP sent');
        return true;
    } else {
        logResult('Forgot Password', false, result.message || 'Forgot password failed');
        return false;
    }
};

// Test 7: Reset Password
const testResetPassword = async () => {
    console.log('🧪 Testing Password Reset...');
    
    // You'll need to get the password reset OTP from console logs
    console.log('   Note: Check console logs for password reset OTP');
    
    const resetData = {
        email: TEST_EMAIL,
        otp: '123456', // Replace with actual OTP from console
        newPassword: 'newpassword123'
    };

    const result = await makeRequest('POST', '/auth/reset-password', resetData);
    
    if (result.success && result.data.success) {
        logResult('Password Reset', true, 'Password reset successfully');
        return true;
    } else {
        logResult('Password Reset', false, result.message || 'Password reset failed');
        return false;
    }
};

// Test 8: Login with New Password
const testLoginWithNewPassword = async () => {
    console.log('🧪 Testing Login with New Password...');
    
    const loginData = {
        email: TEST_EMAIL,
        password: 'newpassword123'
    };

    const result = await makeRequest('POST', '/auth/login', loginData);
    
    if (result.success && result.data.success) {
        authToken = result.data.data.token;
        logResult('Login with New Password', true, 'Login successful with new password');
        return true;
    } else {
        logResult('Login with New Password', false, result.message || 'Login with new password failed');
        return false;
    }
};

// Test 9: Get OTP Configuration (Admin only)
const testGetOTPConfig = async () => {
    console.log('🧪 Testing Get OTP Configuration...');
    
    if (!authToken) {
        logResult('Get OTP Config', false, 'No auth token available');
        return false;
    }

    const result = await makeRequest('GET', '/auth/otp-config', null, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Get OTP Config', true, 'OTP configuration retrieved', result.data.data);
        return true;
    } else {
        logResult('Get OTP Config', false, result.message || 'Failed to get OTP config');
        return false;
    }
};

// Test 10: Invalid OTP Test
const testInvalidOTP = async () => {
    console.log('🧪 Testing Invalid OTP...');
    
    const invalidData = {
        email: TEST_EMAIL,
        otp: '000000'
    };

    const result = await makeRequest('POST', '/auth/verify-otp', invalidData);
    
    if (!result.success && result.status === 400) {
        logResult('Invalid OTP Test', true, 'Correctly rejected invalid OTP');
        return true;
    } else {
        logResult('Invalid OTP Test', false, 'Should have rejected invalid OTP');
        return false;
    }
};

// Test 11: Rate Limiting Test
const testRateLimiting = async () => {
    console.log('🧪 Testing Rate Limiting...');
    
    const resendData = {
        email: TEST_EMAIL,
        purpose: 'verification'
    };

    // Make multiple rapid requests
    const promises = [];
    for (let i = 0; i < 3; i++) {
        promises.push(makeRequest('POST', '/auth/resend-otp', resendData));
    }

    const results = await Promise.all(promises);
    const rateLimited = results.some(result => result.status === 429);
    
    if (rateLimited) {
        logResult('Rate Limiting', true, 'Rate limiting working correctly');
        return true;
    } else {
        logResult('Rate Limiting', false, 'Rate limiting not working');
        return false;
    }
};

// Main test runner
const runTests = async () => {
    console.log('🚀 Starting Authentication API Tests...\n');
    
    const tests = [
        { name: 'User Signup', fn: testSignup },
        { name: 'Login Before Verification', fn: testLoginBeforeVerification },
        { name: 'Resend OTP', fn: testResendOTP },
        { name: 'Verify OTP', fn: testVerifyOTP },
        { name: 'Login After Verification', fn: testLoginAfterVerification },
        { name: 'Forgot Password', fn: testForgotPassword },
        { name: 'Reset Password', fn: testResetPassword },
        { name: 'Login with New Password', fn: testLoginWithNewPassword },
        { name: 'Get OTP Config', fn: testGetOTPConfig },
        { name: 'Invalid OTP Test', fn: testInvalidOTP },
        { name: 'Rate Limiting Test', fn: testRateLimiting }
    ];

    let passed = 0;
    let total = tests.length;

    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) passed++;
        } catch (error) {
            console.log(`❌ ${test.name}: Error - ${error.message}\n`);
        }
    }

    console.log('📊 Test Results:');
    console.log(`   Passed: ${passed}/${total}`);
    console.log(`   Success Rate: ${Math.round((passed / total) * 100)}%`);
    
    if (passed === total) {
        console.log('\n🎉 All tests passed! Your authentication system is working perfectly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
};

// Instructions for manual testing
console.log('📋 Manual Testing Instructions:');
console.log('1. Start your server: npm run dev');
console.log('2. Check server console for OTP codes during testing');
console.log('3. Update verificationOTP variable with the OTP from console');
console.log('4. Run this test script: node test-auth.js');
console.log('');

// Export for manual testing
module.exports = {
    testSignup,
    testLoginBeforeVerification,
    testResendOTP,
    testVerifyOTP,
    testLoginAfterVerification,
    testForgotPassword,
    testResetPassword,
    testLoginWithNewPassword,
    testGetOTPConfig,
    testInvalidOTP,
    testRateLimiting,
    runTests
};

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}
