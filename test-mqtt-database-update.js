const mqtt = require('mqtt');
const { DataSource } = require('typeorm');

// Configuration
const MQTT_BROKER = 'tcp://broker.hivemq.com:1883';
const APPLICATION_ID = '031709f4-457f-4e1c-a446-b9780838d050';
const DEV_EUI = '0102030405060788';
const TOPIC = `application/${APPLICATION_ID}/device/${DEV_EUI}/event/up`;

// Database configuration
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '156.67.218.14',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'smart_parking_admin',
  password: process.env.DB_PASSWORD || 'smartparking@2024',
  database: process.env.DB_NAME || 'smart_parking_db',
  synchronize: false,
  logging: false,
});

// Test payload from user
const testPayload = {
  "deduplicationId": "89664576-9b93-4720-b4ec-d10584b53120",
  "time": "2025-09-15T13:54:21.918705285+00:00",
  "deviceInfo": {
    "tenantId": "b50f6f67-5359-41d5-9ff3-4eae99b081aa",
    "tenantName": "ChirpStack",
    "applicationId": "031709f4-457f-4e1c-a446-b9780838d050",
    "applicationName": "Test_App",
    "deviceProfileId": "45504159-129f-42a0-90f0-2104af25e0e1",
    "deviceProfileName": "US_Parking_Testing",
    "deviceName": "UltraSonic_Parking_Testing",
    "devEui": "0102030405060788",
    "deviceClassEnabled": "CLASS_A",
    "tags": {}
  },
  "devAddr": "009aa844",
  "adr": true,
  "dr": 5,
  "fCnt": 6,
  "fPort": 2,
  "confirmed": true,
  "data": "AKwA",
  "object": {
    "distance_cm": 172.0,
    "state": "FREE"
  },
  "rxInfo": [{
    "gatewayId": "dca632fffe52c445",
    "uplinkId": 38637,
    "nsTime": "2025-09-15T13:54:21.683908579+00:00",
    "rssi": -95,
    "snr": 9.2,
    "channel": 7,
    "location": {},
    "context": "bJxjlA==",
    "crcStatus": "CRC_OK"
  }],
  "txInfo": {
    "frequency": 867900000,
    "modulation": {
      "lora": {
        "bandwidth": 125000,
        "spreadingFactor": 7,
        "codeRate": "CR_4_5"
      }
    }
  },
  "regionConfigId": "eu868"
};

async function main() {
  console.log('\n=== MQTT Database Update Verification Test ===\n');

  try {
    // Initialize database
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    // Step 1: Verify node exists
    console.log('Step 1: Verifying node configuration...');
    const nodeResult = await AppDataSource.query(`
      SELECT
        n.id,
        n.name,
        n."chirpstackDeviceId",
        n."parkingSlotId",
        ps.name as slot_name,
        ps.status as current_status,
        ps."lastDistanceCm",
        ps."lastSensorState",
        ps."lastGatewayId",
        ps."lastMessageReceivedAt",
        pl."chirpstackApplicationId"
      FROM node n
      LEFT JOIN parking_slot ps ON ps.id = n."parkingSlotId"
      LEFT JOIN floor f ON f.id = ps."floorId"
      LEFT JOIN parking_lot pl ON pl.id = f."parkingLotId"
      WHERE n."chirpstackDeviceId" = $1
    `, [DEV_EUI]);

    if (nodeResult.length === 0) {
      console.error(`❌ Node not found with devEui: ${DEV_EUI}`);
      console.log('\nAvailable nodes:');
      const allNodes = await AppDataSource.query(`
        SELECT "chirpstackDeviceId", name FROM node LIMIT 10
      `);
      console.table(allNodes);
      process.exit(1);
    }

    const node = nodeResult[0];
    console.log('✅ Node found:');
    console.log(`   - Node ID: ${node.id}`);
    console.log(`   - Node Name: ${node.name}`);
    console.log(`   - DevEui: ${node.chirpstackDeviceId}`);
    console.log(`   - Parking Slot: ${node.slot_name}`);
    console.log(`   - Application ID: ${node.chirpstackApplicationId}`);
    console.log(`   - Current Status: ${node.current_status}`);
    console.log(`   - Last Distance: ${node.lastDistanceCm}`);
    console.log(`   - Last State: ${node.lastSensorState}`);
    console.log(`   - Last Gateway: ${node.lastGatewayId}`);
    console.log(`   - Last Message: ${node.lastMessageReceivedAt}\n`);

    // Step 2: Get current state
    console.log('Step 2: Capturing current parking slot state...');
    const beforeState = await AppDataSource.query(`
      SELECT
        status,
        "lastDistanceCm",
        "lastSensorState",
        "lastGatewayId",
        "lastMessageReceivedAt"
      FROM parking_slot
      WHERE id = $1
    `, [node.parkingSlotId]);

    console.log('Current state:');
    console.table(beforeState);

    // Step 3: Connect to MQTT and publish message
    console.log('\nStep 3: Publishing MQTT message...');
    console.log(`Topic: ${TOPIC}`);
    console.log(`Payload object.distance_cm: ${testPayload.object.distance_cm}`);
    console.log(`Payload object.state: ${testPayload.object.state}`);

    const client = mqtt.connect(MQTT_BROKER, {
      clientId: `test-client-${Date.now()}`,
      clean: true,
      connectTimeout: 10000,
    });

    await new Promise((resolve, reject) => {
      client.on('connect', () => {
        console.log('✅ Connected to MQTT broker');

        client.publish(TOPIC, JSON.stringify(testPayload), { qos: 1 }, (err) => {
          if (err) {
            console.error('❌ Publish failed:', err);
            reject(err);
          } else {
            console.log('✅ Message published successfully');
            resolve();
          }
        });
      });

      client.on('error', (err) => {
        console.error('❌ MQTT connection error:', err);
        reject(err);
      });

      setTimeout(() => reject(new Error('MQTT connection timeout')), 10000);
    });

    // Step 4: Wait for backend to process
    console.log('\nStep 4: Waiting for backend to process message (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 5: Check updated state
    console.log('\nStep 5: Checking updated parking slot state...');
    const afterState = await AppDataSource.query(`
      SELECT
        status,
        "lastDistanceCm",
        "lastSensorState",
        "lastGatewayId",
        "lastMessageReceivedAt"
      FROM parking_slot
      WHERE id = $1
    `, [node.parkingSlotId]);

    console.log('Updated state:');
    console.table(afterState);

    // Step 6: Compare and verify
    console.log('\n=== VERIFICATION RESULTS ===\n');

    const before = beforeState[0];
    const after = afterState[0];

    const statusChanged = before.status !== after.status;
    const distanceChanged = before.lastDistanceCm !== after.lastDistanceCm;
    const stateChanged = before.lastSensorState !== after.lastSensorState;
    const gatewayChanged = before.lastGatewayId !== after.lastGatewayId;
    const timestampChanged = before.lastMessageReceivedAt !== after.lastMessageReceivedAt;

    // Expected values
    const expectedStatus = 'available'; // FREE -> available
    const expectedDistance = '172.00';
    const expectedState = 'FREE';
    const expectedGateway = 'dca632fffe52c445';

    console.log('Status Update:');
    console.log(`  Before: ${before.status}`);
    console.log(`  After: ${after.status}`);
    console.log(`  Expected: ${expectedStatus}`);
    console.log(`  ${after.status === expectedStatus ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

    console.log('Distance Update:');
    console.log(`  Before: ${before.lastDistanceCm}`);
    console.log(`  After: ${after.lastDistanceCm}`);
    console.log(`  Expected: ${expectedDistance}`);
    console.log(`  ${after.lastDistanceCm === expectedDistance ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

    console.log('Sensor State Update:');
    console.log(`  Before: ${before.lastSensorState}`);
    console.log(`  After: ${after.lastSensorState}`);
    console.log(`  Expected: ${expectedState}`);
    console.log(`  ${after.lastSensorState === expectedState ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

    console.log('Gateway ID Update:');
    console.log(`  Before: ${before.lastGatewayId}`);
    console.log(`  After: ${after.lastGatewayId}`);
    console.log(`  Expected: ${expectedGateway}`);
    console.log(`  ${after.lastGatewayId === expectedGateway ? '✅ CORRECT' : '❌ INCORRECT'}\n`);

    console.log('Timestamp Update:');
    console.log(`  Before: ${before.lastMessageReceivedAt}`);
    console.log(`  After: ${after.lastMessageReceivedAt}`);
    console.log(`  ${timestampChanged ? '✅ UPDATED' : '❌ NOT UPDATED'}\n`);

    // Step 7: Check parking status log
    console.log('\nStep 6: Checking parking status log entries...');
    const logEntries = await AppDataSource.query(`
      SELECT
        id,
        status,
        "detectedAt",
        distance,
        percentage,
        "batteryLevel",
        "createdAt"
      FROM parking_status_log
      WHERE "parkingSlotId" = $1
      ORDER BY "detectedAt" DESC
      LIMIT 5
    `, [node.parkingSlotId]);

    console.log('Recent status log entries:');
    console.table(logEntries);

    // Final summary
    const allCorrect =
      after.status === expectedStatus &&
      after.lastDistanceCm === expectedDistance &&
      after.lastSensorState === expectedState &&
      after.lastGatewayId === expectedGateway &&
      timestampChanged;

    console.log('\n' + '='.repeat(50));
    if (allCorrect) {
      console.log('✅ ALL TESTS PASSED - Database updating correctly!');
    } else {
      console.log('❌ TESTS FAILED - Database NOT updating correctly');
      console.log('\nPossible issues:');
      console.log('1. Backend MQTT service may not be receiving messages');
      console.log('2. Payload parsing may be failing');
      console.log('3. Node lookup may be failing');
      console.log('4. Database update logic may have errors');
    }
    console.log('='.repeat(50) + '\n');

    client.end();
    await AppDataSource.destroy();
    process.exit(allCorrect ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

main();
