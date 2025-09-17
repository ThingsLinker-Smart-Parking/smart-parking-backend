const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
let authToken = null;
let testUser = null;
let testSubscription = null;

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

// Test 1: Get subscription plans (public)
const testGetSubscriptionPlans = async () => {
    console.log('🧪 Testing Get Subscription Plans (Public)...');
    
    const result = await makeRequest('GET', '/subscriptions/plans');
    
    if (result.success && result.data.success && result.data.data.length > 0) {
        logResult('Get Subscription Plans', true, `Retrieved ${result.data.data.length} plans`, result.data.data[0]);
        return true;
    } else {
        logResult('Get Subscription Plans', false, result.message || 'Failed to get subscription plans');
        return false;
    }
};

// Test 2: Get specific subscription plan
const testGetSubscriptionPlan = async () => {
    console.log('🧪 Testing Get Specific Subscription Plan...');
    
    const result = await makeRequest('GET', '/subscriptions/plans/1');
    
    if (result.success && result.data.success) {
        logResult('Get Specific Plan', true, 'Plan retrieved successfully', result.data.data);
        return true;
    } else {
        logResult('Get Specific Plan', false, result.message || 'Failed to get specific plan');
        return false;
    }
};

// Test 3: Create subscription (requires auth)
const testCreateSubscription = async () => {
    console.log('🧪 Testing Create Subscription...');
    
    if (!authToken) {
        logResult('Create Subscription', false, 'No auth token available - skipping');
        return false;
    }
    
    const subscriptionData = {
        planId: 1,
        billingCycle: 'monthly',
        paymentMethod: 'stripe',
        nodeCount: 5,
        autoRenew: true,
        trialDays: 7
    };

    const result = await makeRequest('POST', '/subscriptions', subscriptionData, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success && result.data.success) {
        testSubscription = result.data.data.subscription;
        logResult('Create Subscription', true, 'Subscription created successfully', result.data.data);
        return true;
    } else {
        logResult('Create Subscription', false, result.message || 'Failed to create subscription');
        return false;
    }
};

// Test 4: Get user's current subscription
const testGetCurrentSubscription = async () => {
    console.log('🧪 Testing Get Current Subscription...');
    
    if (!authToken) {
        logResult('Get Current Subscription', false, 'No auth token available - skipping');
        return false;
    }

    const result = await makeRequest('GET', '/subscriptions/current', null, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Get Current Subscription', true, 'Current subscription retrieved', result.data.data);
        return true;
    } else {
        logResult('Get Current Subscription', false, result.message || 'Failed to get current subscription');
        return false;
    }
};

// Test 5: Get subscription history
const testGetSubscriptionHistory = async () => {
    console.log('🧪 Testing Get Subscription History...');
    
    if (!authToken) {
        logResult('Get Subscription History', false, 'No auth token available - skipping');
        return false;
    }

    const result = await makeRequest('GET', '/subscriptions/history', null, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Get Subscription History', true, 'Subscription history retrieved', result.data.data);
        return true;
    } else {
        logResult('Get Subscription History', false, result.message || 'Failed to get subscription history');
        return false;
    }
};

// Test 6: Get payment history
const testGetPaymentHistory = async () => {
    console.log('🧪 Testing Get Payment History...');
    
    if (!authToken) {
        logResult('Get Payment History', false, 'No auth token available - skipping');
        return false;
    }

    const result = await makeRequest('GET', '/subscriptions/payments', null, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Get Payment History', true, 'Payment history retrieved', result.data.data);
        return true;
    } else {
        logResult('Get Payment History', false, result.message || 'Failed to get payment history');
        return false;
    }
};

// Test 7: Get subscription analytics
const testGetSubscriptionAnalytics = async () => {
    console.log('🧪 Testing Get Subscription Analytics...');
    
    if (!authToken) {
        logResult('Get Subscription Analytics', false, 'No auth token available - skipping');
        return false;
    }

    const result = await makeRequest('GET', '/subscriptions/analytics', null, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Get Subscription Analytics', true, 'Analytics retrieved successfully', result.data.data);
        return true;
    } else {
        logResult('Get Subscription Analytics', false, result.message || 'Failed to get analytics');
        return false;
    }
};

// Test 8: Check subscription limits
const testCheckSubscriptionLimits = async () => {
    console.log('🧪 Testing Check Subscription Limits...');
    
    if (!authToken) {
        logResult('Check Subscription Limits', false, 'No auth token available - skipping');
        return false;
    }

    const result = await makeRequest('GET', '/subscriptions/limits?resource=gateways&currentUsage=1', null, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Check Subscription Limits', true, 'Limits checked successfully', result.data.data);
        return true;
    } else {
        logResult('Check Subscription Limits', false, result.message || 'Failed to check limits');
        return false;
    }
};

// Test 9: Cancel subscription
const testCancelSubscription = async () => {
    console.log('🧪 Testing Cancel Subscription...');
    
    if (!authToken || !testSubscription) {
        logResult('Cancel Subscription', false, 'No auth token or subscription available - skipping');
        return false;
    }

    const cancelData = {
        reason: 'Testing cancellation functionality'
    };

    const result = await makeRequest('POST', `/subscriptions/${testSubscription.id}/cancel`, cancelData, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Cancel Subscription', true, 'Subscription cancelled successfully', result.data.data);
        return true;
    } else {
        logResult('Cancel Subscription', false, result.message || 'Failed to cancel subscription');
        return false;
    }
};

// Test 10: Admin - Get all active subscriptions
const testGetAllActiveSubscriptions = async () => {
    console.log('🧪 Testing Admin - Get All Active Subscriptions...');
    
    if (!authToken) {
        logResult('Admin Get All Active', false, 'No auth token available - skipping');
        return false;
    }

    const result = await makeRequest('GET', '/subscriptions/admin/active', null, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Admin Get All Active', true, 'All active subscriptions retrieved', result.data.data);
        return true;
    } else {
        logResult('Admin Get All Active', false, result.message || 'Failed to get all active subscriptions');
        return false;
    }
};

// Test 11: Admin - Get expiring subscriptions
const testGetExpiringSubscriptions = async () => {
    console.log('🧪 Testing Admin - Get Expiring Subscriptions...');
    
    if (!authToken) {
        logResult('Admin Get Expiring', false, 'No auth token available - skipping');
        return false;
    }

    const result = await makeRequest('GET', '/subscriptions/admin/expiring?days=30', null, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Admin Get Expiring', true, 'Expiring subscriptions retrieved', result.data.data);
        return true;
    } else {
        logResult('Admin Get Expiring', false, result.message || 'Failed to get expiring subscriptions');
        return false;
    }
};

// Setup function to create test user and get auth token
const setupTestUser = async () => {
    console.log('🔧 Setting up test user...');
    
    // Create test user
    const signupData = {
        email: 'subscription-test@example.com',
        password: 'password123',
        firstName: 'Subscription',
        lastName: 'Test',
        role: 'admin'
    };

    const signupResult = await makeRequest('POST', '/auth/signup', signupData);
    if (!signupResult.success) {
        console.log('⚠️  User might already exist, trying to login...');
    }

    // Login to get auth token
    const loginData = {
        email: 'subscription-test@example.com',
        password: 'password123'
    };

    const loginResult = await makeRequest('POST', '/auth/login', loginData);
    if (loginResult.success && loginResult.data.success) {
        authToken = loginResult.data.data.token;
        testUser = loginResult.data.data.user;
        console.log('✅ Test user authenticated successfully');
        return true;
    } else {
        console.log('❌ Failed to authenticate test user');
        return false;
    }
};

// Main test runner
const runTests = async () => {
    console.log('🚀 Starting Subscription System Tests...\n');
    
    // Setup test user first
    const setupSuccess = await setupTestUser();
    if (!setupSuccess) {
        console.log('⚠️  Some tests will be skipped due to authentication issues\n');
    }
    
    const tests = [
        { name: 'Get Subscription Plans (Public)', fn: testGetSubscriptionPlans },
        { name: 'Get Specific Plan', fn: testGetSubscriptionPlan },
        { name: 'Create Subscription', fn: testCreateSubscription },
        { name: 'Get Current Subscription', fn: testGetCurrentSubscription },
        { name: 'Get Subscription History', fn: testGetSubscriptionHistory },
        { name: 'Get Payment History', fn: testGetPaymentHistory },
        { name: 'Get Subscription Analytics', fn: testGetSubscriptionAnalytics },
        { name: 'Check Subscription Limits', fn: testCheckSubscriptionLimits },
        { name: 'Cancel Subscription', fn: testCancelSubscription },
        { name: 'Admin - Get All Active', fn: testGetAllActiveSubscriptions },
        { name: 'Admin - Get Expiring', fn: testGetExpiringSubscriptions }
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
        console.log('\n🎉 All tests passed! Your subscription system is working perfectly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
};

// Instructions for manual testing
console.log('📋 Subscription System Test Instructions:');
console.log('1. Start your server: npm run dev');
console.log('2. Seed subscription plans: npm run seed:plans');
console.log('3. Run this test script: node test-subscription.js');
console.log('4. Check server console for any errors');
console.log('');

// Export for manual testing
module.exports = {
    testGetSubscriptionPlans,
    testGetSubscriptionPlan,
    testCreateSubscription,
    testGetCurrentSubscription,
    testGetSubscriptionHistory,
    testGetPaymentHistory,
    testGetSubscriptionAnalytics,
    testCheckSubscriptionLimits,
    testCancelSubscription,
    testGetAllActiveSubscriptions,
    testGetExpiringSubscriptions,
    runTests
};

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}
