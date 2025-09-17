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

// Test webhook with existing transaction ID
const testWebhookWithExistingTransaction = async () => {
    console.log('🧪 Testing webhook with existing transaction...');
    
    // First, let's create a subscription to get a real transaction ID
    // For this demo, we'll simulate what a real webhook would look like
    
    const webhookData = {
        gatewayTransactionId: "TXN_1L9KX74TLG_ABC123", // This should match a real transaction
        status: "completed",
        metadata: {
            amount: 2999,
            currency: "usd",
            description: "Test webhook processing"
        }
    };

    console.log('📤 Sending webhook:', JSON.stringify(webhookData, null, 2));
    
    const result = await makeRequest('POST', '/subscriptions/webhooks/payment', webhookData);
    
    if (result.success) {
        console.log('✅ Webhook processed successfully:', result.data);
    } else {
        console.log('❌ Webhook failed:', result.message);
        console.log('📝 Response:', result.data);
    }
    
    return result;
};

// Test webhook with unknown transaction ID
const testWebhookWithUnknownTransaction = async () => {
    console.log('\n🧪 Testing webhook with unknown transaction...');
    
    const webhookData = {
        gatewayTransactionId: "unknown_transaction_12345",
        status: "completed"
    };

    console.log('📤 Sending webhook:', JSON.stringify(webhookData, null, 2));
    
    const result = await makeRequest('POST', '/subscriptions/webhooks/payment', webhookData);
    
    if (result.success) {
        console.log('✅ Webhook processed successfully:', result.data);
    } else {
        console.log('❌ Webhook failed (expected):', result.message);
        console.log('📝 This is expected behavior - no payment found with this ID');
    }
    
    return result;
};

// Test payment processing endpoint
const testPaymentProcessing = async () => {
    console.log('\n🧪 Testing payment processing endpoint...');
    
    const paymentData = {
        paymentId: 1, // Assuming payment ID 1 exists
        gatewayTransactionId: "stripe_pi_test_123456",
        success: true
    };

    console.log('📤 Processing payment:', JSON.stringify(paymentData, null, 2));
    
    const result = await makeRequest('POST', '/subscriptions/payments/process', paymentData);
    
    if (result.success) {
        console.log('✅ Payment processed successfully:', result.data);
    } else {
        console.log('❌ Payment processing failed:', result.message);
    }
    
    return result;
};

// Main test runner
const runWebhookTests = async () => {
    console.log('🚀 Starting Webhook Tests...\n');
    
    const tests = [
        { name: 'Webhook with Unknown Transaction', fn: testWebhookWithUnknownTransaction },
        { name: 'Payment Processing', fn: testPaymentProcessing },
        { name: 'Webhook with Existing Transaction', fn: testWebhookWithExistingTransaction }
    ];

    for (const test of tests) {
        try {
            console.log(`\n📋 Running: ${test.name}`);
            await test.fn();
        } catch (error) {
            console.log(`❌ ${test.name} failed with error:`, error.message);
        }
    }
    
    console.log('\n✅ Webhook tests completed!');
    
    // Instructions
    console.log('\n📚 How Webhooks Work in Real Scenarios:');
    console.log('1. User creates subscription → Payment record created with pending status');
    console.log('2. Payment sent to gateway (Stripe/PayPal) → Gateway returns their transaction ID');
    console.log('3. We store gateway transaction ID in payment.metadata');
    console.log('4. Gateway processes payment → Sends webhook to our endpoint');
    console.log('5. Webhook handler finds payment by gateway transaction ID');
    console.log('6. Updates payment and subscription status based on webhook data');
};

// Run if executed directly
if (require.main === module) {
    runWebhookTests();
}

module.exports = { runWebhookTests, testWebhookWithExistingTransaction, testWebhookWithUnknownTransaction };