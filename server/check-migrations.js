require("dotenv").config();
const mysql = require("mysql2/promise");

function requireEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === "") throw new Error(`متغير البيئة مطلوب: ${name} (ضعه في server/.env)`);
  return v;
}

async function checkMigrations() {
  const pool = mysql.createPool({
    host: requireEnv("DB_HOST"),
    port: Number(requireEnv("DB_PORT")),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database: requireEnv("DB_NAME"),
  });
  try {
    const [tables] = await pool.query("SHOW TABLES LIKE 'migrations'");
    if (!tables.length) { console.log("جدول migrations غير موجود"); return; }
    const [executed] = await pool.query("SELECT * FROM migrations ORDER BY id");
    console.log(`الترحيلات المنفذة: ${executed.length}`);
    executed.forEach((m) => console.log(`  ${m.version} - ${m.description}`));
    const [cols] = await pool.query("DESCRIBE sessions").catch(() => [[]]);
    if (cols.length) console.log(`جدول sessions: ${cols.length} أعمدة`);
  } finally {
    await pool.end();
  }
}

checkMigrations().catch((e) => { console.error(e.message); process.exit(1); });
