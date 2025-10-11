const mqtt = require('mqtt');
const axios = require('axios');

const MQTT_BROKER = 'tcp://test.mosquitto.org:1883';
const APPLICATION_ID = '031709f4-457f-4e1c-a446-b9780838d050';
const DEV_EUI = '0102030405060788';
const TOPIC = `application/${APPLICATION_ID}/device/${DEV_EUI}/event/up`;
const BASE_URL = 'http://localhost:3001';

let authToken = null;

// Test payload
const createPayload = (state, distance) => ({
  "deduplicationId": `test-${Date.now()}`,
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
  "fCnt": Math.floor(Math.random() * 1000),
  "fPort": 10,
  "confirmed": false,
  "data": "AQIDBAUGBwgJCgsMDQ4PEA==",
  "object": {
    "distance_cm": distance,
    "state": state
  },
  "rxInfo": [
    {
      "gatewayId": "dca632fffe52c445",
      "uplinkId": Math.floor(Math.random() * 10000),
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
});

async function login() {
  console.log('🔐 Authenticating...');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'superadmin@smartparking.com',
      password: 'SuperAdmin2024!'
    });

    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Authenticated successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function findTargetNode() {
  console.log('\n🔍 Finding node with devEui:', DEV_EUI);

  try {
    const response = await axios.get(`${BASE_URL}/api/nodes`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    const nodes = response.data.nodes || [];
    const node = nodes.find(n => n.chirpstackDeviceId === DEV_EUI);

    if (node) {
      console.log(`✅ Found node: ${node.name}`);
      console.log(`   ↳ Node ID: ${node.id}`);
      console.log(`   ↳ Parking Slot ID: ${node.parkingSlotId || 'Not assigned'}`);
      return node;
    } else {
      console.log(`⚠️  Node with devEui ${DEV_EUI} not found`);
      console.log(`   Total nodes in system: ${nodes.length}`);

      // Show first few nodes with their devEui
      if (nodes.length > 0) {
        console.log('\n   Available nodes:');
        nodes.slice(0, 5).forEach((n, idx) => {
          console.log(`   ${idx + 1}. ${n.name} (devEui: ${n.chirpstackDeviceId})`);
        });
      }
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching nodes:', error.message);
    return null;
  }
}

async function getSlotDetails(slotId) {
  try {
    const response = await axios.get(`${BASE_URL}/api/parking-slots/${slotId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return response.data.parkingSlot;
  } catch (error) {
    console.error('❌ Error fetching slot:', error.message);
    return null;
  }
}

async function publishMessage(state, distance) {
  console.log(`\n📡 Publishing MQTT message: ${state} @ ${distance} cm`);

  return new Promise((resolve, reject) => {
    const client = mqtt.connect(MQTT_BROKER, {
      clientId: `test-${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 4000
    });

    const timeout = setTimeout(() => {
      client.end();
      reject(new Error('Connection timeout'));
    }, 5000);

    client.on('connect', () => {
      clearTimeout(timeout);
      console.log('✅ Connected to MQTT broker');

      const payload = createPayload(state, distance);

      client.publish(TOPIC, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error('❌ Publish failed:', err.message);
          client.end();
          reject(err);
        } else {
          console.log(`✅ Published to topic: ${TOPIC}`);
          console.log(`   ↳ State: ${state}, Distance: ${distance} cm`);
          client.end();
          resolve();
        }
      });
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      console.error('❌ MQTT error:', err.message);
      reject(err);
    });
  });
}

async function wait(seconds) {
  console.log(`⏳ Waiting ${seconds}s for processing...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function verifyUpdate(slotId, expectedState, expectedDistance) {
  console.log('\n✔️  Verifying update...');

  const slot = await getSlotDetails(slotId);
  if (!slot) return false;

  const expectedStatus = expectedState === 'FREE' ? 'available' : 'occupied';

  console.log('Database values:');
  console.log(`   Status:       ${slot.status} ${slot.status === expectedStatus ? '✅' : '❌ expected: ' + expectedStatus}`);
  console.log(`   Distance:     ${slot.lastDistanceCm} cm ${Math.abs(slot.lastDistanceCm - expectedDistance) < 0.1 ? '✅' : '❌ expected: ' + expectedDistance}`);
  console.log(`   Gateway:      ${slot.lastGatewayId || 'N/A'}`);
  console.log(`   Sensor State: ${slot.lastSensorState || 'N/A'} ${slot.lastSensorState === expectedState ? '✅' : '❌ expected: ' + expectedState}`);
  console.log(`   Last Updated: ${slot.lastMessageReceivedAt || 'N/A'}`);

  const statusOk = slot.status === expectedStatus;
  const distanceOk = Math.abs(slot.lastDistanceCm - expectedDistance) < 0.1;
  const stateOk = slot.lastSensorState === expectedState;

  return statusOk && distanceOk && stateOk;
}

async function runTest() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  MQTT End-to-End Flow Verification');
  console.log('═══════════════════════════════════════════════════════\n');

  // Authenticate
  const authenticated = await login();
  if (!authenticated) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }

  // Find node
  const node = await findTargetNode();
  if (!node || !node.parkingSlotId) {
    console.log('\n❌ Cannot proceed: Node not found or not assigned to a parking slot');
    console.log('\nℹ️  To create test node, you can:');
    console.log('   1. Use Swagger UI at http://localhost:3001/api-docs');
    console.log(`   2. Create a node with chirpstackDeviceId: ${DEV_EUI}`);
    console.log('   3. Assign it to a parking slot');
    return;
  }

  const slotId = node.parkingSlotId;

  // Get initial state
  console.log('\n📊 Initial state:');
  const initialSlot = await getSlotDetails(slotId);
  if (initialSlot) {
    console.log(`   Status: ${initialSlot.status}`);
    console.log(`   Distance: ${initialSlot.lastDistanceCm ?? 'N/A'} cm`);
    console.log(`   Last Update: ${initialSlot.lastMessageReceivedAt ?? 'Never'}`);
  }

  // Test 1: FREE state
  console.log('\n\n🧪 TEST 1: FREE State (172.0 cm)');
  console.log('───────────────────────────────────────────────────────');
  try {
    await publishMessage('FREE', 172.0);
    await wait(3);
    const test1 = await verifyUpdate(slotId, 'FREE', 172.0);
    console.log(test1 ? '\n✅ TEST 1 PASSED' : '\n❌ TEST 1 FAILED');
  } catch (error) {
    console.error('❌ TEST 1 ERROR:', error.message);
  }

  // Test 2: OCCUPIED state
  console.log('\n\n🧪 TEST 2: OCCUPIED State (45.5 cm)');
  console.log('───────────────────────────────────────────────────────');
  try {
    await publishMessage('OCCUPIED', 45.5);
    await wait(3);
    const test2 = await verifyUpdate(slotId, 'OCCUPIED', 45.5);
    console.log(test2 ? '\n✅ TEST 2 PASSED' : '\n❌ TEST 2 FAILED');
  } catch (error) {
    console.error('❌ TEST 2 ERROR:', error.message);
  }

  // Test 3: Back to FREE
  console.log('\n\n🧪 TEST 3: FREE State Again (180.0 cm)');
  console.log('───────────────────────────────────────────────────────');
  try {
    await publishMessage('FREE', 180.0);
    await wait(3);
    const test3 = await verifyUpdate(slotId, 'FREE', 180.0);
    console.log(test3 ? '\n✅ TEST 3 PASSED' : '\n❌ TEST 3 FAILED');
  } catch (error) {
    console.error('❌ TEST 3 ERROR:', error.message);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Verification Complete');
  console.log('═══════════════════════════════════════════════════════');
}

runTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
