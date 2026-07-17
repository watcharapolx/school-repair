// ============================================================
// scripts/init-db.js — Initialize Database
// ============================================================

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDB() {
  const dbName = process.env.DB_NAME || 'school_repair';

  console.log('🔄 Connecting to MySQL server to prepare database...');
  // Connect without database first to ensure the database exists
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log(`🔨 Creating database "${dbName}" if it does not exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.end();

    console.log('✅ Database created or already exists.');

    // Now connect to the specific database with multipleStatements enabled
    console.log('🔄 Connecting to database with schema script...');
    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: dbName,
      port: parseInt(process.env.DB_PORT || '3306'),
      multipleStatements: true
    });

    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}`);
    }

    console.log('📖 Reading schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Executing schema.sql queries...');
    await dbConnection.query(schemaSql);
    await dbConnection.end();

    console.log('🎉 Database schema initialized successfully!');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
  }
}

initDB();
