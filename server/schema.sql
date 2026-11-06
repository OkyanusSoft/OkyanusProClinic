-- ============================================================
--     نظام إدارة عيادة الأسنان  — مخطط قاعدة البيانات المركزية MySQL
--  التشغيل:  mysql -u root -p < schema.sql
-- ============================================================
CREATE DATABASE IF NOT EXISTS sharafi_dental
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE sharafi_dental;

-- حالة التطبيق الكاملة (مصدر الحقيقة للمزامنة مع الواجهة)
CREATE TABLE IF NOT EXISTS clinic_state (
  id         INT PRIMARY KEY,
  doc        JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================ الكيانات الأساسية ============================
CREATE TABLE IF NOT EXISTS doctors (
  id         VARCHAR(32) PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  specialty  VARCHAR(120),
  color      VARCHAR(16)
);

CREATE TABLE IF NOT EXISTS staff (
  id    VARCHAR(32) PRIMARY KEY,
  name  VARCHAR(120) NOT NULL,
  role  VARCHAR(80),
  phone VARCHAR(32),
  active TINYINT(1) DEFAULT 1,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS patients (
  id        VARCHAR(32) PRIMARY KEY,
  name      VARCHAR(140) NOT NULL,
  phone     VARCHAR(32),
  age       INT,
  gender    ENUM('m','f'),
  blood     VARCHAR(8),
  allergies VARCHAR(255),
  city      VARCHAR(80),
  notes     TEXT,
  joined    DATE,
  teeth     JSON,
  INDEX idx_patients_name (name),
  INDEX idx_patients_phone (phone)
);

CREATE TABLE IF NOT EXISTS services (
  id       VARCHAR(32) PRIMARY KEY,
  name     VARCHAR(140) NOT NULL,
  category VARCHAR(60),
  price    DECIMAL(12,2) DEFAULT 0,
  duration INT DEFAULT 30,
  color    VARCHAR(16),
  active   TINYINT(1) DEFAULT 1
);

-- ============================ التشغيل ============================
CREATE TABLE IF NOT EXISTS appointments (
  id        VARCHAR(32) PRIMARY KEY,
  patientId VARCHAR(32) NOT NULL,
  serviceId VARCHAR(32),
  doctorId  VARCHAR(32),
  date      DATE NOT NULL,
  time      TIME,
  status    ENUM('confirmed','waiting','inprogress','done','cancelled','noshow') DEFAULT 'confirmed',
  notes     TEXT,
  INDEX idx_appt_date (date),
  INDEX idx_appt_doctor (doctorId),
  INDEX idx_appt_patient (patientId)
);

CREATE TABLE IF NOT EXISTS invoices (
  id        VARCHAR(32) PRIMARY KEY,
  number    VARCHAR(40) UNIQUE,
  patientId VARCHAR(32) NOT NULL,
  date      DATE,
  paid      DECIMAL(12,2) DEFAULT 0,
  discount  DECIMAL(5,2) DEFAULT 0,
  method    VARCHAR(20),
  INDEX idx_inv_patient (patientId),
  INDEX idx_inv_date (date)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  invoiceId VARCHAR(32) NOT NULL,
  serviceId VARCHAR(32),
  qty       INT DEFAULT 1,
  price     DECIMAL(12,2) DEFAULT 0,
  INDEX idx_ii_invoice (invoiceId)
);

CREATE TABLE IF NOT EXISTS expenses (
  id       VARCHAR(32) PRIMARY KEY,
  title    VARCHAR(160),
  category VARCHAR(60),
  amount   DECIMAL(12,2) DEFAULT 0,
  date     DATE,
  notes    TEXT
);

CREATE TABLE IF NOT EXISTS follow_ups (
  id        VARCHAR(32) PRIMARY KEY,
  patientId VARCHAR(32) NOT NULL,
  doctorId  VARCHAR(32),
  reason    VARCHAR(255),
  dueDate   DATE,
  status    ENUM('pending','booked','done') DEFAULT 'pending',
  createdAt DATETIME,
  apptId    VARCHAR(32),
  notes     TEXT,
  INDEX idx_fu_due (dueDate),
  INDEX idx_fu_patient (patientId)
);

-- ============================ المستخدمون والصلاحيات ============================
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(32) PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  username   VARCHAR(60) UNIQUE,
  pin        VARCHAR(16),
  role       ENUM('admin','doctor','secretary','assistant'),
  linkId     VARCHAR(32),
  active     TINYINT(1) DEFAULT 1,
  permissions JSON,
  lastLogin  DATETIME
);

-- ============================ العملات ============================
CREATE TABLE IF NOT EXISTS currencies (
  code   VARCHAR(8) PRIMARY KEY,
  name   VARCHAR(80),
  symbol VARCHAR(16),
  rate   DECIMAL(14,4) DEFAULT 1
);

-- ============================ المخزون والمستهلكات ============================
CREATE TABLE IF NOT EXISTS supplies (
  id       VARCHAR(32) PRIMARY KEY,
  name     VARCHAR(140) NOT NULL,
  category VARCHAR(60),
  unit     VARCHAR(40),
  qty      DECIMAL(12,2) DEFAULT 0,
  minQty   DECIMAL(12,2) DEFAULT 0,
  cost     DECIMAL(12,2) DEFAULT 0,
  expiry   DATE,
  INDEX idx_supplies_cat (category)
);

CREATE TABLE IF NOT EXISTS supply_moves (
  id     VARCHAR(32) PRIMARY KEY,
  itemId VARCHAR(32),
  delta  DECIMAL(12,2) DEFAULT 0,
  note   VARCHAR(255),
  date   DATETIME,
  INDEX idx_sm_item (itemId)
);

-- ============================ الفئات (خدمات / أصناف / مصروفات) ============================
CREATE TABLE IF NOT EXISTS service_cats (
  name VARCHAR(80) PRIMARY KEY,
  sort INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS item_cats (
  name VARCHAR(80) PRIMARY KEY,
  sort INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expense_cats (
  name VARCHAR(80) PRIMARY KEY,
  sort INT DEFAULT 0
);

 CREATE TABLE sessions (
  id VARCHAR(20) PRIMARY KEY,
  patientId VARCHAR(20),
  doctorId VARCHAR(20),
  apptId VARCHAR(20),
  DATE DATE,
  startedAt DATETIME,
  endedAt DATETIME,
  STATUS ENUM('open', 'done'),
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
  INDEX idx_date (DATE),
  INDEX idx_status (STATUS)
);

-- ============================ السجلات السريرية ============================
-- الجلسات والإجراءات والروشتات والزراعة والتركيبات والتقويم والأشعة
-- تُحفَظ كاملة داخل clinic_state.doc لضمان تطابق الواجهة،
-- بينما الجداول العلائقية أعلاه قابلة للاستعلام المباشر من أي أداة تقارير.


-- ============================ الحسابات (GL) ============================
CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(32) PRIMARY KEY,
  code VARCHAR(16) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  level INT DEFAULT 5,
  type ENUM('asset','liability','equity','revenue','expense') NOT NULL,
  parent_id VARCHAR(32),
  is_posting TINYINT(1) DEFAULT 0,
  active TINYINT(1) DEFAULT 1,
  notes TEXT,
  updated_at BIGINT,
  INDEX idx_acc_parent (parent_id),
  INDEX idx_acc_type (type)
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id VARCHAR(32) PRIMARY KEY,
  code VARCHAR(16),
  name VARCHAR(160) NOT NULL,
  type ENUM('clinic','department','doctor','project') DEFAULT 'department',
  active TINYINT(1) DEFAULT 1,
  updated_at BIGINT
);

CREATE TABLE IF NOT EXISTS vouchers (
  id VARCHAR(32) PRIMARY KEY,
  number VARCHAR(40),
  type ENUM('journal','payment','receipt','transfer','opening') DEFAULT 'journal',
  date DATE,
  description TEXT,
  status ENUM('draft','posted','void') DEFAULT 'draft',
  created_by VARCHAR(32),
  posted_at DATETIME,
  created_at DATETIME,
  updated_at BIGINT,
  INDEX idx_v_date (date),
  INDEX idx_v_status (status)
);

CREATE TABLE IF NOT EXISTS voucher_lines (
  id VARCHAR(32) PRIMARY KEY,
  voucher_id VARCHAR(32) NOT NULL,
  account_id VARCHAR(32) NOT NULL,
  debit DECIMAL(14,2) DEFAULT 0,
  credit DECIMAL(14,2) DEFAULT 0,
  cost_center_id VARCHAR(32),
  description VARCHAR(255),
  ref_type VARCHAR(40),
  ref_id VARCHAR(32),
  INDEX idx_vl_voucher (voucher_id),
  INDEX idx_vl_account (account_id)
);

CREATE TABLE IF NOT EXISTS fiscal_years (
  id VARCHAR(32) PRIMARY KEY,
  label VARCHAR(16),
  start_date DATE,
  end_date DATE,
  status ENUM('open','closed') DEFAULT 'open',
  updated_at BIGINT
);

CREATE TABLE IF NOT EXISTS fiscal_periods (
  id VARCHAR(32) PRIMARY KEY,
  fiscal_year_id VARCHAR(32),
  period_no INT,
  start_date DATE,
  end_date DATE,
  status ENUM('open','closed','locked') DEFAULT 'open',
  updated_at BIGINT,
  INDEX idx_fp_year (fiscal_year_id)
);

CREATE TABLE IF NOT EXISTS insurance_companies (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(16),
  contact VARCHAR(255),
  terms TEXT,
  claim_days INT DEFAULT 30,
  active TINYINT(1) DEFAULT 1,
  updated_at BIGINT
);

CREATE TABLE IF NOT EXISTS insurance_claims (
  id VARCHAR(32) PRIMARY KEY,
  invoice_id VARCHAR(32),
  patient_id VARCHAR(32),
  company_id VARCHAR(32),
  submitted_amount DECIMAL(14,2) DEFAULT 0,
  approved_amount DECIMAL(14,2) DEFAULT 0,
  status ENUM('submitted','approved','partial','denied','paid') DEFAULT 'submitted',
  submitted_at DATETIME,
  decided_at DATETIME,
  paid_at DATETIME,
  notes TEXT,
  updated_at BIGINT,
  INDEX idx_claim_company (company_id),
  INDEX idx_claim_patient (patient_id)
);

CREATE TABLE IF NOT EXISTS perio_charts (
  id VARCHAR(32) PRIMARY KEY,
  patient_id VARCHAR(32),
  date DATE,
  doctor_id VARCHAR(32),
  sites JSON,
  notes TEXT,
  updated_at BIGINT,
  INDEX idx_perio_patient (patient_id)
);
