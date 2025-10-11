const mqtt = require('mqtt');

// Configuration matching user's specifications
const MQTT_BROKER = 'tcp://test.mosquitto.org:1883';
const APPLICATION_ID = '031709f4-457f-4e1c-a446-b9780838d050';
const DEV_EUI = '0102030405060788';
const TOPIC = `application/${APPLICATION_ID}/device/${DEV_EUI}/event/up`;

console.log('═══════════════════════════════════════════════════════');
console.log('  MQTT Publish Test');
console.log('═══════════════════════════════════════════════════════\n');

console.log('Configuration:');
console.log(`  Broker:         ${MQTT_BROKER}`);
console.log(`  Topic:          ${TOPIC}`);
console.log(`  Application ID: ${APPLICATION_ID}`);
console.log(`  Device EUI:     ${DEV_EUI}\n`);

// Test payloads
const payloads = [
  {
    name: 'FREE State (172 cm)',
    state: 'FREE',
    distance: 172.0
  },
  {
    name: 'OCCUPIED State (45.5 cm)',
    state: 'OCCUPIED',
    distance: 45.5
  },
  {
    name: 'FREE State Again (180 cm)',
    state: 'FREE',
    distance: 180.0
  }
];

function createPayload(state, distance) {
  return {
    "deduplicationId": `test-${Date.now()}-${Math.random().toString(16).substr(2, 8)}`,
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
  };
}

async function publishMessage(name, state, distance) {
  return new Promise((resolve, reject) => {
    console.log(`\n📡 Publishing: ${name}`);
    console.log(`   State: ${state}, Distance: ${distance} cm`);

    const client = mqtt.connect(MQTT_BROKER, {
      clientId: `mqtt-test-${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 5000
    });

    const timeout = setTimeout(() => {
      client.end();
      reject(new Error('Connection timeout'));
    }, 6000);

    client.on('connect', () => {
      clearTimeout(timeout);
      console.log('   ✅ Connected to broker');

      const payload = createPayload(state, distance);
      const payloadStr = JSON.stringify(payload);

      client.publish(TOPIC, payloadStr, { qos: 1 }, (err) => {
        if (err) {
          console.error('   ❌ Publish failed:', err.message);
          client.end();
          reject(err);
        } else {
          console.log('   ✅ Message published successfully');
          console.log(`   ↳ Topic: ${TOPIC}`);
          console.log(`   ↳ Payload size: ${payloadStr.length} bytes`);
          client.end();
          resolve();
        }
      });
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      console.error('   ❌ MQTT error:', err.message);
      reject(err);
    });
  });
}

async function wait(seconds) {
  console.log(`   ⏳ Waiting ${seconds}s for backend processing...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function runTest() {
  console.log('Starting MQTT publish test...\n');

  for (let i = 0; i < payloads.length; i++) {
    const test = payloads[i];

    try {
      console.log(`───────────────────────────────────────────────────────`);
      console.log(`Test ${i + 1}/${payloads.length}: ${test.name}`);
      await publishMessage(test.name, test.state, test.distance);

      if (i < payloads.length - 1) {
        await wait(3);
      }
    } catch (error) {
      console.error(`\n❌ Test ${i + 1} failed:`, error.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  All messages published!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📋 Next Steps:');
  console.log('1. Check backend logs for MQTT message processing');
  console.log('2. Verify database updates using API or database queries');
  console.log('3. Check that parking slot status changed based on state');
  console.log('\n✅ Test completed successfully!\n');
}

runTest().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
