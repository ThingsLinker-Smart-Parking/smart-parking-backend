#!/usr/bin/env node
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test user credentials
const TEST_ADMIN = {
  email: 'admin@test.com',
  password: 'Admin@123'
};

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, TEST_ADMIN);
    if (response.data.success) {
      return response.data.data.token;
    }
    throw new Error('Login failed');
  } catch (error) {
    console.error('❌ Login Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function testEndpoint(method, url, token, data = null, description = '') {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) config.data = data;

    console.log(`\n🧪 ${description || `${method.toUpperCase()} ${url}`}`);
    const response = await axios(config);

    if (response.data.success) {
      console.log(`✅ SUCCESS: ${response.data.message || 'Request successful'}`);
      if (response.data.data) {
        console.log(`📊 Data count: ${Array.isArray(response.data.data) ? response.data.data.length : 'Single object'}`);
      }
    } else {
      console.log(`⚠️  FAILED: ${response.data.message || 'Unknown error'}`);
    }

    return response.data;
  } catch (error) {
    const errorData = error.response?.data;
    const status = error.response?.status;

    if (status === 403 && errorData?.code === 'FEATURE_LIMIT_EXCEEDED') {
      console.log(`⚠️  LIMIT: ${errorData.message} (${errorData.data?.planName} plan)`);
    } else if (status === 500) {
      console.log(`❌ SERVER ERROR: ${errorData?.message || 'Internal server error'}`);
      console.log(`   Possible database schema issue`);
    } else {
      console.log(`❌ ERROR (${status}): ${errorData?.message || error.message}`);
    }

    return errorData;
  }
}

async function runAllTests() {
  console.log('🔍 Smart Parking API Diagnostic Test');
  console.log('=====================================');

  const token = await login();
  console.log('✅ Authentication successful');

  // Test all major endpoints
  const tests = [
    // Parking Lot Management
    { method: 'get', url: '/api/parking-lots', desc: 'Get all parking lots' },
    { method: 'post', url: '/api/parking-lots', data: {
      name: 'Test Lot',
      address: '123 Test St',
      latitude: 40.7128,
      longitude: -74.0060
    }, desc: 'Create parking lot' },

    // Gateway Management
    { method: 'get', url: '/api/gateways', desc: 'Get all gateways' },
    { method: 'get', url: '/api/gateways/available', desc: 'Get available gateways' },

    // Floor Management
    { method: 'get', url: '/api/floors', desc: 'Get all floors' },

    // Parking Slot Management
    { method: 'get', url: '/api/parking-slots', desc: 'Get all parking slots' },

    // Node Management
    { method: 'get', url: '/api/nodes', desc: 'Get all nodes' },

    // Health Check
    { method: 'get', url: '/api/health', desc: 'Health check' },

    // Subscription Management
    { method: 'get', url: '/api/subscriptions/status', desc: 'Get subscription status' },
    { method: 'get', url: '/api/subscription-plans', desc: 'Get subscription plans' },
  ];

  console.log('\n📋 Testing All API Endpoints');
  console.log('=============================');

  const results = {};
  for (const test of tests) {
    const result = await testEndpoint(test.method, test.url, token, test.data, test.desc);
    results[test.url] = result;

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');

  const successful = Object.values(results).filter(r => r?.success).length;
  const failed = Object.values(results).filter(r => !r?.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${Object.keys(results).length}`);

  // Identify specific issues
  console.log('\n🔧 Issues Identified:');
  Object.entries(results).forEach(([endpoint, result]) => {
    if (!result?.success) {
      if (result?.code === 'FEATURE_LIMIT_EXCEEDED') {
        console.log(`⚠️  ${endpoint}: Subscription limit reached`);
      } else if (result?.message?.includes('does not exist')) {
        console.log(`🗄️  ${endpoint}: Database schema issue`);
      } else if (result?.code === 'INTERNAL_ERROR') {
        console.log(`💥 ${endpoint}: Internal server error`);
      } else {
        console.log(`❓ ${endpoint}: ${result?.message || 'Unknown error'}`);
      }
    }
  });

  console.log('\n✨ Diagnostic complete!');
}

runAllTests().catch(console.error);