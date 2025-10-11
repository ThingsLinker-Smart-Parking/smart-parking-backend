const mqtt = require('mqtt');

const MQTT_BROKER = 'tcp://broker.hivemq.com:1883';
const TOPIC = 'application/031709f4-457f-4e1c-a446-b9780838d050/device/0102030405060788/event/up';

const testPayload = {
  "deduplicationId": `test-${Date.now()}`,
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
  "fCnt": Math.floor(Math.random() * 1000),
  "fPort": 2,
  "confirmed": true,
  "data": "AKwA",
  "object": {
    "distance_cm": 172.0,
    "state": "FREE"
  },
  "rxInfo": [{
    "gatewayId": "dca632fffe52c445",
    "uplinkId": Math.floor(Math.random() * 100000),
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
};

console.log('\n📤 Publishing MQTT Test Message...\n');
console.log('Topic:', TOPIC);
console.log('Payload:');
console.log('  - devEui:', testPayload.deviceInfo.devEui);
console.log('  - applicationId:', testPayload.deviceInfo.applicationId);
console.log('  - distance_cm:', testPayload.object.distance_cm);
console.log('  - state:', testPayload.object.state);
console.log('  - gatewayId:', testPayload.rxInfo[0].gatewayId);
console.log('\nConnecting to MQTT broker...');

const client = mqtt.connect(MQTT_BROKER, {
  clientId: `test-publisher-${Date.now()}`,
  clean: true,
});

client.on('connect', () => {
  console.log('✅ Connected to broker:', MQTT_BROKER);
  console.log('\nPublishing message...');

  client.publish(TOPIC, JSON.stringify(testPayload), { qos: 1 }, (err) => {
    if (err) {
      console.error('❌ Publish failed:', err);
      process.exit(1);
    } else {
      console.log('✅ Message published successfully!');
      console.log('\n📊 Check the backend logs for processing results.');
      console.log('   - Look for "MQTT message received"');
      console.log('   - Look for "Parking slot status updated"');
      console.log('   - Or look for any error messages\n');
      client.end();
      process.exit(0);
    }
  });
});

client.on('error', (err) => {
  console.error('❌ MQTT error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.error('❌ Connection timeout');
  process.exit(1);
}, 10000);
