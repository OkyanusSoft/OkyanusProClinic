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
        version: '2.0.0',
        description: 'إنشاء جداول الحسابات/التأمين/الدواعم/الصناديق/المراكز',
        up: async (conn) => {
          const stmts = [
            `CREATE TABLE IF NOT EXISTS accounts (id VARCHAR(32) PRIMARY KEY, code VARCHAR(16) NOT NULL UNIQUE, name VARCHAR(160) NOT NULL, level INT DEFAULT 5, type ENUM('asset','liability','equity','revenue','expense') NOT NULL, parent_id VARCHAR(32), is_posting TINYINT(1) DEFAULT 0, active TINYINT(1) DEFAULT 1, notes TEXT, updated_at BIGINT)`,
            `CREATE TABLE IF NOT EXISTS cost_centers (id VARCHAR(32) PRIMARY KEY, code VARCHAR(16), name VARCHAR(160) NOT NULL, type ENUM('clinic','department','doctor','project') DEFAULT 'department', active TINYINT(1) DEFAULT 1, updated_at BIGINT)`,
            `CREATE TABLE IF NOT EXISTS vouchers (id VARCHAR(32) PRIMARY KEY, number VARCHAR(40), type ENUM('journal','payment','receipt','transfer','opening') DEFAULT 'journal', date DATE, description TEXT, status ENUM('draft','posted','void') DEFAULT 'draft', created_by VARCHAR(32), posted_at DATETIME, created_at DATETIME, updated_at BIGINT)`,
            `CREATE TABLE IF NOT EXISTS voucher_lines (id VARCHAR(32) PRIMARY KEY, voucher_id VARCHAR(32) NOT NULL, account_id VARCHAR(32) NOT NULL, debit DECIMAL(14,2) DEFAULT 0, credit DECIMAL(14,2) DEFAULT 0, cost_center_id VARCHAR(32), description VARCHAR(255), ref_type VARCHAR(40), ref_id VARCHAR(32))`,
            `CREATE TABLE IF NOT EXISTS fiscal_years (id VARCHAR(32) PRIMARY KEY, label VARCHAR(16), start_date DATE, end_date DATE, status ENUM('open','closed') DEFAULT 'open', updated_at BIGINT)`,
            `CREATE TABLE IF NOT EXISTS fiscal_periods (id VARCHAR(32) PRIMARY KEY, fiscal_year_id VARCHAR(32), period_no INT, start_date DATE, end_date DATE, status ENUM('open','closed','locked') DEFAULT 'open', updated_at BIGINT)`,
            `CREATE TABLE IF NOT EXISTS insurance_companies (id VARCHAR(32) PRIMARY KEY, name VARCHAR(160) NOT NULL, code VARCHAR(16), contact VARCHAR(255), terms TEXT, claim_days INT DEFAULT 30, active TINYINT(1) DEFAULT 1, updated_at BIGINT)`,
            `CREATE TABLE IF NOT EXISTS insurance_claims (id VARCHAR(32) PRIMARY KEY, invoice_id VARCHAR(32), patient_id VARCHAR(32), company_id VARCHAR(32), submitted_amount DECIMAL(14,2) DEFAULT 0, approved_amount DECIMAL(14,2) DEFAULT 0, status ENUM('submitted','approved','partial','denied','paid') DEFAULT 'submitted', submitted_at DATETIME, decided_at DATETIME, paid_at DATETIME, notes TEXT, updated_at BIGINT)`,
            `CREATE TABLE IF NOT EXISTS perio_charts (id VARCHAR(32) PRIMARY KEY, patient_id VARCHAR(32), date DATE, doctor_id VARCHAR(32), sites JSON, notes TEXT, updated_at BIGINT)`,
          ];
          for (const s of stmts) await conn.query(s);
          console.log('   ✅ جداول الحسابات/التأمين/الدواعم جاهزة');
        }
      },
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