// ============================================================
// scripts/seed-db.js — Seed Database Data
// ============================================================

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function seedDB() {
  const dbName = process.env.DB_NAME || 'school_repair';

  console.log(`🔄 Connecting to database "${dbName}" to seed initial data...`);
  try {
    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: dbName,
      port: parseInt(process.env.DB_PORT || '3306'),
      multipleStatements: true
    });

    const seedPath = path.join(__dirname, '..', 'sql', 'seed.sql');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`seed.sql not found at ${seedPath}`);
    }

    console.log('📖 Reading seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('🚀 Executing seed.sql queries...');
    await dbConnection.query(seedSql);
    await dbConnection.end();

    console.log('🎉 Database seeded successfully!');
  } catch (err) {
    console.error('❌ Failed to seed database:', err.message);
    process.exit(1);
  }
}

seedDB();
