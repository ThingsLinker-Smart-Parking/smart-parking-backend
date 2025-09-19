#!/usr/bin/env node
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function fixSchema() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔧 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'fix-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔧 Running schema fixes...');

    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim());

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
        try {
          await client.query(statement);
          console.log(`✅ Statement ${i + 1} completed`);
        } catch (error) {
          console.log(`⚠️  Statement ${i + 1} warning:`, error.message);
          // Continue with other statements even if one fails
        }
      }
    }

    console.log('🎉 Schema fixes completed!');

    // Verify the fixes
    console.log('\n🔍 Verifying schema fixes...');

    const verifyQueries = [
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'parking_lot' AND column_name IN ('latitude', 'longitude', 'adminId')",
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'subscription' AND column_name = 'adminId'",
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'gateway' AND column_name IN ('linkedAdminId', 'createdById')"
    ];

    for (const query of verifyQueries) {
      const result = await client.query(query);
      console.log(`📊 Found columns:`, result.rows.map(r => r.column_name));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixSchema();