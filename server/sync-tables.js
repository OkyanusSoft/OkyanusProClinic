// server/sync-tables.js
require("dotenv").config();
const mysql = require("mysql2/promise");

function requireEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === "") throw new Error(`متغير البيئة مطلوب: ${name} (ضعه في server/.env)`);
  return v;
}
async function syncTables() {
  console.log('🔄 جاري مزامنة البيانات من clinic_state إلى الجداول المنفصلة...');

  const pool = mysql.createPool({
    host: requireEnv("DB_HOST"),
    port: Number(requireEnv("DB_PORT")),
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database: requireEnv("DB_NAME"),
  });

  try {
    // 1. جلب البيانات من clinic_state
    const [rows] = await pool.query(
      'SELECT doc FROM clinic_state ORDER BY updated_at DESC LIMIT 1'
    );

    if (rows.length === 0) {
      console.log('❌ لا توجد بيانات في clinic_state');
      return;
    }

    const db = rows[0].doc;
    console.log(`📊 المرضى: ${db.patients?.length || 0}`);
    console.log(`📊 الموظفين: ${db.staff?.length || 0}`);
    console.log(`📊 حركات المخزون: ${db.supplyMoves?.length || 0}`);

     // server/sync-tables.js - تحديث مزامنة staff
if (db.staff && db.staff.length > 0) {
  console.log('📝 جاري مزامنة staff...');
  await pool.query('DELETE FROM staff');
  
  for (const s of db.staff) {
    await pool.query(
      `INSERT INTO staff (id, name, role, phone, active, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        s.id, 
        s.name, 
        s.role || '', 
        s.phone || '', 
        s.active !== undefined ? (s.active ? 1 : 0) : 1,
        s.notes || ''
      ]
    );
  }
  console.log(`✅ تم مزامنة ${db.staff.length} موظف`);
}

    // ====== 3. مزامنة جدول supply_moves ======
    if (db.supplyMoves && db.supplyMoves.length > 0) {
      console.log('📝 جاري مزامنة supply_moves...');
      
      // حذف البيانات القديمة
      await pool.query('DELETE FROM supply_moves');
      
      // إدراج البيانات الجديدة
      for (const m of db.supplyMoves) {
        await pool.query(
          `INSERT INTO supply_moves (id, itemId, delta, note, date) 
           VALUES (?, ?, ?, ?, ?)`,
          [m.id, m.itemId, m.delta || 0, m.note || '', m.date || new Date().toISOString()]
        );
      }
      console.log(`✅ تم مزامنة ${db.supplyMoves.length} حركة مخزون`);
    } else {
      console.log('⏭️ لا توجد حركات مخزون للمزامنة');
    }

    // ====== 4. عرض النتيجة ======
    const [staffCount] = await pool.query('SELECT COUNT(*) as count FROM staff');
    const [movesCount] = await pool.query('SELECT COUNT(*) as count FROM supply_moves');
    
    console.log('📊 ===== النتيجة =====');
    console.log(`👨‍💼 staff: ${staffCount[0].count} سجل`);
    console.log(`📦 supply_moves: ${movesCount[0].count} سجل`);

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await pool.end();
  }
}

syncTables();