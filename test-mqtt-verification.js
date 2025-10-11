const mqtt = require('mqtt');
const axios = require('axios');

const MQTT_BROKER = 'tcp://test.mosquitto.org:1883';
const APPLICATION_ID = '031709f4-457f-4e1c-a446-b9780838d050';
const DEV_EUI = '0102030405060788';
const TOPIC = `application/${APPLICATION_ID}/device/${DEV_EUI}/event/up`;

const BASE_URL = 'http://localhost:3001';

// Test payload from user
const testPayload = {
  "deduplicationId": "057c2b8a-1111-4c6f-a632-2c16e2ee3d1a",
  "time": new Date().toISOString(),
  "deviceInfo": {
    "tenantId": "52f14cd4-c6f1-4fbd-8f87-4025e1d49242",
    "tenantName": "ChirpStack",
    "applicationId": APPLICATION_ID,
    "applicationName": "app1",
    "deviceProfileId": "b1d6c168-7944-4982-b53e-a1e7162456bb",
    "deviceProfileName": "device profile 1",
    "deviceName": "dev1",
    "devEui": DEV_EUI,
    "deviceClassEnabled": "CLASS_A",
    "tags": {}
  },
  "devAddr": "01020304",
  "adr": true,
  "dr": 5,
  "fCnt": 11,
  "fPort": 10,
  "confirmed": false,
  "data": "AQIDBAUGBwgJCgsMDQ4PEA==",
  "object": {
    "distance_cm": 172.0,
    "state": "FREE"
  },
  "rxInfo": [
    {
      "gatewayId": "dca632fffe52c445",
      "uplinkId": 7997,
      "time": new Date().toISOString(),
      "timeSinceGpsEpoch": null,
      "rssi": -57,
      "snr": 10.0,
      "channel": 2,
      "rfChain": 1,
      "board": 0,
      "antenna": 0,
      "location": {
        "latitude": 19.0760,
        "longitude": 72.8777,
        "altitude": 10,
        "source": "UNKNOWN",
        "accuracy": 0
      },
      "fineTimestampType": "NONE",
      "context": "EFwKww==",
      "metadata": {
        "region_config_id": "eu868",
        "region_common_name": "EU868"
      },
      "crcStatus": "CRC_OK"
    }
  ],
  "txInfo": {
    "frequency": 868100000,
    "modulation": {
      "lora": {
        "bandwidth": 125000,
        "spreadingFactor": 7,
        "codeRate": "CR_4_5"
      }
    }
  }
};

async function findNodeAndSlot() {
  console.log('\n🔍 Step 1: Finding node and parking slot...');

  try {
    const response = await axios.get(`${BASE_URL}/api/nodes`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_TOKEN || ''}`
      }
    });

    const node = response.data.nodes?.find(n => n.chirpstackDeviceId === DEV_EUI);

    if (node) {
      console.log(`✅ Found node: ${node.name} (ID: ${node.id})`);
      console.log(`   ↳ Parking Slot ID: ${node.parkingSlotId || 'N/A'}`);
      return { nodeId: node.id, parkingSlotId: node.parkingSlotId };
    } else {
      console.log(`⚠️  No node found with devEui: ${DEV_EUI}`);
      console.log('   Available nodes:', response.data.nodes?.length || 0);
      return null;
    }
  } catch (error) {
    console.error('❌ Error finding node:', error.message);
    if (error.response?.status === 401) {
      console.log('   Note: Authentication required. Set TEST_TOKEN environment variable.');
    }
    return null;
  }
}

async function getSlotStatusBefore(parkingSlotId) {
  if (!parkingSlotId) return null;

  console.log('\n📊 Step 2: Getting current slot status...');

  try {
    const response = await axios.get(`${BASE_URL}/api/parking-slots/${parkingSlotId}`);
    const slot = response.data.parkingSlot;

    console.log(`Current status:`);
    console.log(`   ↳ Status: ${slot.status}`);
    console.log(`   ↳ Distance: ${slot.lastDistanceCm ?? 'N/A'} cm`);
    console.log(`   ↳ Gateway: ${slot.lastGatewayId ?? 'N/A'}`);
    console.log(`   ↳ Sensor State: ${slot.lastSensorState ?? 'N/A'}`);
    console.log(`   ↳ Last Message: ${slot.lastMessageReceivedAt ?? 'N/A'}`);

    return slot;
  } catch (error) {
    console.error('❌ Error getting slot status:', error.message);
    return null;
  }
}

async function publishMqttMessage(state = 'FREE', distance = 172.0) {
  console.log(`\n📡 Step 3: Publishing MQTT message (${state}, ${distance} cm)...`);

  return new Promise((resolve, reject) => {
    const client = mqtt.connect(MQTT_BROKER, {
      clientId: `mqtt-test-${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 4000
    });

    client.on('connect', () => {
      console.log('✅ Connected to MQTT broker');

      // Update payload with test values
      const payload = {
        ...testPayload,
        time: new Date().toISOString(),
        object: {
          distance_cm: distance,
          state: state
        },
        rxInfo: testPayload.rxInfo.map(info => ({
          ...info,
          time: new Date().toISOString()
        }))
      };

      client.publish(TOPIC, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error('❌ Publish failed:', err.message);
          client.end();
          reject(err);
        } else {
          console.log(`✅ Published to: ${TOPIC}`);
          console.log(`   ↳ State: ${state}`);
          console.log(`   ↳ Distance: ${distance} cm`);
          console.log(`   ↳ Gateway: ${payload.rxInfo[0].gatewayId}`);
          client.end();
          resolve();
        }
      });
    });

    client.on('error', (err) => {
      console.error('❌ MQTT connection error:', err.message);
      reject(err);
    });
  });
}

async function waitForProcessing(seconds = 3) {
  console.log(`\n⏳ Waiting ${seconds}s for backend processing...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function verifySlotUpdate(parkingSlotId, expectedState, expectedDistance, expectedGateway) {
  if (!parkingSlotId) {
    console.log('\n⚠️  Cannot verify: No parking slot ID');
    return false;
  }

  console.log('\n✔️  Step 4: Verifying database update...');

  try {
    const response = await axios.get(`${BASE_URL}/api/parking-slots/${parkingSlotId}`);
    const slot = response.data.parkingSlot;

    console.log('Updated status:');
    console.log(`   ↳ Status: ${slot.status} (expected: ${expectedState === 'FREE' ? 'available' : 'occupied'})`);
    console.log(`   ↳ Distance: ${slot.lastDistanceCm} cm (expected: ${expectedDistance} cm)`);
    console.log(`   ↳ Gateway: ${slot.lastGatewayId} (expected: ${expectedGateway})`);
    console.log(`   ↳ Sensor State: ${slot.lastSensorState} (expected: ${expectedState})`);
    console.log(`   ↳ Last Message: ${slot.lastMessageReceivedAt}`);

    const statusMatch = slot.status === (expectedState === 'FREE' ? 'available' : 'occupied');
    const distanceMatch = Math.abs(slot.lastDistanceCm - expectedDistance) < 0.1;
    const gatewayMatch = slot.lastGatewayId === expectedGateway;
    const sensorStateMatch = slot.lastSensorState === expectedState;

    if (statusMatch && distanceMatch && gatewayMatch && sensorStateMatch) {
      console.log('\n✅ All fields updated correctly!');
      return true;
    } else {
      console.log('\n⚠️  Some fields did not match expected values:');
      if (!statusMatch) console.log('   • Status mismatch');
      if (!distanceMatch) console.log('   • Distance mismatch');
      if (!gatewayMatch) console.log('   • Gateway mismatch');
      if (!sensorStateMatch) console.log('   • Sensor state mismatch');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying update:', error.message);
    return false;
  }
}

async function checkStatusLogs(parkingSlotId) {
  if (!parkingSlotId) return;

  console.log('\n📝 Step 5: Checking status logs...');

  try {
    const response = await axios.get(`${BASE_URL}/api/parking/${parkingSlotId}/status-history?limit=5`);
    const logs = response.data.statusHistory;

    if (logs && logs.length > 0) {
      console.log(`Found ${logs.length} recent log entries:`);
      logs.slice(0, 3).forEach((log, idx) => {
        console.log(`   ${idx + 1}. ${log.status} at ${log.detectedAt}`);
        console.log(`      Distance: ${log.distance} cm, Battery: ${log.batteryLevel ?? 'N/A'}%`);
      });
    } else {
      console.log('No status logs found');
    }
  } catch (error) {
    console.error('❌ Error checking logs:', error.message);
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  MQTT End-to-End Verification Test');
  console.log('═══════════════════════════════════════════════════════');

  try {
    // Step 1: Find node and slot
    const result = await findNodeAndSlot();
    if (!result) {
      console.log('\n⚠️  Test incomplete: Could not find test node');
      console.log('   Please create a node with devEui: 0102030405060788');
      return;
    }

    const { parkingSlotId } = result;

    // Step 2: Get current status
    const beforeStatus = await getSlotStatusBefore(parkingSlotId);

    // Step 3: Test FREE state
    console.log('\n\n🧪 TEST 1: Publishing FREE state');
    console.log('───────────────────────────────────────────────────────');
    await publishMqttMessage('FREE', 172.0);
    await waitForProcessing(3);
    const test1Success = await verifySlotUpdate(parkingSlotId, 'FREE', 172.0, 'dca632fffe52c445');
    await checkStatusLogs(parkingSlotId);

    // Step 4: Test OCCUPIED state
    console.log('\n\n🧪 TEST 2: Publishing OCCUPIED state');
    console.log('───────────────────────────────────────────────────────');
    await publishMqttMessage('OCCUPIED', 45.5);
    await waitForProcessing(3);
    const test2Success = await verifySlotUpdate(parkingSlotId, 'OCCUPIED', 45.5, 'dca632fffe52c445');
    await checkStatusLogs(parkingSlotId);

    // Summary
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('  Test Summary');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Test 1 (FREE):     ${test1Success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 (OCCUPIED): ${test2Success ? '✅ PASS' : '❌ FAIL'}`);

    if (test1Success && test2Success) {
      console.log('\n🎉 All tests passed! MQTT verification successful!');
    } else {
      console.log('\n⚠️  Some tests failed. Check backend logs for details.');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Run tests
runTests().then(() => {
  console.log('\nTest completed.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
