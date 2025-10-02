const { Client } = require('pg');
require('dotenv').config();

async function checkStatusLogs() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check table structure first
    const tableStructure = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'parking_status_log'
      ORDER BY ordinal_position
    `);

    console.log('\n--- Table Structure: parking_status_log ---');
    tableStructure.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });

    // Check if there are any status logs
    const countResult = await client.query(
      'SELECT COUNT(*) as total FROM parking_status_log'
    );
    console.log(`\nTotal status logs in database: ${countResult.rows[0].total}`);

    if (countResult.rows[0].total > 0) {
      // Get all column names
      const columns = tableStructure.rows.map(r => r.column_name).join(', ');

      // Get latest 10 records for the specific parking slot
      const parkingSlotId = '2e9f8379-cecc-468d-b290-51208d7faf04';
      const logsResult = await client.query(
        `SELECT ${columns}
         FROM parking_status_log
         WHERE parking_slot_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [parkingSlotId]
      );

      console.log(`\nStatus logs for parking slot ${parkingSlotId}:`);
      console.log('Found', logsResult.rows.length, 'records\n');
      console.log(logsResult.rows);
    } else {
      console.log('\n⚠️ No data found in parking_status_log table!');
      console.log('The table exists but is empty.');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkStatusLogs();
