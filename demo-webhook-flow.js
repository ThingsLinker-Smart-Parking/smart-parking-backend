const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';

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

// Step 1: Create a new subscription (this creates a pending payment)
const createTestSubscription = async (authToken) => {
    console.log('🔨 Step 1: Creating a new subscription...');
    
    const subscriptionData = {
        planId: 1, // Starter plan
        billingCycle: 'monthly',
        paymentMethod: 'stripe',
        nodeCount: 2,
        autoRenew: true,
        trialDays: 0 // No trial to get immediate payment
    };

    const result = await makeRequest('POST', '/subscriptions', subscriptionData, {
        'Authorization': `Bearer ${authToken}`
    });
    
    if (result.success) {
        console.log('✅ Subscription created successfully');
        console.log(`   Subscription ID: ${result.data.data.subscription.id}`);
        console.log(`   Payment ID: ${result.data.data.payment.id}`);
        console.log(`   Payment Status: ${result.data.data.payment.status}`);
        console.log(`   Transaction ID: ${result.data.data.payment.transactionId}`);
        return result.data.data;
    } else {
        console.log('❌ Failed to create subscription:', result.message);
        return null;
    }
};

// Step 2: Simulate payment gateway processing
const simulateGatewayProcessing = async (payment) => {
    console.log('\n🏦 Step 2: Simulating payment gateway processing...');
    
    // In real life, this would be Stripe/PayPal processing the payment
    const gatewayTransactionId = `stripe_pi_${Date.now()}_demo`;
    
    console.log(`   Gateway assigned ID: ${gatewayTransactionId}`);
    console.log('   Gateway processing payment...');
    console.log('   Payment approved by gateway');
    
    return gatewayTransactionId;
};

// Step 3: Receive webhook from payment gateway
const processWebhook = async (gatewayTransactionId) => {
    console.log('\n🔔 Step 3: Processing webhook from payment gateway...');
    
    const webhookData = {
        gatewayTransactionId: gatewayTransactionId,
        status: 'succeeded', // or 'completed'
        metadata: {
            amount: 3399, // $33.99 (Starter + 2 nodes)
            currency: 'usd',
            payment_method: 'card',
            last4: '4242'
        }
    };

    console.log('📤 Webhook payload:', JSON.stringify(webhookData, null, 2));
    
    const result = await makeRequest('POST', '/subscriptions/webhooks/payment', webhookData);
    
    if (result.success) {
        console.log('✅ Webhook processed successfully');
        console.log('   Payment status updated to completed');
        console.log('   Subscription activated');
        return true;
    } else {
        console.log('❌ Webhook processing failed:', result.message);
        return false;
    }
};

// Step 4: Process payment directly (alternative to webhook)
const processPaymentDirectly = async (paymentId, gatewayTransactionId) => {
    console.log('\n💳 Step 4 (Alternative): Processing payment directly...');
    
    const paymentData = {
        paymentId: paymentId,
        gatewayTransactionId: gatewayTransactionId,
        success: true
    };

    console.log('📤 Payment processing data:', JSON.stringify(paymentData, null, 2));
    
    const result = await makeRequest('POST', '/subscriptions/payments/process', paymentData);
    
    if (result.success) {
        console.log('✅ Payment processed successfully');
        console.log(`   Payment ID: ${result.data.data.id}`);
        console.log(`   Status: ${result.data.data.status}`);
        return true;
    } else {
        console.log('❌ Payment processing failed:', result.message);
        return false;
    }
};

// Main demonstration
const demonstrateWebhookFlow = async () => {
    console.log('🚀 Demonstrating Complete Webhook Flow\n');
    console.log('This shows how gatewayTransactionId works in real payment processing:\n');
    
    // For this demo, we'll simulate having an auth token
    // In reality, you'd need to login first
    const authToken = 'your_auth_token_here';
    
    console.log('ℹ️  Note: This demo requires a valid auth token');
    console.log('ℹ️  To get one, login via: POST /api/auth/login\n');
    
    // Simulate the flow without actual API calls
    console.log('📋 Simulated Flow:');
    console.log('1. User creates subscription → Payment created with pending status');
    console.log('2. System sends payment to Stripe → Gets gatewayTransactionId');
    console.log('3. Stripe processes payment → Sends webhook with their ID');
    console.log('4. Our webhook handler → Finds payment and updates status\n');
    
    // Show real payment structure
    console.log('📝 Payment Record Structure:');
    console.log(`{
  "id": 123,
  "transactionId": "TXN_INTERNAL_123",  // Our tracking ID
  "status": "pending",                   // Initially pending
  "metadata": {
    "gatewayTransactionId": null         // Set later
  }
}`);
    
    console.log('\n🏦 After Gateway Processing:');
    console.log(`{
  "id": 123,
  "transactionId": "TXN_INTERNAL_123",
  "status": "pending",                   // Still pending until webhook
  "metadata": {
    "gatewayTransactionId": "pi_1234567890"  // Gateway's ID stored
  }
}`);
    
    console.log('\n🔔 Webhook Arrives:');
    console.log(`{
  "gatewayTransactionId": "pi_1234567890",  // Gateway uses their ID
  "status": "succeeded"
}`);
    
    console.log('\n✅ After Webhook Processing:');
    console.log(`{
  "id": 123,
  "transactionId": "TXN_INTERNAL_123",
  "status": "completed",                    // Updated by webhook
  "metadata": {
    "gatewayTransactionId": "pi_1234567890",
    "processedAt": "2025-09-13T16:30:00.000Z"
  }
}`);
    
    console.log('\n🎯 Key Points:');
    console.log('• gatewayTransactionId bridges our system with payment gateway');
    console.log('• Webhooks use gateway IDs to identify payments');
    console.log('• We store both our ID and gateway ID for complete tracking');
    console.log('• Prevents double-processing with status checks');
    
    console.log('\n✨ Your Payment Analysis:');
    console.log('Your payment "1321424sad" was already processed, which is why');
    console.log('the webhook returned an error - it prevents double-processing!');
};

// Run the demonstration
if (require.main === module) {
    demonstrateWebhookFlow();
}

module.exports = { demonstrateWebhookFlow };