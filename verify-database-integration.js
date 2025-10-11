const { DataSource } = require('typeorm');
const mqtt = require('mqtt');
require('dotenv').config();

// Database connection
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: false
});

const MQTT_BROKER = 'tcp://test.mosquitto.org:1883';
const TEST_DEV_EUI = '0102030405060788';
const TEST_APP_ID = '031709f4-457f-4e1c-a446-b9780838d050';

console.log('═══════════════════════════════════════════════════════');
console.log('  Database Integration Verification');
console.log('═══════════════════════════════════════════════════════\n');

async function verifyApplicationIds() {
  console.log('📊 Step 1: Verifying Application IDs in database...\n');

  const parkingLots = await AppDataSource.query(`
    SELECT id, name, "chirpstackApplicationId", "chirpstackApplicationName", "isActive"
    FROM parking_lot
    WHERE "chirpstackApplicationId" IS NOT NULL
    ORDER BY "createdAt" DESC
  `);

  if (parkingLots.length === 0) {
    console.log('❌ No parking lots with Application IDs found\n');
    return [];
  }

  console.log(`✅ Found ${parkingLots.length} parking lot(s) with Application IDs:\n`);
  parkingLots.forEach((lot, idx) => {
    console.log(`${idx + 1}. ${lot.name}`);
    console.log(`   ↳ Application ID: ${lot.chirpstackApplicationId}`);
    console.log(`   ↳ Application Name: ${lot.chirpstackApplicationName || 'N/A'}`);
    console.log(`   ↳ Status: ${lot.isActive ? '✅ Active' : '⚠️  Inactive'}`);
    console.log(`   ↳ Expected Topic: application/${lot.chirpstackApplicationId}/device/+/event/up\n`);
  });

  return parkingLots;
}

async function verifyNodes() {
  console.log('🔧 Step 2: Checking nodes in database...\n');

  const nodes = await AppDataSource.query(`
    SELECT
      n.id,
      n.name,
      n."chirpstackDeviceId",
      n."parkingSlotId",
      ps.name as slot_name,
      ps.status as slot_status,
      ps."lastDistanceCm",
      ps."lastSensorState",
      ps."lastGatewayId",
      ps."lastMessageReceivedAt"
    FROM node n
    LEFT JOIN parking_slot ps ON ps.id = n."parkingSlotId"
    ORDER BY n."createdAt" DESC
    LIMIT 10
  `);

  if (nodes.length === 0) {
    console.log('❌ No nodes found in database\n');
    return null;
  }

  console.log(`✅ Found ${nodes.length} node(s) in database:\n`);

  let testNode = null;
  nodes.forEach((node, idx) => {
    const isTestNode = node.chirpstackDeviceId === TEST_DEV_EUI;
    if (isTestNode) testNode = node;

    console.log(`${idx + 1}. ${node.name} ${isTestNode ? '⭐ (TEST NODE)' : ''}`);
    console.log(`   ↳ DevEUI: ${node.chirpstackDeviceId}`);
    console.log(`   ↳ Parking Slot: ${node.slot_name || 'Not assigned'}`);

    if (node.parkingSlotId) {
      console.log(`   ↳ Slot Status: ${node.slot_status || 'unknown'}`);
      console.log(`   ↳ Last Distance: ${node.lastDistanceCm !== null ? node.lastDistanceCm + ' cm' : 'N/A'}`);
      console.log(`   ↳ Last Sensor State: ${node.lastSensorState || 'N/A'}`);
      console.log(`   ↳ Last Gateway ID: ${node.lastGatewayId || 'N/A'}`);
      console.log(`   ↳ Last Message: ${node.lastMessageReceivedAt ? new Date(node.lastMessageReceivedAt).toISOString() : 'Never'}`);
    }
    console.log('');
  });

  return testNode;
}

async function checkParkingSlotDetails(nodeInfo) {
  if (!nodeInfo || !nodeInfo.parkingSlotId) {
    console.log('⚠️  Test node not assigned to parking slot\n');
    return null;
  }

  console.log('📍 Step 3: Parking slot details for test node...\n');

  const slot = await AppDataSource.query(`
    SELECT
      ps.id,
      ps.name,
      ps.status,
      ps."lastDistanceCm",
      ps."lastSensorState",
      ps."lastGatewayId",
      ps."lastMessageReceivedAt",
      f.name as floor_name,
      pl.name as parking_lot_name,
      pl."chirpstackApplicationId"
    FROM parking_slot ps
    JOIN floor f ON f.id = ps."floorId"
    JOIN parking_lot pl ON pl.id = f."parkingLotId"
    WHERE ps.id = $1
  `, [nodeInfo.parkingSlotId]);

  if (slot.length === 0) {
    console.log('❌ Parking slot not found\n');
    return null;
  }

  const slotInfo = slot[0];
  console.log(`Parking Slot: ${slotInfo.name}`);
  console.log(`   ↳ Floor: ${slotInfo.floor_name}`);
  console.log(`   ↳ Parking Lot: ${slotInfo.parking_lot_name}`);
  console.log(`   ↳ Application ID: ${slotInfo.chirpstackApplicationId}`);
  console.log(`   ↳ Current Status: ${slotInfo.status}`);
  console.log(`   ↳ Last Distance: ${slotInfo.lastDistanceCm !== null ? slotInfo.lastDistanceCm + ' cm' : 'N/A'}`);
  console.log(`   ↳ Last Sensor State: ${slotInfo.lastSensorState || 'N/A'}`);
  console.log(`   ↳ Last Gateway: ${slotInfo.lastGatewayId || 'N/A'}`);
  console.log(`   ↳ Last Update: ${slotInfo.lastMessageReceivedAt ? new Date(slotInfo.lastMessageReceivedAt).toISOString() : 'Never'}\n`);

  return slotInfo;
}

async function checkStatusLogs(parkingSlotId) {
  console.log('📝 Step 4: Recent status logs...\n');

  const logs = await AppDataSource.query(`
    SELECT
      status,
      distance,
      percentage,
      "batteryLevel",
      "signalQuality",
      "detectedAt",
      metadata
    FROM parking_status_log
    WHERE "parkingSlotId" = $1
    ORDER BY "detectedAt" DESC
    LIMIT 5
  `, [parkingSlotId]);

  if (logs.length === 0) {
    console.log('⚠️  No status logs found for this slot\n');
    return;
  }

  console.log(`✅ Found ${logs.length} recent log entries:\n`);
  logs.forEach((log, idx) => {
    console.log(`${idx + 1}. ${log.status.toUpperCase()} at ${new Date(log.detectedAt).toISOString()}`);
    console.log(`   ↳ Distance: ${log.distance} cm`);
    console.log(`   ↳ Battery: ${log.batteryLevel !== null ? log.batteryLevel + '%' : 'N/A'}`);
    console.log(`   ↳ Signal: ${log.signalQuality !== null ? log.signalQuality + '%' : 'N/A'}`);
    if (log.metadata) {
      console.log(`   ↳ DevEUI: ${log.metadata.devEui || 'N/A'}`);
      console.log(`   ↳ Gateway: ${log.metadata.gatewayId || 'N/A'}`);
    }
    console.log('');
  });
}

function createMqttPayload(state, distance) {
  return {
    "deduplicationId": `verify-${Date.now()}-${Math.random().toString(16).substr(2, 8)}`,
    "time": new Date().toISOString(),
    "deviceInfo": {
      "tenantId": "52f14cd4-c6f1-4fbd-8f87-4025e1d49242",
      "tenantName": "ChirpStack",
      "applicationId": TEST_APP_ID,
      "applicationName": "app1",
      "deviceProfileId": "b1d6c168-7944-4982-b53e-a1e7162456bb",
      "deviceProfileName": "device profile 1",
      "deviceName": "dev1",
      "devEui": TEST_DEV_EUI,
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
  };
}

async function publishAndVerify(slotId, testName, state, distance) {
  console.log(`\n🧪 ${testName}`);
  console.log('─────────────────────────────────────────────────────\n');

  // Get current state
  const before = await AppDataSource.query(`
    SELECT status, "lastDistanceCm", "lastSensorState", "lastMessageReceivedAt"
    FROM parking_slot
    WHERE id = $1
  `, [slotId]);

  console.log(`Before: status=${before[0].status}, distance=${before[0].lastDistanceCm}, state=${before[0].lastSensorState}`);

  // Publish MQTT message
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(MQTT_BROKER, {
      clientId: `verify-${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 5000
    });

    const timeout = setTimeout(() => {
      client.end();
      reject(new Error('Connection timeout'));
    }, 6000);

    client.on('connect', () => {
      clearTimeout(timeout);

      const topic = `application/${TEST_APP_ID}/device/${TEST_DEV_EUI}/event/up`;
      const payload = createMqttPayload(state, distance);

      client.publish(topic, JSON.stringify(payload), { qos: 1 }, async (err) => {
        if (err) {
          console.error('❌ Publish failed:', err.message);
          client.end();
          reject(err);
        } else {
          console.log(`✅ Published: state=${state}, distance=${distance} cm`);
          client.end();

          // Wait for processing
          console.log('⏳ Waiting 3s for backend processing...\n');
          await new Promise(r => setTimeout(r, 3000));

          // Verify update
          const after = await AppDataSource.query(`
            SELECT status, "lastDistanceCm", "lastSensorState", "lastMessageReceivedAt", "lastGatewayId"
            FROM parking_slot
            WHERE id = $1
          `, [slotId]);

          const expectedStatus = state === 'FREE' ? 'available' : 'occupied';
          const statusMatch = after[0].status === expectedStatus;
          const distanceMatch = Math.abs(after[0].lastDistanceCm - distance) < 0.1;
          const stateMatch = after[0].lastSensorState === state;
          const updated = after[0].lastMessageReceivedAt > before[0].lastMessageReceivedAt;

          console.log(`After:  status=${after[0].status}, distance=${after[0].lastDistanceCm}, state=${after[0].lastSensorState}`);
          console.log(`Gateway: ${after[0].lastGatewayId}`);
          console.log(`Updated: ${updated ? '✅ Yes' : '❌ No'}`);

          console.log('\nVerification:');
          console.log(`  Status: ${statusMatch ? '✅' : '❌'} (expected: ${expectedStatus}, got: ${after[0].status})`);
          console.log(`  Distance: ${distanceMatch ? '✅' : '❌'} (expected: ${distance}, got: ${after[0].lastDistanceCm})`);
          console.log(`  Sensor State: ${stateMatch ? '✅' : '❌'} (expected: ${state}, got: ${after[0].lastSensorState})`);
          console.log(`  Timestamp: ${updated ? '✅' : '❌'}`);

          if (statusMatch && distanceMatch && stateMatch && updated) {
            console.log('\n✅ TEST PASSED - Real-time update working!');
            resolve(true);
          } else {
            console.log('\n❌ TEST FAILED - Some fields did not update correctly');
            resolve(false);
          }
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

async function runVerification() {
  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    // Step 1: Verify Application IDs
    const parkingLots = await verifyApplicationIds();

    if (parkingLots.length === 0) {
      console.log('❌ Cannot proceed without parking lots with Application IDs\n');
      return;
    }

    // Step 2: Check nodes
    const testNode = await verifyNodes();

    if (!testNode) {
      console.log(`\n⚠️  Test node with devEui ${TEST_DEV_EUI} not found in database`);
      console.log('\n📋 To complete verification:');
      console.log('   1. Open Swagger UI: http://localhost:3001/api-docs');
      console.log('   2. Create a gateway with chirpstackGatewayId: dca632fffe52c445');
      console.log(`   3. Create a node with chirpstackDeviceId: ${TEST_DEV_EUI}`);
      console.log('   4. Assign the node to a parking slot');
      console.log('   5. Re-run this script\n');
      return;
    }

    // Step 3: Check parking slot details
    const slotInfo = await checkParkingSlotDetails(testNode);

    if (!slotInfo) {
      console.log('❌ Cannot proceed without parking slot assignment\n');
      return;
    }

    // Step 4: Check status logs
    await checkStatusLogs(slotInfo.id);

    // Step 5: Real-time testing
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Real-Time Database Update Tests');
    console.log('═══════════════════════════════════════════════════════');

    const test1 = await publishAndVerify(slotInfo.id, 'Test 1: OCCUPIED → available (FREE at 180cm)', 'FREE', 180.0);
    const test2 = await publishAndVerify(slotInfo.id, 'Test 2: available → occupied (OCCUPIED at 30cm)', 'OCCUPIED', 30.0);
    const test3 = await publishAndVerify(slotInfo.id, 'Test 3: occupied → available (FREE at 200cm)', 'FREE', 200.0);

    // Check final status logs
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  Updated Status Logs');
    console.log('═══════════════════════════════════════════════════════\n');
    await checkStatusLogs(slotInfo.id);

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Verification Summary');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`Test 1 (FREE 180cm):     ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 (OCCUPIED 30cm):  ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 (FREE 200cm):     ${test3 ? '✅ PASS' : '❌ FAIL'}\n`);

    if (test1 && test2 && test3) {
      console.log('🎉 All tests passed! Database integration verified!\n');
    } else {
      console.log('⚠️  Some tests failed. Check backend logs for details.\n');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    // Close database
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed\n');
    }
  }
}

runVerification().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
