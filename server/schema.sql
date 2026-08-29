-- ============================================================
--  عيادة د. عبدالله الشرفي — مخطط قاعدة البيانات المركزية MySQL
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
  phone VARCHAR(32)
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

-- ============================ السجلات السريرية ============================
-- الجلسات والإجراءات والروشتات والزراعة والتركيبات والتقويم والأشعة
-- تُحفَظ كاملة داخل clinic_state.doc لضمان تطابق الواجهة،
-- بينما الجداول العلائقية أعلاه قابلة للاستعلام المباشر من أي أداة تقارير.
