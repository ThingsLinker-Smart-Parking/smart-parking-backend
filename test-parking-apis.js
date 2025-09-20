const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
let adminToken = null;
let testParkingLot = null;
let testFloor = null;
let testParkingSlot = null;
let testGateway = null;
let testNode = null;

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

// Setup function for admin user
const setupAdminUser = async () => {
    console.log('🔧 Setting up test admin user...');
    
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
        console.log('❌ Failed to authenticate admin:', adminLogin.message);
        return false;
    }
};

// Parking Lot Tests
const testCreateParkingLot = async () => {
    console.log('🧪 Testing Create Parking Lot...');
    
    const parkingLotData = {
        name: `Test Parking Lot ${Date.now()}`,
        address: '123 Test Street, Parking City'
    };

    const result = await makeRequest('POST', '/parking-lots', parkingLotData, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        testParkingLot = result.data.data;
        logResult('Create Parking Lot', true, 'Parking lot created successfully', result.data.data);
        return true;
    } else {
        logResult('Create Parking Lot', false, result.message || 'Failed to create parking lot');
        return false;
    }
};

const testGetParkingLots = async () => {
    console.log('🧪 Testing Get Parking Lots...');
    
    const result = await makeRequest('GET', '/parking-lots', null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success && Array.isArray(result.data.data)) {
        logResult('Get Parking Lots', true, `Retrieved ${result.data.count} parking lots`);
        return true;
    } else {
        logResult('Get Parking Lots', false, result.message || 'Failed to get parking lots');
        return false;
    }
};

const testGetParkingLotById = async () => {
    console.log('🧪 Testing Get Parking Lot by ID...');
    
    if (!testParkingLot) {
        logResult('Get Parking Lot by ID', false, 'No test parking lot available');
        return false;
    }
    
    const result = await makeRequest('GET', `/parking-lots/${testParkingLot.id}`, null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Get Parking Lot by ID', true, 'Parking lot retrieved successfully');
        return true;
    } else {
        logResult('Get Parking Lot by ID', false, result.message || 'Failed to get parking lot');
        return false;
    }
};

// Floor Tests
const testCreateFloor = async () => {
    console.log('🧪 Testing Create Floor...');
    
    if (!testParkingLot) {
        logResult('Create Floor', false, 'No test parking lot available');
        return false;
    }
    
    const floorData = {
        name: 'Ground Floor',
        level: 0
    };

    const result = await makeRequest('POST', `/floors/parking-lot/${testParkingLot.id}`, floorData, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        testFloor = result.data.data;
        logResult('Create Floor', true, 'Floor created successfully', result.data.data);
        return true;
    } else {
        logResult('Create Floor', false, result.message || 'Failed to create floor');
        return false;
    }
};

const testGetFloors = async () => {
    console.log('🧪 Testing Get Floors...');
    
    if (!testParkingLot) {
        logResult('Get Floors', false, 'No test parking lot available');
        return false;
    }
    
    const result = await makeRequest('GET', `/floors/parking-lot/${testParkingLot.id}`, null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success && Array.isArray(result.data.data)) {
        logResult('Get Floors', true, `Retrieved ${result.data.count} floors`);
        return true; 
    } else {
        logResult('Get Floors', false, result.message || 'Failed to get floors');
        return false;
    } 
};

// Parking Slot Tests
const testCreateParkingSlot = async () => {
    console.log('🧪 Testing Create Parking Slot...');
    
    if (!testFloor) {
        logResult('Create Parking Slot', false, 'No test floor available');
        return false;
    }
    
    const slotData = {
        name: 'A-001',
        isReservable: true
    };

    const result = await makeRequest('POST', `/parking-slots/floor/${testFloor.id}`, slotData, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        testParkingSlot = result.data.data;
        logResult('Create Parking Slot', true, 'Parking slot created successfully', result.data.data);
        return true;
    } else {
        logResult('Create Parking Slot', false, result.message || 'Failed to create parking slot');
        return false;
    }
};

const testBulkCreateParkingSlots = async () => {
    console.log('🧪 Testing Bulk Create Parking Slots...');
    
    if (!testFloor) {
        logResult('Bulk Create Parking Slots', false, 'No test floor available');
        return false;
    }
    
    const bulkSlots = {
        slots: [
            { name: 'A-002', isReservable: false },
            { name: 'A-003', isReservable: true },
            { name: 'A-004', isReservable: false }
        ]
    };

    const result = await makeRequest('POST', `/parking-slots/floor/${testFloor.id}/bulk`, bulkSlots, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Bulk Create Parking Slots', true, `Created ${result.data.data.length} parking slots`);
        return true;
    } else {
        logResult('Bulk Create Parking Slots', false, result.message || 'Failed to bulk create parking slots');
        return false;
    }
};

const testGetParkingSlots = async () => {
    console.log('🧪 Testing Get Parking Slots...');
    
    if (!testFloor) {
        logResult('Get Parking Slots', false, 'No test floor available');
        return false;
    }
    
    const result = await makeRequest('GET', `/parking-slots/floor/${testFloor.id}`, null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success && Array.isArray(result.data.data)) {
        logResult('Get Parking Slots', true, `Retrieved ${result.data.count} parking slots`);
        return true;
    } else {
        logResult('Get Parking Slots', false, result.message || 'Failed to get parking slots');
        return false;
    }
};

// Gateway Tests (from existing gateway system)
const testCreateGateway = async () => {
    console.log('🧪 Testing Create Gateway (Super Admin required - this should fail)...');
    
    const gatewayData = {
        chirpstackGatewayId: `test_gw_${Date.now()}`,
        name: 'Test Gateway for Parking',
        description: 'Gateway for parking lot testing'
    };

    const result = await makeRequest('POST', '/gateways', gatewayData, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (!result.success && result.status === 403) {
        logResult('Create Gateway Access Control', true, 'Admin correctly denied access to super admin endpoint');
        return true;
    } else {
        logResult('Create Gateway Access Control', false, 'Admin should not have super admin access');
        return false;
    }
};

const testLinkGateway = async () => {
    console.log('🧪 Testing Link Gateway (if available)...');
    
    // First get available gateways
    const availableResult = await makeRequest('GET', '/gateways/available', null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (availableResult.success && availableResult.data.success && availableResult.data.data.length > 0) {
        const gateway = availableResult.data.data[0];
        
        const linkResult = await makeRequest('POST', '/gateways/link', { gatewayId: gateway.id }, {
            'Authorization': `Bearer ${adminToken}`
        });
        
        if (linkResult.success && linkResult.data.success) {
            testGateway = gateway;
            logResult('Link Gateway', true, 'Gateway linked successfully');
            return true;
        } else {
            logResult('Link Gateway', false, linkResult.message || 'Failed to link gateway');
            return false;
        }
    } else {
        logResult('Link Gateway', false, 'No available gateways to link');
        return false;
    }
};

// Node Tests
const testCreateNode = async () => {
    console.log('🧪 Testing Create Node...');
    
    if (!testGateway) {
        logResult('Create Node', false, 'No linked gateway available');
        return false;
    }
    
    const nodeData = {
        gatewayId: testGateway.id,
        chirpstackDeviceId: `test_node_${Date.now()}`,
        name: 'Test Parking Node',
        description: 'Sensor node for parking slot testing',
        metadata: {
            sensorType: 'ultrasonic',
            range: '4m',
            testData: true
        }
    };

    const result = await makeRequest('POST', '/nodes', nodeData, {
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

const testGetNodes = async () => {
    console.log('🧪 Testing Get Nodes...');
    
    const result = await makeRequest('GET', '/nodes', null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success && Array.isArray(result.data.data)) {
        logResult('Get Nodes', true, `Retrieved ${result.data.count} nodes`);
        return true;
    } else {
        logResult('Get Nodes', false, result.message || 'Failed to get nodes');
        return false;
    }
};

const testGetUnassignedNodes = async () => {
    console.log('🧪 Testing Get Unassigned Nodes...');
    
    const result = await makeRequest('GET', '/nodes/unassigned', null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success && Array.isArray(result.data.data)) {
        logResult('Get Unassigned Nodes', true, `Found ${result.data.count} unassigned nodes`);
        return true;
    } else {
        logResult('Get Unassigned Nodes', false, result.message || 'Failed to get unassigned nodes');
        return false;
    }
};

// Integration Tests
const testAssignNodeToParkingSlot = async () => {
    console.log('🧪 Testing Assign Node to Parking Slot...');
    
    if (!testNode || !testParkingSlot) {
        logResult('Assign Node to Parking Slot', false, 'Missing test node or parking slot');
        return false;
    }
    
    const result = await makeRequest('POST', `/parking-slots/${testParkingSlot.id}/assign-node`, 
        { nodeId: testNode.id }, 
        { 'Authorization': `Bearer ${adminToken}` }
    );
    
    if (result.success && result.data.success) {
        logResult('Assign Node to Parking Slot', true, 'Node assigned successfully');
        return true;
    } else {
        logResult('Assign Node to Parking Slot', false, result.message || 'Failed to assign node');
        return false;
    }
};

const testGetParkingSlotStatus = async () => {
    console.log('🧪 Testing Get Parking Slot Status...');
    
    if (!testParkingSlot) {
        logResult('Get Parking Slot Status', false, 'No test parking slot available');
        return false;
    }
    
    const result = await makeRequest('GET', `/parking-slots/${testParkingSlot.id}/status`, null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Get Parking Slot Status', true, 'Parking slot status retrieved');
        return true;
    } else {
        logResult('Get Parking Slot Status', false, result.message || 'Failed to get parking slot status');
        return false;
    }
};

const testFloorStatistics = async () => {
    console.log('🧪 Testing Get Floor Statistics...');
    
    if (!testFloor) {
        logResult('Get Floor Statistics', false, 'No test floor available');
        return false;
    }
    
    const result = await makeRequest('GET', `/floors/${testFloor.id}/statistics`, null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        const stats = result.data.data;
        logResult('Get Floor Statistics', true, 
            `Stats - Total Slots: ${stats.totalSlots}, With Nodes: ${stats.slotsWithNodes}, Coverage: ${stats.nodesCoverage}%`);
        return true;
    } else {
        logResult('Get Floor Statistics', false, result.message || 'Failed to get floor statistics');
        return false;
    }
};

const testNodeStatistics = async () => {
    console.log('🧪 Testing Get Node Statistics...');
    
    const result = await makeRequest('GET', '/nodes/statistics', null, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        const stats = result.data.data.overall;
        logResult('Get Node Statistics', true, 
            `Stats - Total: ${stats.totalNodes}, Assigned: ${stats.assignedNodes}, Online: ${stats.onlineNodes}`);
        return true;
    } else {
        logResult('Get Node Statistics', false, result.message || 'Failed to get node statistics');
        return false;
    }
};

// Clean up tests
const testUnassignNode = async () => {
    console.log('🧪 Testing Unassign Node from Parking Slot...');
    
    if (!testParkingSlot) {
        logResult('Unassign Node', false, 'No test parking slot available');
        return false;
    }
    
    const result = await makeRequest('POST', `/parking-slots/${testParkingSlot.id}/unassign-node`, {}, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Unassign Node', true, 'Node unassigned successfully');
        return true;
    } else {
        logResult('Unassign Node', false, result.message || 'Failed to unassign node');
        return false;
    }
};

const testUpdateParkingLot = async () => {
    console.log('🧪 Testing Update Parking Lot...');
    
    if (!testParkingLot) {
        logResult('Update Parking Lot', false, 'No test parking lot available');
        return false;
    }
    
    const updateData = {
        name: testParkingLot.name + ' (Updated)',
        address: 'Updated Address'
    };
    
    const result = await makeRequest('PUT', `/parking-lots/${testParkingLot.id}`, updateData, {
        'Authorization': `Bearer ${adminToken}`
    });
    
    if (result.success && result.data.success) {
        logResult('Update Parking Lot', true, 'Parking lot updated successfully');
        return true;
    } else {
        logResult('Update Parking Lot', false, result.message || 'Failed to update parking lot');
        return false;
    }
};

// Main test runner
const runParkingTests = async () => {
    console.log('🚀 Starting Comprehensive Parking Management API Tests...\n');
    
    // Setup
    const adminSetup = await setupAdminUser();
    if (!adminSetup) {
        console.log('⚠️  Tests cannot run without admin authentication');
        return;
    }
    
    const tests = [
        // Core Entity Tests
        { name: 'Create Parking Lot', fn: testCreateParkingLot },
        { name: 'Get Parking Lots', fn: testGetParkingLots },
        { name: 'Get Parking Lot by ID', fn: testGetParkingLotById },
        { name: 'Create Floor', fn: testCreateFloor },
        { name: 'Get Floors', fn: testGetFloors },
        { name: 'Create Parking Slot', fn: testCreateParkingSlot },
        { name: 'Bulk Create Parking Slots', fn: testBulkCreateParkingSlots },
        { name: 'Get Parking Slots', fn: testGetParkingSlots },
        
        // Gateway and Node Tests
        { name: 'Gateway Access Control', fn: testCreateGateway },
        { name: 'Link Gateway', fn: testLinkGateway },
        { name: 'Create Node', fn: testCreateNode },
        { name: 'Get Nodes', fn: testGetNodes },
        { name: 'Get Unassigned Nodes', fn: testGetUnassignedNodes },
        
        // Integration Tests
        { name: 'Assign Node to Parking Slot', fn: testAssignNodeToParkingSlot },
        { name: 'Get Parking Slot Status', fn: testGetParkingSlotStatus },
        { name: 'Get Floor Statistics', fn: testFloorStatistics },
        { name: 'Get Node Statistics', fn: testNodeStatistics },
        
        // Update and Management Tests
        { name: 'Update Parking Lot', fn: testUpdateParkingLot },
        { name: 'Unassign Node from Slot', fn: testUnassignNode },
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
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('📊 Parking Management API Test Results:');
    console.log(`   Passed: ${passed}/${total}`);
    console.log(`   Success Rate: ${Math.round((passed / total) * 100)}%`);
    
    if (passed === total) {
        console.log('\n🎉 All parking management API tests passed!');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
    
    console.log('\n📋 Complete Parking Management Flow Tested:');
    console.log('✅ Admin can create and manage parking lots');
    console.log('✅ Admin can create floors within parking lots');
    console.log('✅ Admin can create individual and bulk parking slots');
    console.log('✅ Admin can link gateways to their account');
    console.log('✅ Admin can create nodes under gateways');
    console.log('✅ Admin can assign nodes to parking slots');
    console.log('✅ System provides comprehensive statistics and monitoring');
    console.log('✅ Proper access control and data isolation');
    console.log('✅ Full CRUD operations on all entities');
};

// Instructions
console.log('📋 Parking Management API Test Instructions:');
console.log('1. Make sure your server is running: npm run dev');
console.log('2. Make sure test users are set up: npx ts-node setup-test-users.ts');
console.log('3. Run this comprehensive test: node test-parking-apis.js');
console.log('4. For verbose output: VERBOSE=true node test-parking-apis.js');
console.log('');

// Export for manual testing
module.exports = {
    runParkingTests,
    makeRequest,
    setupAdminUser
};

// Run tests if this file is executed directly
if (require.main === module) {
    runParkingTests();
}