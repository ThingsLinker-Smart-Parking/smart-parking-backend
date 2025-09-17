const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'unverified@example.com';
const TEST_PASSWORD = 'password123';
const TEST_FIRST_NAME = 'Unverified';
const TEST_LAST_NAME = 'User';

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
            status: error.response?.status || 500,
            data: error.response?.data || null
        };
    }
};

// Test 1: First registration attempt
const testFirstRegistration = async () => {
    console.log('🧪 Testing First Registration Attempt...');
    
    const signupData = {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        firstName: TEST_FIRST_NAME,
        lastName: TEST_LAST_NAME,
        role: 'user'
    };

    const result = await makeRequest('POST', '/auth/signup', signupData);
    
    if (result.success && result.data.success) {
        logResult('First Registration', true, 'User created successfully', result.data);
        return true;
    } else {
        logResult('First Registration', false, result.message || 'First registration failed');
        return false;
    }
};

// Test 2: Second registration attempt (should update existing user)
const testSecondRegistration = async () => {
    console.log('🧪 Testing Second Registration Attempt (Same Email)...');
    
    const signupData = {
        email: TEST_EMAIL,
        password: 'newpassword123',
        firstName: 'Updated',
        lastName: 'User',
        role: 'user'
    };

    const result = await makeRequest('POST', '/auth/signup', signupData);
    
    if (result.success && result.data.success && result.data.isExistingUser) {
        logResult('Second Registration', true, 'Existing user updated successfully', result.data);
        return true;
    } else {
        logResult('Second Registration', false, result.message || 'Second registration failed');
        return false;
    }
};

// Test 3: Third registration attempt (OTP still valid)
const testThirdRegistration = async () => {
    console.log('🧪 Testing Third Registration Attempt (OTP Still Valid)...');
    
    const signupData = {
        email: TEST_EMAIL,
        password: 'anotherpassword',
        firstName: 'Another',
        lastName: 'Attempt',
        role: 'user'
    };

    const result = await makeRequest('POST', '/auth/signup', signupData);
    
    if (!result.success && result.status === 400 && result.data?.code === 'OTP_STILL_VALID') {
        logResult('Third Registration', true, 'Correctly blocked - OTP still valid', result.data);
        return true;
    } else {
        logResult('Third Registration', false, 'Should have been blocked due to valid OTP');
        return false;
    }
};

// Test 4: Account recovery endpoint
const testAccountRecovery = async () => {
    console.log('🧪 Testing Account Recovery Endpoint...');
    
    const recoveryData = {
        email: TEST_EMAIL
    };

    const result = await makeRequest('POST', '/auth/recover-account', recoveryData);
    
    if (result.success && result.data.success) {
        logResult('Account Recovery', true, 'Account recovered successfully', result.data);
        return true;
    } else {
        logResult('Account Recovery', false, result.message || 'Account recovery failed');
        return false;
    }
};

// Test 5: Verify OTP after recovery
const testVerifyOTPAfterRecovery = async () => {
    console.log('🧪 Testing OTP Verification After Recovery...');
    console.log('   Note: Check server console for the new OTP');
    
    // You'll need to get the OTP from server console
    const verifyData = {
        email: TEST_EMAIL,
        otp: '123456' // Replace with actual OTP from server console
    };

    const result = await makeRequest('POST', '/auth/verify-otp', verifyData);
    
    if (result.success && result.data.success) {
        logResult('OTP Verification After Recovery', true, 'Email verified successfully');
        return true;
    } else {
        logResult('OTP Verification After Recovery', false, result.message || 'OTP verification failed');
        return false;
    }
};

// Test 6: Try registration after verification (should fail)
const testRegistrationAfterVerification = async () => {
    console.log('🧪 Testing Registration After Verification...');
    
    const signupData = {
        email: TEST_EMAIL,
        password: 'finalpassword',
        firstName: 'Final',
        lastName: 'Attempt',
        role: 'user'
    };

    const result = await makeRequest('POST', '/auth/signup', signupData);
    
    if (!result.success && result.status === 400 && result.data?.code === 'USER_VERIFIED') {
        logResult('Registration After Verification', true, 'Correctly blocked - user already verified', result.data);
        return true;
    } else {
        logResult('Registration After Verification', false, 'Should have been blocked - user is verified');
        return false;
    }
};

// Test 7: Login after verification (should succeed)
const testLoginAfterVerification = async () => {
    console.log('🧪 Testing Login After Verification...');
    
    const loginData = {
        email: TEST_EMAIL,
        password: 'newpassword123' // Use the password from second registration
    };

    const result = await makeRequest('POST', '/auth/login', loginData);
    
    if (result.success && result.data.success) {
        logResult('Login After Verification', true, 'Login successful after verification');
        return true;
    } else {
        logResult('Login After Verification', false, result.message || 'Login failed');
        return false;
    }
};

// Main test runner
const runTests = async () => {
    console.log('🚀 Starting Unverified User Handling Tests...\n');
    
    const tests = [
        { name: 'First Registration', fn: testFirstRegistration },
        { name: 'Second Registration (Update)', fn: testSecondRegistration },
        { name: 'Third Registration (Blocked)', fn: testThirdRegistration },
        { name: 'Account Recovery', fn: testAccountRecovery },
        { name: 'OTP Verification After Recovery', fn: testVerifyOTPAfterRecovery },
        { name: 'Registration After Verification (Blocked)', fn: testRegistrationAfterVerification },
        { name: 'Login After Verification', fn: testLoginAfterVerification }
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
        console.log('\n🎉 All tests passed! Your unverified user handling is working perfectly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
};

// Instructions for manual testing
console.log('📋 Unverified User Handling Test Instructions:');
console.log('1. Start your server: npm run dev');
console.log('2. Check server console for OTP codes during testing');
console.log('3. Update OTP variables in the test script as needed');
console.log('4. Run this test script: node test-unverified-user.js');
console.log('');

// Export for manual testing
module.exports = {
    testFirstRegistration,
    testSecondRegistration,
    testThirdRegistration,
    testAccountRecovery,
    testVerifyOTPAfterRecovery,
    testRegistrationAfterVerification,
    testLoginAfterVerification,
    runTests
};

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}
