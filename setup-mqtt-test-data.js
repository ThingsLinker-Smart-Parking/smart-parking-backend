const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const DEV_EUI = '0102030405060788';
const GATEWAY_ID = 'dca632fffe52c445';

let token = null;

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'superadmin@smartparking.com',
      password: 'SuperAdmin2024!'
    });

    if (response.data.token) {
      token = response.data.token;
      console.log('✅ Logged in successfully\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
  }
  return false;
}

async function findParkingSlot() {
  console.log('🔍 Finding a parking slot without a node...');

  try {
    const response = await axios.get(`${BASE_URL}/parking-slots`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const slots = response.data.parkingSlots || [];
    console.log(`Found ${slots.length} parking slots`);

    // Find slot in Downtown Parking Complex (Application ID: 031709f4-457f-4e1c-a446-b9780838d050)
    const slot = slots.find(s => !s.node);

    if (slot) {
      console.log(`✅ Found empty slot: ${slot.name} (ID: ${slot.id})\n`);
      return slot;
    } else {
      console.log('⚠️  No empty slots found\n');
    }
  } catch (error) {
    console.error('❌ Error finding slots:', error.response?.data?.message || error.message);
  }

  return null;
}

async function createGateway() {
  console.log('🌐 Creating gateway...');

  try {
    const response = await axios.post(`${BASE_URL}/gateways`, {
      chirpstackGatewayId: GATEWAY_ID,
      name: 'MQTT Test Gateway',
      description: 'Gateway for MQTT testing',
      location: 'Test Location'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.data.gateway) {
      console.log(`✅ Gateway created: ${response.data.gateway.name} (ID: ${response.data.gateway.id})\n`);
      return response.data.gateway;
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message.includes('already exists')) {
      console.log('✅ Gateway already exists, fetching...\n');
      return await getExistingGateway();
    }
    console.error('❌ Error creating gateway:', error.response?.data?.message || error.message);
  }

  return null;
}

async function getExistingGateway() {
  try {
    const response = await axios.get(`${BASE_URL}/gateways`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const gateway = response.data.gateways?.find(g => g.chirpstackGatewayId === GATEWAY_ID);
    if (gateway) {
      console.log(`✅ Found existing gateway: ${gateway.name} (ID: ${gateway.id})\n`);
      return gateway;
    }
  } catch (error) {
    console.error('❌ Error fetching gateways:', error.message);
  }
  return null;
}

async function createNode(gatewayId, parkingSlotId) {
  console.log(`🔧 Creating node with devEui: ${DEV_EUI}...`);

  try {
    const response = await axios.post(`${BASE_URL}/gateways/nodes`, {
      gatewayId: gatewayId,
      chirpstackDeviceId: DEV_EUI,
      name: 'MQTT Test Node',
      description: 'Node for MQTT flow testing',
      parkingSlotId: parkingSlotId
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.data.node) {
      console.log(`✅ Node created successfully!`);
      console.log(`   ↳ Name: ${response.data.node.name}`);
      console.log(`   ↳ DevEUI: ${response.data.node.chirpstackDeviceId}`);
      console.log(`   ↳ Parking Slot ID: ${response.data.node.parkingSlotId}\n`);
      return response.data.node;
    }
  } catch (error) {
    console.error('❌ Error creating node:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }

  return null;
}

async function setup() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  MQTT Test Data Setup');
  console.log('═══════════════════════════════════════════════════════\n');

  // Step 1: Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Setup failed: Could not login\n');
    return;
  }

  // Step 2: Create/Get Gateway
  const gateway = await createGateway();
  if (!gateway) {
    console.log('\n❌ Setup failed: Could not create gateway\n');
    return;
  }

  // Step 3: Find parking slot
  const slot = await findParkingSlot();
  if (!slot) {
    console.log('\n❌ Setup failed: No empty parking slot available\n');
    return;
  }

  // Step 4: Create node
  const node = await createNode(gateway.id, slot.id);
  if (!node) {
    console.log('\n❌ Setup failed: Could not create node\n');
    return;
  }

  // Success summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✅ Setup Complete!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\nTest Configuration:`);
  console.log(`  Gateway ID:       ${gateway.chirpstackGatewayId}`);
  console.log(`  Node DevEUI:      ${DEV_EUI}`);
  console.log(`  Parking Slot:     ${slot.name}`);
  console.log(`  Parking Slot ID:  ${slot.id}`);
  console.log(`\nYou can now run: node test-mqtt-simple.js`);
  console.log('');
}

setup().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
