const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test user credentials
const testUser = {
    email: 'admin-test@example.com',
    password: 'password123',
    firstName: 'Admin',
    lastName: 'Test',
    role: 'admin'
};

let authToken = null;

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

// Step 1: Create test user
const createTestUser = async () => {
    console.log('👤 Step 1: Creating test user...');
    
    const result = await makeRequest('POST', '/auth/signup', testUser);
    
    if (result.success) {
        console.log('✅ User created successfully');
        return true;
    } else if (result.status === 400 && result.data?.code === 'USER_VERIFIED') {
        console.log('ℹ️  User already exists and verified');
        return true;
    } else {
        console.log('⚠️  User creation result:', result.message);
        return false;
    }
};

// Step 2: Login to get auth token
const loginUser = async () => {
    console.log('🔐 Step 2: Logging in user...');
    
    const loginData = {
        email: testUser.email,
        password: testUser.password
    };

    const result = await makeRequest('POST', '/auth/login', loginData);
    
    if (result.success && result.data.success) {
        authToken = result.data.data.token;
        console.log('✅ Login successful, got auth token');
        return true;
    } else {
        console.log('❌ Login failed:', result.message);
        return false;
    }
};

// Step 3: View available subscription plans
const viewSubscriptionPlans = async () => {
    console.log('📋 Step 3: Viewing subscription plans...');
    
    const result = await makeRequest('GET', '/subscriptions/plans');
    
    if (result.success && result.data.success) {
        console.log('✅ Subscription plans retrieved:');
        result.data.data.forEach(plan => {
            console.log(`   • ${plan.name}: $${plan.basePricePerMonth}/month + $${plan.pricePerNodePerMonth}/node`);
            console.log(`     Features: ${plan.features?.slice(0, 3).join(', ')}...`);
        });
        return result.data.data;
    } else {
        console.log('❌ Failed to get subscription plans:', result.message);
        return null;
    }
};

// Step 4: Create subscription
const createSubscription = async (planId, nodeCount = 5) => {
    console.log(`💳 Step 4: Creating subscription to plan ${planId} with ${nodeCount} nodes...`);
    
    if (!authToken) {
        console.log('❌ No auth token available');
        return false;
    }

    const subscriptionData = {
        planId: planId,
        billingCycle: 'monthly',
        paymentMethod: 'stripe',
        nodeCount: nodeCount,
        autoRenew: true,
        trialDays: 7
    };

    const result = await makeRequest('POST', '/subscriptions', subscriptionData, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success && result.data.success) {
        console.log('✅ Subscription created successfully!');
        console.log(`   Plan: ${result.data.data.subscription.plan.name}`);
        console.log(`   Amount: $${result.data.data.subscription.amount}`);
        console.log(`   Status: ${result.data.data.subscription.status}`);
        console.log(`   Payment ID: ${result.data.data.payment.id}`);
        return result.data.data;
    } else {
        console.log('❌ Failed to create subscription:', result.message);
        if (result.data?.existingSubscription) {
            console.log('   Existing subscription found:', result.data.existingSubscription);
        }
        return false;
    }
};

// Step 5: View current subscription
const viewCurrentSubscription = async () => {
    console.log('📊 Step 5: Viewing current subscription...');
    
    if (!authToken) {
        console.log('❌ No auth token available');
        return false;
    }

    const result = await makeRequest('GET', '/subscriptions/current', null, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success && result.data.success) {
        console.log('✅ Current subscription:');
        const sub = result.data.data;
        console.log(`   Plan: ${sub.plan.name}`);
        console.log(`   Amount: $${sub.amount}`);
        console.log(`   Status: ${sub.status}`);
        console.log(`   Billing Cycle: ${sub.billingCycle}`);
        console.log(`   Start Date: ${sub.startDate}`);
        console.log(`   End Date: ${sub.endDate}`);
        return sub;
    } else {
        console.log('❌ Failed to get current subscription:', result.message);
        return false;
    }
};

// Step 6: View subscription analytics
const viewAnalytics = async () => {
    console.log('📈 Step 6: Viewing subscription analytics...');
    
    if (!authToken) {
        console.log('❌ No auth token available');
        return false;
    }

    const result = await makeRequest('GET', '/subscriptions/analytics', null, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success && result.data.success) {
        console.log('✅ Analytics retrieved:');
        const analytics = result.data.data;
        console.log(`   Total Spent: $${analytics.totalSpent}`);
        console.log(`   Payment Count: ${analytics.paymentCount}`);
        console.log(`   Next Billing: ${analytics.nextBillingDate || 'N/A'}`);
        console.log(`   Days Until Expiry: ${analytics.daysUntilExpiry || 'N/A'}`);
        return analytics;
    } else {
        console.log('❌ Failed to get analytics:', result.message);
        return false;
    }
};

// Main test flow
const runSubscriptionFlow = async () => {
    console.log('🚀 Starting Complete Subscription Flow Test...\n');
    
    try {
        // Step 1: Create user
        await createTestUser();
        console.log('');
        
        // Step 2: Login
        const loginSuccess = await loginUser();
        if (!loginSuccess) {
            console.log('❌ Cannot continue without authentication');
            return;
        }
        console.log('');
        
        // Step 3: View plans
        const plans = await viewSubscriptionPlans();
        if (!plans || plans.length === 0) {
            console.log('❌ No subscription plans available');
            return;
        }
        console.log('');
        
        // Step 4: Create subscription (choose first plan)
        const subscription = await createSubscription(plans[0].id, 5);
        if (!subscription) {
            console.log('❌ Subscription creation failed');
            return;
        }
        console.log('');
        
        // Step 5: View current subscription
        await viewCurrentSubscription();
        console.log('');
        
        // Step 6: View analytics
        await viewAnalytics();
        console.log('');
        
        console.log('🎉 Subscription flow test completed successfully!');
        
    } catch (error) {
        console.error('💥 Error during subscription flow:', error.message);
    }
};

// Run the test if this file is executed directly
if (require.main === module) {
    runSubscriptionFlow();
}

module.exports = {
    createTestUser,
    loginUser,
    viewSubscriptionPlans,
    createSubscription,
    viewCurrentSubscription,
    viewAnalytics,
    runSubscriptionFlow
};
