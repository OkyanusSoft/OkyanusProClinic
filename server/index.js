/**
 * خادم قاعدة البيانات المركزية — عيادة د. عبدالله الشرفي
 * التشغيل:  node index.js   (بعد npm install وضبط .env)
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "sharafi_dental",
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4_unicode_ci",
});

/* ============================ مزامنة الجداول العلائقية ============================ */
async function syncNormalized(conn, db) {
  // تحديث كامل (delete + insert) ضمن معاملة واحدة — كافٍ وموثوق بهذا الحجم
  const clear = [
    "invoice_items", "invoices", "appointments", "patients",
    "services", "doctors", "expenses", "follow_ups", "users", "currencies",
    "supplies", "supply_moves", "service_cats", "item_cats", "expense_cats",
  ];
  for (const t of clear) await conn.query(`DELETE FROM ${t}`);

  for (const d of db.doctors || [])
    await conn.query("INSERT INTO doctors (id,name,specialty,color) VALUES (?,?,?,?)", [d.id, d.name, d.specialty ?? null, d.color ?? null]);

  for (const p of db.patients || [])
    await conn.query(
      "INSERT INTO patients (id,name,phone,age,gender,blood,allergies,city,notes,joined,teeth) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [p.id, p.name, p.phone ?? null, p.age ?? null, p.gender ?? null, p.blood ?? null, p.allergies ?? null, p.city ?? null, p.notes ?? null, p.joined ?? null, JSON.stringify(p.teeth ?? {})]
    );

  for (const s of db.services || [])
    await conn.query(
      "INSERT INTO services (id,name,category,price,duration,color,active) VALUES (?,?,?,?,?,?,?)",
      [s.id, s.name, s.category ?? null, s.price ?? 0, s.duration ?? 30, s.color ?? null, s.active ? 1 : 0]
    );

  for (const a of db.appointments || [])
    await conn.query(
      "INSERT INTO appointments (id,patientId,serviceId,doctorId,date,time,status,notes) VALUES (?,?,?,?,?,?,?,?)",
      [a.id, a.patientId, a.serviceId ?? null, a.doctorId ?? null, a.date, a.time ?? null, a.status ?? "confirmed", a.notes ?? null]
    );

  for (const inv of db.invoices || []) {
    await conn.query(
      "INSERT INTO invoices (id,number,patientId,date,paid,discount,method) VALUES (?,?,?,?,?,?,?)",
      [inv.id, inv.number, inv.patientId, inv.date, inv.paid ?? 0, inv.discount ?? 0, inv.method ?? null]
    );
    for (const it of inv.items || [])
      await conn.query(
        "INSERT INTO invoice_items (invoiceId,serviceId,qty,price) VALUES (?,?,?,?)",
        [inv.id, it.serviceId, it.qty ?? 1, it.price ?? 0]
      );
  }

  for (const e of db.expenses || [])
    await conn.query("INSERT INTO expenses (id,title,category,amount,date,notes) VALUES (?,?,?,?,?,?)", [e.id, e.title ?? null, e.category ?? null, e.amount ?? 0, e.date, e.notes ?? null]);

  for (const f of db.followUps || [])
    await conn.query(
      "INSERT INTO follow_ups (id,patientId,doctorId,reason,dueDate,status,createdAt,apptId,notes) VALUES (?,?,?,?,?,?,?,?,?)",
      [f.id, f.patientId, f.doctorId ?? null, f.reason ?? null, f.dueDate, f.status ?? "pending", f.createdAt ? new Date(f.createdAt) : null, f.apptId ?? null, f.notes ?? null]
    );

  for (const u of db.users || [])
    await conn.query(
      "INSERT INTO users (id,name,username,pin,role,linkId,active,permissions,lastLogin) VALUES (?,?,?,?,?,?,?,?,?)",
      [u.id, u.name, u.username, u.pin, u.role, u.linkId ?? null, u.active ? 1 : 0, JSON.stringify(u.permissions ?? []), u.lastLogin ? new Date(u.lastLogin) : null]
    );

  for (const c of db.currencies || [])
    await conn.query("INSERT INTO currencies (code,name,symbol,rate) VALUES (?,?,?,?)", [c.code, c.name, c.symbol, c.rate ?? 1]);

  for (const s of db.supplies || [])
    await conn.query(
      "INSERT INTO supplies (id,name,category,unit,qty,minQty,cost,expiry) VALUES (?,?,?,?,?,?,?,?)",
      [s.id, s.name, s.category ?? null, s.unit ?? null, s.qty ?? 0, s.minQty ?? 0, s.cost ?? 0, s.expiry ?? null]
    );

  for (const m of db.supplyMoves || [])
    await conn.query("INSERT INTO supply_moves (id,itemId,delta,note,date) VALUES (?,?,?,?,?)", [m.id, m.itemId, m.delta ?? 0, m.note ?? null, m.date ?? null]);

  for (const [i, name] of (db.serviceCats || []).entries())
    await conn.query("INSERT INTO service_cats (name,sort) VALUES (?,?)", [name, i]);
  for (const [i, name] of (db.itemCats || []).entries())
    await conn.query("INSERT INTO item_cats (name,sort) VALUES (?,?)", [name, i]);
  for (const [i, name] of (db.expenseCats || []).entries())
    await conn.query("INSERT INTO expense_cats (name,sort) VALUES (?,?)", [name, i]);
}

/* ============================ الواجهات ============================ */
app.get("/api/health", (_req, res) => res.json({ ok: true, db: "sharafi_dental", time: new Date().toISOString() }));

// جلب الحالة الكاملة
app.get("/api/state", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT doc FROM clinic_state WHERE id = 1");
    if (!rows.length) return res.json({ db: null });
    const doc = typeof rows[0].doc === "string" ? JSON.parse(rows[0].doc) : rows[0].doc;
    res.json({ db: doc });
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

// حفظ الحالة الكاملة + تحديث الجداول العلائقية
app.put("/api/state", async (req, res) => {
  const db = req.body;
  if (!db || !Array.isArray(db.patients)) return res.status(400).json({ error: "invalid payload" });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "INSERT INTO clinic_state (id,doc) VALUES (1,?) ON DUPLICATE KEY UPDATE doc = VALUES(doc)",
      [JSON.stringify(db)]
    );
    await syncNormalized(conn, db);
    await conn.commit();
    res.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: String(err.message) });
  } finally {
    conn.release();
  }
});

// واجهات قراءة علائقية (لأدوات التقارير الخارجية)
app.get("/api/patients", async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM patients ORDER BY name");
  res.json(rows);
});
app.get("/api/appointments", async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM appointments ORDER BY date DESC, time");
  res.json(rows);
});
app.get("/api/invoices", async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM invoices ORDER BY date DESC");
  res.json(rows);
});
app.get("/api/doctors", async (_req, res) => res.json(await pool.query("SELECT * FROM doctors").then((r) => r[0])));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ خادم عيادة الشرفي يعمل على  http://localhost:${PORT}`);
  console.log(`   قاعدة البيانات: MySQL — sharafi_dental`);
});
