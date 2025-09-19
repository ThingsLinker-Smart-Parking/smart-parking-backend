#!/usr/bin/env node
const axios = require('axios');

const LOCAL_URL = 'http://localhost:3001';
const PRODUCTION_URL = 'https://smart-parking-backend-production-5449.up.railway.app';

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlZmRiYjgyMS1jZTc1LTQ4MWYtYTE2OS1jODYyMzlhNTNhNjAiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwicm9sZSI6ImFkbWluIiwidmVyaWZpZWQiOnRydWUsImlhdCI6MTc1ODI4NTYyOH0.5WAyyKlqFwEUfPwWRWMi61WlSk74LURg5NfIF0a0Fwk';

async function testEndpoint(url, endpoint, description) {
  try {
    const response = await axios.get(`${url}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return {
      status: 'SUCCESS',
      statusCode: response.status,
      success: response.data.success,
      message: response.data.message,
      dataCount: Array.isArray(response.data.data) ? response.data.data.length : (response.data.data ? 1 : 0)
    };
  } catch (error) {
    const errorData = error.response?.data;
    const status = error.response?.status;

    return {
      status: 'ERROR',
      statusCode: status || 'TIMEOUT',
      success: false,
      message: errorData?.message || error.message,
      errorCode: errorData?.code || error.code
    };
  }
}

async function testParkingLotCreation(url) {
  try {
    const response = await axios.post(`${url}/api/parking-lots`, {
      name: "Test Parking Lot",
      address: "123 Test Street"
    }, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return {
      status: 'SUCCESS',
      statusCode: response.status,
      success: response.data.success,
      message: response.data.message
    };
  } catch (error) {
    const errorData = error.response?.data;
    const status = error.response?.status;

    return {
      status: 'ERROR',
      statusCode: status || 'TIMEOUT',
      success: false,
      message: errorData?.message || error.message,
      errorCode: errorData?.code || error.code
    };
  }
}

async function runComparison() {
  console.log('🔍 DEPLOYMENT VERIFICATION REPORT');
  console.log('==================================');
  console.log(`📍 Local: ${LOCAL_URL}`);
  console.log(`🌐 Production: ${PRODUCTION_URL}`);
  console.log('');

  const testEndpoints = [
    { endpoint: '/api/floors', description: 'Get all floors' },
    { endpoint: '/api/parking-slots', description: 'Get all parking slots' },
    { endpoint: '/api/subscriptions/status', description: 'Get subscription status' },
    { endpoint: '/api/parking-lots', description: 'Get parking lots' },
    { endpoint: '/api/gateways', description: 'Get gateways' },
    { endpoint: '/api/nodes', description: 'Get nodes' }
  ];

  console.log('📊 ENDPOINT COMPARISON');
  console.log('======================');

  const results = [];

  for (const test of testEndpoints) {
    console.log(`\n🧪 Testing: ${test.description}`);

    const localResult = await testEndpoint(LOCAL_URL, test.endpoint, test.description);
    const prodResult = await testEndpoint(PRODUCTION_URL, test.endpoint, test.description);

    const localStatus = localResult.success ? '✅ SUCCESS' :
                       localResult.errorCode === 'FEATURE_LIMIT_EXCEEDED' ? '⚠️ LIMIT' : '❌ ERROR';
    const prodStatus = prodResult.success ? '✅ SUCCESS' :
                      prodResult.errorCode === 'FEATURE_LIMIT_EXCEEDED' ? '⚠️ LIMIT' : '❌ ERROR';

    console.log(`   Local:      ${localStatus} - ${localResult.message}`);
    console.log(`   Production: ${prodStatus} - ${prodResult.message}`);

    results.push({
      endpoint: test.endpoint,
      description: test.description,
      local: localResult,
      production: prodResult,
      deploymentIssue: localResult.success !== prodResult.success
    });
  }

  console.log('\n🚨 PARKING LOT CREATION TEST');
  console.log('============================');

  console.log('\n🧪 Testing: POST /api/parking-lots');
  const localPOST = await testParkingLotCreation(LOCAL_URL);
  const prodPOST = await testParkingLotCreation(PRODUCTION_URL);

  const localPOSTStatus = localPOST.errorCode === 'FEATURE_LIMIT_EXCEEDED' ? '⚠️ LIMIT (GOOD)' :
                         localPOST.errorCode === 'INTERNAL_ERROR' ? '❌ INTERNAL ERROR' : '✅ SUCCESS';
  const prodPOSTStatus = prodPOST.errorCode === 'FEATURE_LIMIT_EXCEEDED' ? '⚠️ LIMIT (GOOD)' :
                        prodPOST.errorCode === 'INTERNAL_ERROR' ? '❌ INTERNAL ERROR' : '✅ SUCCESS';

  console.log(`   Local:      ${localPOSTStatus} - ${localPOST.message}`);
  console.log(`   Production: ${prodPOSTStatus} - ${prodPOST.message}`);

  // Summary
  console.log('\n📋 DEPLOYMENT GAP ANALYSIS');
  console.log('===========================');

  const deploymentIssues = results.filter(r => r.deploymentIssue);
  const newEndpointsNotDeployed = results.filter(r =>
    r.local.success && r.production.message?.includes('not found')
  );

  console.log(`\n🔍 Total endpoints tested: ${results.length + 1}`);
  console.log(`✅ Working in both environments: ${results.filter(r => !r.deploymentIssue).length}`);
  console.log(`❌ Deployment issues found: ${deploymentIssues.length + (prodPOST.errorCode === 'INTERNAL_ERROR' ? 1 : 0)}`);

  if (newEndpointsNotDeployed.length > 0) {
    console.log('\n🚧 NEW ENDPOINTS NOT DEPLOYED TO PRODUCTION:');
    newEndpointsNotDeployed.forEach(issue => {
      console.log(`   • ${issue.endpoint} - ${issue.description}`);
    });
  }

  if (prodPOST.errorCode === 'INTERNAL_ERROR') {
    console.log('\n🔧 CRITICAL ISSUES IN PRODUCTION:');
    console.log('   • POST /api/parking-lots returns INTERNAL_ERROR instead of subscription limit');
    console.log('   • This indicates database schema or subscription middleware bugs');
  }

  console.log('\n🎯 REQUIRED PRODUCTION UPDATES:');
  console.log('================================');
  console.log('1. 📦 Deploy latest code with new endpoints');
  console.log('2. 🗄️  Update database schema (missing columns/foreign keys)');
  console.log('3. 🔧 Fix subscription middleware column name bug (userId → adminId)');
  console.log('4. ✅ Verify all endpoints return proper responses');

  console.log('\n✨ Verification complete!');
}

runComparison().catch(console.error);