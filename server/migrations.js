// server/migrations.js
const mysql = require('mysql2/promise');

async function runMigrations(pool) {
  console.log('🔄 جاري التحقق من تحديثات القاعدة...');

  try {
    // 1. إنشاء جدول migrations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255),
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول migrations جاهز');

    // 2. جلب الإصدارات المنفذة
    const [executed] = await pool.query('SELECT version FROM migrations');
    const executedVersions = new Set(executed.map(r => r.version));
    console.log(`📋 الإصدارات المنفذة: ${[...executedVersions].join(', ') || 'لا يوجد'}`);

    // 3. التحديثات
    const migrations = [
      {
        version: '1.0.0',
        description: 'إنشاء جدول sessions',
        up: async (conn) => {
          console.log('   📦 إنشاء جدول sessions...');
          await conn.query(`
            CREATE TABLE IF NOT EXISTS sessions (
              id VARCHAR(20) PRIMARY KEY,
              patientId VARCHAR(20),
              doctorId VARCHAR(20),
              apptId VARCHAR(20),
              date DATE,
              startedAt DATETIME,
              endedAt DATETIME,
              status ENUM('open', 'done'),
              complaint TEXT,
              diagnosis TEXT,
              procedures JSON,
              teethTreated JSON,
              workItems JSON,
              stages JSON,
              meds JSON,
              medNotes TEXT,
              summary TEXT,
              invoiceId VARCHAR(20),
              rxId VARCHAR(20),
              fuId VARCHAR(20),
              fromFuId VARCHAR(20),
              updatedAt BIGINT,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              deleted BOOLEAN DEFAULT FALSE,
              INDEX idx_patientId (patientId),
              INDEX idx_doctorId (doctorId),
              INDEX idx_date (date),
              INDEX idx_status (status)
            )
          `);
          console.log('   ✅ تم إنشاء جدول sessions');
        }
      }
    ];

    // 4. تنفيذ التحديثات
    let executedCount = 0;
    for (const migration of migrations) {
      if (executedVersions.has(migration.version)) {
        console.log(`⏭️  تخطي الإصدار ${migration.version} (منفذ مسبقاً)`);
        continue;
      }

      console.log(`📦 تنفيذ التحديث ${migration.version}: ${migration.description}`);
      
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await migration.up(connection);
        await connection.query(
          'INSERT INTO migrations (version, description) VALUES (?, ?)',
          [migration.version, migration.description]
        );
        await connection.commit();
        console.log(`✅ تم تنفيذ التحديث ${migration.version}`);
        executedCount++;
      } catch (error) {
        await connection.rollback();
        console.error(`❌ فشل التحديث ${migration.version}:`, error.message);
        throw error;
      } finally {
        connection.release();
      }
    }

    console.log(`✅ اكتملت التحديثات (${executedCount} تحديثات جديدة)`);
    
    // 5. عرض الجداول الموجودة
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]).join(', ');
    console.log(`📋 الجداول الموجودة: ${tableNames}`);

  } catch (error) {
    console.error('❌ فشل في تحديث القاعدة:', error);
    throw error;
  }
}

// ====== ✅ تأكد من تصدير الدالة ======
module.exports = { runMigrations };