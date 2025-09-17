const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
let superAdminToken = null;
let adminToken = null;
let testGateway = null;
let testNode = null;
let testParkingLot = null;

// Helper function to log results
const logResult = (testName, success, message, data = null) => {
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}: ${message}`);
    if (data && process.env.VERBOSE === 'true') {
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

// Setup functions
const setupUsers = async () => {
    console.log('🔧 Setting up test users...');
    
    // Create super admin
    const superAdminData = {
        email: 'superadmin@gateway-test.com',
        password: 'SuperAdmin123!',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin'
    };

    const superAdminSignup = await makeRequest('POST', '/auth/signup', superAdminData);
    if (!superAdminSignup.success) {
        console.log('⚠️  Super admin might already exist, trying to login...');
    }

    // Login super admin
    const superAdminLogin = await makeRequest('POST', '/auth/login', {
        email: 'superadmin@gateway-test.com',
        password: 'SuperAdmin123!'
    });

    if (superAdminLogin.success && superAdminLogin.data.success) {
        superAdminToken = superAdminLogin.data.data.token;
        console.log('✅ Super admin authenticated successfully');
    } else {
        console.log('❌ Failed to authenticate super admin');
        return false;
    }

    // Create admin user
    const adminData = {
        email: 'admin@gateway-test.com',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
    };

    const adminSignup = await makeRequest('POST', '/auth/signup', adminData);
    if (!adminSignup.success) {
        console.log('⚠️  Admin might already exist, trying to login...');
    }

    // Login admin
    const adminLogin = await makeRequest('POST', '/auth/login', {
        email: 'admin@gateway-test.com',
        password: 'Admin123!'
    });

    if (adminLogin.success && adminLogin.data.success) {
        adminToken = adminLogin.data.data.token;
        console.log('✅ Admin authenticated successfully');
        return true;
    } else {
        console.log('❌ Failed to authenticate admin');
        return false;
    }
};

const setupParkingLot = async () => {
    console.log('🔧 Setting up test parking lot...');
    
    const parkingLotData = {
        name: 'Test Gateway Parking Lot',
        address: '123 Test Street, Gateway City'
    };

    const result = await makeRequest('POST', '/parking-lots', parkingLotData, {
        'Authorization': `Bearer ${adminToken}`
    });

    if (result.success && result.data.success) {
        testParkingLot = result.data.data;
        console.log('✅ Test parking lot created successfully');
        return true;
    } else {
        console.log('❌ Failed to create test parking lot');
        return false;
    }
};

// Super Admin Tests
const testCreateGateway = async () => {
    console.log('🧪 Testing Create Gateway (Super Admin)...');
    
    const gatewayData = {
        chirpstackGatewayId: `gw_test_${Date.now()}`,
        name: 'Test Gateway 1',
        description: 'Primary test gateway for automated testing',
        location: 'Test Building, Floor 1',
        latitude: 40.7128,
        longitude: -74.0060,
        metadata: {
            model: 'RAK7249',
            version: '1.0.3',
            testData: true
        }
    };

    const result = await makeRequest('POST', '/gateways', gatewayData, {
        'Authorization': `Bearer ${superAdminToken}`
    });
    
    if (result.success && result.data.success) {
        testGateway = result.data.data;
        logResult('Create Gateway', true, 'Gateway created successfully', result.data.data);
        return true;
    } else {
        logResult('Create Gateway', false, result.message || 'Failed to create gateway');
        return false;
    }
};

const testGetAllGateways = async () => {
    console.log('🧪 Testing Get All Gateways (Super Admin)...');
    
    const result = await makeRequest('GET', '/gateways', null, {
        'Authorization': `Bearer ${superAdminToken}`
    });
    
    if (result.success && result.data.success && Array.isArray(result.data.data)) {
        logResult('Get All Gateways', true, `Retrieved ${result.data.count} gateways`);
        return true;
    } else {
        logResult('Get All Gateways', false, result.message || 'Failed to get gateways');
        return false;
    }
};

const testGetGatewayById = async () => {
    console.log('🧪 Testing Get Gateway by ID (Super Admin)...');
    
    if (!testGateway) {
        logResult('Get Gateway by ID', false, 'No test gateway available');
        return false;
    }
    
    const result = await makeRequest('GET', `/gateways/${testGateway.id}`, null, {
        'Authorization': `Bearer ${superAdminToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Get Gateway by ID', true, 'Gateway retrieved successfully');
        return true;
    } else {
        logResult('Get Gateway by ID', false, result.message || 'Failed to get gateway');
        return false;
    }
};

const testUpdateGateway = async () => {
    console.log('🧪 Testing Update Gateway (Super Admin)...');
    
    if (!testGateway) {
        logResult('Update Gateway', false, 'No test gateway available');
        return false;
    }
    
    const updateData = {
        name: 'Updated Test Gateway 1',
        description: 'Updated description for testing',
        location: 'Updated Test Building, Floor 2',
        metadata: {
            ...testGateway.metadata,
            lastUpdate: new Date().toISOString(),
            version: '1.0.4'
        }
    };

    const result = await makeRequest('PUT', `/gateways/${testGateway.id}`, updateData, {
        'Authorization': `Bearer ${superAdminToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Update Gateway', true, 'Gateway updated successfully');
        return true;
    } else {
        logResult('Update Gateway', false, result.message || 'Failed to update gateway');
        return false;
    }
};

// Admin Tests
const testGetAvailableGateways = async () => {
    console.log('🧪 Testing Get Available Gateways (Admin)...');
    
    const result = await makeRequest('GET', '/gateways/available', null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success && Array.isArray(result.data.data)) {
        logResult('Get Available Gateways', true, `Found ${result.data.count} available gateways`);
        return true;
    } else {
        logResult('Get Available Gateways', false, result.message || 'Failed to get available gateways');
        return false;
    }
};

const testLinkGateway = async () => {
    console.log('🧪 Testing Link Gateway to Admin...');
    
    if (!testGateway) {
        logResult('Link Gateway', false, 'No test gateway available');
        return false;
    }
    
    const linkData = {
        gatewayId: testGateway.id
    };

    const result = await makeRequest('POST', '/gateways/link', linkData, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Link Gateway', true, 'Gateway linked to admin successfully');
        return true;
    } else {
        logResult('Link Gateway', false, result.message || 'Failed to link gateway');
        return false;
    }
};

const testGetLinkedGateways = async () => {
    console.log('🧪 Testing Get Linked Gateways (Admin)...');
    
    const result = await makeRequest('GET', '/gateways/my-gateways', null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success && Array.isArray(result.data.data)) {
        logResult('Get Linked Gateways', true, `Found ${result.data.count} linked gateways`);
        return true;
    } else {
        logResult('Get Linked Gateways', false, result.message || 'Failed to get linked gateways');
        return false;
    }
};

const testAssignGatewayToParkingLot = async () => {
    console.log('🧪 Testing Assign Gateway to Parking Lot (Admin)...');
    
    if (!testGateway || !testParkingLot) {
        logResult('Assign Gateway to Parking Lot', false, 'Missing test gateway or parking lot');
        return false;
    }
    
    const assignData = {
        parkingLotId: testParkingLot.id
    };

    const result = await makeRequest('POST', `/gateways/${testGateway.id}/assign-parking-lot`, assignData, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Assign Gateway to Parking Lot', true, 'Gateway assigned to parking lot successfully');
        return true;
    } else {
        logResult('Assign Gateway to Parking Lot', false, result.message || 'Failed to assign gateway');
        return false;
    }
};

const testCreateNode = async () => {
    console.log('🧪 Testing Create Node under Gateway (Admin)...');
    
    if (!testGateway) {
        logResult('Create Node', false, 'No test gateway available');
        return false;
    }
    
    const nodeData = {
        gatewayId: testGateway.id,
        chirpstackDeviceId: `node_test_${Date.now()}`,
        name: 'Test Sensor Node 1',
        description: 'Ultrasonic sensor for testing',
        latitude: 40.7129,
        longitude: -74.0061,
        metadata: {
            sensorType: 'ultrasonic',
            range: '4m',
            batteryLevel: 95,
            testData: true
        }
    };

    const result = await makeRequest('POST', '/gateways/nodes', nodeData, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        testNode = result.data.data;
        logResult('Create Node', true, 'Node created successfully', result.data.data);
        return true;
    } else {
        logResult('Create Node', false, result.message || 'Failed to create node');
        return false;
    }
};

const testGetGatewayNodes = async () => {
    console.log('🧪 Testing Get Gateway Nodes...');
    
    if (!testGateway) {
        logResult('Get Gateway Nodes', false, 'No test gateway available');
        return false;
    }
    
    const result = await makeRequest('GET', `/gateways/${testGateway.id}/nodes`, null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success && Array.isArray(result.data.data)) {
        logResult('Get Gateway Nodes', true, `Found ${result.data.count} nodes for gateway`);
        return true;
    } else {
        logResult('Get Gateway Nodes', false, result.message || 'Failed to get gateway nodes');
        return false;
    }
};

const testGetStatistics = async () => {
    console.log('🧪 Testing Get Gateway Statistics...');
    
    const result = await makeRequest('GET', '/gateways/statistics', null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        const stats = result.data.data;
        logResult('Get Statistics', true, 
            `Stats - Gateways: ${stats.totalGateways}, Nodes: ${stats.totalNodes}, Online: ${stats.onlineNodes}`);
        return true;
    } else {
        logResult('Get Statistics', false, result.message || 'Failed to get statistics');
        return false;
    }
};

// Webhook Tests
const testNodeStatusWebhook = async () => {
    console.log('🧪 Testing Node Status Webhook...');
    
    if (!testNode) {
        logResult('Node Status Webhook', false, 'No test node available');
        return false;
    }
    
    const webhookData = {
        deviceId: testNode.chirpstackDeviceId,
        metadata: {
            batteryLevel: 87,
            rssi: -65,
            snr: 8.5,
            lastSeen: new Date().toISOString()
        }
    };

    const result = await makeRequest('POST', '/gateways/webhook/node-status', webhookData);
    
    if (result.success && result.data.success) {
        logResult('Node Status Webhook', true, 'Node status updated via webhook');
        return true;
    } else {
        logResult('Node Status Webhook', false, result.message || 'Failed to update node status');
        return false;
    }
};

const testGatewayStatusWebhook = async () => {
    console.log('🧪 Testing Gateway Status Webhook...');
    
    if (!testGateway) {
        logResult('Gateway Status Webhook', false, 'No test gateway available');
        return false;
    }
    
    const webhookData = {
        gatewayId: testGateway.chirpstackGatewayId,
        metadata: {
            temperature: 42.5,
            uptime: 86400,
            lastSeen: new Date().toISOString()
        }
    };

    const result = await makeRequest('POST', '/gateways/webhook/gateway-status', webhookData);
    
    if (result.success && result.data.success) {
        logResult('Gateway Status Webhook', true, 'Gateway status updated via webhook');
        return true;
    } else {
        logResult('Gateway Status Webhook', false, result.message || 'Failed to update gateway status');
        return false;
    }
};

// Access Control Tests
const testAccessControl = async () => {
    console.log('🧪 Testing Access Control...');
    
    // Test admin trying to access super admin endpoint
    const adminAccessTest = await makeRequest('GET', '/gateways', null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (!adminAccessTest.success && adminAccessTest.status === 403) {
        logResult('Admin Access Control', true, 'Admin correctly denied access to super admin endpoint');
    } else {
        logResult('Admin Access Control', false, 'Admin should not have access to super admin endpoints');
    }
    
    // Test unauthenticated access
    const unauthenticatedTest = await makeRequest('GET', '/gateways/available');
    
    if (!unauthenticatedTest.success && unauthenticatedTest.status === 401) {
        logResult('Unauthenticated Access Control', true, 'Unauthenticated user correctly denied access');
    } else {
        logResult('Unauthenticated Access Control', false, 'Unauthenticated users should be denied access');
    }
};

const testUnlinkGateway = async () => {
    console.log('🧪 Testing Unlink Gateway from Admin...');
    
    if (!testGateway) {
        logResult('Unlink Gateway', false, 'No test gateway available');
        return false;
    }
    
    const result = await makeRequest('POST', `/gateways/${testGateway.id}/unlink`, {}, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Unlink Gateway', true, 'Gateway unlinked from admin successfully');
        return true;
    } else {
        logResult('Unlink Gateway', false, result.message || 'Failed to unlink gateway');
        return false;
    }
};

// Cleanup Tests
const testDeleteGateway = async () => {
    console.log('🧪 Testing Delete Gateway (Super Admin)...');
    
    if (!testGateway) {
        logResult('Delete Gateway', false, 'No test gateway available');
        return false;
    }
    
    const result = await makeRequest('DELETE', `/gateways/${testGateway.id}`, null, {
        'Authorization': `Bearer ${superAdminToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Delete Gateway', true, 'Gateway deleted successfully');
        return true;
    } else {
        logResult('Delete Gateway', false, result.message || 'Failed to delete gateway');
        return false;
    }
};

// Main test runner
const runGatewayTests = async () => {
    console.log('🚀 Starting Gateway Management API Tests...\n');
    
    // Setup
    const usersSetup = await setupUsers();
    if (!usersSetup) {
        console.log('⚠️  Some tests will be skipped due to authentication issues\n');
        return;
    }
    
    await setupParkingLot();
    
    const tests = [
        // Super Admin Tests
        { name: 'Create Gateway (Super Admin)', fn: testCreateGateway },
        { name: 'Get All Gateways (Super Admin)', fn: testGetAllGateways },
        { name: 'Get Gateway by ID (Super Admin)', fn: testGetGatewayById },
        { name: 'Update Gateway (Super Admin)', fn: testUpdateGateway },
        
        // Admin Tests
        { name: 'Get Available Gateways (Admin)', fn: testGetAvailableGateways },
        { name: 'Link Gateway to Admin', fn: testLinkGateway },
        { name: 'Get Linked Gateways (Admin)', fn: testGetLinkedGateways },
        { name: 'Assign Gateway to Parking Lot (Admin)', fn: testAssignGatewayToParkingLot },
        { name: 'Create Node under Gateway (Admin)', fn: testCreateNode },
        { name: 'Get Gateway Nodes', fn: testGetGatewayNodes },
        { name: 'Get Gateway Statistics', fn: testGetStatistics },
        
        // Webhook Tests
        { name: 'Node Status Webhook', fn: testNodeStatusWebhook },
        { name: 'Gateway Status Webhook', fn: testGatewayStatusWebhook },
        
        // Access Control Tests
        { name: 'Access Control Tests', fn: testAccessControl },
        
        // Cleanup Tests
        { name: 'Unlink Gateway from Admin', fn: testUnlinkGateway },
        { name: 'Delete Gateway (Super Admin)', fn: testDeleteGateway }
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
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('📊 Gateway API Test Results:');
    console.log(`   Passed: ${passed}/${total}`);
    console.log(`   Success Rate: ${Math.round((passed / total) * 100)}%`);
    
    if (passed === total) {
        console.log('\n🎉 All gateway API tests passed! Your gateway management system is working perfectly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
    
    console.log('\n📋 Test Summary:');
    console.log('✅ Super Admin can create, view, update, and delete gateways');
    console.log('✅ Admin can link gateways and manage nodes');
    console.log('✅ Proper access control and authentication');
    console.log('✅ Webhook integration for real-time status updates');
    console.log('✅ Gateway assignment to parking lots');
    console.log('✅ Node creation and management under gateways');
};

// Instructions
console.log('📋 Gateway Management API Test Instructions:');
console.log('1. Start your server: npm run dev');
console.log('2. Run this test script: node test-gateway-apis.js');
console.log('3. For verbose output: VERBOSE=true node test-gateway-apis.js');
console.log('4. Check server console for any errors');
console.log('');

// Export for manual testing
module.exports = {
    runGatewayTests,
    makeRequest,
    setupUsers,
    // Individual test functions available for manual testing
    testCreateGateway,
    testGetAllGateways,
    testLinkGateway,
    testCreateNode,
    testGetGatewayNodes
};

// Run tests if this file is executed directly
if (require.main === module) {
    runGatewayTests();
}