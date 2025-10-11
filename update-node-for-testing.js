const { DataSource } = require('typeorm');
require('dotenv').config();

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

const TEST_DEV_EUI = '0102030405060788';

async function updateNode() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Update Node for MQTT Testing');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    // Find a node in Downtown Parking Complex (Application ID: 031709f4-457f-4e1c-a446-b9780838d050)
    const result = await AppDataSource.query(`
      SELECT
        n.id,
        n.name,
        n."chirpstackDeviceId",
        ps.id as slot_id,
        ps.name as slot_name,
        ps.status,
        f.name as floor_name,
        pl.name as lot_name,
        pl."chirpstackApplicationId"
      FROM node n
      JOIN parking_slot ps ON ps.id = n."parkingSlotId"
      JOIN floor f ON f.id = ps."floorId"
      JOIN parking_lot pl ON pl.id = f."parkingLotId"
      WHERE pl."chirpstackApplicationId" = '031709f4-457f-4e1c-a446-b9780838d050'
      LIMIT 1
    `);

    if (result.length === 0) {
      console.log('❌ No node found in Downtown Parking Complex\n');
      return;
    }

    const node = result[0];
    console.log('Found node to update:');
    console.log(`  Name: ${node.name}`);
    console.log(`  Current DevEUI: ${node.chirpstackDeviceId}`);
    console.log(`  Parking Slot: ${node.slot_name}`);
    console.log(`  Floor: ${node.floor_name}`);
    console.log(`  Parking Lot: ${node.lot_name}`);
    console.log(`  Application ID: ${node.chirpstackApplicationId}\n`);

    // Update the node's chirpstackDeviceId
    await AppDataSource.query(`
      UPDATE node
      SET "chirpstackDeviceId" = $1
      WHERE id = $2
    `, [TEST_DEV_EUI, node.id]);

    console.log(`✅ Updated node chirpstackDeviceId to: ${TEST_DEV_EUI}\n`);

    // Verify update
    const updated = await AppDataSource.query(`
      SELECT
        n.id,
        n.name,
        n."chirpstackDeviceId",
        ps.name as slot_name,
        ps.id as slot_id
      FROM node n
      JOIN parking_slot ps ON ps.id = n."parkingSlotId"
      WHERE n."chirpstackDeviceId" = $1
    `, [TEST_DEV_EUI]);

    if (updated.length > 0) {
      console.log('✅ Verification successful!');
      console.log(`  Node: ${updated[0].name}`);
      console.log(`  DevEUI: ${updated[0].chirpstackDeviceId}`);
      console.log(`  Parking Slot: ${updated[0].slot_name}`);
      console.log(`  Parking Slot ID: ${updated[0].slot_id}\n`);

      console.log('═══════════════════════════════════════════════════════');
      console.log('  ✅ Setup Complete!');
      console.log('═══════════════════════════════════════════════════════');
      console.log('\nYou can now run:');
      console.log('  node verify-database-integration.js\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === '23505') {
      console.error('\nThis devEUI already exists in the database.');
      console.error('Check if another node is using this devEUI.\n');
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

updateNode();
