const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001/api';
let adminToken = null;
let testParkingLot = null;
let testFloor = null;
let testParkingSlot = null;
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

// Login as admin
async function setupAdmin() {
    console.log('🔐 Setting up admin user...\n');

    const loginData = {
        email: 'superadmin@test.com',
        password: 'superadmin123'
    };

    const loginResult = await makeRequest('POST', '/auth/login', loginData);

    if (loginResult.success && loginResult.data.data.token) {
        adminToken = loginResult.data.data.token;
        logResult('Admin Login', true, 'Successfully logged in as admin');
        return true;
    } else {
        logResult('Admin Login', false, loginResult.message || 'Login failed');
        return false;
    }
}

// Create test parking lot, floor, and slot
async function createTestResources() {
    console.log('🏗️ Creating test resources...\n');

    // Create parking lot
    const parkingLotData = {
        name: 'Test Parking Lot for Nodes',
        address: '123 Test Street, Test City'
    };

    const parkingLotResult = await makeRequest('POST', '/parking-lots', parkingLotData, {
        'Authorization': `Bearer ${adminToken}`
    });

    if (parkingLotResult.success) {
        testParkingLot = parkingLotResult.data.data;
        logResult('Create Parking Lot', true, `Created parking lot: ${testParkingLot.name}`);
    } else {
        logResult('Create Parking Lot', false, parkingLotResult.message);
        return false;
    }

    // Create floor
    const floorData = {
        name: 'Ground Floor'
    };

    const floorResult = await makeRequest('POST', `/parking-lots/${testParkingLot.id}/floors`, floorData, {
        'Authorization': `Bearer ${adminToken}`
    });

    if (floorResult.success) {
        testFloor = floorResult.data.data;
        logResult('Create Floor', true, `Created floor: ${testFloor.name}`);
    } else {
        logResult('Create Floor', false, floorResult.message);
        return false;
    }

    // Create parking slot
    const slotData = {
        name: 'A-001'
    };

    const slotResult = await makeRequest('POST', `/floors/${testFloor.id}/parking-slots`, slotData, {
        'Authorization': `Bearer ${adminToken}`
    });

    if (slotResult.success) {
        testParkingSlot = slotResult.data.data;
        logResult('Create Parking Slot', true, `Created parking slot: ${testParkingSlot.name}`);
        return true;
    } else {
        logResult('Create Parking Slot', false, slotResult.message);
        return false;
    }
}

// Test node creation (without gateway)
async function testNodeCreation() {
    console.log('🔗 Testing Node Creation (without gateway)...\n');

    const nodeData = {
        name: 'Test Node Sensor 001',
        chirpstackDeviceId: '0123456789ABCDEF',
        description: 'Test ultrasonic sensor for parking slot A-001',
        parkingSlotId: testParkingSlot.id,
        latitude: 40.7128,
        longitude: -74.0060
    };

    const result = await makeRequest('POST', '/nodes', nodeData, {
        'Authorization': `Bearer ${adminToken}`
    });

    if (result.success) {
        testNode = result.data.data;
        logResult('Create Node', true, `Created node: ${testNode.name} (ID: ${testNode.id})`);
        return true;
    } else {
        logResult('Create Node', false, result.message);
        console.log('Response data:', result.data);
        return false;
    }
}

// Test node retrieval
async function testNodeRetrieval() {
    console.log('📋 Testing Node Retrieval...\n');

    // Get all nodes
    const allNodesResult = await makeRequest('GET', '/nodes', null, {
        'Authorization': `Bearer ${adminToken}`
    });

    if (allNodesResult.success) {
        const nodes = allNodesResult.data.data;
        logResult('Get All Nodes', true, `Retrieved ${nodes.length} node(s)`);

        if (nodes.length > 0) {
            console.log(`   First node details: ${nodes[0].name} connected to slot: ${nodes[0].parkingSlot.name}`);
        }
    } else {
        logResult('Get All Nodes', false, allNodesResult.message);
    }

    // Get specific node
    if (testNode) {
        const nodeResult = await makeRequest('GET', `/nodes/${testNode.id}`, null, {
            'Authorization': `Bearer ${adminToken}`
        });

        if (nodeResult.success) {
            const node = nodeResult.data.data;
            logResult('Get Specific Node', true, `Retrieved node: ${node.name}`);
            console.log(`   Connected to slot: ${node.parkingSlot.name}`);
            console.log(`   Gateway info: ${node.gateway.name} (ID: ${node.gateway.id})`);
        } else {
            logResult('Get Specific Node', false, nodeResult.message);
        }
    }
}

// Test node status update
async function testNodeStatusUpdate() {
    console.log('📊 Testing Node Status Update...\n');

    if (!testNode) {
        logResult('Node Status Update', false, 'No test node available');
        return;
    }

    const statusData = {
        distance: 15.5,
        percentage: 85,
        batteryLevel: 92
    };

    const result = await makeRequest('PUT', `/nodes/${testNode.id}/status`, statusData, {
        'Authorization': `Bearer ${adminToken}`
    });

    if (result.success) {
        const nodeStatus = result.data.data;
        logResult('Update Node Status', true, `Updated node status - Slot Status: ${nodeStatus.slotStatus}`);
        console.log(`   Distance: ${nodeStatus.distance}cm, Percentage: ${nodeStatus.percentage}%, Battery: ${nodeStatus.batteryLevel}%`);
    } else {
        logResult('Update Node Status', false, result.message);
    }
}

// Test validation errors
async function testValidationErrors() {
    console.log('⚠️ Testing Validation Errors...\n');

    // Test missing required fields
    const invalidNodeData = {
        name: 'Test Node',
        // Missing chirpstackDeviceId and parkingSlotId
    };

    const result = await makeRequest('POST', '/nodes', invalidNodeData, {
        'Authorization': `Bearer ${adminToken}`
    });

    if (!result.success && result.status === 400) {
        logResult('Validation Error Test', true, 'Correctly rejected invalid node data');
    } else {
        logResult('Validation Error Test', false, 'Should have rejected invalid data');
    }

    // Test invalid ChirpStack Device ID format
    const invalidDeviceIdData = {
        name: 'Test Node',
        chirpstackDeviceId: 'INVALID',
        parkingSlotId: testParkingSlot.id
    };

    const deviceIdResult = await makeRequest('POST', '/nodes', invalidDeviceIdData, {
        'Authorization': `Bearer ${adminToken}`
    });

    if (!deviceIdResult.success && deviceIdResult.status === 400) {
        logResult('ChirpStack ID Validation', true, 'Correctly rejected invalid ChirpStack Device ID');
    } else {
        logResult('ChirpStack ID Validation', false, 'Should have rejected invalid ChirpStack Device ID');
    }
}

// Clean up test data
async function cleanup() {
    console.log('🧹 Cleaning up test data...\n');

    if (testNode) {
        const deleteNodeResult = await makeRequest('DELETE', `/nodes/${testNode.id}`, null, {
            'Authorization': `Bearer ${adminToken}`
        });
        logResult('Delete Node', deleteNodeResult.success,
            deleteNodeResult.success ? 'Node deleted successfully' : deleteNodeResult.message);
    }

    if (testParkingLot) {
        const deleteLotResult = await makeRequest('DELETE', `/parking-lots/${testParkingLot.id}`, null, {
            'Authorization': `Bearer ${adminToken}`
        });
        logResult('Delete Parking Lot', deleteLotResult.success,
            deleteLotResult.success ? 'Parking lot deleted successfully' : deleteLotResult.message);
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Starting Node API Tests (Updated Model)\n');
    console.log('========================================\n');

    try {
        // Setup
        const adminSetup = await setupAdmin();
        if (!adminSetup) {
            console.log('❌ Cannot proceed without admin access');
            return;
        }

        const resourcesSetup = await createTestResources();
        if (!resourcesSetup) {
            console.log('❌ Cannot proceed without test resources');
            return;
        }

        // Run tests
        await testNodeCreation();
        await testNodeRetrieval();
        await testNodeStatusUpdate();
        await testValidationErrors();

        // Clean up
        await cleanup();

        console.log('✅ All tests completed!');

    } catch (error) {
        console.error('💥 Test suite failed:', error.message);
    }
}

// Run the tests
runTests();