// server/migrate.js
const mysql = require('mysql2/promise');
require('dotenv').config();
const { runMigrations } = require('./migrations');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
   password: process.env.DB_PASSWORD || '123456@os',
  database: process.env.DB_NAME || 'sharafi_dental',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

(async () => {
  console.log('🔄 تشغيل الترحيلات...');
  await runMigrations(pool);
  console.log('✅ اكتملت الترحيلات');
  process.exit(0);
})();