// server/migrate.js
require("dotenv").config();
const mysql = require("mysql2/promise");

function requireEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === "") throw new Error(`متغير البيئة مطلوب: ${name} (ضعه في server/.env)`);
  return v;
}
const { runMigrations } = require('./migrations');

const pool = mysql.createPool({
  host: requireEnv("DB_HOST"),
  port: Number(requireEnv("DB_PORT")),
  user: requireEnv("DB_USER"),
   password: requireEnv("DB_PASSWORD"),
  database: requireEnv("DB_NAME"),
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