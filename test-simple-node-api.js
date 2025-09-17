#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let nodeId = '';

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bright: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
    console.log('\n' + '='.repeat(50));
    log(message, 'bright');
    console.log('='.repeat(50));
}

async function apiCall(method, endpoint, data = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && { Authorization: `Bearer ${authToken}` })
            },
            ...(data && { data })
        };

        const response = await axios(config);
        return response.data;
    } catch (error) {
        log(`❌ ${method} ${endpoint} failed: ${error.response?.data?.message || error.message}`, 'red');
        throw error;
    }
}

async function testSimpleAPI() {
    try {
        logHeader('🚀 SIMPLE NODE API TEST');

        // 1. Authenticate
        log('1. Authenticating...', 'blue');
        const authResponse = await apiCall('POST', '/auth/login', {
            email: 'admin@test.com',
            password: 'password123'
        });
        
        authToken = authResponse.data.token;
        log('✅ Authentication successful', 'green');

        // 2. Get nodes
        log('\n2. Getting all nodes...', 'blue');
        const nodesResponse = await apiCall('GET', '/nodes');
        const nodes = nodesResponse.data;
        
        if (nodes.length > 0) {
            nodeId = nodes[0].id;
            log(`✅ Found ${nodes.length} nodes`, 'green');
            log(`Using node: ${nodes[0].name} (${nodes[0].id})`, 'cyan');
            
            // Show current status
            log(`Current status:`, 'cyan');
            log(`  - Online: ${nodes[0].isOnline}`, 'blue');
            log(`  - Battery: ${nodes[0].batteryLevel || 'N/A'}%`, 'blue');
            log(`  - Distance: ${nodes[0].distance || 'N/A'}`, 'blue');
            log(`  - Percentage: ${nodes[0].percentage || 'N/A'}%`, 'blue');
            log(`  - Slot Status: ${nodes[0].slotStatus || 'N/A'}`, 'blue');
        } else {
            log('⚠️ No nodes found', 'yellow');
            return;
        }

        // 3. Update node status - Test case 1: Available slot (90%)
        log('\n3. Testing slot availability logic...', 'blue');
        
        log('\n📊 Test 1: Setting percentage to 90% (should be AVAILABLE)', 'cyan');
        const test1Response = await apiCall('PUT', `/nodes/${nodeId}/status`, {
            distance: 200,
            percentage: 90,
            batteryLevel: 85
        });
        
        log(`✅ Status updated:`, 'green');
        log(`  - Percentage: ${test1Response.data.percentage}%`, 'blue');
        log(`  - Slot Status: ${test1Response.data.slotStatus}`, test1Response.data.slotStatus === 'available' ? 'green' : 'red');
        log(`  - Distance: ${test1Response.data.distance}`, 'blue');

        // 4. Test case 2: Reserved slot (40%)
        log('\n📊 Test 2: Setting percentage to 40% (should be RESERVED)', 'cyan');
        const test2Response = await apiCall('PUT', `/nodes/${nodeId}/status`, {
            distance: 50,
            percentage: 40,
            batteryLevel: 80
        });
        
        log(`✅ Status updated:`, 'green');
        log(`  - Percentage: ${test2Response.data.percentage}%`, 'blue');
        log(`  - Slot Status: ${test2Response.data.slotStatus}`, test2Response.data.slotStatus === 'reserved' ? 'green' : 'red');
        log(`  - Distance: ${test2Response.data.distance}`, 'blue');

        // 5. Test case 3: Indeterminate zone (70%)
        log('\n📊 Test 3: Setting percentage to 70% (should be INDETERMINATE)', 'cyan');
        const test3Response = await apiCall('PUT', `/nodes/${nodeId}/status`, {
            distance: 100,
            percentage: 70,
            batteryLevel: 75
        });
        
        log(`✅ Status updated:`, 'green');
        log(`  - Percentage: ${test3Response.data.percentage}%`, 'blue');
        log(`  - Slot Status: ${test3Response.data.slotStatus || 'INDETERMINATE'}`, 'yellow');
        log(`  - Distance: ${test3Response.data.distance}`, 'blue');

        // 6. Get final node status
        log('\n4. Getting final node status...', 'blue');
        const finalResponse = await apiCall('GET', `/nodes/${nodeId}`);
        const finalNode = finalResponse.data;
        
        log(`✅ Final node status:`, 'green');
        log(`  - Name: ${finalNode.name}`, 'cyan');
        log(`  - Online: ${finalNode.isOnline}`, 'blue');
        log(`  - Last Seen: ${new Date(finalNode.lastSeen).toLocaleString()}`, 'blue');
        log(`  - Battery Level: ${finalNode.batteryLevel}%`, 'blue');
        log(`  - Distance: ${finalNode.distance}`, 'blue');
        log(`  - Percentage: ${finalNode.percentage}%`, 'blue');
        log(`  - Slot Status: ${finalNode.slotStatus}`, finalNode.slotStatus === 'available' ? 'green' : finalNode.slotStatus === 'reserved' ? 'red' : 'yellow');

        logHeader('✅ SIMPLE API TEST COMPLETED SUCCESSFULLY');
        
        log('\n📋 Summary of Simple Logic:', 'bright');
        log('• Percentage ≥ 80%: Slot is AVAILABLE', 'green');
        log('• Percentage < 60%: Slot is RESERVED', 'red');
        log('• Percentage 60-79%: Slot is INDETERMINATE', 'yellow');
        log('\n🔗 API Endpoints:', 'bright');
        log('• GET /api/nodes - List all nodes with status', 'blue');
        log('• GET /api/nodes/:id - Get specific node details', 'blue');
        log('• PUT /api/nodes/:id/status - Update node status', 'blue');

    } catch (error) {
        log(`❌ Test failed: ${error.message}`, 'red');
        process.exit(1);
    }
}

if (require.main === module) {
    testSimpleAPI();
}

module.exports = { testSimpleAPI };