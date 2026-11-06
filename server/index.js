/**
 * .'/E B'9/) 'D(J'F'* 'DE1C2J)   9J'/) /. 9(/'DDG 'D41AJ
 * E2'EF) /E, (Merge Sync): CD 'D#,G2) */E, (J'F'*G' AJ B'9/) H'-/)   D' -0A HD' '3*(/'D.
 * 'D*4:JD: node index.js  (J5D- ,/'HDG (FA3G 9F/ 'D%BD'9)
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
function requireEnv(name){const v=process.env[name]; if(v===undefined||v==="") throw new Error(`متغير البيئة مطلوب: ${name} (ضعه في server/.env)`); return v;}
const DB_HOST=requireEnv("DB_HOST"),DB_PORT=Number(requireEnv("DB_PORT")),DB_USER=requireEnv("DB_USER"),DB_PASSWORD=requireEnv("DB_PASSWORD"),DB_NAME=requireEnv("DB_NAME"),API_PORT=Number(requireEnv("API_PORT"));
if(!Number.isFinite(DB_PORT)||DB_PORT<=0) throw new Error("DB_PORT غير صالح");
if(!Number.isFinite(API_PORT)||API_PORT<=0) throw new Error("API_PORT غير صالح");
const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const pool = mysql.createPool({host:DB_HOST,port:DB_PORT,user:DB_USER,password:DB_PASSWORD,database:DB_NAME,waitForConnections:true,connectionLimit:10,charset:"utf8mb4_unicode_ci"});

 
  // server/index.js

// ====== -'13 'D-'D'* 'DFG'&J) ======

/**
 * 'D-'D'* 'D*J *O9/ �FG'&J)� HD' J,H2 'D*1',9 9FG' 9(1 'D/E,.
 * EA*'-: '3E 'DE5AHA) �! E,EH9) 'D-'D'* 'DFG'&J) AJG'.
 */
const TERMINAL_STATES = {
  sessions: new Set(["done", "cancelled"]),
  // JECF *H3J9G' E3*B(DK' E+'D:
  // invoices: new Set(["void"]),
};

/**
 * *-EJ 'D3,D'* 0'* 'D-'D) 'DFG'&J) EF 'D*1',9.
 * DCD 3,D AJ 'DF3.) 'DB'/E) (incoming): %0' C'F DG F8J1 AJ 'DF3.)
 * 'DE.2F) (stored) (-'D) FG'&J) F-*A8 (-'D) 'DF3.) 'DE.2F).
 */
function guardTerminalStates(stored, incoming) {
  if (!incoming || typeof incoming !== "object") return incoming;

  for (const [entity, finals] of Object.entries(TERMINAL_STATES)) {
    const incomingList = incoming[entity];
    const storedList = stored?.[entity];
    if (!Array.isArray(incomingList) || !Array.isArray(storedList)) continue;

    // AG13 'DF3.) 'DE.2F) -3( 'DE91A
    const storedById = new Map(storedList.map((r) => [r && r.id, r]));

    incoming[entity] = incomingList.map((inc) => {
      if (!inc || typeof inc !== "object") return inc;
      const prev = storedById.get(inc.id);
      if (!prev) return inc;

      // %0' C'F* 'DF3.) 'DE.2F) AJ -'D) FG'&J)& 
      if (finals.has(prev.status) && !finals.has(inc.status)) {
        // & A'DF'*, J(BI 9DI 'D-'D) 'DFG'&J) (D' *1',9)
        return { ...inc, status: prev.status, endedAt: prev.endedAt ?? inc.endedAt };
      }
      return inc;
    });
  }
  return incoming;
}
const { runMigrations } = require('./migrations');

 
/* FH9 9EH/ updated_at 'DA9DJ AJ 'DB'9/): DATETIME (BH'9/ schema.sql 'DB/JE)) #H BIGINT (,/J/)) */
let updatedAtIsDatetime = false;

/* ============================ *1EJE 0'*J DD,/'HD 9F/ 'D%BD'9 ============================ */
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
    // C4A FH9 'D9EH/ 'DEH,H/ A9DJ'K   'DBH'9/ 'DEF4#) EF schema.sql 'DB/JE 9EH/G' DATETIME
    try {
      const [cols] = await c.query("SHOW COLUMNS FROM clinic_state LIKE 'updated_at'");
      updatedAtIsDatetime = !!cols.length && /^datetime|timestamp/i.test(cols[0].Type);
      console.log(`   9EH/ updated_at: ${updatedAtIsDatetime ? "DATETIME (B'9/) B/JE))" : "BIGINT"}`);
    } catch { /* *,'GD */ }
    await c.query(
      "CREATE TABLE IF NOT EXISTS activity_log (id BIGINT AUTO_INCREMENT PRIMARY KEY, at BIGINT, device_id VARCHAR(64), device_label VARCHAR(120), user_name VARCHAR(120), user_role VARCHAR(30), action VARCHAR(60), cat VARCHAR(30), entity VARCHAR(30), record_id VARCHAR(32), description TEXT, INDEX idx_at (at))"
    );
    await c.query(
      "CREATE TABLE IF NOT EXISTS deletions (entity VARCHAR(30), record_id VARCHAR(32), deleted_at BIGINT, PRIMARY KEY (entity, record_id))"
    );
    await c.query(
      "CREATE TABLE IF NOT EXISTS device_registry (device_id VARCHAR(64) PRIMARY KEY, label VARCHAR(120), last_user VARCHAR(120), last_seen BIGINT)"
    );
    // 'D,/'HD 'D9D'&BJ) (DD*B'1J1 'D.'1,J))
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

/* ============================ E-1C 'D/E, ============================ */
const COLLECTIONS = [
  "patients", "doctors", "staff", "services", "appointments", "invoices", "expenses",
  "followUps", "supplies", "supplyMoves", "sessions", "implants", "prosthetics",
  "orthoCases", "xrays", "plans", "users", "prescriptions",
];

/** /E, B'&E*JF 9DI E3*HI 'D3,D: 'D#-/+ updatedAt JAH2 */
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

/** *7(JB 3,D 'D-0A (tombstones) 9DI 'D-'D) */
function applyTombstones(doc, tombs = []) {
  for (const t of tombs) {
    const coll = doc[t.entity];
    if (Array.isArray(coll)) doc[t.entity] = coll.filter((r) => r.id !== t.record_id);
  }
  return doc;
}

/**
 * J-HQD EDDJ +'FJ) %DI BJE) *7'(B FH9 9EH/ updated_at 'DA9DJ:
 * DATETIME (BH'9/ schema.sql 'DB/JE)) �! F5 (*'1J. 5'D-   BIGINT ('D,/J/)) �! 'D1BE E('41)
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

/* ============================ E2'EF) 'D,/'HD 'D9D'&BJ) (EF 'D-'D) 'DE/E,)) ============================ */
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

// ====== (5E'* 'D-0A (Tombstones) ======


function unionTombstones(a = [], b = []) {
  const map = new Map();
  for (const t of [...a, ...b]) map.set(`${t.entity}::${t.id}`, t);
  return [...map.values()];
}


/* ============================ 'DH',G'* ============================ */
app.get("/api/health", (_req, res) => res.json({ ok: true, db: DB_NAME, time: new Date().toISOString() }));

/** A-5 B'9/) 'D(J'F'* 'DA9DJ */
app.get("/api/db-check", async (_req, res) => {
  try {
    await ensureSchema();
    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM clinic_state");
    res.json({ ok: true, db: DB_NAME, records: rows[0].n });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err.message) });
  }
});

/** '3*7D'9: GD *:JQ1 4J! EF0 D-8) E9JF) (gen J1*A9 9F/ 'D'3*(/'D 'D4'ED) */
app.get("/api/poll", async (req, res) => {
  try {
    const since = Number(req.query.since || 0);
    // C4A 'D*:JJ1 EF savedAt 'D/BJB /'.D 'DH+JB) (EDDJ +'FJ))   D' J*#+1 (/B) 9EH/ DATETIME
    const { doc, gen } = await loadDoc();
    const at = Number(doc?.savedAt || 0);
    res.json({ changed: at > since, at, gen });
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

/** ,D( 'D-'D) 'DC'ED) 'DE/E,) */
app.get("/api/state", async (_req, res) => {
  try { const { doc, at, gen } = await loadDoc(); const tombstones = await loadTombstones(); res.json({ db: guardTerminalStates(doc, doc), tombstones, serverAt: at, gen }); }
  catch (err) { console.error("GET /api/state:", err); if (!res.headersSent) res.status(500).json({ error: String(err.message) }); }
});

app.put("/api/state", async (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== "object" || !Array.isArray(incoming.patients)) return res.status(400).json({ error: "invalid payload" });
  const wipe = incoming.wipe === true;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { doc: current, gen } = await loadDoc();
    const tombs = await loadTombstones();
    let merged; let newGen = gen;
    if (wipe || !current) { merged = { ...incoming }; delete merged.wipe; if (wipe) { newGen = gen + 1; await conn.query("DELETE FROM deletions"); } }
    else {
      merged = { ...current };
      for (const coll of COLLECTIONS) merged[coll] = mergeList(current[coll], incoming[coll]);
      const curMap = new Map((current.currencies || []).map((c) => [c.code, c]));
      for (const c of incoming.currencies || []) curMap.set(c.code, c);
      merged.currencies = [...curMap.values()];
      merged.serviceCats = [...new Set([...(current.serviceCats || []), ...(incoming.serviceCats || [])])];
      merged.itemCats = [...new Set([...(current.itemCats || []), ...(incoming.itemCats || [])])];
      merged.expenseCats = [...new Set([...(current.expenseCats || []), ...(incoming.expenseCats || [])])];
      merged.settings = { ...(current.settings || {}), ...(incoming.settings || {}) };
      merged.nextInv = Math.max(current.nextInv || 0, incoming.nextInv || 0);
      delete merged.wipe;
    }
    merged = applyTombstones(merged, tombs);
    merged.savedAt = Number(incoming.savedAt || Date.now());
    merged = guardTerminalStates(current || {}, merged);
    await conn.query("INSERT INTO clinic_state (id,doc,updated_at,gen) VALUES (1,?,?,?) ON DUPLICATE KEY UPDATE doc = VALUES(doc), updated_at = VALUES(updated_at), gen = VALUES(gen)", [JSON.stringify(merged), updatedAtValue(merged.savedAt), newGen]);
    await syncNormalized(conn, merged);
    await conn.commit();
    res.json({ ok: true, savedAt: merged.savedAt, merged: true, gen: newGen });
  } catch (err) {
    await conn.rollback();
    console.error("PUT /api/state:", err);
    if (!res.headersSent) res.status(500).json({ error: String(err.message) });
  } finally { conn.release(); }
});


/** 3,D 'D#-/'+ (DDE/J1) */
app.get("/api/events", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 300), 1000);
  try {
    const [rows] = await pool.query("SELECT * FROM activity_log ORDER BY at DESC LIMIT ?", [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

/** 'D#,G2) 'DE3,D) */
app.get("/api/devices", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM device_registry ORDER BY last_seen DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

// H',G'* B1'!) 9D'&BJ) (D#/H'* 'D*B'1J1 'D.'1,J))
app.get("/api/patients", async (_req, res) => res.json((await pool.query("SELECT * FROM patients ORDER BY name"))[0]));
app.get("/api/appointments", async (_req, res) => res.json((await pool.query("SELECT * FROM appointments ORDER BY date DESC, time"))[0]));
app.get("/api/invoices", async (_req, res) => res.json((await pool.query("SELECT * FROM invoices ORDER BY date DESC"))[0]));
app.get("/api/doctors", async (_req, res) => res.json((await pool.query("SELECT * FROM doctors"))[0]));

async function start(){try{await runMigrations(pool);}catch(e){console.error("فشل الترحيلات:",e.message);process.exit(1);} await ensureSchema(); app.listen(API_PORT,()=>console.log(`خادم API يعمل على المنفذ ${API_PORT}`));}
start().catch(e=>{console.error("تعذر بدء الخادم:",e.message);process.exit(1);})
