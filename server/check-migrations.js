// server/check-migrations.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMigrations() {
  console.log('🔍 ===== فحص الترحيلات =====');
  
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456@os',
    database: process.env.DB_NAME || 'sharafi_dental',
  });

  try {
    // 1. التحقق من وجود جدول migrations
    const [tables] = await pool.query("SHOW TABLES LIKE 'migrations'");
    if (tables.length === 0) {
      console.log('❌ جدول migrations غير موجود');
      return;
    }
    console.log('✅ جدول migrations موجود');

    // 2. عرض الإصدارات المنفذة
    const [executed] = await pool.query('SELECT * FROM migrations ORDER BY id');
    console.log(`📋 الإصدارات المنفذة (${executed.length}):`);
    executed.forEach(m => {
      console.log(`   ${m.id}. v${m.version} - ${m.description} (${m.executed_at})`);
    });

    // 3. عرض هيكل جدول sessions
    const [columns] = await pool.query('DESCRIBE sessions');
    console.log('\n📋 هيكل جدول sessions:');
    columns.forEach(c => {
      console.log(`   ${c.Field}: ${c.Type} ${c.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${c.Default ? 'DEFAULT ' + c.Default : ''}`);
    });

    // 4. عدد الجلسات
    const [count] = await pool.query('SELECT COUNT(*) as total FROM sessions');
    console.log(`\n📊 عدد الجلسات: ${count[0].total}`);

    // 5. التحقق من وجود test_column
    const [testCol] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'sessions' AND COLUMN_NAME = 'test_column'
    `);
    
    if (testCol.length > 0) {
      console.log('✅ عمود test_column موجود (الترحيلات تعمل)');
    } else {
      console.log('❌ عمود test_column غير موجود');
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await pool.end();
  }
}

checkMigrations();