/**
 * Script to create a test node for MQTT testing
 *
 * This creates a node with devEui: 0102030405060788
 * for parking slot A-001 in the Downtown Parking Complex
 *
 * Usage: node create-mqtt-test-node.js
 */

require('dotenv').config();
const { AppDataSource } = require('./dist/data-source');

async function createTestNode() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const Node = require('./dist/models/Node').Node;
    const User = require('./dist/models/User').User;
    const ParkingSlot = require('./dist/models/ParkingSlot').ParkingSlot;

    const nodeRepository = AppDataSource.getRepository(Node);
    const userRepository = AppDataSource.getRepository(User);
    const parkingSlotRepository = AppDataSource.getRepository(ParkingSlot);

    // Check if node already exists
    const existingNode = await nodeRepository.findOne({
      where: { chirpstackDeviceId: '0102030405060788' }
    });

    if (existingNode) {
      console.log('✅ Node already exists!');
      console.log('   Node ID:', existingNode.id);
      console.log('   DevEui: 0102030405060788');
      console.log('   Parking Slot ID:', existingNode.parkingSlotId);
      return;
    }

    // Get super admin
    const superAdmin = await userRepository.findOne({
      where: { role: 'super_admin' }
    });

    if (!superAdmin) {
      console.error('❌ Super admin not found');
      process.exit(1);
    }

    // Get the parking slot
    const parkingSlot = await parkingSlotRepository.findOne({
      where: { id: 'e38f999d-4c1c-45bb-860c-4e8189cfd8b1' }
    });

    if (!parkingSlot) {
      console.error('❌ Parking slot A-001 not found');
      process.exit(1);
    }

    // Create the node
    const newNode = nodeRepository.create({
      chirpstackDeviceId: '0102030405060788',
      name: 'Test Sensor - MQTT Demo',
      description: 'Test sensor for MQTT testing with Application ID 031709f4-457f-4e1c-a446-b9780838d050',
      isActive: true,
      parkingSlot: parkingSlot, // Assign the full entity
      admin: superAdmin,
      metadata: {
        test: true,
        purpose: 'MQTT testing',
        applicationId: '031709f4-457f-4e1c-a446-b9780838d050'
      }
    });

    const savedNode = await nodeRepository.save(newNode);

    console.log('✅ Test node created successfully!');
    console.log('   Node ID:', savedNode.id);
    console.log('   DevEui: 0102030405060788');
    console.log('   Parking Slot: A-001 (e38f999d-4c1c-45bb-860c-4e8189cfd8b1)');
    console.log('');
    console.log('📋 MQTT Testing Instructions:');
    console.log('==============================');
    console.log('');
    console.log('1. Open: https://testclient-cloud.mqtt.cool/');
    console.log('');
    console.log('2. Connection Settings:');
    console.log('   - Broker: tcp://test.mosquitto.org:1883');
    console.log('   - Client ID: (leave default)');
    console.log('   - Click "Connect"');
    console.log('');
    console.log('3. Publish Test Message:');
    console.log('   - Topic: application/031709f4-457f-4e1c-a446-b9780838d050/device/0102030405060788/event/up');
    console.log('   - QoS: 1');
    console.log('');
    console.log('4. Payload (JSON):');
    console.log(JSON.stringify({
      "deduplicationId": "test-" + Date.now(),
      "time": new Date().toISOString(),
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
        "nsTime": new Date().toISOString(),
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
    }, null, 2));
    console.log('');
    console.log('5. Expected Results:');
    console.log('   ✅ Parking slot A-001 status → "available" (because state="FREE")');
    console.log('   ✅ Distance stored → 172.0 cm');
    console.log('   ✅ Gateway ID stored → dca632fffe52c445');
    console.log('   ✅ Status log entry created');
    console.log('');
    console.log('6. Test Different States:');
    console.log('   - OCCUPIED: Change "state":"FREE" to "state":"OCCUPIED"');
    console.log('   - Different distance: Change "distance_cm" value');
    console.log('');
    console.log('7. Monitor Backend Logs:');
    console.log('   - Watch for "Parking slot status updated from ChirpStack"');
    console.log('   - Check "MQTT message received" debug logs');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  createTestNode();
}

module.exports = { createTestNode };
