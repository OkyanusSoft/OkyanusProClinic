import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { arLocale } from "./prefs";
import {
  fetchMergedState,
  ping,
  pollState,
  saveState,
  type ActivityEvent,
} from "./api";

/* ============================== الهوية المحلية للجهاز ============================== */

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem("dental-device-id");
    if (!id) {
      id = "dev-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("dental-device-id", id);
    }
    return id;
  } catch {
    return "dev-unknown";
  }
}
export function getDeviceLabel(): string {
  try {
    return localStorage.getItem("dental-device-label") || "جهاز غير مسمّى";
  } catch {
    return "جهاز غير مسمّى";
  }
}
export function setDeviceLabel(v: string) {
  try {
    localStorage.setItem("dental-device-label", v.trim() || "جهاز غير مسمّى");
  } catch {
    /* تجاهل */
  }
}

/* ============================== سجل أحداث النشاط ============================== */

const pendingEvents: ActivityEvent[] = [];
export function drainPendingEvents(): ActivityEvent[] {
  return pendingEvents.splice(0, pendingEvents.length);
}

/* ============================== محرك الدمج (Merge) ============================== */

const MERGE_COLLECTIONS = [
  "patients", "doctors", "staff", "services", "appointments", "invoices", "expenses",
  "followUps", "supplies", "supplyMoves", "sessions", "implants", "prosthetics",
  "orthoCases", "xrays", "plans", "users", "prescriptions",
] as const;

type Rec = { id?: string; updatedAt?: number };

function mergeListById<T extends Rec>(a: T[] = [], b: T[] = []): T[] {
  const map = new Map<string, T>();
  for (const r of b) if (r && r.id) map.set(r.id, r);
  for (const r of a) {
    if (!r || !r.id) continue;
    const ex = map.get(r.id);
    if (!ex || (r.updatedAt ?? 0) >= (ex.updatedAt ?? 0)) map.set(r.id, r);
  }
  return [...map.values()];
}

/** دمج حالتين على مستوى السجل — الأحدث يفوز، وسجل الحذف (tombstones) هو الفيصل */
export function mergeDB(
  local: DB,
  remote: DB,
  tombstones: { entity: string; record_id: string }[] = []
): DB {
  const merged: Record<string, unknown> = { ...local };
  const l = local as unknown as Record<string, Rec[]>;
  const r = remote as unknown as Record<string, Rec[]>;
  for (const c of MERGE_COLLECTIONS) {
    merged[c] = mergeListById(l[c] ?? [], r[c] ?? []);
  }
  // العملات بمفتاح code
  const curMap = new Map<string, { code: string }>();
  for (const c of local.currencies ?? []) curMap.set(c.code, c);
  for (const c of remote.currencies ?? []) curMap.set(c.code, c);
  merged.currencies = [...curMap.values()];
  // الفئات: اتحاد القيم
  merged.serviceCats = [...new Set([...(local.serviceCats ?? []), ...(remote.serviceCats ?? [])])];
  merged.itemCats = [...new Set([...(local.itemCats ?? []), ...(remote.itemCats ?? [])])];
  merged.expenseCats = [...new Set([...(local.expenseCats ?? []), ...(remote.expenseCats ?? [])])];
  merged.settings = { ...(local.settings ?? {}), ...(remote.settings ?? {}) };
  merged.nextInv = Math.max(local.nextInv ?? 0, remote.nextInv ?? 0);
  merged.savedAt = remote.savedAt ?? local.savedAt;

  // تطبيق سجل الحذف المركزي — المحذوف لا يعود أبداً
  const tset = new Map<string, Set<string>>();
  for (const t of tombstones) {
    if (!tset.has(t.entity)) tset.set(t.entity, new Set());
    tset.get(t.entity)!.add(t.record_id);
  }
  for (const c of MERGE_COLLECTIONS) {
    const gone = tset.get(c);
    if (gone) merged[c] = ((merged[c] as Rec[]) ?? []).filter((r) => !gone.has(r.id ?? ""));
  }
  return normalizeDB(merged as unknown as DB);
}

/** ختم السجلات المضافة/المعدّلة بطابع زمني — أساس «الأحدث يفوز» في الدمج */
function stampAction(a: Action) {
  const now = Date.now();
  const stamp = <T,>(o: T): T => ({ ...(o as object), updatedAt: now } as T);
  switch (a.type) {
    case "ADD_PATIENT": a.p = stamp(a.p); break;
    case "ADD_APPT": a.a = stamp(a.a); break;
    case "ADD_INVOICE": a.inv = stamp(a.inv); break;
    case "ADD_SERVICE":
    case "UPDATE_SERVICE": a.s = stamp(a.s); break;
    case "ADD_EXPENSE": a.e = stamp(a.e); break;
    case "ADD_PRESCRIPTION": a.rx = stamp(a.rx); break;
    case "ADD_FOLLOWUP":
    case "UPDATE_FOLLOWUP": a.f = stamp(a.f); break;
    case "ADD_SUPPLY": a.item = stamp(a.item); break;
    case "ADD_PLAN":
    case "UPDATE_PLAN": a.plan = stamp(a.plan); break;
    case "ADD_USER":
    case "UPDATE_USER": a.u = stamp(a.u); break;
    case "ADD_IMPLANT":
    case "ADD_PROSTHETIC":
    case "ADD_ORTHO":
    case "UPDATE_ORTHO":
    case "ADD_XRAY": a.r = stamp(a.r); break;
    default: break;
  }
}

/** ترجمة كل عملية إلى حدث مراقبة بالعربية (اسم + فئة + وصف) */
function queueActionEvent(a: Action, db: DB) {
  const now = Date.now();
  const add = (action: string, cat: string, desc: string, entity?: string, recordId?: string) =>
    pendingEvents.push({ at: now, action, cat, desc, entity, recordId });
  const pname = (id?: string) => db.patients.find((p) => p.id === id)?.name ?? "مريض";
  switch (a.type) {
    case "ADD_PATIENT": add("إضافة", "المرضى", `سجّل مريضاً جديداً: ${a.p.name}`); break;
    case "DELETE_PATIENT": add("حذف", "المرضى", `حذف من السجل المريض: ${pname(a.id)}`, "patients", a.id); break;
    case "SET_TOOTH": add("تعديل", "المرضى", `حدّث حالة سن للمريض: ${pname(a.patientId)}`); break;
    case "ADD_APPT": add("إضافة", "المواعيد", `حجز موعداً للمريض: ${pname(a.a.patientId)}`); break;
    case "SET_APPT_STATUS": add("تعديل", "المواعيد", `غيّر حالة موعد إلى: ${APPT_META[a.status]?.label ?? a.status}`); break;
    case "DELETE_APPT": add("حذف", "المواعيد", "حذف موعداً من الجدول", "appointments", a.id); break;
    case "ADD_INVOICE": add("إضافة", "المالية", `أصدر الفاتورة ${a.inv.number} للمريض: ${pname(a.inv.patientId)}`); break;
    case "PAY_INVOICE": add("تعديل", "المالية", "سجّل دفعة تحصيل على فاتورة"); break;
    case "ADD_SERVICE": add("إضافة", "الخدمات", `أضاف خدمة جديدة: ${a.s.name}`); break;
    case "UPDATE_SERVICE": add("تعديل", "الخدمات", `عدّل خدمة: ${a.s.name}`); break;
    case "DELETE_SERVICE": add("حذف", "الخدمات", "حذف خدمة من قائمة الأسعار", "services", a.id); break;
    case "ADD_EXPENSE": add("إضافة", "المالية", `سجّل مصروفاً: ${a.e.title}`); break;
    case "DELETE_EXPENSE": add("حذف", "المالية", "حذف مصروفاً مسجلاً", "expenses", a.id); break;
    case "ADD_PRESCRIPTION": add("إضافة", "المرضى", `كتب روشتة للمريض: ${pname(a.rx.patientId)}`); break;
    case "DELETE_PRESCRIPTION": add("حذف", "المرضى", "حذف روشتة طبية", "prescriptions", a.id); break;
    case "START_SESSION": add("جلسة", "الجلسات", `أدخل المريض للكرسي وبدأ جلسة علاج: ${pname(a.patientId)}`); break;
    case "END_SESSION": add("جلسة", "الجلسات", "أنهى جلسة علاج وأصدر فواتيرها وروشتها"); break;
    case "CANCEL_SESSION": add("جلسة", "الجلسات", "ألغى جلسة علاج مفتوحة"); break;
    case "ADD_FOLLOWUP": add("إضافة", "المتابعات", `جدول عودة للمريض: ${pname(a.f.patientId)}`); break;
    case "DELETE_FOLLOWUP": add("حذف", "المتابعات", "حذف عودة متابعة", "followUps", a.id); break;
    case "ADD_SUPPLY": add("إضافة", "المخزون", `أضاف صنفاً للمخزون: ${a.item.name}`); break;
    case "MOVE_SUPPLY": add("تعديل", "المخزون", `حركة مخزون: ${a.note}`); break;
    case "DELETE_SUPPLY": add("حذف", "المخزون", "حذف صنفاً من المخزون", "supplies", a.id); break;
    case "ADD_PLAN": add("إضافة", "المرضى", `أنشأ خطة علاج للمريض: ${pname(a.plan.patientId)}`); break;
    case "DELETE_PLAN": add("حذف", "المرضى", "حذف خطة علاج", "plans", a.id); break;
    case "ADD_USER": add("إضافة", "الإدارة", `أنشأ حساب مستخدم: ${a.u.name}`); break;
    case "DELETE_USER": add("حذف", "الإدارة", "حذف حساب مستخدم", "users", a.id); break;
    case "ADD_SERVICE_CAT": add("إضافة", "الخدمات", `أضاف فئة خدمات: ${a.name}`); break;
    case "RENAME_SERVICE_CAT": add("تعديل", "الخدمات", `أعاد تسمية فئة: ${a.from} ← ${a.to}`); break;
    case "DELETE_SERVICE_CAT": add("حذف", "الخدمات", `حذف فئة خدمات: ${a.name}`); break;
    case "ADD_ITEM_CAT": add("إضافة", "المخزون", `أضاف فئة أصناف: ${a.name}`); break;
    case "RENAME_ITEM_CAT": add("تعديل", "المخزون", `أعاد تسمية فئة أصناف: ${a.from} ← ${a.to}`); break;
    case "DELETE_ITEM_CAT": add("حذف", "المخزون", `حذف فئة أصناف: ${a.name}`); break;
    case "UPDATE_SETTINGS": add("تعديل", "الإعدادات", "عدّل الإعدادات العامة للعيادة"); break;
    case "IMPORT": add("نظام", "النظام", "استورد نسخة احتياطية كاملة (استبدال شامل)"); break;
    case "RESET": add("نظام", "النظام", "حذف كل البيانات وأعاد النظام للصفر"); break;
    case "ADD_IMPLANT": add("إضافة", "المرضى", `سجّل زراعة سن للمريض: ${pname(a.r.patientId)}`); break;
    case "ADD_PROSTHETIC": add("إضافة", "المرضى", `سجّل تركيباً للمريض: ${pname(a.r.patientId)}`); break;
    case "ADD_ORTHO": add("إضافة", "المرضى", `فتح حالة تقويم للمريض: ${pname(a.r.patientId)}`); break;
    case "ADD_XRAY": add("إضافة", "المرضى", `أرفق أشعة للمريض: ${pname(a.r.patientId)}`); break;
    case "PATCH_SESSION":
    case "UPDATE_ORTHO":
    case "UPDATE_USER":
    case "UPDATE_FOLLOWUP":
    case "UPDATE_PLAN":
    case "HYDRATE":
    case "MERGE":
    case "SYNCED":
      break; // عمليات متكررة أو داخلية — لا تُسجَّل
  }
  if (pendingEvents.length > 50) pendingEvents.splice(0, pendingEvents.length - 50);
}

/* ============================== Types ============================== */

export type ToothStatus = "healthy" | "caries" | "filled" | "root" | "prosthetic" | "ortho" | "crown" | "missing";
export type ApptStatus = "confirmed" | "waiting" | "inprogress" | "done" | "cancelled" | "noshow";
export type InvoiceStatus = "paid" | "partial" | "unpaid";

export interface Patient {
  id: string;
  name: string;
  phone: string;
  age: number;
  gender: "m" | "f";
  blood: string;
  allergies: string;
  city: string;
  notes: string;
  joined: string;
  teeth: Partial<Record<number, ToothStatus>>;
}
export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  color: string;
  active: boolean;
}
export interface Staff {
  id: string;
  name: string;
  role: string;
  phone: string;
  active: boolean;
  notes?: string;
}
export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number; // كم يساوي بالعملة الأساسية (ر.ي)
}
export interface Service {
  id: string;
  name: string;
  category: string;
  price: number; // بالعملة الأساسية
  duration: number;
  color: string;
  active: boolean;
}
export interface Appointment {
  id: string;
  patientId: string;
  serviceId: string;
  doctorId: string;
  date: string;
  time: string;
  status: ApptStatus;
  notes?: string;
}
export interface InvoiceItem {
  serviceId: string;
  name?: string; // اسم البند عند عدم وجود خدمة مرتبطة (إجراء مخصص)
  qty: number;
  price: number;
}
export interface Invoice {
  id: string;
  number: string;
  patientId: string;
  date: string;
  items: InvoiceItem[];
  paid: number;
  discount?: number;
  method?: string;
}
export interface Activity {
  id: string;
  text: string;
  time: string;
  kind: "patient" | "appt" | "invoice" | "tooth" | "team" | "rx";
}
export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
}
export interface RxItem {
  name: string;
  dose: string;
  freq: string;
  duration: string;
}
export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  items: RxItem[];
  notes?: string;
}
/** بيانات قنوات العصب لكل سن على حدة */
export interface ToothCanalData {
  tooth: number;
  channels: number; // عدد القنوات
  length: number;   // طول القناة (مم)
}

/**
 * إجراء/خدمة منفذة داخل الجلسة.
 * تُبنى من تبويبات «مخطط العمل السريري» (فئات الخدمات) وتحمل سعراً قابلاً للتعديل،
 * وتُحوَّل تلقائياً إلى بند فاتورة عند إنهاء الجلسة.
 */
export interface SessionProc {
  id: string;
  category: string;          // فئة الخدمة المصدر (قلع/حشوات/سحب عصب/تركيب/تقويم/…)
  name: string;              // اسم الإجراء/الخدمة
  serviceId?: string;        // ربط اختياري بخدمة من قائمة الأسعار
  price: number;             // السعر القابل للتعديل
  teeth: number[];           // الأسنان المحددة (FDI)
  detail?: string;           // النوع: نوع القلع/الحشوة/العصب/التركيب…
  canals?: ToothCanalData[]; // سحب العصب: قنوات كل سن
  impression?: string;       // تركيب: أخذ القياس
  color?: string;            // تركيب: اللون
  wireNum?: string;          // تقويم: رقم السلك
  ligature?: string;         // تقويم: نوع الربل
  stageId?: string;          // المرحلة (الجلسة) المرتبطة
  note?: string;
}
export interface ClinicalSession {
  id: string;
  patientId: string;
  doctorId: string;
  apptId?: string;
  date: string;
  startedAt: string;
  endedAt?: string;
  status: "open" | "done";
  complaint: string;
  diagnosis: string;
  procedures: SessionProc[];
  teethTreated: { tooth: number; status: ToothStatus }[];
  workItems: WorkItem[]; // خطة العمل السريرية (قلع/حشوات/عصب/تركيب…)
  stages: SessionStage[]; // مراحل الجلسات (الأولى/الثانية/الثالثة…)
  meds: RxItem[];
  medNotes: string;
  summary: string; // تقرير العمل السريري للجلسة
  invoiceId?: string;
  rxId?: string;
  fuId?: string; // العودة المرتبطة بالجلسة
}

/* ============================== خطة العمل السريرية ============================== */

export type WorkKind = "قلع" | "حشوات" | "سحب عصب" | "تركيب" | "أطقم" | "تقويم";

export interface WorkItem {
  id: string;
  kind: WorkKind;
  teeth: number[]; // رموز الأسنان (FDI) التي يسري عليها العمل
  stageId: string; // المرحلة (الجلسة) المرتبطة
  extractType?: string; // نوع القلع
  fillType?: string; // نوع الحشوة
  rctType?: string; // نوع سحب العصب
  channels?: number; // عدد القنوات المعالجة
  rctFill?: string; // حشوة الجلسة الأولى بعد العصب
  prosType?: string; // نوع التركيب
  withRct?: boolean; // هل يترافق التركيب مع سحب عصب
  dentureType?: string; // نوع الطقم
  wireType?: string; // نوع سلك التقويم
  wireNum?: string; // رقم السلك
  rubberType?: string; // نوع الربلات
  note?: string;
}

export interface SessionStage {
  id: string;
  name: string; // الجلسة الأولى…
  date: string; // التاريخ المقرر
  done: boolean;
  notes?: string; // ملاحظات المرحلة
  fuId?: string; // معرّف العودة/المتابعة المرتبطة بهذه المرحلة
}

/* مرجعيات الأنواع — تُعرض كأزرار/قوائم في مخطط العمل */
export const EXTRACT_TYPES = ["قلع عادي", "قلع جراحي"];
export const FILL_TYPES = ["حشوة كمبوزيت (تجميلية)", "حشوة أملغم", "حشوة زجاجية (GIC)", "حشوة مؤقتة"];
export const RCT_TYPES = ["سحب عصب كامل", "سحب عصب جزئي (بتر اللب)", "إعادة علاج عصب"];
export const RCT_FILLS = ["حشوة مؤقتة", "حشوة كمبوزيت", "تاج مؤقت"];
export const DENTURE_TYPES = ["طقم كامل علوي", "طقم كامل سفلي", "طقم جزئي متحرك", "طقم فوري"];
export const WIRE_TYPES = ["NiTi حراري", "ستانلس ستيل", "TMA"];
export const RUBBER_TYPES = ["ربلات عادية", "ربلات سلسلة (Chain)", "أربطة معدنية"];

export const WORK_META: Record<WorkKind, { color: string; status: ToothStatus; desc: string }> = {
  "قلع": { color: "#d9503a", status: "missing", desc: "إزالة السن — عادي أو جراحي" },
  "حشوات": { color: "#1273c4", status: "filled", desc: "ترميم التسوس بحشوة" },
  "سحب عصب": { color: "#e2952b", status: "root", desc: "علاج القنوات الجذرية" },
  "تركيب": { color: "#2f9fe0", status: "crown", desc: "تاج أو جسر ثابت" },
  "أطقم": { color: "#0b518f", status: "crown", desc: "أطقم متحركة كاملة/جزئية" },
  "تقويم": { color: "#2c9c69", status: "filled", desc: "تقويم وأسلاك وربلات" },
};

/* فئة المريض حسب العمر: لبنية (أطفال) أو دائمة (بالغون) */
export type DentitionMode = "adult" | "child";
export const dentitionOf = (age: number): DentitionMode => (age > 0 && age < 12 ? "child" : "adult");

/* ============================== العودات والمتابعة ============================== */

export type FollowUpStatus = "pending" | "booked" | "done";
export interface FollowUp {
  id: string;
  patientId: string;
  doctorId: string;
  reason: string;
  dueDate: string; // YYYY-MM-DD
  status: FollowUpStatus;
  createdAt: string;
  apptId?: string; // موعد مرتبط عند التحويل
  notes?: string;
}

export const FU_META: Record<FollowUpStatus, { label: string; cls: string; dot: string }> = {
  pending: { label: "بانتظار المراجعة", cls: "bg-sky-soft text-sky", dot: "#3a86c4" },
  booked: { label: "محجوزة", cls: "bg-jade-soft text-jade-deep", dot: "#0d8f83" },
  done: { label: "مكتملة", cls: "bg-mint-soft text-[#1d6b47]", dot: "#2c9c69" },
};

/* اقتراح العودة تلقائياً حسب نوع العلاج المنفذ */
export const FOLLOWUP_SUGGESTIONS: { match: RegExp; reason: string; days: number }[] = [
  { match: /عصب/, reason: "تركيب التاج بعد علاج العصب", days: 7 },
  { match: /زراعة/, reason: "كشف مرحلة الالتئام للزرعة", days: 56 },
  { match: /ضرس عقل/, reason: "فك الغرز ومراجعة الجرح", days: 7 },
  { match: /خلع/, reason: "مراجعة ما بعد الخلع", days: 5 },
  { match: /تقويم/, reason: "موعد شد التقويم الدوري", days: 30 },
  { match: /تبييض/, reason: "متابعة نتيجة التبييض", days: 90 },
  { match: /حشوة/, reason: "مراجعة الحشوة والتأكد من الإطباق", days: 14 },
  { match: /تاج|زيركون/, reason: "تسليم وتركيب التاج", days: 10 },
  { match: /تنظيف/, reason: "تنظيف دوري كل 6 أشهر", days: 180 },
];
export function suggestFollowUp(serviceNames: string[]) {
  for (const s of serviceNames) {
    const hit = FOLLOWUP_SUGGESTIONS.find((x) => x.match.test(s));
    if (hit) return hit;
  }
  return { reason: "مراجعة عامة", days: 30 };
}

/* ---------- السجلات السريرية الدائمة ---------- */
export interface Implant {
  id: string;
  patientId: string;
  tooth: number;
  brand: string;
  date: string;
  status: "مخطط له" | "مرحلة الالتئام" | "مكتمل";
  doctorId: string;
  notes?: string;
}
export interface Prosthetic {
  id: string;
  patientId: string;
  kind: string;
  teeth: string;
  date: string;
  lab: string;
  status: "قيد التصنيع" | "مركّب";
  doctorId: string;
}
export interface OrthoCase {
  id: string;
  patientId: string;
  kind: string;
  started: string;
  nextAdjust: string;
  progress: number; // 0-100
  notes?: string;
}
export interface XrayRec {
  id: string;
  patientId: string;
  kind: string;
  date: string;
  findings: string;
  doctorId: string;
}

export const IMPLANT_BRANDS = ["Straumann", "Osstem", "Nobel Biocare", "Dentium", "Megagen"];
export const IMPLANT_STATUS = ["مخطط له", "مرحلة الالتئام", "مكتمل"] as const;
export const PROSTHETIC_KINDS = ["تاج زيركون", "تاج بورسلين", "جسر ثابت", "فينير", "طقم كامل", "طقم جزئي"];
export const ORTHO_KINDS = ["تقويم معدني", "تقويم شفاف", "تقويم خزفي"];
export const XRAY_KINDS = ["بانورامية (OPG)", "سيفالومترية", "بيريابيكال", "CBCT ثلاثي الأبعاد"];

/* مرجعية أدوية ذات أعراض جانبية مهمة — تُطابق تلقائياً مع روشتة الجلسة */
export const DRUG_WATCH: { key: string; side: string[]; caution: string }[] = [
  { key: "أموكسيسيلين", side: ["طفح جلدي", "غثيان", "إسهال"], caution: "يُمنع تماماً مع حساسية البنسلين" },
  { key: "إيبوبروفين", side: ["تهيّج معدة", "ارتفاع ضغط"], caution: "حذر مع قرحة المعدة والربو والحمل" },
  { key: "كليندامايسين", side: ["إسهال قد يكون شديداً", "غثيان"], caution: "أوقفه فوراً عند إسهال مائي وأبلغ الطبيب" },
  { key: "ميترونيدازول", side: ["طعم معدني", "غثيان"], caution: "يُمنع الكحول أثناءه وبعده 48 ساعة" },
  { key: "باراسيتامول", side: ["آمن غالباً بالجرعات الموصوفة"], caution: "الحد الأقصى 4 جم يومياً — تجاوزُه سام للكبد" },
  { key: "كلورهيكسيدين", side: ["تصبغ الأسنان", "تغيّر الطعم"], caution: "لا يُستخدم أكثر من أسبوعين متواصلين" },
  { key: "أسبرين", side: ["نزيف", "تهيّج معدة"], caution: "يوقف قبل الجراحة بـ 7 أيام بموافقة الطبيب" },
];

/* ============================== المستخدمون والصلاحيات ============================== */

export type Role = "admin" | "doctor" | "secretary" | "assistant";
export interface User {
  id: string;
  name: string;
  username: string;
  pin: string;
  role: Role;
  linkId?: string; // معرّف الطبيب أو الموظف المرتبط
  active: boolean;
  permissions: string[];
  lastLogin?: string;
}

export const PERMISSIONS: { key: string; label: string; desc: string; scope?: boolean }[] = [
  { key: "dashboard", label: "لوحة التحكم", desc: "الإحصائيات وجدول اليوم والنشاط" },
  { key: "appointments", label: "المواعيد", desc: "الحجوزات وجدول الأيام" },
  { key: "session", label: "محطة العمل", desc: "جلسات العلاج السريرية" },
  { key: "patients", label: "ملفات المرضى", desc: "السجل وخريطة الأسنان والروشتات" },
  { key: "team", label: "الفريق الطبي", desc: "الأطباء والموظفون" },
  { key: "serviceCats", label: "فئات الخدمات", desc: "تصنيفات الخدمات الطبية" },
  { key: "services", label: "بيانات الخدمات", desc: "الخدمات وأسعارها ومددها" },
  { key: "invoices", label: "الفواتير", desc: "الإصدار والتحصيل والطباعة" },
  { key: "expenses", label: "المصروفات", desc: "تسجيل مصاريف العيادة" },
  { key: "priceList", label: "قائمة الأسعار", desc: "قائمة أسعار جاهزة للطباعة" },
  { key: "currencies", label: "العملات", desc: "العملات وأسعار الصرف" },
  { key: "expenseCats", label: "فئات المصروفات", desc: "تصنيفات مصروفات العيادة" },
  { key: "inventory", label: "المخزون والمستهلكات", desc: "لوحة المخزون والتنبيهات" },
  { key: "itemCats", label: "فئات الأصناف", desc: "تصنيفات أصناف المخزون" },
  { key: "itemsData", label: "بيانات الأصناف", desc: "أصناف المخزون وحركاتها" },
  { key: "reports", label: "التقارير", desc: "الإيرادات وأداء الأطباء" },
  { key: "settings", label: "الإعدادات العامة", desc: "هوية العيادة والدوام والفوترة والبيانات" },
  { key: "users", label: "المستخدمون والصلاحيات", desc: "إدارة الحسابات والأدوار" },
  { key: "monitor", label: "مراقبة النشاط", desc: "متابعة عمليات الموظفين والأجهزة لحظياً (للمدير)" },
  { key: "guide", label: "دليل المستخدم", desc: "شرح شاشات النظام" },
  { key: "scope_all_patients", label: "كل المرضى", desc: "رؤية جميع ملفات المرضى — بدونها يرى الطبيب مرضاه فقط", scope: true },
  { key: "scope_all_appointments", label: "كل المواعيد", desc: "رؤية جدول مواعيد كل الأطباء — بدونها يرى الطبيب مواعيده فقط", scope: true },
];

export const ROLE_META: Record<Role, { label: string; cls: string; color: string; desc: string; defaults: string[] }> = {
  admin: {
    label: "مدير النظام",
    cls: "bg-pine text-white",
    color: "#0b2f2b",
    desc: "وصول كامل لكل الشاشات والإعدادات",
    defaults: PERMISSIONS.map((p) => p.key),
  },
  doctor: {
    label: "طبيب",
    cls: "bg-jade-soft text-jade-deep",
    color: "#1273c4",
    desc: "يرى مرضاه ومواعيده وجلسات علاجه فقط",
    defaults: ["dashboard", "appointments", "session", "patients", "reports", "services", "serviceCats", "priceList", "guide"],
  },
  secretary: {
    label: "سكرتارية",
    cls: "bg-sky-soft text-sky",
    color: "#2f9fe0",
    desc: "الاستقبال والحجوزات والفواتير حسب الممنوح",
    defaults: ["dashboard", "appointments", "patients", "invoices", "services", "serviceCats", "priceList", "inventory", "itemCats", "itemsData", "expenses", "expenseCats", "reports", "guide", "scope_all_patients", "scope_all_appointments"],
  },
  assistant: {
    label: "مساعد طبيب",
    cls: "bg-amber-soft text-[#a06410]",
    color: "#e2952b",
    desc: "مساعدة الطبيب في الجلسات والملفات",
    defaults: ["appointments", "session", "patients", "inventory", "itemCats", "itemsData", "guide", "scope_all_patients", "scope_all_appointments"],
  },
};

export interface DB {
  expenses: Expense[];
  prescriptions: Prescription[];
  patients: Patient[];
  doctors: Doctor[];
  staff: Staff[];
  currencies: Currency[];
  defaultCurrency: string;
  services: Service[];
  appointments: Appointment[];
  invoices: Invoice[];
  activity: Activity[];
  sessions: ClinicalSession[];
  implants: Implant[];
  prosthetics: Prosthetic[];
  orthoCases: OrthoCase[];
  xrays: XrayRec[];
  followUps: FollowUp[];
  supplies: SupplyItem[];
  supplyMoves: SupplyMove[];
  serviceCats: string[];
  itemCats: string[];
  expenseCats: string[];
  plans: TreatmentPlan[];
  users: User[];
  settings: ClinicSettings;
  /** قوائم ديناميكية قابلة للإضافة الفورية */
  cities: string[];
  specialties: string[];
  staffRoles: string[];
  nextInv: number;
  /** طابع زمن آخر حفظ — للمقارنة بين localStorage و MySQL واختيار الأحدث */
  savedAt?: number;
}

export const CLINIC_NAME = "عيادة د. عبدالله الشرفي";
export const CLINIC_LATIN = "AL-SHARAFI DENTAL CLINIC";

/* ---------- المخزون والمستهلكات ---------- */
export interface SupplyItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  qty: number;
  minQty: number;
  cost: number;
  expiry?: string;
}
export interface SupplyMove {
  id: string;
  itemId: string;
  delta: number;
  note: string;
  date: string; // ISO
}

/* ---------- خطط العلاج ---------- */
export interface PlanItem {
  id: string;
  name: string;
  tooth?: string;
  cost: number;
  done: boolean;
}
export interface TreatmentPlan {
  id: string;
  patientId: string;
  title: string;
  doctorId: string;
  created: string;
  items: PlanItem[];
  notes?: string;
}

/* ---------- إعدادات العيادة ---------- */
export interface ClinicSettings {
  clinicName: string;
  clinicLatin: string;
  address: string;
  phone: string;
  email: string;
  workStart: string;
  workEnd: string;
  followUpAlertDays: number;
  invoiceTitle: string;
  invoicePrefix: string;
  invoiceFooter: string;
}
export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
  clinicName: CLINIC_NAME,
  clinicLatin: CLINIC_LATIN,
  address: "صنعاء — شارع الزبيري، عمارة النخبة، الدور الثاني",
  phone: "+967 777 220 115 · +967 1 445 880",
  email: "info@alsharafi-dental.ye",
  workStart: "09:00",
  workEnd: "21:00",
  followUpAlertDays: 3,
  invoiceTitle: "فاتورة العيادة",
  invoicePrefix: "INV",
  invoiceFooter: "يشمل السعر الكشف والمتابعة خلال 7 أيام. يُرجى إحضار هذه الفاتورة عند المراجعة. شكراً لثقتكم.",
};
export const clinicOf = (db: { settings?: ClinicSettings }): ClinicSettings => ({
  ...DEFAULT_CLINIC_SETTINGS,
  ...(db.settings ?? {}),
});
export const BASE_CURRENCY = "YER";

/* ============================== Meta ============================== */

export const TOOTH_META: Record<ToothStatus, { label: string; fill: string; stroke: string; dash?: boolean }> = {
  healthy: { label: "سليم", fill: "#ffffff", stroke: "#93a9bd" },
  caries: { label: "تسوس", fill: "#f6d7d0", stroke: "#d9503a" },
  filled: { label: "حشوة", fill: "#d3e8fa", stroke: "#1273c4" },
  root: { label: "سحب عصب", fill: "#f7e5c4", stroke: "#e2952b" },
  prosthetic: { label: "تركيب", fill: "#d6e6f5", stroke: "#0b518f" },
  ortho: { label: "تقويم", fill: "#e6dcf7", stroke: "#8e5ac8" },
  crown: { label: "تاج / زراعة", fill: "#d5e6f5", stroke: "#2f9fe0" },
  missing: { label: "مفقود", fill: "#eef2f5", stroke: "#a7bac7", dash: true },
};

/* ترتيب الحالات الثماني في واجهات حالة السن */
export const TOOTH_STATUS_ORDER: ToothStatus[] = ["healthy", "caries", "filled", "root", "prosthetic", "ortho", "crown", "missing"];

export const APPT_META: Record<ApptStatus, { label: string; cls: string; dot: string }> = {
  confirmed: { label: "مؤكد", cls: "bg-sky-soft text-sky", dot: "#3a86c4" },
  waiting: { label: "في الانتظار", cls: "bg-amber-soft text-[#a06410]", dot: "#e2952b" },
  inprogress: { label: "قيد العلاج", cls: "bg-jade-soft text-jade-deep", dot: "#0d8f83" },
  done: { label: "مكتمل", cls: "bg-mint-soft text-[#1d6b47]", dot: "#2c9c69" },
  cancelled: { label: "ملغي", cls: "bg-coral-soft text-coral", dot: "#d9503a" },
  noshow: { label: "لم يحضر", cls: "bg-mist text-soft", dot: "#7d8ba0" },
};

export const INV_META: Record<InvoiceStatus, { label: string; cls: string }> = {
  paid: { label: "مدفوعة", cls: "bg-mint-soft text-[#1d6b47]" },
  partial: { label: "جزئية", cls: "bg-amber-soft text-[#a06410]" },
  unpaid: { label: "غير مدفوعة", cls: "bg-coral-soft text-coral" },
};

export const EXPENSE_CATS: { name: string; color: string }[] = [
  { name: "رواتب", color: "#e2952b" },
  { name: "إيجار", color: "#3a86c4" },
  { name: "مستلزمات طبية", color: "#0d8f83" },
  { name: "مختبر وأشعة", color: "#b23a48" },
  { name: "صيانة", color: "#d9503a" },
  { name: "تسويق", color: "#2c9c69" },
  { name: "فواتير خدمات", color: "#3a86c4" },
  { name: "أخرى", color: "#5b7370" },
];
const EXP_FALLBACK = ["#1273c4", "#2c9c69", "#e2952b", "#d9503a", "#b23a48", "#3a86c4", "#0b518f", "#8e5ac8"];
export const expCatColor = (name: string) => {
  const known = EXPENSE_CATS.find((c) => c.name === name)?.color;
  if (known) return known;
  let h = 0;
  for (const ch of name) h = (h + ch.charCodeAt(0)) % 997;
  return EXP_FALLBACK[h % EXP_FALLBACK.length];
};

export const YEMEN_CITIES = ["صنعاء", "عدن", "تعز", "الحديدة", "إب", "المكلا", "ذمار", "سيئون", "مأرب", "عمران", "لحج", "الضالع"];

export const STAFF_ROLES = ["مساعد أسنان", "استقبال وعلاقات مرضى", "فني تعقيم", "فني مختبر أسنان", "محاسب", "ممرض"];

export const DEFAULT_SPECIALTIES = [
  "طب أسنان عام وترميم",
  "تقويم الأسنان",
  "جراحة الفم والوجه والفكين",
  "طب أسنان الأطفال",
  "علاج الجذور والعصب",
  "علاج اللثة",
  "التعويضات السنية",
  "أشعة الفم والوجه والفكين",
  "طب الفم",
];

/* ============================== Helpers ============================== */

export const uid = () => Math.random().toString(36).slice(2, 10);
const pad = (n: number) => String(n).padStart(2, "0");
export const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return dstr(d);
};
export const fmtMoney = (n: number) => `${Math.round(n).toLocaleString("en-US")} ر.ي`;
export const fmtDate = (ds: string) =>
  new Intl.DateTimeFormat(arLocale(), { day: "numeric", month: "long" }).format(new Date(ds + "T12:00:00"));
export const fmtDateFull = (ds: string) =>
  new Intl.DateTimeFormat(arLocale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(ds + "T12:00:00")
  );
export const dayName = (ds: string) =>
  new Intl.DateTimeFormat(arLocale(), { weekday: "short" }).format(new Date(ds + "T12:00:00"));
export const monthName = () => new Intl.DateTimeFormat(arLocale(), { month: "long", year: "numeric" }).format(new Date());
export const relTime = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  return `قبل ${Math.floor(h / 24)} يوم`;
};
export const addMinutes = (time: string, mins: number) => {
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m + mins;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
};

export const invoiceTotal = (inv: Invoice) => {
  const gross = inv.items.reduce((s, i) => s + i.qty * i.price, 0);
  return Math.max(0, Math.round(gross * (1 - (inv.discount || 0) / 100)));
};
export const PAY_METHODS: Record<string, string> = { cash: "نقداً", card: "بطاقة بنكية", transfer: "حوالة / تحويل" };
export const invoiceStatus = (inv: Invoice): InvoiceStatus => {
  const t = invoiceTotal(inv);
  if (inv.paid >= t) return "paid";
  if (inv.paid > 0) return "partial";
  return "unpaid";
};

/* ============================== Bootstrap ============================== */

/**
 * حالة البداية الفارغة — لا بيانات افتراضية إطلاقاً.
 * تحتوي فقط على البنية التحتية اللازمة للتشغيل:
 *   حساب المدير (للدخول) · العملات (الريال اليمني أساساً) · فئات التصنيف · الإعدادات.
 * كل بيانات العمل (مرضى، مواعيد، فواتير…) تبدأ فارغة وتُحفظ في قاعدة البيانات.
 */
function bootstrap(): DB {
  const adminUser: User = {
    id: "u-admin",
    name: "عبدالله الشرفي",
    username: "abdullah",
    pin: "0000",
    role: "admin",
    linkId: undefined,
    active: true,
    permissions: ROLE_META.admin.defaults,
  };
  const baseCurrencies: Currency[] = [
    { code: "YER", name: "ريال يمني", symbol: "ر.ي", rate: 1 },
    { code: "SAR", name: "ريال سعودي", symbol: "ر.س", rate: 141 },
    { code: "USD", name: "دولار أمريكي", symbol: "$", rate: 530 },
    { code: "AED", name: "درهم إماراتي", symbol: "د.إ", rate: 144 },
  ];
  return {
    patients: [],
    doctors: [],
    staff: [],
    currencies: baseCurrencies,
    defaultCurrency: "YER",
    services: [],
    appointments: [],
    invoices: [],
    activity: [],
    expenses: [],
    prescriptions: [],
    sessions: [],
    implants: [],
    prosthetics: [],
    orthoCases: [],
    xrays: [],
    followUps: [],
    supplies: [],
    supplyMoves: [],
    serviceCats: ["تشخيص", "وقاية", "علاج", "تجميل", "جراحة", "تعويضات", "تقويم"],
    itemCats: ["تخدير", "حشوات", "علاج عصب", "جراحة", "وقاية", "تعقيم", "مختبر", "استهلاكي عام"],
    expenseCats: EXPENSE_CATS.map((c) => c.name),
    cities: [...YEMEN_CITIES],
    specialties: [...DEFAULT_SPECIALTIES],
    staffRoles: [...STAFF_ROLES],
    plans: [],
    users: [adminUser],
    settings: DEFAULT_CLINIC_SETTINGS,
    nextInv: 1001,
  };
}

/* ============================== Seed (بيانات تجريبية — غير مستخدمة) ============================== */

function seed(): DB {
  const doctors: Doctor[] = [
    { id: "d1", name: "د. عبدالله الشرفي", specialty: "طب أسنان عام وترميم", phone: "771100110", color: "#0d8f83", active: true },
    { id: "d2", name: "د. أمل الحميري", specialty: "تقويم الأسنان", phone: "771200200", color: "#3a86c4", active: true },
    { id: "d3", name: "د. محمد باصهيب", specialty: "جراحة الفم والوجه", phone: "771300300", color: "#e2952b", active: true },
    { id: "d4", name: "د. سميرة الأهدل", specialty: "طب أسنان الأطفال", phone: "771400400", color: "#b23a48", active: true },
  ];
  const staff: Staff[] = [
    { id: "st1", name: "أ. خالد السقاف", role: "استقبال وعلاقات مرضى", phone: "770111222", active: true },
    { id: "st2", name: "أ. أروى العنسي", role: "مساعد أسنان", phone: "773334455", active: true },
    { id: "st3", name: "أ. فهد البعداني", role: "فني تعقيم", phone: "775554433", active: true },
    { id: "st4", name: "أ. منى الشامي", role: "محاسب", phone: "776667788", active: true },
    { id: "st5", name: "أ. وليد الجوفي", role: "فني مختبر أسنان", phone: "778881122", active: true },
  ];
  const currencies: Currency[] = [
    { code: "YER", name: "ريال يمني", symbol: "ر.ي", rate: 1 },
    { code: "SAR", name: "ريال سعودي", symbol: "ر.س", rate: 141 },
    { code: "USD", name: "دولار أمريكي", symbol: "$", rate: 530 },
    { code: "AED", name: "درهم إماراتي", symbol: "د.إ", rate: 144 },
  ];
  const services: Service[] = [
    { id: "s1", name: "كشف واستشارة", category: "تشخيص", price: 2000, duration: 30, color: "#0d8f83", active: true },
    { id: "s2", name: "تنظيف وتلميع", category: "وقاية", price: 4000, duration: 45, color: "#2c9c69", active: true },
    { id: "s3", name: "أشعة بانورامية", category: "تشخيص", price: 5000, duration: 20, color: "#3a86c4", active: true },
    { id: "s4", name: "حشوة تجميلية", category: "علاج", price: 7000, duration: 45, color: "#0a6158", active: true },
    { id: "s5", name: "علاج عصب", category: "علاج", price: 18000, duration: 90, color: "#e2952b", active: true },
    { id: "s6", name: "خلع بسيط", category: "جراحة", price: 5000, duration: 30, color: "#d9503a", active: true },
    { id: "s7", name: "خلع ضرس عقل", category: "جراحة", price: 15000, duration: 60, color: "#b23a48", active: true },
    { id: "s8", name: "تبييض أسنان", category: "تجميل", price: 12000, duration: 60, color: "#3a86c4", active: true },
    { id: "s9", name: "تاج زيركون", category: "تعويضات", price: 30000, duration: 60, color: "#e2952b", active: true },
    { id: "s10", name: "زراعة سن", category: "تعويضات", price: 80000, duration: 90, color: "#0a6158", active: true },
    { id: "s11", name: "متابعة تقويم", category: "تقويم", price: 8000, duration: 30, color: "#3a86c4", active: true },
    { id: "s12", name: "فلورايد وقائي", category: "وقاية", price: 3000, duration: 20, color: "#2c9c69", active: true },
  ];
  const patients: Patient[] = [
    { id: "p1", name: "عبده الحمزي", phone: "777123456", age: 34, gender: "m", blood: "O+", allergies: "لا يوجد", city: "صنعاء", notes: "يفضل المواعيد المسائية", joined: today(-160), teeth: { 16: "filled", 26: "caries", 36: "root", 46: "crown", 18: "missing" } },
    { id: "p2", name: "أمل الحرازي", phone: "771234567", age: 28, gender: "f", blood: "A+", allergies: "لا يوجد", city: "عدن", notes: "", joined: today(-92), teeth: { 11: "filled", 21: "filled", 31: "caries" } },
    { id: "p3", name: "صالح الحداء", phone: "733456789", age: 41, gender: "m", blood: "B+", allergies: "حساسية بنسلين", city: "تعز", notes: "ارتفاع ضغط — مراجعة قبل الجراحة", joined: today(-210), teeth: { 17: "root", 27: "crown", 37: "caries", 38: "missing", 48: "missing" } },
    { id: "p4", name: "أمة الرحمن الشرعبي", phone: "775556677", age: 22, gender: "f", blood: "O-", allergies: "لا يوجد", city: "الحديدة", notes: "", joined: today(-5), teeth: { 13: "caries" } },
    { id: "p5", name: "نبيل العنسي", phone: "770001122", age: 55, gender: "m", blood: "AB+", allergies: "أسبرين", city: "ذمار", notes: "سكري نوع ثانٍ", joined: today(-340), teeth: { 14: "crown", 15: "missing", 16: "crown", 24: "crown", 26: "root", 35: "missing", 36: "crown", 46: "crown" } },
    { id: "p6", name: "وديع بازرعة", phone: "772223344", age: 19, gender: "m", blood: "A-", allergies: "لا يوجد", city: "المكلا", notes: "حالة تقويم نشطة", joined: today(-45), teeth: {} },
    { id: "p7", name: "سحر المطري", phone: "778889900", age: 37, gender: "f", blood: "O+", allergies: "لا يوجد", city: "إب", notes: "", joined: today(-3), teeth: { 25: "filled", 34: "caries" } },
    { id: "p8", name: "غمدان القحوم", phone: "776665544", age: 45, gender: "m", blood: "B-", allergies: "لاتكس", city: "صنعاء", notes: "", joined: today(-120), teeth: { 11: "crown", 21: "crown", 22: "filled" } },
    { id: "p9", name: "ريام الحميري", phone: "773334455", age: 31, gender: "f", blood: "O+", allergies: "لا يوجد", city: "لحج", notes: "", joined: today(-60), teeth: { 46: "root", 47: "caries" } },
    { id: "p10", name: "توفيق الآنسي", phone: "774443322", age: 26, gender: "m", blood: "A+", allergies: "لا يوجد", city: "تعز", notes: "", joined: today(-30), teeth: { 38: "caries", 18: "filled" } },
  ];

  const A = (patientId: string, serviceId: string, doctorId: string, date: string, time: string, status: ApptStatus): Appointment =>
    ({ id: uid(), patientId, serviceId, doctorId, date, time, status });

  const appointments: Appointment[] = [
    // اليوم
    A("p2", "s2", "d1", today(0), "09:00", "done"),
    A("p1", "s4", "d1", today(0), "10:00", "inprogress"),
    A("p4", "s1", "d4", today(0), "11:00", "confirmed"),
    A("p8", "s9", "d1", today(0), "13:00", "confirmed"),
    A("p6", "s11", "d2", today(0), "15:00", "waiting"),
    A("p3", "s7", "d3", today(0), "16:30", "confirmed"),
    A("p9", "s5", "d1", today(0), "17:30", "confirmed"),
    A("p10", "s2", "d2", today(0), "19:00", "cancelled"),
    // قادمة
    A("p7", "s11", "d2", today(1), "12:00", "confirmed"),
    A("p5", "s1", "d1", today(1), "16:00", "confirmed"),
    A("p4", "s12", "d4", today(1), "10:30", "confirmed"),
    A("p2", "s8", "d1", today(2), "11:00", "confirmed"),
    A("p9", "s4", "d1", today(2), "18:00", "confirmed"),
    A("p10", "s12", "d4", today(3), "10:00", "confirmed"),
    // السابقة
    A("p5", "s9", "d1", today(-1), "09:30", "done"),
    A("p7", "s4", "d1", today(-1), "11:00", "done"),
    A("p2", "s1", "d1", today(-1), "13:30", "done"),
    A("p8", "s2", "d2", today(-1), "16:00", "cancelled"),
    A("p1", "s1", "d1", today(-2), "10:00", "done"),
    A("p6", "s11", "d2", today(-2), "12:30", "done"),
    A("p3", "s5", "d1", today(-2), "17:00", "done"),
    A("p4", "s1", "d4", today(-2), "14:00", "done"),
    A("p10", "s1", "d1", today(-3), "09:00", "done"),
    A("p4", "s3", "d1", today(-3), "14:00", "done"),
    A("p7", "s12", "d4", today(-3), "16:00", "done"),
    A("p9", "s1", "d1", today(-4), "10:30", "done"),
    A("p8", "s9", "d1", today(-4), "12:00", "done"),
    A("p7", "s2", "d2", today(-4), "15:30", "cancelled"),
    A("p2", "s12", "d4", today(-4), "18:00", "done"),
    A("p1", "s2", "d1", today(-5), "11:00", "done"),
    A("p5", "s1", "d1", today(-5), "13:00", "done"),
    A("p6", "s3", "d1", today(-6), "10:00", "done"),
    A("p3", "s1", "d3", today(-6), "12:30", "done"),
    A("p10", "s4", "d1", today(-6), "17:30", "done"),
  ];

  const I = (num: number, patientId: string, date: string, paid: number, items: InvoiceItem[]): Invoice =>
    ({ id: uid(), number: `INV-${num}`, patientId, date, items, paid });
  const invoices: Invoice[] = [
    I(1042, "p1", today(-1), 9000, [{ serviceId: "s4", qty: 1, price: 7000 }, { serviceId: "s1", qty: 1, price: 2000 }]),
    I(1041, "p8", today(-2), 30000, [{ serviceId: "s9", qty: 2, price: 30000 }]),
    I(1040, "p5", today(-3), 0, [{ serviceId: "s1", qty: 1, price: 2000 }]),
    I(1039, "p2", today(-4), 4000, [{ serviceId: "s2", qty: 1, price: 4000 }]),
    I(1038, "p3", today(-6), 20000, [{ serviceId: "s5", qty: 1, price: 18000 }, { serviceId: "s1", qty: 1, price: 2000 }]),
    I(1037, "p10", today(-8), 7000, [{ serviceId: "s2", qty: 1, price: 4000 }, { serviceId: "s12", qty: 1, price: 3000 }]),
    I(1036, "p7", today(-12), 3000, [{ serviceId: "s4", qty: 1, price: 7000 }]),
    I(1035, "p6", today(-15), 8000, [{ serviceId: "s11", qty: 1, price: 8000 }]),
    I(1034, "p9", today(-20), 7000, [{ serviceId: "s1", qty: 1, price: 2000 }, { serviceId: "s3", qty: 1, price: 5000 }]),
    I(1033, "p4", today(-24), 2000, [{ serviceId: "s1", qty: 1, price: 2000 }]),
  ];

  const ago = (mins: number) => new Date(Date.now() - mins * 60000).toISOString();
  const activity: Activity[] = [
    { id: uid(), text: "بدأ علاج حشوة تجميلية للمريض عبده الحمزي", time: ago(12), kind: "appt" },
    { id: uid(), text: "تم تحصيل فاتورة INV-1042 بقيمة 9,000 ر.ي", time: ago(95), kind: "invoice" },
    { id: uid(), text: "انضم المريض سحر المطري إلى سجل العيادة", time: ago(180), kind: "patient" },
    { id: uid(), text: "تحديث حالة السن 37 لصالح الحداء — تسوس", time: ago(300), kind: "tooth" },
    { id: uid(), text: "حجز موعد متابعة تقويم للمريض وديع بازرعة غداً 15:00", time: ago(420), kind: "appt" },
  ];

  const E = (title: string, category: string, amount: number, date: string, notes?: string): Expense =>
    ({ id: uid(), title, category, amount, date, notes });
  const expenses: Expense[] = [
    E("إيجار العيادة — شهري", "إيجار", 250000, today(-31), "عقد سنوي مع المالك"),
    E("رواتب الكادر الطبي والإداري", "رواتب", 850000, today(-28), "شامل الأطباء والفنيين"),
    E("مستلزمات تعقيم وقفازات", "مستلزمات طبية", 45000, today(-21)),
    E("أعمال مختبر — تيجان زيركون", "مختبر وأشعة", 120000, today(-19), "مختبر الأسنان الحديث"),
    E("صيانة كرسي الأسنان (2)", "صيانة", 35000, today(-14)),
    E("حملة إعلانات فيسبوك", "تسويق", 25000, today(-10)),
    E("مواد حشو كومبوزيت وأدوات", "مستلزمات طبية", 68000, today(-7)),
    E("فاتورة كهرباء ومياه", "فواتير خدمات", 18000, today(-4)),
    E("أشعة بانورامية خارجية — مريض محوَّل", "مختبر وأشعة", 15000, today(-2)),
    E("إيجار العيادة — شهري", "إيجار", 250000, today(-1)),
    E("ضيافة وقرطاسية", "أخرى", 8000, today(-1)),
  ];

  const RX = (patientId: string, doctorId: string, date: string, items: RxItem[], notes?: string): Prescription =>
    ({ id: uid(), patientId, doctorId, date, items, notes });
  const prescriptions: Prescription[] = [
    RX("p1", "d1", today(-1), [
      { name: "أموكسيسيلين Amoxicillin", dose: "500 مجم", freq: "كل 8 ساعات", duration: "5 أيام" },
      { name: "إيبوبروفين Ibuprofen", dose: "400 مجم", freq: "عند الألم — بعد الأكل", duration: "3 أيام" },
      { name: "غسول كلورهيكسيدين", dose: "10 مل", freq: "مرتين يومياً", duration: "أسبوع" },
    ], "بعد علاج العصب — السن 36"),
    RX("p3", "d3", today(-2), [
      { name: "كليندامايسين Clindamycin", dose: "300 مجم", freq: "كل 6 ساعات", duration: "7 أيام" },
      { name: "باراسيتامول Paracetamol", dose: "1000 مجم", freq: "كل 8 ساعات", duration: "3 أيام" },
    ], "بديل آمن — المريض لديه حساسية بنسلين، قبل خلع ضرس العقل"),
    RX("p7", "d1", today(-3), [
      { name: "باراسيتامول Paracetamol", dose: "500 مجم", freq: "كل 8 ساعات", duration: "3 أيام" },
    ]),
  ];

  const SES = (
    patientId: string,
    doctorId: string,
    date: string,
    start: string,
    end: string,
    complaint: string,
    diagnosis: string,
    procedures: SessionProc[],
    teethTreated: { tooth: number; status: ToothStatus }[],
    meds: RxItem[],
    medNotes = "",
    summary = ""
  ): ClinicalSession => ({
    id: uid(),
    patientId,
    doctorId,
    date,
    startedAt: new Date(`${date}T${start}:00`).toISOString(),
    endedAt: new Date(`${date}T${end}:00`).toISOString(),
    status: "done",
    complaint,
    diagnosis,
    procedures,
    teethTreated,
    workItems: [],
    stages: [],
    meds,
    medNotes,
    summary,
  });

  const sessions: ClinicalSession[] = [
    SES(
      "p2", "d1", today(0), "09:00", "09:42",
      "نزيف في اللثة عند التفريش",
      "التهاب لثة بسيط مع ترسبات جيرية على القواطع السفلية",
      [{ id: uid(), category: "وقاية", name: "تنظيف وتلميع", serviceId: "s2", price: 4000, teeth: [] }],
      [],
      [{ name: "غسول كلورهيكسيدين", dose: "10 مل", freq: "مرتين يومياً", duration: "أسبوع" }],
      "استخدام فرشاة ناعمة ومحلول ماء وملح دافئ",
      "نفّذ تنظيف وتلميع كامل للفكين مع إزالة الترسبات الجيرية، استجابت اللثة جيداً. أُعطي المريض تعليمات العناية المنزلية وموعد مراجعة روتيني."
    ),
    SES(
      "p9", "d1", today(-1), "11:00", "12:15",
      "ألم شديد في الضرس السفلي الأيمن يزداد ليلاً",
      "التهاب لبّي غير قابل للعكس — السن 46",
      [{ id: uid(), category: "سحب عصب", name: "علاج عصب", serviceId: "s5", price: 18000, teeth: [46], canals: [{ tooth: 46, channels: 3, length: 21 }] }],
      [{ tooth: 46, status: "root" }],
      [
        { name: "أموكسيسيلين Amoxicillin", dose: "500 مجم", freq: "كل 8 ساعات", duration: "5 أيام" },
        { name: "إيبوبروفين Ibuprofen", dose: "400 مجم", freq: "عند الألم — بعد الأكل", duration: "3 أيام" },
      ],
      "اكتمل علاج العصب للسن 46 — مراجعة الأسبوع القادم للحشوة والتاج",
      "أُكمل علاج العصب للسن 46 بجلسة واحدة: فتح حجرة اللب، تحديد طول القنوات، تحضير وحشو ثلاث قنوات. زوال الألم بعد التخدير، يُستكمل التركيب في المراجعة القادمة."
    ),
  ];

  const U = (id: string, name: string, username: string, pin: string, role: Role, linkId: string | undefined, permissions: string[]): User =>
    ({ id, name, username, pin, role, linkId, active: true, permissions });
  const users: User[] = [
    U("u-admin", "عبدالله الشرفي", "abdullah", "0000", "admin", undefined, ROLE_META.admin.defaults),
    U("u-d1", "أحمد النجار", "najar", "1111", "doctor", "d1", ROLE_META.doctor.defaults),
    U("u-d2", "سارة الحكيمي", "hakimi", "2222", "doctor", "d2", ROLE_META.doctor.defaults),
    U("u-d3", "خالد باصهيب", "basuhaib", "3333", "doctor", "d3", ROLE_META.doctor.defaults),
    U("u-s1", "أروى الشرعبي", "arwa", "4444", "secretary", "st1", ROLE_META.secretary.defaults),
    U("u-a1", "ماهر الحداء", "maher", "5555", "assistant", "st2", ROLE_META.assistant.defaults),
  ];

  const implants: Implant[] = [
    { id: uid(), patientId: "p5", tooth: 15, brand: "Straumann", date: today(-12), status: "مرحلة الالتئام", doctorId: "d1", notes: "غرسة بعد خلع الضرس العلوي — كشف الغطاء بعد 8 أسابيع" },
    { id: uid(), patientId: "p5", tooth: 35, brand: "Osstem", date: today(-80), status: "مكتمل", doctorId: "d1" },
    { id: uid(), patientId: "p3", tooth: 48, brand: "Nobel Biocare", date: today(-4), status: "مخطط له", doctorId: "d3", notes: "بعد تقييم CBCT لموضع ضرس العقل المنطمر" },
  ];

  const prosthetics: Prosthetic[] = [
    { id: uid(), patientId: "p8", kind: "تاج زيركون", teeth: "11", date: today(-30), lab: "مختبر الأسنان الحديث", status: "مركّب", doctorId: "d1" },
    { id: uid(), patientId: "p8", kind: "تاج زيركون", teeth: "21", date: today(-30), lab: "مختبر الأسنان الحديث", status: "مركّب", doctorId: "d1" },
    { id: uid(), patientId: "p1", kind: "تاج زيركون", teeth: "46", date: today(-2), lab: "مختبر الرواد للأسنان", status: "قيد التصنيع", doctorId: "d1" },
    { id: uid(), patientId: "p5", kind: "جسر ثابت", teeth: "14–16", date: today(-60), lab: "مختبر الأسنان الحديث", status: "مركّب", doctorId: "d1" },
  ];

  const orthoCases: OrthoCase[] = [
    { id: uid(), patientId: "p6", kind: "تقويم معدني", started: today(-45), nextAdjust: today(5), progress: 35, notes: "المرحلة الأولى من الإطباق — شد الأقواس شهرياً" },
  ];

  const FU = (patientId: string, doctorId: string, reason: string, dueDate: string, status: FollowUpStatus, notes?: string): FollowUp =>
    ({ id: uid(), patientId, doctorId, reason, dueDate, status, createdAt: new Date().toISOString(), notes });
  const followUps: FollowUp[] = [
    FU("p1", "d1", "تركيب التاج بعد علاج العصب — السن 36", today(-2), "pending", "التاج قيد التصنيع في المختبر"),
    FU("p9", "d1", "بدء المرحلة الثانية — حشو القنوات للسن 46", today(0), "pending"),
    FU("p3", "d3", "فك الغرز ومراجعة جرح الخلع", today(1), "pending", "المريض لديه حساسية بنسلين"),
    FU("p6", "d2", "موعد شد التقويم الشهري", today(3), "pending"),
    FU("p5", "d1", "كشف الغطاء للزرعة — السن 15", today(12), "pending", "غرسة Straumann"),
    FU("p2", "d2", "تنظيف دوري كل 6 أشهر", today(60), "pending"),
    FU("p8", "d1", "مراجعة ما بعد تركيب التاجين", today(-5), "done", "تمت المراجعة والإطباق سليم"),
  ];

  const xrays: XrayRec[] = [
    { id: uid(), patientId: "p3", kind: "CBCT ثلاثي الأبعاد", date: today(-4), findings: "ضرس عقل سفلي أيمن منطمر أفقياً ملامس للقناة العصبية — يُوصى بخلع جراحي بحذر", doctorId: "d3" },
    { id: uid(), patientId: "p4", kind: "بيريابيكال", date: today(-3), findings: "آفة ذروية مبكرة على السن 13 مع widening في الرباط السني", doctorId: "d1" },
    { id: uid(), patientId: "p5", kind: "بانورامية (OPG)", date: today(-20), findings: "فقدان عظمي أفقي متوسط في الفك السفلي، والجيوب الأنفية سليمة", doctorId: "d1" },
    { id: uid(), patientId: "p6", kind: "سيفالومترية", date: today(-40), findings: "تحليل ما قبل التقويم: صنف هيكلي أول مع بروز قاطعي خفيف", doctorId: "d2" },
  ];

  const SUP = (name: string, category: string, unit: string, qty: number, minQty: number, cost: number, expiry?: string): SupplyItem =>
    ({ id: uid(), name, category, unit, qty, minQty, cost, expiry });
  const supplies: SupplyItem[] = [
    SUP("أمبولات تخدير ليدوكائين", "تخدير", "علبة 50", 45, 20, 8500, today(240)),
    SUP("قفازات نتريل وسط", "وقاية", "علبة 100", 8, 15, 12000),
    SUP("كومبوزيت حشوات A2", "حشوات", "حقنة", 12, 6, 45000, today(300)),
    SUP("إبر تخدير 30G", "تخدير", "علبة 100", 30, 10, 6000),
    SUP("أكياس تعقيم ذاتية اللصق", "تعقيم", "رزمة 200", 5, 10, 9500),
    SUP("شاش معقم", "جراحة", "رزمة", 60, 25, 3500),
    SUP("بلانكات زيركون", "مختبر", "قرص", 14, 5, 55000),
    SUP("سيلانت شقوق وقائي", "وقاية", "عبوة", 7, 4, 28000, today(180)),
    SUP("حمض حفر (إيتش)", "حشوات", "حقنة", 3, 4, 18000),
    SUP("ماصات لعاب", "استهلاكي عام", "رزمة 100", 100, 40, 5000),
    SUP("مبارد قنوات روتاري", "علاج عصب", "طقم", 6, 3, 35000),
    SUP("خيوط جراحية 4/0", "جراحة", "علبة 12", 9, 4, 15000, today(400)),
  ];
  const MV = (itemId: string, delta: number, note: string, hoursAgo: number): SupplyMove =>
    ({ id: uid(), itemId, delta, note, date: new Date(Date.now() - hoursAgo * 3600000).toISOString() });
  const supplyMoves: SupplyMove[] = [
    MV(supplies[0].id, 20, "توريد من المورد الطبي", 20),
    MV(supplies[1].id, -2, "استهلاك يومي — عيادتا 1 و2", 8),
    MV(supplies[2].id, -1, "حشوة تجميلية — محمد العباسي", 6),
    MV(supplies[4].id, -1, "تشغيل معقم الأوتوكلاف", 30),
    MV(supplies[9].id, -5, "استهلاك جلسة تنظيف", 5),
    MV(supplies[7].id, 4, "توريد وقاية أطفال", 52),
    MV(supplies[10].id, -1, "علاج عصب — ريام الحميري", 26),
    MV(supplies[8].id, -1, "تجهيز حشوة", 3),
    MV(supplies[11].id, 6, "توريد جراحة", 76),
    MV(supplies[5].id, -3, "خلع ضرس عقل — فهد", 49),
    MV(supplies[3].id, -10, "مناوبة نهاية الأسبوع", 96),
    MV(supplies[6].id, 8, "طلبية مختبر الزيركون", 120),
    MV(supplies[2].id, 5, "توريد حشوات", 140),
    MV(supplies[1].id, -4, "نفاد جزئي — يلزم طلب عاجل", 2),
  ];
  const plans: TreatmentPlan[] = [
    {
      id: uid(),
      patientId: "p2",
      title: "خطة الابتسامة الشاملة",
      doctorId: "d1",
      created: today(-30),
      notes: "تجميل الجبهة الأمامية العلوية على ثلاث مراحل",
      items: [
        { id: uid(), name: "فينير خزفي", tooth: "11", cost: 350000, done: true },
        { id: uid(), name: "فينير خزفي", tooth: "21", cost: 350000, done: true },
        { id: uid(), name: "تبييض ضوئي بالعيادة", cost: 60000, done: false },
        { id: uid(), name: "تنظيف وتلميع نهائي", cost: 15000, done: false },
      ],
    },
    {
      id: uid(),
      patientId: "p5",
      title: "تأهيل الفك السفلي بالزراعة",
      doctorId: "d3",
      created: today(-70),
      notes: "يعوّض الأسنان المفقودة 35-37 بزرعتين وجسر",
      items: [
        { id: uid(), name: "زراعة سن Osstem", tooth: "35", cost: 450000, done: true },
        { id: uid(), name: "زراعة سن Osstem", tooth: "37", cost: 450000, done: false },
        { id: uid(), name: "جسر زيركون 3 وحدات", tooth: "35–37", cost: 700000, done: false },
      ],
    },
  ];

  const serviceCats: string[] = ["تشخيص", "وقاية", "علاج", "تجميل", "جراحة", "تعويضات", "تقويم"];
  const itemCats: string[] = ["تخدير", "حشوات", "علاج عصب", "جراحة", "وقاية", "تعقيم", "مختبر", "استهلاكي عام"];
  const expenseCats: string[] = EXPENSE_CATS.map((c) => c.name);

  return { patients, doctors, staff, currencies, defaultCurrency: "YER", services, appointments, invoices, activity, expenses, prescriptions, sessions, implants, prosthetics, orthoCases, xrays, followUps, supplies, supplyMoves, serviceCats, itemCats, expenseCats, cities: [...YEMEN_CITIES], specialties: [...DEFAULT_SPECIALTIES], staffRoles: [...STAFF_ROLES], plans, users, settings: DEFAULT_CLINIC_SETTINGS, nextInv: 1043 };
}

/* ============================== Store ============================== */

export type Action =
  | { type: "ADD_PATIENT"; p: Patient }
  | { type: "DELETE_PATIENT"; id: string }
  | { type: "SET_TOOTH"; patientId: string; tooth: number; status: ToothStatus }
  | { type: "ADD_APPT"; a: Appointment }
  | { type: "SET_APPT_STATUS"; id: string; status: ApptStatus }
  | { type: "DELETE_APPT"; id: string }
  | { type: "ADD_INVOICE"; inv: Invoice }
  | { type: "PAY_INVOICE"; id: string; amount: number }
  | { type: "ADD_SERVICE"; s: Service }
  | { type: "UPDATE_SERVICE"; s: Service }
  | { type: "DELETE_SERVICE"; id: string }
  | { type: "ADD_DOCTOR"; d: Doctor }
  | { type: "UPDATE_DOCTOR"; d: Doctor }
  | { type: "DELETE_DOCTOR"; id: string }
  | { type: "ADD_STAFF"; s: Staff }
  | { type: "UPDATE_STAFF"; s: Staff }
  | { type: "DELETE_STAFF"; id: string }
  | { type: "ADD_CURRENCY"; c: Currency }
  | { type: "UPDATE_CURRENCY"; c: Currency }
  | { type: "DELETE_CURRENCY"; code: string }
  | { type: "SET_DEFAULT_CURRENCY"; code: string }
  | { type: "ADD_EXPENSE"; e: Expense }
  | { type: "DELETE_EXPENSE"; id: string }
  | { type: "ADD_PRESCRIPTION"; rx: Prescription }
  | { type: "DELETE_PRESCRIPTION"; id: string }
  | { type: "START_SESSION"; patientId: string; doctorId: string; apptId?: string }
  | { type: "PATCH_SESSION"; id: string; patch: Partial<ClinicalSession> }
  | { type: "END_SESSION"; id: string; paid: number; fuId?: string }
  | { type: "CANCEL_SESSION"; id: string }
  | { type: "IMPORT"; db: DB }
  | { type: "HYDRATE"; db: DB }
  | { type: "MERGE"; db: DB; tombstones: { entity: string; record_id: string }[] }
  | { type: "SYNCED"; savedAt: number }
  | { type: "ADD_USER"; u: User }
  | { type: "UPDATE_USER"; u: User }
  | { type: "DELETE_USER"; id: string }
  | { type: "ADD_IMPLANT"; r: Implant }
  | { type: "DELETE_IMPLANT"; id: string }
  | { type: "ADD_PROSTHETIC"; r: Prosthetic }
  | { type: "DELETE_PROSTHETIC"; id: string }
  | { type: "ADD_ORTHO"; r: OrthoCase }
  | { type: "UPDATE_ORTHO"; r: OrthoCase }
  | { type: "DELETE_ORTHO"; id: string }
  | { type: "ADD_XRAY"; r: XrayRec }
  | { type: "DELETE_XRAY"; id: string }
  | { type: "ADD_FOLLOWUP"; f: FollowUp }
  | { type: "UPDATE_FOLLOWUP"; f: FollowUp }
  | { type: "DELETE_FOLLOWUP"; id: string }
  | { type: "UPDATE_SETTINGS"; patch: Partial<ClinicSettings> }
  | { type: "ADD_SUPPLY"; item: SupplyItem }
  | { type: "MOVE_SUPPLY"; itemId: string; delta: number; note: string }
  | { type: "DELETE_SUPPLY"; id: string }
  | { type: "ADD_PLAN"; plan: TreatmentPlan }
  | { type: "UPDATE_PLAN"; plan: TreatmentPlan }
  | { type: "DELETE_PLAN"; id: string }
  | { type: "ADD_SERVICE_CAT"; name: string }
  | { type: "RENAME_SERVICE_CAT"; from: string; to: string }
  | { type: "DELETE_SERVICE_CAT"; name: string }
  | { type: "ADD_ITEM_CAT"; name: string }
  | { type: "RENAME_ITEM_CAT"; from: string; to: string }
  | { type: "DELETE_ITEM_CAT"; name: string }
  | { type: "ADD_EXPENSE_CAT"; name: string }
  | { type: "RENAME_EXPENSE_CAT"; from: string; to: string }
  | { type: "DELETE_EXPENSE_CAT"; name: string }
  | { type: "ADD_CITY"; name: string }
  | { type: "ADD_SPECIALTY"; name: string }
  | { type: "ADD_STAFF_ROLE"; name: string }
  | { type: "RESET" };

const nowIso = () => new Date().toISOString();
const act = (text: string, kind: Activity["kind"]): Activity => ({ id: uid(), text, time: nowIso(), kind });

function reducer(db: DB, action: Action): DB {
  switch (action.type) {
    case "ADD_PATIENT":
      return {
        ...db,
        patients: [action.p, ...db.patients],
        activity: [act(`انضم المريض ${action.p.name} إلى سجل العيادة`, "patient"), ...db.activity].slice(0, 30),
      };
    case "DELETE_PATIENT": {
      const p = db.patients.find((x) => x.id === action.id);
      return {
        ...db,
        patients: db.patients.filter((x) => x.id !== action.id),
        appointments: db.appointments.filter((a) => a.patientId !== action.id),
        invoices: db.invoices.filter((i) => i.patientId !== action.id),
        activity: [act(`حذف المريض ${p?.name ?? ""} من السجل`, "patient"), ...db.activity].slice(0, 30),
      };
    }
    case "SET_TOOTH": {
      const p = db.patients.find((x) => x.id === action.patientId);
      const teeth = { ...p?.teeth };
      if (action.status === "healthy") delete teeth[action.tooth];
      else teeth[action.tooth] = action.status;
      return {
        ...db,
        patients: db.patients.map((x) => (x.id === action.patientId ? { ...x, teeth } : x)),
        activity: [
          act(`تحديث حالة السن ${action.tooth} للمريض ${p?.name ?? ""} — ${TOOTH_META[action.status].label}`, "tooth"),
          ...db.activity,
        ].slice(0, 30),
      };
    }
    case "ADD_APPT": {
      const p = db.patients.find((x) => x.id === action.a.patientId);
      const s = db.services.find((x) => x.id === action.a.serviceId);
      return {
        ...db,
        appointments: [...db.appointments, action.a],
        activity: [act(`حجز موعد ${s?.name ?? ""} للمريض ${p?.name ?? ""} — ${action.a.date} ${action.a.time}`, "appt"), ...db.activity].slice(0, 30),
      };
    }
    case "SET_APPT_STATUS": {
      const appointments = db.appointments.map((a) => (a.id === action.id ? { ...a, status: action.status } : a));
      // عند إتمام موعد مرتبط بعودة — تُكمل العودة تلقائياً
      const followUps =
        action.status === "done"
          ? db.followUps.map((f) => (f.apptId === action.id && f.status !== "done" ? { ...f, status: "done" as FollowUpStatus } : f))
          : db.followUps;
      return { ...db, appointments, followUps };
    }
    case "DELETE_APPT":
      return { ...db, appointments: db.appointments.filter((a) => a.id !== action.id) };
    case "ADD_INVOICE": {
      const p = db.patients.find((x) => x.id === action.inv.patientId);
      return {
        ...db,
        invoices: [action.inv, ...db.invoices],
        nextInv: db.nextInv + 1,
        activity: [act(`إنشاء فاتورة ${action.inv.number} للمريض ${p?.name ?? ""}`, "invoice"), ...db.activity].slice(0, 30),
      };
    }
    case "PAY_INVOICE": {
      const inv = db.invoices.find((i) => i.id === action.id);
      return {
        ...db,
        invoices: db.invoices.map((i) =>
          i.id === action.id ? { ...i, paid: Math.min(invoiceTotal(i), i.paid + action.amount) } : i
        ),
        activity: [act(`تحصيل ${fmtMoney(action.amount)} على الفاتورة ${inv?.number ?? ""}`, "invoice"), ...db.activity].slice(0, 30),
      };
    }
    case "ADD_SERVICE":
      return { ...db, services: [...db.services, action.s] };
    case "UPDATE_SERVICE":
      return { ...db, services: db.services.map((s) => (s.id === action.s.id ? action.s : s)) };
    case "DELETE_SERVICE":
      return { ...db, services: db.services.filter((s) => s.id !== action.id) };
    case "ADD_DOCTOR":
      return {
        ...db,
        doctors: [...db.doctors, action.d],
        activity: [act(`انضم ${action.d.name} إلى الفريق الطبي — ${action.d.specialty}`, "team"), ...db.activity].slice(0, 30),
      };
    case "UPDATE_DOCTOR":
      return { ...db, doctors: db.doctors.map((d) => (d.id === action.d.id ? action.d : d)) };
    case "DELETE_DOCTOR":
      return { ...db, doctors: db.doctors.filter((d) => d.id !== action.id) };
    case "ADD_STAFF":
      return {
        ...db,
        staff: [...db.staff, action.s],
        activity: [act(`انضم ${action.s.name} إلى طاقم العيادة — ${action.s.role}`, "team"), ...db.activity].slice(0, 30),
      };
    case "UPDATE_STAFF":
      return { ...db, staff: db.staff.map((s) => (s.id === action.s.id ? action.s : s)) };
    case "DELETE_STAFF":
      return { ...db, staff: db.staff.filter((s) => s.id !== action.id) };
    case "ADD_CURRENCY":
      return { ...db, currencies: [...db.currencies, action.c] };
    case "UPDATE_CURRENCY":
      return { ...db, currencies: db.currencies.map((c) => (c.code === action.c.code ? action.c : c)) };
    case "DELETE_CURRENCY": {
      const currencies = db.currencies.filter((c) => c.code !== action.code);
      return {
        ...db,
        currencies,
        defaultCurrency: db.defaultCurrency === action.code ? BASE_CURRENCY : db.defaultCurrency,
      };
    }
    case "SET_DEFAULT_CURRENCY":
      return { ...db, defaultCurrency: action.code };
    case "ADD_EXPENSE":
      return {
        ...db,
        expenses: [action.e, ...db.expenses],
        activity: [act(`تسجيل مصروف «${action.e.title}» — ${fmtMoney(action.e.amount)}`, "invoice"), ...db.activity].slice(0, 30),
      };
    case "DELETE_EXPENSE":
      return { ...db, expenses: db.expenses.filter((e) => e.id !== action.id) };
    case "ADD_PRESCRIPTION": {
      const p = db.patients.find((x) => x.id === action.rx.patientId);
      return {
        ...db,
        prescriptions: [action.rx, ...db.prescriptions],
        activity: [act(`وصفة طبية جديدة للمريض ${p?.name ?? ""} (${action.rx.items.length} أدوية)`, "rx"), ...db.activity].slice(0, 30),
      };
    }
    case "DELETE_PRESCRIPTION":
      return { ...db, prescriptions: db.prescriptions.filter((r) => r.id !== action.id) };

    /* ---------- جلسات العلاج ---------- */
    case "START_SESSION": {
      if (db.sessions.some((x) => x.status === "open")) return db;
      const sess: ClinicalSession = {
        id: uid(),
        patientId: action.patientId,
        doctorId: action.doctorId,
        apptId: action.apptId,
        date: today(0),
        startedAt: nowIso(),
        status: "open",
        complaint: "",
        diagnosis: "",
        procedures: [],
        teethTreated: [],
        workItems: [],
        stages: [{ id: uid(), name: "الجلسة الأولى", date: today(0), done: false }],
        meds: [],
        medNotes: "",
        summary: "",
      };
      const appointments = action.apptId
        ? db.appointments.map((a) => (a.id === action.apptId ? { ...a, status: "inprogress" as ApptStatus } : a))
        : db.appointments;
      const pName = db.patients.find((p) => p.id === action.patientId)?.name ?? "";
      return {
        ...db,
        sessions: [sess, ...db.sessions],
        appointments,
        activity: [act(`دخول المريض ${pName} إلى غرفة العلاج — بدأت الجلسة`, "appt"), ...db.activity].slice(0, 30),
      };
    }
    case "PATCH_SESSION":
      return {
        ...db,
        sessions: db.sessions.map((x) => (x.id === action.id && x.status === "open" ? { ...x, ...action.patch } : x)),
      };
    case "END_SESSION": {
      const s = db.sessions.find((x) => x.id === action.id);
      if (!s || s.status === "done") return db;
      let invoices = db.invoices;
      let nextInv = db.nextInv;
      let invoiceId: string | undefined;
      let invNumber: string | undefined;
      if (s.procedures.length > 0) {
        // كل إجراء يصبح بنداً مستقلاً باسمه وسعره القابل للتعديل
        const items: InvoiceItem[] = s.procedures.map((pr) => ({
          serviceId: pr.serviceId ?? "",
          name: pr.name,
          qty: Math.max(1, pr.teeth.length),
          price: pr.price,
        }));
        const total = items.reduce((a, i) => a + i.qty * i.price, 0);
        const inv: Invoice = {
          id: uid(),
          number: `${db.settings.invoicePrefix}-${nextInv}`,
          patientId: s.patientId,
          date: today(0),
          items,
          paid: Math.min(Math.max(0, action.paid), total),
        };
        invoices = [inv, ...invoices];
        invoiceId = inv.id;
        invNumber = inv.number;
        nextInv += 1;
      }
      let prescriptions = db.prescriptions;
      let rxId: string | undefined;
      if (s.meds.length > 0) {
        const rx: Prescription = {
          id: uid(),
          patientId: s.patientId,
          doctorId: s.doctorId,
          date: today(0),
          items: s.meds,
          notes: s.medNotes.trim() || undefined,
        };
        prescriptions = [rx, ...prescriptions];
        rxId = rx.id;
      }
      const patients = db.patients.map((p) => {
        if (p.id !== s.patientId || s.teethTreated.length === 0) return p;
        const teeth = { ...p.teeth };
        s.teethTreated.forEach((t) => {
          if (t.status === "healthy") delete teeth[t.tooth];
          else teeth[t.tooth] = t.status;
        });
        return { ...p, teeth };
      });
      const appointments = s.apptId
        ? db.appointments.map((a) => (a.id === s.apptId ? { ...a, status: "done" as ApptStatus } : a))
        : db.appointments;
      const sessions = db.sessions.map((x) =>
        x.id === s.id ? { ...x, status: "done" as const, endedAt: nowIso(), invoiceId, rxId, fuId: action.fuId } : x
      );
      const pName = db.patients.find((p) => p.id === s.patientId)?.name ?? "";
      return {
        ...db,
        patients,
        appointments,
        invoices,
        prescriptions,
        sessions,
        nextInv,
        activity: [
          act(
            `خروج المريض ${pName} — ${s.procedures.length} إجراء${invNumber ? ` بفاتورة ${invNumber}` : ""}${rxId ? " وروشتة إلكترونية" : ""}`,
            "appt"
          ),
          ...db.activity,
        ].slice(0, 30),
      };
    }
    case "CANCEL_SESSION": {
      const s = db.sessions.find((x) => x.id === action.id);
      if (!s) return db;
      const appointments = s.apptId
        ? db.appointments.map((a) => (a.id === s.apptId ? { ...a, status: "confirmed" as ApptStatus } : a))
        : db.appointments;
      const pName = db.patients.find((p) => p.id === s.patientId)?.name ?? "";
      return {
        ...db,
        sessions: db.sessions.filter((x) => x.id !== action.id),
        appointments,
        activity: [act(`إلغاء جلسة العلاج للمريض ${pName} قبل اكتمالها`, "appt"), ...db.activity].slice(0, 30),
      };
    }

    case "IMPORT":
      return action.db;
    case "HYDRATE":
      return normalizeDB(action.db);
    case "MERGE":
      return mergeDB(db, normalizeDB(action.db), action.tombstones);
    case "SYNCED":
      return { ...db, savedAt: action.savedAt };
    case "ADD_USER":
      return { ...db, users: [...db.users, action.u] };
    case "UPDATE_USER":
      return { ...db, users: db.users.map((x) => (x.id === action.u.id ? action.u : x)) };
    case "DELETE_USER":
      return { ...db, users: db.users.filter((x) => x.id !== action.id) };

    /* ---------- السجلات السريرية ---------- */
    case "ADD_IMPLANT":
      return { ...db, implants: [action.r, ...db.implants] };
    case "DELETE_IMPLANT":
      return { ...db, implants: db.implants.filter((x) => x.id !== action.id) };
    case "ADD_PROSTHETIC":
      return { ...db, prosthetics: [action.r, ...db.prosthetics] };
    case "DELETE_PROSTHETIC":
      return { ...db, prosthetics: db.prosthetics.filter((x) => x.id !== action.id) };
    case "ADD_ORTHO":
      return { ...db, orthoCases: [action.r, ...db.orthoCases] };
    case "UPDATE_ORTHO":
      return { ...db, orthoCases: db.orthoCases.map((x) => (x.id === action.r.id ? action.r : x)) };
    case "DELETE_ORTHO":
      return { ...db, orthoCases: db.orthoCases.filter((x) => x.id !== action.id) };
    case "ADD_XRAY":
      return { ...db, xrays: [action.r, ...db.xrays] };
    case "DELETE_XRAY":
      return { ...db, xrays: db.xrays.filter((x) => x.id !== action.id) };

    /* ---------- العودات والمتابعة ---------- */
    case "ADD_FOLLOWUP":
      return { ...db, followUps: [action.f, ...db.followUps] };
    case "UPDATE_FOLLOWUP":
      return { ...db, followUps: db.followUps.map((x) => (x.id === action.f.id ? action.f : x)) };
    case "DELETE_FOLLOWUP":
      return { ...db, followUps: db.followUps.filter((x) => x.id !== action.id) };
    case "UPDATE_SETTINGS":
      return { ...db, settings: { ...db.settings, ...action.patch } };

    /* ---------- المخزون ---------- */
    case "ADD_SUPPLY":
      return { ...db, supplies: [...db.supplies, action.item] };
    case "MOVE_SUPPLY": {
      const item = db.supplies.find((s) => s.id === action.itemId);
      if (!item) return db;
      const qty = Math.max(0, item.qty + action.delta);
      const move: SupplyMove = { id: uid(), itemId: action.itemId, delta: action.delta, note: action.note, date: nowIso() };
      return {
        ...db,
        supplies: db.supplies.map((s) => (s.id === action.itemId ? { ...s, qty } : s)),
        supplyMoves: [move, ...db.supplyMoves].slice(0, 60),
        activity: [act(`${action.delta > 0 ? "توريد" : "صرف"} مخزون: ${item.name} (${action.delta > 0 ? "+" : ""}${action.delta})`, "invoice"), ...db.activity].slice(0, 30),
      };
    }
    case "DELETE_SUPPLY":
      return { ...db, supplies: db.supplies.filter((s) => s.id !== action.id) };

    /* ---------- خطط العلاج ---------- */
    case "ADD_PLAN":
      return { ...db, plans: [action.plan, ...db.plans] };
    case "UPDATE_PLAN":
      return { ...db, plans: db.plans.map((p) => (p.id === action.plan.id ? action.plan : p)) };
    case "DELETE_PLAN":
      return { ...db, plans: db.plans.filter((p) => p.id !== action.id) };

    /* ---------- فئات الخدمات ---------- */
    case "ADD_SERVICE_CAT":
      if (!action.name.trim() || db.serviceCats.includes(action.name.trim())) return db;
      return { ...db, serviceCats: [...db.serviceCats, action.name.trim()] };
    case "RENAME_SERVICE_CAT":
      return {
        ...db,
        serviceCats: db.serviceCats.map((c) => (c === action.from ? action.to.trim() : c)),
        services: db.services.map((s) => (s.category === action.from ? { ...s, category: action.to.trim() } : s)),
      };
    case "DELETE_SERVICE_CAT": {
      const rest = db.serviceCats.filter((c) => c !== action.name);
      const fallback = rest[0] ?? "علاج";
      return {
        ...db,
        serviceCats: rest,
        services: db.services.map((s) => (s.category === action.name ? { ...s, category: fallback } : s)),
      };
    }

    /* ---------- فئات الأصناف ---------- */
    case "ADD_ITEM_CAT":
      if (!action.name.trim() || db.itemCats.includes(action.name.trim())) return db;
      return { ...db, itemCats: [...db.itemCats, action.name.trim()] };
    case "RENAME_ITEM_CAT":
      return {
        ...db,
        itemCats: db.itemCats.map((c) => (c === action.from ? action.to.trim() : c)),
        supplies: db.supplies.map((s) => (s.category === action.from ? { ...s, category: action.to.trim() } : s)),
      };
    case "DELETE_ITEM_CAT": {
      const rest = db.itemCats.filter((c) => c !== action.name);
      const fallback = rest[0] ?? "استهلاكي عام";
      return {
        ...db,
        itemCats: rest,
        supplies: db.supplies.map((s) => (s.category === action.name ? { ...s, category: fallback } : s)),
      };
    }

    /* ---------- فئات المصروفات ---------- */
    case "ADD_EXPENSE_CAT":
      if (!action.name.trim() || db.expenseCats.includes(action.name.trim())) return db;
      return { ...db, expenseCats: [...db.expenseCats, action.name.trim()] };
    case "RENAME_EXPENSE_CAT":
      return {
        ...db,
        expenseCats: db.expenseCats.map((c) => (c === action.from ? action.to.trim() : c)),
        expenses: db.expenses.map((e) => (e.category === action.from ? { ...e, category: action.to.trim() } : e)),
      };
    case "DELETE_EXPENSE_CAT": {
      let rest = db.expenseCats.filter((c) => c !== action.name);
      if (rest.length === 0) rest = ["أخرى"];
      const fallback = rest[0];
      return {
        ...db,
        expenseCats: rest,
        expenses: db.expenses.map((e) => (e.category === action.name ? { ...e, category: fallback } : e)),
      };
    }

    /* ---------- القوائم الديناميكية (إضافة فورية) ---------- */
    case "ADD_CITY": {
      const name = action.name.trim();
      if (!name || db.cities.some((c) => c === name)) return db;
      return { ...db, cities: [...db.cities, name] };
    }
    case "ADD_SPECIALTY": {
      const name = action.name.trim();
      if (!name || db.specialties.some((c) => c === name)) return db;
      return { ...db, specialties: [...db.specialties, name] };
    }
    case "ADD_STAFF_ROLE": {
      const name = action.name.trim();
      if (!name || db.staffRoles.some((c) => c === name)) return db;
      return { ...db, staffRoles: [...db.staffRoles, name] };
    }

    case "RESET":
      return bootstrap();
    default:
      return db;
  }
}

const KEY = "sharafi-dental-v1";

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** تطبيع أي نسخة خام (من localStorage أو من MySQL) إلى بنية DB مكتملة ومضمونة */
export function normalizeDB(raw: Partial<DB> | null | undefined): DB {
  const base = bootstrap();
  const db = (raw ?? {}) as Partial<DB>;
  return {
    patients: arr<Patient>(db.patients),
    doctors: arr<Doctor>(db.doctors).length ? arr<Doctor>(db.doctors) : base.doctors,
    staff: arr<Staff>(db.staff),
    currencies: arr<Currency>(db.currencies).length ? arr<Currency>(db.currencies) : base.currencies,
    defaultCurrency: db.defaultCurrency ?? base.defaultCurrency,
    services: arr<Service>(db.services),
    appointments: arr<Appointment>(db.appointments),
    invoices: arr<Invoice>(db.invoices),
    activity: arr<Activity>(db.activity),
    expenses: arr<Expense>(db.expenses),
    prescriptions: arr<Prescription>(db.prescriptions),
    sessions: arr<ClinicalSession>(db.sessions).map((s) => ({
      ...s,
      summary: s.summary ?? "",
      workItems: s.workItems ?? [],
      stages: s.stages ?? [],
      procedures: arr<SessionProc>(s.procedures).map((pr) => {
        const legacy = pr as SessionProc & { tooth?: number };
        return {
          id: pr.id ?? uid(),
          category: pr.category ?? "علاج",
          name: pr.name ?? pr.detail ?? "إجراء",
          serviceId: pr.serviceId,
          price: typeof pr.price === "number" ? pr.price : 0,
          teeth: Array.isArray(pr.teeth) ? pr.teeth : legacy.tooth ? [legacy.tooth] : [],
          detail: pr.detail,
          canals: pr.canals,
          impression: pr.impression,
          color: pr.color,
          wireNum: pr.wireNum,
          ligature: pr.ligature,
          stageId: pr.stageId,
          note: pr.note,
        };
      }),
    })),
    implants: arr<Implant>(db.implants),
    prosthetics: arr<Prosthetic>(db.prosthetics),
    orthoCases: arr<OrthoCase>(db.orthoCases),
    xrays: arr<XrayRec>(db.xrays),
    followUps: arr<FollowUp>(db.followUps),
    supplies: arr<SupplyItem>(db.supplies),
    supplyMoves: arr<SupplyMove>(db.supplyMoves),
    plans: arr<TreatmentPlan>(db.plans),
    serviceCats: arr<string>(db.serviceCats).length ? arr<string>(db.serviceCats) : base.serviceCats,
    itemCats: arr<string>(db.itemCats).length ? arr<string>(db.itemCats) : base.itemCats,
    expenseCats: arr<string>(db.expenseCats).length ? arr<string>(db.expenseCats) : base.expenseCats,
    cities: arr<string>(db.cities).length ? arr<string>(db.cities) : base.cities,
    specialties: arr<string>(db.specialties).length ? arr<string>(db.specialties) : base.specialties,
    staffRoles: arr<string>(db.staffRoles).length ? arr<string>(db.staffRoles) : base.staffRoles,
    settings: { ...DEFAULT_CLINIC_SETTINGS, ...(db.settings ?? {}) },
    users: (arr<User>(db.users).length ? arr<User>(db.users) : base.users).map((u) =>
      u.role === "secretary" || u.role === "assistant"
        ? { ...u, permissions: [...new Set([...u.permissions, "scope_all_patients", "scope_all_appointments"])] }
        : u
    ),
    nextInv: typeof db.nextInv === "number" ? db.nextInv : base.nextInv,
    savedAt: typeof db.savedAt === "number" ? db.savedAt : 0,
  };
}

/** قراءة الحالة المحلية + طابع آخر حفظ */
function loadLocal(): { db: DB; savedAt: number } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { db: bootstrap(), savedAt: 0 };
    const parsed = JSON.parse(raw) as Partial<DB>;
    return { db: normalizeDB(parsed), savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0 };
  } catch {
    return { db: bootstrap(), savedAt: 0 };
  }
}

export type ConnStatus = "checking" | "online" | "offline";

interface Ctx {
  db: DB;
  dispatch: React.Dispatch<Action>;
  patientById: (id: string) => Patient | undefined;
  serviceById: (id: string) => Service | undefined;
  doctorById: (id: string) => Doctor | undefined;
  patientBalance: (id: string) => number;
  lastVisit: (id: string) => string | undefined;
  conn: ConnStatus;
  syncing: boolean;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, baseDispatch] = useReducer(reducer, undefined as unknown as DB, () => loadLocal().db);
  const [conn, setConn] = useState<ConnStatus>("checking");
  const [syncing, setSyncing] = useState(false);
  const connRef = useRef<ConnStatus>("checking");
  const dbRef = useRef<DB>(db);
  const bootedRef = useRef(false);
  const dirtyRef = useRef(false); // هل توجد تغييرات محلية لم تُدفَع بعد؟
  const wipeRef = useRef(false); // استبدال شامل قادم (RESET/IMPORT)
  const genRef = useRef(0); // جيل المركزية — يرتفع عند الاستبدال الشامل
  connRef.current = conn;
  dbRef.current = db;

  /* الموزّع الذكي: يختم السجلات + يسجّل أحداث المراقبة + يتتبع التغييرات المحلية */
  const dispatch = useCallback((action: Action) => {
    if (action.type !== "MERGE" && action.type !== "SYNCED" && action.type !== "HYDRATE") {
      stampAction(action);
      queueActionEvent(action, dbRef.current);
      dirtyRef.current = true;
      if (action.type === "RESET" || action.type === "IMPORT") wipeRef.current = true;
    }
    baseDispatch(action);
  }, []);

  /* عند الإقلاع: جلب الحالة المدمجة من القاعدة المركزية */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await fetchMergedState();
      if (cancelled) return;
      genRef.current = remote?.gen ?? 0;
      const r = remote?.db as unknown as DB | null;
      if (r && Array.isArray(r.patients)) {
        dispatch({ type: "MERGE", db: r, tombstones: remote?.tombstones ?? [] });
        dirtyRef.current = false; // لا حاجة لإعادة دفع ما جاء من المركز
        setConn("online");
      } else {
        const ok = await ping();
        if (cancelled) return;
        setConn(ok ? "online" : "offline");
        // خادم متصل بقاعدة فارغة → ارفع الحالة المحلية لتأسيس المركز
        if (ok) dirtyRef.current = true;
      }
      bootedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  /* البث اللحظي: استطلاع القاعدة المركزية كل 4 ثوانٍ ودمج أي جديد */
  useEffect(() => {
    const t = setInterval(async () => {
      if (connRef.current !== "online" || !bootedRef.current) return;
      const res = await pollState(dbRef.current.savedAt ?? 0);
      if (!res) return;

      // ارتفع الجيل → استبدال شامل حدث (RESET/IMPORT من جهاز آخر) → حلّ محل المحلية
      if (res.gen > genRef.current) {
        genRef.current = res.gen;
        const remote = await fetchMergedState();
        const r = remote?.db as unknown as DB | null;
        if (r && Array.isArray(r.patients)) {
          dispatch({ type: "HYDRATE", db: r });
          dirtyRef.current = false;
        }
        return;
      }

      if (!res.changed) return;
      const remote = await fetchMergedState();
      const r = remote?.db as unknown as DB | null;
      if (r && Array.isArray(r.patients)) {
        genRef.current = remote?.gen ?? genRef.current;
        dispatch({ type: "MERGE", db: r, tombstones: remote?.tombstones ?? [] });
        dirtyRef.current = false;
      }
    }, 4000);
    return () => clearInterval(t);
  }, [dispatch]);

  /* حفظ محلي دائم + دفع التغييرات المحلية فقط إلى المركز */
  useEffect(() => {
    const stamped = { ...db, savedAt: Date.now() };
    try {
      localStorage.setItem(KEY, JSON.stringify(stamped));
    } catch {
      /* تجاهل */
    }
    if (!bootedRef.current || connRef.current !== "online" || !dirtyRef.current) return;
    setSyncing(true);
    const t = setTimeout(async () => {
      const res = await saveState({ ...db, savedAt: Date.now(), wipe: wipeRef.current });
      setSyncing(false);
      if (res.ok) {
        dirtyRef.current = false;
        wipeRef.current = false;
      }
    }, 700);
    return () => clearTimeout(t);
  }, [db]);

  const value = useMemo<Ctx>(
    () => ({
      db,
      dispatch,
      conn,
      syncing,
      patientById: (id) => db.patients.find((p) => p.id === id),
      serviceById: (id) => db.services.find((s) => s.id === id),
      doctorById: (id) => db.doctors.find((d) => d.id === id),
      patientBalance: (id) =>
        db.invoices.filter((i) => i.patientId === id).reduce((s, i) => s + Math.max(0, invoiceTotal(i) - i.paid), 0),
      lastVisit: (id) => {
        const past = db.appointments
          .filter((a) => a.patientId === id && a.date <= today(0) && a.status !== "cancelled")
          .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
        return past[0]?.date;
      },
    }),
    [db, conn, syncing]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}

/* منسّق المبالغ حسب العملة الافتراضية المختارة */
export function useMoney() {
  const { db } = useStore();
  const cur = db.currencies.find((c) => c.code === db.defaultCurrency) ?? db.currencies[0];
  return useCallback(
    (n: number) => {
      const rate = cur?.rate || 1;
      const v = n / rate;
      const rounded = Math.abs(v) >= 1000 ? Math.round(v) : Math.round(v * 100) / 100;
      return `${rounded.toLocaleString("en-US")} ${cur?.symbol ?? "ر.ي"}`;
    },
    [cur]
  );
}

/* ============================== المصادقة والصلاحيات ============================== */

const AUTH_KEY = "dental-auth-v1";

interface AuthCtx {
  user: User | null;
  isAdmin: boolean;
  isDoctor: boolean;
  login: (username: string, pin: string) => { ok: boolean; error?: string };
  loginById: (id: string, pin: string) => { ok: boolean; error?: string };
  logout: () => void;
  can: (perm: string) => boolean;
  patientScope: Set<string> | null; // null = يرى كل المرضى
  apptScope: string | null; // null = كل المواعيد، وإلا معرّف الطبيب الذي تُقيَّد به الرؤية
  doctorScopeId: string | null; // معرّف الطبيب المرتبط بحساب الطبيب
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { db, dispatch } = useStore();
  const [userId, setUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AUTH_KEY);
    } catch {
      return null;
    }
  });

  const user = useMemo(() => db.users.find((u) => u.id === userId && u.active) ?? null, [db.users, userId]);

  const doLogin = useCallback(
    (u: User, pin: string): { ok: boolean; error?: string } => {
      if (!u.active) return { ok: false, error: "هذا الحساب موقوف — تواصل مع الإدارة." };
      if (u.pin !== pin) return { ok: false, error: "رمز الدخول غير صحيح، حاول مجدداً." };
      setUserId(u.id);
      try {
        localStorage.setItem(AUTH_KEY, u.id);
      } catch {
        /* تجاهل */
      }
      dispatch({ type: "UPDATE_USER", u: { ...u, lastLogin: new Date().toISOString() } });
      return { ok: true };
    },
    [dispatch]
  );

  const value = useMemo<AuthCtx>(() => {
    const isAdmin = user?.role === "admin";
    const isDoctor = user?.role === "doctor";
    const doctorScopeId = isDoctor ? user?.linkId ?? null : null;
    const hasAllPatients = isAdmin || !!user?.permissions.includes("scope_all_patients");
    const hasAllAppts = isAdmin || !!user?.permissions.includes("scope_all_appointments");

    // نطاق المرضى: الطبيب المقيَّد يرى فقط مرضى مواعيده وجلساته
    let patientScope: Set<string> | null = null;
    if (isDoctor && !hasAllPatients) {
      const set = new Set<string>();
      if (doctorScopeId) {
        db.appointments.forEach((a) => {
          if (a.doctorId === doctorScopeId) set.add(a.patientId);
        });
        db.sessions.forEach((s) => {
          if (s.doctorId === doctorScopeId) set.add(s.patientId);
        });
      }
      patientScope = set;
    }

    // نطاق المواعيد: null = الجدول الكامل، وإلا يُعرض جدول الطبيب المرتبط فقط
    const apptScope = isDoctor && !hasAllAppts ? doctorScopeId ?? "∅" : null;

    return {
      user,
      isAdmin,
      isDoctor,
      login: (username, pin) => {
        const u = db.users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
        if (!u) return { ok: false, error: "اسم المستخدم غير موجود." };
        return doLogin(u, pin);
      },
      loginById: (id, pin) => {
        const u = db.users.find((x) => x.id === id);
        if (!u) return { ok: false, error: "المستخدم غير موجود." };
        return doLogin(u, pin);
      },
      logout: () => {
        setUserId(null);
        try {
          localStorage.removeItem(AUTH_KEY);
        } catch {
          /* تجاهل */
        }
      },
      can: (perm) => {
        if (!user) return false;
        if (isAdmin) return true;
        return user.permissions.includes(perm);
      },
      patientScope,
      apptScope,
      doctorScopeId,
    };
  }, [user, db.appointments, db.sessions, db.users, doLogin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
