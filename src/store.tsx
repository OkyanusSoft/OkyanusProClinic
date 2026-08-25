import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";

/* ============================== Types ============================== */

export type ToothStatus = "healthy" | "caries" | "filled" | "root" | "crown" | "missing";
export type ApptStatus = "confirmed" | "waiting" | "inprogress" | "done" | "cancelled";
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
}
export interface Activity {
  id: string;
  text: string;
  time: string;
  kind: "patient" | "appt" | "invoice" | "tooth" | "team";
}
export interface DB {
  patients: Patient[];
  doctors: Doctor[];
  staff: Staff[];
  currencies: Currency[];
  defaultCurrency: string;
  services: Service[];
  appointments: Appointment[];
  invoices: Invoice[];
  activity: Activity[];
  nextInv: number;
}

export const CLINIC_NAME = "عيادة د. عبدالله الشرفي";
export const CLINIC_LATIN = "AL-SHARAFI DENTAL CLINIC";
export const BASE_CURRENCY = "YER";

/* ============================== Meta ============================== */

export const TOOTH_META: Record<ToothStatus, { label: string; fill: string; stroke: string; dash?: boolean }> = {
  healthy: { label: "سليم", fill: "#ffffff", stroke: "#9db8b1" },
  caries: { label: "تسوس", fill: "#f6d7d0", stroke: "#d9503a" },
  filled: { label: "حشوة", fill: "#cfeae5", stroke: "#0d8f83" },
  root: { label: "علاج عصب", fill: "#f7e5c4", stroke: "#e2952b" },
  crown: { label: "تاج / زراعة", fill: "#d5e6f5", stroke: "#3a86c4" },
  missing: { label: "مفقود", fill: "#eef2f0", stroke: "#a7bab4", dash: true },
};

export const APPT_META: Record<ApptStatus, { label: string; cls: string; dot: string }> = {
  confirmed: { label: "مؤكد", cls: "bg-sky-soft text-sky", dot: "#3a86c4" },
  waiting: { label: "في الانتظار", cls: "bg-amber-soft text-[#a06410]", dot: "#e2952b" },
  inprogress: { label: "قيد العلاج", cls: "bg-jade-soft text-jade-deep", dot: "#0d8f83" },
  done: { label: "مكتمل", cls: "bg-mint-soft text-[#1d6b47]", dot: "#2c9c69" },
  cancelled: { label: "ملغي", cls: "bg-coral-soft text-coral", dot: "#d9503a" },
};

export const INV_META: Record<InvoiceStatus, { label: string; cls: string }> = {
  paid: { label: "مدفوعة", cls: "bg-mint-soft text-[#1d6b47]" },
  partial: { label: "جزئية", cls: "bg-amber-soft text-[#a06410]" },
  unpaid: { label: "غير مدفوعة", cls: "bg-coral-soft text-coral" },
};

export const YEMEN_CITIES = ["صنعاء", "عدن", "تعز", "الحديدة", "إب", "المكلا", "ذمار", "سيئون", "مأرب", "عمران", "لحج", "الضالع"];

export const STAFF_ROLES = ["مساعد أسنان", "استقبال وعلاقات مرضى", "فني تعقيم", "فني مختبر أسنان", "محاسب", "ممرض"];

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
const AR = "ar-EG-u-nu-latn";
export const fmtDate = (ds: string) =>
  new Intl.DateTimeFormat(AR, { day: "numeric", month: "long" }).format(new Date(ds + "T12:00:00"));
export const fmtDateFull = (ds: string) =>
  new Intl.DateTimeFormat(AR, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(ds + "T12:00:00")
  );
export const dayName = (ds: string) =>
  new Intl.DateTimeFormat(AR, { weekday: "short" }).format(new Date(ds + "T12:00:00"));
export const monthName = () => new Intl.DateTimeFormat(AR, { month: "long", year: "numeric" }).format(new Date());
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

export const invoiceTotal = (inv: Invoice) => inv.items.reduce((s, i) => s + i.qty * i.price, 0);
export const invoiceStatus = (inv: Invoice): InvoiceStatus => {
  const t = invoiceTotal(inv);
  if (inv.paid >= t) return "paid";
  if (inv.paid > 0) return "partial";
  return "unpaid";
};

/* ============================== Seed ============================== */

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
    { id: "p9", name: "ريام الحميري", phone: "773334455", age: 31, gender: "f", blood: "O+", allergies: "لا يوجد", city: "لحج", notes: "", joined: today(-60), teeth: { 46: "caries", 47: "caries" } },
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

  return { patients, doctors, staff, currencies, defaultCurrency: "YER", services, appointments, invoices, activity, nextInv: 1043 };
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
    case "SET_APPT_STATUS":
      return { ...db, appointments: db.appointments.map((a) => (a.id === action.id ? { ...a, status: action.status } : a)) };
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
    case "RESET":
      return seed();
    default:
      return db;
  }
}

const KEY = "sharafi-dental-v1";

function load(): DB {
  let db: DB;
  try {
    const raw = localStorage.getItem(KEY);
    db = raw ? (JSON.parse(raw) as DB) : seed();
    if (!db.patients?.length || !db.currencies?.length) db = seed();
  } catch {
    db = seed();
  }
  // نضمن دائماً وجود مواعيد لليوم حتى تبقى اللوحة حيّة
  if (!db.appointments.some((a) => a.date === today(0) && a.status !== "cancelled")) {
    db = {
      ...db,
      appointments: [
        ...db.appointments,
        { id: uid(), patientId: "p4", serviceId: "s1", doctorId: "d1", date: today(0), time: "09:30", status: "confirmed" },
        { id: uid(), patientId: "p6", serviceId: "s11", doctorId: "d2", date: today(0), time: "12:00", status: "waiting" },
        { id: uid(), patientId: "p9", serviceId: "s4", doctorId: "d1", date: today(0), time: "16:30", status: "confirmed" },
        { id: uid(), patientId: "p10", serviceId: "s2", doctorId: "d2", date: today(0), time: "18:00", status: "confirmed" },
      ],
    };
  }
  return db;
}

interface Ctx {
  db: DB;
  dispatch: React.Dispatch<Action>;
  patientById: (id: string) => Patient | undefined;
  serviceById: (id: string) => Service | undefined;
  doctorById: (id: string) => Doctor | undefined;
  patientBalance: (id: string) => number;
  lastVisit: (id: string) => string | undefined;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, dispatch] = useReducer(reducer, undefined as unknown as DB, load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* تجاهل */
    }
  }, [db]);

  const value = useMemo<Ctx>(
    () => ({
      db,
      dispatch,
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
    [db]
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
