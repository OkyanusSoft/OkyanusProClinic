/**
 * خادم قاعدة البيانات المركزية — عيادة د. عبدالله الشرفي
 * مزامنة دمج (Merge Sync): كل الأجهزة تدمج بياناتها في قاعدة واحدة — لا حذف ولا استبدال.
 * التشغيل: node index.js  (يصلح جداوله بنفسه عند الإقلاع)
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const DB_NAME = process.env.DB_NAME || "sharafi_dental";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || '123456@os',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4_unicode_ci",
});

 
  // server/index.js

// ====== حارس الحالات النهائية ======

/**
 * الحالات التي تُعد «نهائية» ولا يجوز التراجع عنها عبر الدمج.
 * مفتاح: اسم المصفوفة → مجموعة الحالات النهائية فيها.
 */
const TERMINAL_STATES = {
  sessions: new Set(["done", "cancelled"]),
  // يمكن توسيعها مستقبلًا، مثال:
  // invoices: new Set(["void"]),
};

/**
 * تحمي السجلات ذات الحالة النهائية من التراجع.
 * لكل سجل في النسخة القادمة (incoming): إذا كان له نظير في النسخة
 * المخزنة (stored) بحالة نهائية، نحتفظ بحالة النسخة المخزنة.
 */
function guardTerminalStates(stored, incoming) {
  if (!incoming || typeof incoming !== "object") return incoming;

  for (const [entity, finals] of Object.entries(TERMINAL_STATES)) {
    const incomingList = incoming[entity];
    const storedList = stored?.[entity];
    if (!Array.isArray(incomingList) || !Array.isArray(storedList)) continue;

    // فهرس النسخة المخزنة حسب المعرف
    const storedById = new Map(storedList.map((r) => [r && r.id, r]));

    incoming[entity] = incomingList.map((inc) => {
      if (!inc || typeof inc !== "object") return inc;
      const prev = storedById.get(inc.id);
      if (!prev) return inc;

      // إذا كانت النسخة المخزنة في حالة نهائية…
      if (finals.has(prev.status) && !finals.has(inc.status)) {
        // …فالناتج يبقى على الحالة النهائية (لا تراجع)
        return { ...inc, status: prev.status, endedAt: prev.endedAt ?? inc.endedAt };
      }
      return inc;
    });
  }
  return incoming;
}
const path = require('path');
 

const { runMigrations } = require('./migrations');

 
app.use(cors());
app.use(express.json({ limit: '50mb' }));

 
// ====== تشغيل الترحيلات عند بدء الخادم ======
(async () => {
  try {
    await runMigrations(pool);
    console.log('✅ قاعدة البيانات جاهزة');
  } catch (error) {
    console.error('❌ فشل في تحديث القاعدة:', error);
    process.exit(1);
  }
})();


/* نوع عمود updated_at الفعلي في القاعدة: DATETIME (قواعد schema.sql القديمة) أو BIGINT (جديدة) */
let updatedAtIsDatetime = false;

/* ============================ ترميم ذاتي للجداول عند الإقلاع ============================ */
async function ensureSchema() {
  const c = await pool.getConnection();
  try {
    await c.query(
      "CREATE TABLE IF NOT EXISTS clinic_state (id INT PRIMARY KEY, doc LONGTEXT, updated_at BIGINT DEFAULT 0)"
    );
    await c.query(
      "ALTER TABLE clinic_state ADD COLUMN IF NOT EXISTS updated_at BIGINT DEFAULT 0"
    ).catch(() => {});
    await c.query(
      "ALTER TABLE clinic_state ADD COLUMN IF NOT EXISTS gen INT DEFAULT 0"
    ).catch(() => {});
    // كشف نوع العمود الموجود فعلياً — القواعد المنشأة من schema.sql القديم عمودها DATETIME
    try {
      const [cols] = await c.query("SHOW COLUMNS FROM clinic_state LIKE 'updated_at'");
      updatedAtIsDatetime = !!cols.length && /^datetime|timestamp/i.test(cols[0].Type);
      console.log(`   عمود updated_at: ${updatedAtIsDatetime ? "DATETIME (قاعدة قديمة)" : "BIGINT"}`);
    } catch { /* تجاهل */ }
    await c.query(
      "CREATE TABLE IF NOT EXISTS activity_log (id BIGINT AUTO_INCREMENT PRIMARY KEY, at BIGINT, device_id VARCHAR(64), device_label VARCHAR(120), user_name VARCHAR(120), user_role VARCHAR(30), action VARCHAR(60), cat VARCHAR(30), entity VARCHAR(30), record_id VARCHAR(32), description TEXT, INDEX idx_at (at))"
    );
    await c.query(
      "CREATE TABLE IF NOT EXISTS deletions (entity VARCHAR(30), record_id VARCHAR(32), deleted_at BIGINT, PRIMARY KEY (entity, record_id))"
    );
    await c.query(
      "CREATE TABLE IF NOT EXISTS device_registry (device_id VARCHAR(64) PRIMARY KEY, label VARCHAR(120), last_user VARCHAR(120), last_seen BIGINT)"
    );
    // الجداول العلائقية (للتقارير الخارجية)
    await c.query("CREATE TABLE IF NOT EXISTS patients (id VARCHAR(32) PRIMARY KEY, name VARCHAR(140), phone VARCHAR(30), age INT, gender VARCHAR(10), blood VARCHAR(10), allergies VARCHAR(255), city VARCHAR(80), notes TEXT, joined VARCHAR(20), teeth JSON)");
    await c.query("CREATE TABLE IF NOT EXISTS doctors (id VARCHAR(32) PRIMARY KEY, name VARCHAR(120), specialty VARCHAR(120), color VARCHAR(20))");
    await c.query("CREATE TABLE IF NOT EXISTS services (id VARCHAR(32) PRIMARY KEY, name VARCHAR(140), category VARCHAR(60), price DECIMAL(12,2), duration INT, color VARCHAR(20), active TINYINT)");
    await c.query("CREATE TABLE IF NOT EXISTS appointments (id VARCHAR(32) PRIMARY KEY, patientId VARCHAR(32), serviceId VARCHAR(32), doctorId VARCHAR(32), date VARCHAR(20), time VARCHAR(10), status VARCHAR(20), notes TEXT)");
    await c.query("CREATE TABLE IF NOT EXISTS invoices (id VARCHAR(32) PRIMARY KEY, number VARCHAR(30), patientId VARCHAR(32), date VARCHAR(20), paid DECIMAL(12,2), discount DECIMAL(5,2), method VARCHAR(20))");
    await c.query("CREATE TABLE IF NOT EXISTS invoice_items (invoiceId VARCHAR(32), serviceId VARCHAR(32), qty INT, price DECIMAL(12,2))");
    await c.query("CREATE TABLE IF NOT EXISTS expenses (id VARCHAR(32) PRIMARY KEY, title VARCHAR(200), category VARCHAR(60), amount DECIMAL(12,2), date VARCHAR(20), notes TEXT)");
    await c.query("CREATE TABLE IF NOT EXISTS follow_ups (id VARCHAR(32) PRIMARY KEY, patientId VARCHAR(32), doctorId VARCHAR(32), reason VARCHAR(255), dueDate VARCHAR(20), status VARCHAR(20), apptId VARCHAR(32), notes TEXT)");
    await c.query("CREATE TABLE IF NOT EXISTS users (id VARCHAR(32) PRIMARY KEY, name VARCHAR(120), username VARCHAR(60), pin VARCHAR(10), role VARCHAR(20), linkId VARCHAR(32), active TINYINT, permissions JSON)");
    await c.query("CREATE TABLE IF NOT EXISTS currencies (code VARCHAR(8) PRIMARY KEY, name VARCHAR(80), symbol VARCHAR(16), rate DECIMAL(14,4))");
    await c.query("CREATE TABLE IF NOT EXISTS supplies (id VARCHAR(32) PRIMARY KEY, name VARCHAR(140), category VARCHAR(60), unit VARCHAR(40), qty DECIMAL(12,2), minQty DECIMAL(12,2), cost DECIMAL(12,2), expiry VARCHAR(20))");
    await c.query("CREATE TABLE IF NOT EXISTS supply_moves (id VARCHAR(32) PRIMARY KEY, itemId VARCHAR(32), delta DECIMAL(12,2), note VARCHAR(255), date VARCHAR(30))");
    await c.query("CREATE TABLE IF NOT EXISTS service_cats (name VARCHAR(80) PRIMARY KEY, sort INT)");
    await c.query("CREATE TABLE IF NOT EXISTS item_cats (name VARCHAR(80) PRIMARY KEY, sort INT)");
    await c.query("CREATE TABLE IF NOT EXISTS expense_cats (name VARCHAR(80) PRIMARY KEY, sort INT)");
  } finally {
    c.release();
  }
}

/* ============================ محرك الدمج ============================ */
const COLLECTIONS = [
  "patients", "doctors", "staff", "services", "appointments", "invoices", "expenses",
  "followUps", "supplies", "supplyMoves", "sessions", "implants", "prosthetics",
  "orthoCases", "xrays", "plans", "users", "prescriptions",
];

/** دمج قائمتين على مستوى السجل: الأحدث updatedAt يفوز */
function mergeList(a = [], b = []) {
  const map = new Map();
  for (const r of b) if (r && r.id) map.set(r.id, r);
  for (const r of a) {
    if (!r || !r.id) continue;
    const ex = map.get(r.id);
    if (!ex || (r.updatedAt || 0) >= (ex.updatedAt || 0)) map.set(r.id, r);
  }
  return [...map.values()];
}

/** تطبيق سجل الحذف (tombstones) على الحالة */
function applyTombstones(doc, tombs = []) {
  for (const t of tombs) {
    const coll = doc[t.entity];
    if (Array.isArray(coll)) doc[t.entity] = coll.filter((r) => r.id !== t.record_id);
  }
  return doc;
}

/**
 * يحوّل مللي ثانية إلى قيمة تطابق نوع عمود updated_at الفعلي:
 * DATETIME (قواعد schema.sql القديمة) ← نص بتاريخ صالح — BIGINT (الجديدة) ← الرقم مباشرة
 */
function updatedAtValue(ms) {
  const v = Number(ms) || Date.now();
  if (!updatedAtIsDatetime) return v;
  const d = new Date(v);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function loadDoc() {
  const [rows] = await pool.query("SELECT doc, updated_at, gen FROM clinic_state WHERE id = 1");
  if (!rows.length) return { doc: null, at: 0, gen: 0 };
  const doc = typeof rows[0].doc === "string" ? JSON.parse(rows[0].doc) : rows[0].doc;
  return { doc, at: Number(rows[0].updated_at || 0), gen: Number(rows[0].gen || 0) };
}

async function loadTombstones() {
  const [rows] = await pool.query("SELECT entity, record_id FROM deletions");
  return rows;
}

/* ============================ مزامنة الجداول العلائقية (من الحالة المدمجة) ============================ */
async function syncNormalized(conn, db) {
  const clear = [
    "invoice_items", "invoices", "appointments", "patients",
    "services", "doctors", "expenses", "follow_ups", "users", "currencies",
    "supplies", "supply_moves", "service_cats", "item_cats", "expense_cats",
  ];
  for (const t of clear) await conn.query(`DELETE FROM ${t}`);

  for (const d of db.doctors || [])
    await conn.query("INSERT INTO doctors (id,name,specialty,color) VALUES (?,?,?,?)", [d.id, d.name, d.specialty ?? null, d.color ?? null]).catch(() => {});
  for (const p of db.patients || [])
    await conn.query(
      "INSERT INTO patients (id,name,phone,age,gender,blood,allergies,city,notes,joined,teeth) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [p.id, p.name, p.phone ?? null, p.age ?? null, p.gender ?? null, p.blood ?? null, p.allergies ?? null, p.city ?? null, p.notes ?? null, p.joined ?? null, JSON.stringify(p.teeth ?? {})]
    ).catch(() => {});
  for (const s of db.services || [])
    await conn.query("INSERT INTO services (id,name,category,price,duration,color,active) VALUES (?,?,?,?,?,?,?)", [s.id, s.name, s.category ?? null, s.price ?? 0, s.duration ?? 30, s.color ?? null, s.active ? 1 : 0]).catch(() => {});
  for (const a of db.appointments || [])
    await conn.query("INSERT INTO appointments (id,patientId,serviceId,doctorId,date,time,status,notes) VALUES (?,?,?,?,?,?,?,?)", [a.id, a.patientId, a.serviceId ?? null, a.doctorId ?? null, a.date, a.time ?? null, a.status ?? "confirmed", a.notes ?? null]).catch(() => {});
  for (const inv of db.invoices || []) {
    await conn.query("INSERT INTO invoices (id,number,patientId,date,paid,discount,method) VALUES (?,?,?,?,?,?,?)", [inv.id, inv.number, inv.patientId, inv.date, inv.paid ?? 0, inv.discount ?? 0, inv.method ?? null]).catch(() => {});
    for (const it of inv.items || [])
      await conn.query("INSERT INTO invoice_items (invoiceId,serviceId,qty,price) VALUES (?,?,?,?)", [inv.id, it.serviceId, it.qty ?? 1, it.price ?? 0]).catch(() => {});
  }
  for (const e of db.expenses || [])
    await conn.query("INSERT INTO expenses (id,title,category,amount,date,notes) VALUES (?,?,?,?,?,?)", [e.id, e.title ?? null, e.category ?? null, e.amount ?? 0, e.date, e.notes ?? null]).catch(() => {});
  for (const f of db.followUps || [])
    await conn.query("INSERT INTO follow_ups (id,patientId,doctorId,reason,dueDate,status,apptId,notes) VALUES (?,?,?,?,?,?,?,?)", [f.id, f.patientId, f.doctorId ?? null, f.reason ?? null, f.dueDate, f.status ?? "pending", f.apptId ?? null, f.notes ?? null]).catch(() => {});
  for (const u of db.users || [])
    await conn.query("INSERT INTO users (id,name,username,pin,role,linkId,active,permissions) VALUES (?,?,?,?,?,?,?,?)", [u.id, u.name, u.username, u.pin, u.role, u.linkId ?? null, u.active ? 1 : 0, JSON.stringify(u.permissions ?? [])]).catch(() => {});
  for (const c of db.currencies || [])
    await conn.query("INSERT INTO currencies (code,name,symbol,rate) VALUES (?,?,?,?)", [c.code, c.name, c.symbol, c.rate ?? 1]).catch(() => {});
  for (const s of db.supplies || [])
    await conn.query("INSERT INTO supplies (id,name,category,unit,qty,minQty,cost,expiry) VALUES (?,?,?,?,?,?,?,?)", [s.id, s.name, s.category ?? null, s.unit ?? null, s.qty ?? 0, s.minQty ?? 0, s.cost ?? 0, s.expiry ?? null]).catch(() => {});
  for (const m of db.supplyMoves || [])
    await conn.query("INSERT INTO supply_moves (id,itemId,delta,note,date) VALUES (?,?,?,?,?)", [m.id, m.itemId, m.delta ?? 0, m.note ?? null, m.date ?? null]).catch(() => {});
  for (const [i, name] of (db.serviceCats || []).entries())
    await conn.query("INSERT INTO service_cats (name,sort) VALUES (?,?)", [name, i]).catch(() => {});
  for (const [i, name] of (db.itemCats || []).entries())
    await conn.query("INSERT INTO item_cats (name,sort) VALUES (?,?)", [name, i]).catch(() => {});
  for (const [i, name] of (db.expenseCats || []).entries())
    await conn.query("INSERT INTO expense_cats (name,sort) VALUES (?,?)", [name, i]).catch(() => {});
}

// ====== بصمات الحذف (Tombstones) ======

/** بصمة حذف: { entity, id, at } */
function applyTombstones(doc) {
  const stones = Array.isArray(doc.tombstones) ? doc.tombstones : [];
  if (stones.length === 0) return doc;
  for (const t of stones) {
    const coll = doc[t.entity];
    if (Array.isArray(coll)) {
      doc[t.entity] = coll.filter((r) => !(r && typeof r === "object" && r.id === t.id));
    }
  }
  return doc;
}

/** اتحاد مصفوفتي شواهد حسب entity+id */
function unionTombstones(a = [], b = []) {
  const map = new Map();
  for (const t of [...a, ...b]) map.set(`${t.entity}::${t.id}`, t);
  return [...map.values()];
}


/* ============================ الواجهات ============================ */
app.get("/api/health", (_req, res) => res.json({ ok: true, db: DB_NAME, time: new Date().toISOString() }));

/** فحص قاعدة البيانات الفعلي */
app.get("/api/db-check", async (_req, res) => {
  try {
    await ensureSchema();
    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM clinic_state");
    res.json({ ok: true, db: DB_NAME, records: rows[0].n });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err.message) });
  }
});

/** استطلاع: هل تغيّر شيء منذ لحظة معينة؟ (gen يرتفع عند الاستبدال الشامل) */
app.get("/api/poll", async (req, res) => {
  try {
    const since = Number(req.query.since || 0);
    // كشف التغيير من savedAt الدقيق داخل الوثيقة (مللي ثانية) — لا يتأثر بدقة عمود DATETIME
    const { doc, gen } = await loadDoc();
    const at = Number(doc?.savedAt || 0);
    res.json({ changed: at > since, at, gen });
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

/** جلب الحالة الكاملة المدمجة */
app.get("/api/state", async (_req, res) => {
  try {
    const { doc, at, gen } = await loadDoc();
    const tombstones = await loadTombstones();
    res.json({ db: doc, tombstones, serverAt: at, gen });
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }

try {
    const [rows] = await pool.query(
      'SELECT doc, updated_at FROM clinic_state ORDER BY updated_at DESC LIMIT 1'
    );
    
    if (rows.length === 0) {
      return res.json({ db: null, tombstones: [], gen: 0 });
    }
    
    const doc = rows[0].doc;
    
    // ✅ تطبيق الحارس عند القراءة أيضاً
    const guardedDoc = guardTerminalStates(doc, doc);
    
    res.json({
      db: guardedDoc,
      tombstones: [],
      gen: 1
    });
  } catch (error) {
    console.error('❌ خطأ في جلب الحالة:', error);
    res.status(500).json({ error: error.message });
  }
 

});

/** حفظ + دمج: يدمج بيانات الجهاز القادم مع المركزية — لا استبدال (إلا بطلب wipe) */
app.put("/api/stateOld", async (req, res) => {
  const incoming = req.body;

  
  if (!incoming || !Array.isArray(incoming.patients)) return res.status(400).json({ error: "invalid payload" });
  const wipe = incoming.wipe === true;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { doc: current, gen } = await loadDoc();
    const tombs = await loadTombstones();

    let merged;
    let newGen = gen;
    const storedDoc = rows.length > 0 ? rows[0].doc : {};
    
  


    if (wipe || !current) {
      // استبدال شامل (RESET/IMPORT) أو أول تأسيس — يرفع الجيل ليحل محل كل الأجهزة
      merged = { ...incoming };
      delete merged.wipe;
      if (wipe) {
        newGen = gen + 1;
        await conn.query("DELETE FROM deletions"); // بداية نظيفة
      }
    } else {
      merged = { ...current };
      for (const coll of COLLECTIONS) merged[coll] = mergeList(current[coll], incoming[coll]);
      // العملات بمفتاح code
      const curMap = new Map((current.currencies || []).map((c) => [c.code, c]));
      for (const c of incoming.currencies || []) curMap.set(c.code, c);
      merged.currencies = [...curMap.values()];
      // الفئات: اتحاد
      merged.serviceCats = [...new Set([...(current.serviceCats || []), ...(incoming.serviceCats || [])])];
      merged.itemCats = [...new Set([...(current.itemCats || []), ...(incoming.itemCats || [])])];
      merged.expenseCats = [...new Set([...(current.expenseCats || []), ...(incoming.expenseCats || [])])];
      merged.settings = { ...(current.settings || {}), ...(incoming.settings || {}) };
      merged.nextInv = Math.max(current.nextInv || 0, incoming.nextInv || 0);
      delete merged.wipe;
    }
    merged = applyTombstones(merged, tombs);
    merged.savedAt = incoming.savedAt || Date.now();

try {

  // جلب النسخة المخزنة
    const [rows] = await pool.query(
      'SELECT doc FROM clinic_state ORDER BY updated_at DESC LIMIT 1'
    );
    const storedDoc = rows.length > 0 ? rows[0].doc : {};
    
    // ✅ تطبيق الحارس
    const guardedDoc = guardTerminalStates(storedDoc, incomingDoc);
    
    // حفظ
    await pool.query(
      `INSERT INTO clinic_state (id, doc, updated_at) 
       VALUES (1, ?, ?) 
       ON DUPLICATE KEY UPDATE doc = VALUES(doc), updated_at = VALUES(updated_at)`,
      [JSON.stringify(guardedDoc), Date.now()]
    );
    // تطبيق الفلترة قبل الحفظ
    applyTombstones(doc);
    /*
    await pool.query(
      `INSERT INTO clinic_state (id, doc, updated_at) 
       VALUES (1, ?, ?) 
       ON DUPLICATE KEY UPDATE doc = VALUES(doc), updated_at = VALUES(updated_at)`,
      [JSON.stringify(doc), Date.now()]
    );
    */
    res.json({ ok: true });
  } catch (error) {
    console.error('❌ خطأ:', error);
    res.status(500).json({ error: error.message });
  }

    await conn.query(
      "INSERT INTO clinic_state (id,doc,updated_at,gen) VALUES (1,?,?,?) ON DUPLICATE KEY UPDATE doc = VALUES(doc), updated_at = VALUES(updated_at), gen = VALUES(gen)",
      [JSON.stringify(merged), updatedAtValue(merged.savedAt), newGen]
    );
    await syncNormalized(conn, merged);
    await conn.commit();
    res.json({ ok: true, savedAt: merged.savedAt, merged: true, gen: newGen });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: String(err.message) });
  } finally {
    conn.release();
  }
});
app.put('/api/state', async (req, res) => {
  try {
    const incomingDoc = req.body;
    
    // ✅ تحويل updated_at إلى تنسيق MySQL DATETIME
    function toMySQLDateTime(timestamp) {
      if (!timestamp) return null;
      const date = new Date(timestamp);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }
    
    // جلب النسخة المخزنة
    const [rows] = await pool.query(
      'SELECT doc FROM clinic_state ORDER BY updated_at DESC LIMIT 1'
    );
    const storedDoc = rows.length > 0 ? rows[0].doc : {};
    
    // تطبيق الحارس
    const guardedDoc = guardTerminalStates(storedDoc, incomingDoc);
    
    // ✅ تحويل updated_at
    const updatedAt = toMySQLDateTime(guardedDoc.savedAt || Date.now());
    
    // حفظ
    await pool.query(
      `INSERT INTO clinic_state (id, doc, updated_at) 
       VALUES (1, ?, ?) 
       ON DUPLICATE KEY UPDATE doc = VALUES(doc), updated_at = VALUES(updated_at)`,
      [JSON.stringify(guardedDoc), updatedAt || new Date().toISOString().slice(0, 19).replace('T', ' ')]
    );
    
    res.json({ ok: true });
  } catch (error) {
    console.error('❌ خطأ:', error);
    res.status(500).json({ error: error.message });
  }
});
/** استقبال أحداث النشاط (سجل مراقبة الموظفين) + تسجيل الحذف */
app.post("/api/events", async (req, res) => {
  const { deviceId, deviceLabel, userName, userRole, events } = req.body || {};
  if (!Array.isArray(events)) return res.status(400).json({ error: "invalid" });
  try {
    for (const ev of events) {
      await pool.query(
        "INSERT INTO activity_log (at, device_id, device_label, user_name, user_role, action, cat, entity, record_id, description) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [ev.at || Date.now(), deviceId ?? "?", deviceLabel ?? "", userName ?? "", userRole ?? "", ev.action ?? "", ev.cat ?? "عام", ev.entity ?? null, ev.recordId ?? null, ev.desc ?? ""]
      );
      // عمليات الحذف → سجل tombstone لينتشر الحذف لكل الأجهزة
      if (ev.entity && ev.recordId && String(ev.action).startsWith("حذف")) {
        await pool.query("INSERT IGNORE INTO deletions (entity, record_id, deleted_at) VALUES (?,?,?)", [ev.entity, ev.recordId, ev.at || Date.now()]);
        // احذف السجل من الحالة المدمجة فوراً
        const { doc, at } = await loadDoc();
        if (doc && Array.isArray(doc[ev.entity])) {
          doc[ev.entity] = doc[ev.entity].filter((r) => r.id !== ev.recordId);
          await pool.query("UPDATE clinic_state SET doc = ?, updated_at = ? WHERE id = 1", [JSON.stringify(doc), updatedAtValue(Date.now())]);
        }
      }
    }
    // تحديث سجل الجهاز
    if (deviceId) {
      await pool.query(
        "INSERT INTO device_registry (device_id,label,last_user,last_seen) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE label = VALUES(label), last_user = VALUES(last_user), last_seen = VALUES(last_seen)",
        [deviceId, deviceLabel ?? "", userName ?? "", Date.now()]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

/** سجل الأحداث (للمدير) */
app.get("/api/events", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 300), 1000);
  try {
    const [rows] = await pool.query("SELECT * FROM activity_log ORDER BY at DESC LIMIT ?", [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

/** الأجهزة المسجلة */
app.get("/api/devices", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM device_registry ORDER BY last_seen DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

// واجهات قراءة علائقية (لأدوات التقارير الخارجية)
app.get("/api/patients", async (_req, res) => res.json((await pool.query("SELECT * FROM patients ORDER BY name"))[0]));
app.get("/api/appointments", async (_req, res) => res.json((await pool.query("SELECT * FROM appointments ORDER BY date DESC, time"))[0]));
app.get("/api/invoices", async (_req, res) => res.json((await pool.query("SELECT * FROM invoices ORDER BY date DESC"))[0]));
app.get("/api/doctors", async (_req, res) => res.json((await pool.query("SELECT * FROM doctors"))[0]));

const PORT = process.env.PORT || 4000;
ensureSchema()
  .then(() =>
    app.listen(PORT, () => {
      console.log(`✅ خادم عيادة الشرفي (مزامنة الدمج) يعمل على http://localhost:${PORT}`);
      console.log(`   قاعدة البيانات: MySQL — ${DB_NAME} · الجداول مرمّمة تلقائياً`);
    })
  )
  .catch((err) => {
    console.error("❌ تعذّر تجهيز قاعدة البيانات:", err.message);
    console.error("   تحقق من بيانات الاتصال في ملف .env ثم أعد التشغيل.");
    app.listen(PORT, () => console.log(`⚠️ الخادم يعمل بدون قاعدة بيانات على :${PORT}`));
  });

  // ====== مسارات الجلسات ======

 // ============================================================
// مسارات الجلسات (Sessions)
// ============================================================

// جلب جميع الجلسات
app.get('/api/sessions', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE deleted = FALSE ORDER BY date DESC'
    );
    res.json({ sessions: rows });
  } catch (error) {
    console.error('❌ خطأ في جلب الجلسات:', error);
    res.status(500).json({ error: error.message });
  }
});

// جلب جلسة واحدة
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE id = ? AND deleted = FALSE',
      [req.params.id]
    );
    res.json({ session: rows[0] || null });
  } catch (error) {
    console.error('❌ خطأ في جلب الجلسة:', error);
    res.status(500).json({ error: error.message });
  }
});

// حفظ جلسة جديدة أو تحديثها
 
app.post('/api/sessions', async (req, res) => {
  try {
    const session = req.body;
    console.log('📝 حفظ جلسة:', session.id);
    
    // دالة لتحويل التاريخ إلى صيغة MySQL DATETIME
    function toMySQLDateTime(isoString) {
      if (!isoString) return null;
      const date = new Date(isoString);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }
    
    const startedAt = toMySQLDateTime(session.startedAt);
    const endedAt = session.endedAt ? toMySQLDateTime(session.endedAt) : null;
    
    const query = `
      INSERT INTO sessions (
        id, patientId, doctorId, apptId, date, 
        startedAt, endedAt, status, complaint, diagnosis, 
        procedures, teethTreated, workItems, stages, 
        meds, medNotes, summary, invoiceId, rxId, fuId, fromFuId, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        patientId = VALUES(patientId),
        doctorId = VALUES(doctorId),
        apptId = VALUES(apptId),
        date = VALUES(date),
        startedAt = VALUES(startedAt),
        endedAt = VALUES(endedAt),
        status = VALUES(status),
        complaint = VALUES(complaint),
        diagnosis = VALUES(diagnosis),
        procedures = VALUES(procedures),
        teethTreated = VALUES(teethTreated),
        workItems = VALUES(workItems),
        stages = VALUES(stages),
        meds = VALUES(meds),
        medNotes = VALUES(medNotes),
        summary = VALUES(summary),
        invoiceId = VALUES(invoiceId),
        rxId = VALUES(rxId),
        fuId = VALUES(fuId),
        fromFuId = VALUES(fromFuId),
        updatedAt = VALUES(updatedAt)
    `;
    
    const values = [
      session.id,
      session.patientId,
      session.doctorId,
      session.apptId || null,
      session.date,
      startedAt,
      endedAt,
      session.status || 'open',
      session.complaint || '',
      session.diagnosis || '',
      JSON.stringify(session.procedures || []),
      JSON.stringify(session.teethTreated || []),
      JSON.stringify(session.workItems || []),
      JSON.stringify(session.stages || []),
      JSON.stringify(session.meds || []),
      session.medNotes || '',
      session.summary || '',
      session.invoiceId || null,
      session.rxId || null,
      session.fuId || null,
      session.fromFuId || null,
      session.updatedAt || Date.now()
    ];
    
    await pool.query(query, values);
    res.json({ ok: true });
  } catch (error) {
    console.error('❌ خطأ في حفظ الجلسة:', error);
    res.status(500).json({ error: error.message });
  }
});
// حفظ جميع الجلسات دفعة واحدة
 // POST /api/sessions/batch - حفظ جميع الجلسات دفعة واحدة
app.post('/api/sessions/batch', async (req, res) => {
  try {
    const { sessions } = req.body;
    console.log(`📝 حفظ ${sessions.length} جلسة دفعة واحدة`);
    
    // دالة لتحويل التاريخ إلى صيغة MySQL DATETIME
    function toMySQLDateTime(isoString) {
      if (!isoString) return null;
      // تحويل "2026-09-01T22:25:36.453Z" إلى "2026-09-01 22:25:36"
      const date = new Date(isoString);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }
    
    for (const session of sessions) {
      // تحويل التواريخ
      const startedAt = toMySQLDateTime(session.startedAt);
      const endedAt = session.endedAt ? toMySQLDateTime(session.endedAt) : null;
      
      const query = `
        INSERT INTO sessions (
          id, patientId, doctorId, apptId, date, 
          startedAt, endedAt, status, complaint, diagnosis, 
          procedures, teethTreated, workItems, stages, 
          meds, medNotes, summary, invoiceId, rxId, fuId, fromFuId, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          patientId = VALUES(patientId),
          doctorId = VALUES(doctorId),
          apptId = VALUES(apptId),
          date = VALUES(date),
          startedAt = VALUES(startedAt),
          endedAt = VALUES(endedAt),
          status = VALUES(status),
          complaint = VALUES(complaint),
          diagnosis = VALUES(diagnosis),
          procedures = VALUES(procedures),
          teethTreated = VALUES(teethTreated),
          workItems = VALUES(workItems),
          stages = VALUES(stages),
          meds = VALUES(meds),
          medNotes = VALUES(medNotes),
          summary = VALUES(summary),
          invoiceId = VALUES(invoiceId),
          rxId = VALUES(rxId),
          fuId = VALUES(fuId),
          fromFuId = VALUES(fromFuId),
          updatedAt = VALUES(updatedAt)
      `;
      
      const values = [
        session.id,
        session.patientId,
        session.doctorId,
        session.apptId || null,
        session.date,
        startedAt,
        endedAt,
        session.status || 'open',
        session.complaint || '',
        session.diagnosis || '',
        JSON.stringify(session.procedures || []),
        JSON.stringify(session.teethTreated || []),
        JSON.stringify(session.workItems || []),
        JSON.stringify(session.stages || []),
        JSON.stringify(session.meds || []),
        session.medNotes || '',
        session.summary || '',
        session.invoiceId || null,
        session.rxId || null,
        session.fuId || null,
        session.fromFuId || null,
        session.updatedAt || Date.now()
      ];
      
      await pool.query(query, values);
    }
    
    res.json({ ok: true, count: sessions.length });
  } catch (error) {
    console.error('❌ خطأ في حفظ الجلسات دفعة واحدة:', error);
    res.status(500).json({ error: error.message });
  }
});

// حذف جلسة (soft delete)
app.delete('/api/sessions/:id', async (req, res) => {
  try {
    await pool.query(
      'UPDATE sessions SET deleted = TRUE WHERE id = ?',
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('❌ خطأ في حذف الجلسة:', error);
    res.status(500).json({ error: error.message });
  }
});

// تحديث جلسة
app.put('/api/sessions/:id', async (req, res) => {
  try {
    const session = req.body;
    await pool.query(
      `UPDATE sessions SET 
        patientId = ?, doctorId = ?, apptId = ?, date = ?, 
        startedAt = ?, endedAt = ?, status = ?,
        complaint = ?, diagnosis = ?, procedures = ?, 
        teethTreated = ?, workItems = ?, stages = ?, 
        meds = ?, medNotes = ?, summary = ?,
        invoiceId = ?, rxId = ?, fuId = ?, fromFuId = ?,
        updatedAt = ?
       WHERE id = ? AND deleted = FALSE`,
      [
        session.patientId,
        session.doctorId,
        session.apptId || null,
        session.date,
        session.startedAt,
        session.endedAt || null,
        session.status,
        session.complaint || '',
        session.diagnosis || '',
        JSON.stringify(session.procedures || []),
        JSON.stringify(session.teethTreated || []),
        JSON.stringify(session.workItems || []),
        JSON.stringify(session.stages || []),
        JSON.stringify(session.meds || []),
        session.medNotes || '',
        session.summary || '',
        session.invoiceId || null,
        session.rxId || null,
        session.fuId || null,
        session.fromFuId || null,
        session.updatedAt || Date.now(),
        req.params.id
      ]
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('❌ خطأ في تحديث الجلسة:', error);
    res.status(500).json({ error: error.message });
  }
});

// server/index.js
app.get('/api/debug/state', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT doc, updated_at FROM clinic_state ORDER BY updated_at DESC LIMIT 1'
    );
    if (rows.length === 0) {
      return res.json({ message: 'لا توجد بيانات', data: null });
    }
    
    // استخراج عدد السجلات من JSON
    const doc = rows[0].doc;
    res.json({
      updated_at: rows[0].updated_at,
      counts: {
        patients: doc.patients?.length || 0,
        doctors: doc.doctors?.length || 0,
        staff: doc.staff?.length || 0,
        services: doc.services?.length || 0,
        appointments: doc.appointments?.length || 0,
        invoices: doc.invoices?.length || 0,
        expenses: doc.expenses?.length || 0,
        followUps: doc.followUps?.length || 0,
        supplies: doc.supplies?.length || 0,
        supplyMoves: doc.supplyMoves?.length || 0,
        sessions: doc.sessions?.length || 0,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


 // server/index.js - أضف هذا المسار

 // server/index.js - تحديث مسار /api/sync/staff
app.post('/api/sync/staff', async (req, res) => {
  try {
    const { staff, supplyMoves } = req.body;
    
    console.log(`📝 حفظ staff: ${staff?.length || 0}`);
    console.log(`📝 حفظ supplyMoves: ${supplyMoves?.length || 0}`);
    
    function toMySQLDateTime(isoString) {
      if (!isoString) return null;
      const date = new Date(isoString);
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }
    
    // ✅ حفظ staff مع notes
    if (staff && staff.length > 0) {
      await pool.query('DELETE FROM staff');
      for (const s of staff) {
        await pool.query(
          `INSERT INTO staff (id, name, role, phone, active, notes) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            s.id, 
            s.name, 
            s.role || '', 
            s.phone || '', 
            s.active ? 1 : 0,
            s.notes || ''  // ✅ أضف notes
          ]
        );
      }
      console.log(`✅ تم حفظ ${staff.length} موظف`);
    }
    
    // حفظ supply_moves
    if (supplyMoves && supplyMoves.length > 0) {
      await pool.query('DELETE FROM supply_moves');
      for (const m of supplyMoves) {
        const formattedDate = toMySQLDateTime(m.date);
        await pool.query(
          `INSERT INTO supply_moves (id, itemId, delta, note, date) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            m.id, 
            m.itemId, 
            m.delta || 0, 
            m.note || '', 
            formattedDate || new Date().toISOString().slice(0, 19).replace('T', ' ')
          ]
        );
      }
      console.log(`✅ تم حفظ ${supplyMoves.length} حركة مخزون`);
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('❌ خطأ في حفظ staff:', error);
    res.status(500).json({ error: error.message });
  }
});

 

 app.post('/api/cleanup-sessions', async (req, res) => {
  try {
    // جلب البيانات
    const [rows] = await pool.query('SELECT doc FROM clinic_state LIMIT 1');
    if (rows.length === 0) {
      return res.json({ ok: true, message: 'لا توجد بيانات' });
    }
    
    const doc = rows[0].doc;
    
    // تنظيف الجلسات
    if (doc.sessions) {
      doc.sessions = doc.sessions.filter(s => s.status === 'open');
    }
    
    // حفظ (بدون updated_at)
    await pool.query(
      `UPDATE clinic_state SET doc = ? WHERE id = 1`,
      [JSON.stringify(doc)]
    );
    
    res.json({ ok: true, message: 'تم التنظيف' });
  } catch (error) {
    console.error('❌ خطأ:', error);
    res.status(500).json({ error: error.message });
  }
});
// server/index.js

// ====== عرض جميع الجلسات ======
app.get('/api/sessions/all', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT doc FROM clinic_state ORDER BY updated_at DESC LIMIT 1'
    );
    
    if (rows.length === 0) {
      return res.json({ sessions: [] });
    }
    
    const doc = rows[0].doc;
    res.json({ 
      sessions: doc.sessions || [],
      count: (doc.sessions || []).length
    });
  } catch (error) {
    console.error('❌ خطأ:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====== حذف جميع الجلسات ======
app.delete('/api/sessions/clear', async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions');
    
    const [rows] = await pool.query('SELECT doc FROM clinic_state LIMIT 1');
    if (rows.length > 0) {
      const doc = rows[0].doc;
      doc.sessions = [];
      await pool.query(
        `UPDATE clinic_state SET doc = ? WHERE id = 1`,
        [JSON.stringify(doc)]
      );
    }
    
    res.json({ ok: true, message: 'تم حذف جميع الجلسات' });
  } catch (error) {
    console.error('❌ خطأ:', error);
    res.status(500).json({ error: error.message });
  }
});