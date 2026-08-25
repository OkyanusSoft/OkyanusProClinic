import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

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
  color: string;
}
export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  color: string;
  active: boolean;
}
export interface Appointment {
  id: string;
  patientId: string;
  serviceId: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
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
  time: string; // ISO
  kind: "patient" | "appt" | "invoice" | "tooth";
}
export interface DB {
  patients: Patient[];
  doctors: Doctor[];
  services: Service[];
  appointments: Appointment[];
  invoices: Invoice[];
  activity: Activity[];
  nextInv: number;
}

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

/* ============================== Helpers ============================== */

export const uid = () => Math.random().toString(36).slice(2, 10);
const pad = (n: number) => String(n).padStart(2, "0");
export const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return dstr(d);
};
export const fmtMoney = (n: number) => `${Math.round(n).toLocaleString("en-US")} ر.س`;
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
    { id: "d1", name: "د. أحمد الشمري", specialty: "طب أسنان عام وترميم", color: "#0d8f83" },
    { id: "d2", name: "د. سارة العتيبي", specialty: "تقويم الأسنان", color: "#3a86c4" },
    { id: "d3", name: "د. خالد المطيري", specialty: "جراحة الفم", color: "#e2952b" },
  ];
  const services: Service[] = [
    { id: "s1", name: "كشف واستشارة", category: "تشخيص", price: 100, duration: 30, color: "#0d8f83", active: true },
    { id: "s2", name: "تنظيف وتلميع", category: "وقاية", price: 150, duration: 45, color: "#2c9c69", active: true },
    { id: "s3", name: "أشعة بانورامية", category: "تشخيص", price: 200, duration: 20, color: "#3a86c4", active: true },
    { id: "s4", name: "حشوة تجميلية", category: "علاج", price: 250, duration: 45, color: "#0a6158", active: true },
    { id: "s5", name: "علاج عصب", category: "علاج", price: 600, duration: 90, color: "#e2952b", active: true },
    { id: "s6", name: "خلع بسيط", category: "جراحة", price: 150, duration: 30, color: "#d9503a", active: true },
    { id: "s7", name: "خلع ضرس عقل", category: "جراحة", price: 450, duration: 60, color: "#b23a48", active: true },
    { id: "s8", name: "تبييض أسنان", category: "تجميل", price: 400, duration: 60, color: "#3a86c4", active: true },
    { id: "s9", name: "تاج زيركون", category: "تعويضات", price: 900, duration: 60, color: "#e2952b", active: true },
    { id: "s10", name: "زراعة سن", category: "تعويضات", price: 2500, duration: 90, color: "#0a6158", active: true },
    { id: "s11", name: "متابعة تقويم", category: "تقويم", price: 300, duration: 30, color: "#3a86c4", active: true },
    { id: "s12", name: "فلورايد وقائي", category: "وقاية", price: 120, duration: 20, color: "#2c9c69", active: true },
  ];
  const patients: Patient[] = [
    { id: "p1", name: "محمد العبدالله", phone: "0501234567", age: 34, gender: "m", blood: "O+", allergies: "لا يوجد", city: "الرياض", notes: "يفضل المواعيد المسائية", joined: today(-160), teeth: { 16: "filled", 26: "caries", 36: "root", 46: "crown", 18: "missing" } },
    { id: "p2", name: "نورة القحطاني", phone: "0559876543", age: 28, gender: "f", blood: "A+", allergies: "لا يوجد", city: "جدة", notes: "", joined: today(-92), teeth: { 11: "filled", 21: "filled", 31: "caries" } },
    { id: "p3", name: "فهد الدوسري", phone: "0533334444", age: 41, gender: "m", blood: "B+", allergies: "حساسية بنسلين", city: "الدمام", notes: "ارتفاع ضغط — مراجعة قبل الجراحة", joined: today(-210), teeth: { 17: "root", 27: "crown", 37: "caries", 38: "missing", 48: "missing" } },
    { id: "p4", name: "ريم السبيعي", phone: "0567778888", age: 22, gender: "f", blood: "O-", allergies: "لا يوجد", city: "الرياض", notes: "", joined: today(-5), teeth: { 13: "caries" } },
    { id: "p5", name: "عبدالله الحربي", phone: "0544445555", age: 55, gender: "m", blood: "AB+", allergies: "أسبرين", city: "مكة المكرمة", notes: "سكري نوع ثانٍ", joined: today(-340), teeth: { 14: "crown", 15: "missing", 16: "crown", 24: "crown", 26: "root", 35: "missing", 36: "crown", 46: "crown" } },
    { id: "p6", name: "لمى الشهري", phone: "0512223333", age: 19, gender: "f", blood: "A-", allergies: "لا يوجد", city: "أبها", notes: "حالة تقويم نشطة", joined: today(-45), teeth: {} },
    { id: "p7", name: "سعود الغامدي", phone: "0555556666", age: 37, gender: "m", blood: "O+", allergies: "لا يوجد", city: "الرياض", notes: "", joined: today(-3), teeth: { 25: "filled", 34: "caries" } },
    { id: "p8", name: "هند الزهراني", phone: "0568889999", age: 45, gender: "f", blood: "B-", allergies: "لاتكس", city: "المدينة المنورة", notes: "", joined: today(-120), teeth: { 11: "crown", 21: "crown", 22: "filled" } },
    { id: "p9", name: "تركي العنزي", phone: "0533221100", age: 31, gender: "m", blood: "O+", allergies: "لا يوجد", city: "تبوك", notes: "", joined: today(-60), teeth: { 46: "caries", 47: "caries" } },
    { id: "p10", name: "جواهر المالكي", phone: "0509998877", age: 26, gender: "f", blood: "A+", allergies: "لا يوجد", city: "الخبر", notes: "", joined: today(-30), teeth: { 38: "caries", 18: "filled" } },
  ];

  const A = (patientId: string, serviceId: string, doctorId: string, date: string, time: string, status: ApptStatus): Appointment =>
    ({ id: uid(), patientId, serviceId, doctorId, date, time, status });

  const appointments: Appointment[] = [
    // اليوم
    A("p2", "s2", "d1", today(0), "09:00", "done"),
    A("p1", "s4", "d1", today(0), "10:00", "inprogress"),
    A("p4", "s1", "d1", today(0), "11:30", "confirmed"),
    A("p8", "s9", "d1", today(0), "13:00", "confirmed"),
    A("p6", "s11", "d2", today(0), "15:00", "waiting"),
    A("p9", "s5", "d1", today(0), "17:30", "confirmed"),
    A("p10", "s2", "d2", today(0), "19:00", "cancelled"),
    // غداً وما بعده
    A("p3", "s7", "d3", today(1), "10:30", "confirmed"),
    A("p7", "s11", "d2", today(1), "12:00", "confirmed"),
    A("p5", "s1", "d1", today(1), "16:00", "confirmed"),
    A("p2", "s8", "d1", today(2), "11:00", "confirmed"),
    A("p9", "s4", "d1", today(2), "18:00", "confirmed"),
    A("p10", "s12", "d2", today(3), "10:00", "confirmed"),
    // الأيام السابقة
    A("p5", "s9", "d1", today(-1), "09:30", "done"),
    A("p7", "s4", "d1", today(-1), "11:00", "done"),
    A("p2", "s1", "d1", today(-1), "13:30", "done"),
    A("p8", "s2", "d2", today(-1), "16:00", "cancelled"),
    A("p1", "s1", "d1", today(-2), "10:00", "done"),
    A("p6", "s11", "d2", today(-2), "12:30", "done"),
    A("p3", "s5", "d1", today(-2), "17:00", "done"),
    A("p10", "s1", "d1", today(-3), "09:00", "done"),
    A("p4", "s3", "d1", today(-3), "14:00", "done"),
    A("p9", "s1", "d1", today(-4), "10:30", "done"),
    A("p8", "s9", "d1", today(-4), "12:00", "done"),
    A("p7", "s2", "d2", today(-4), "15:30", "cancelled"),
    A("p2", "s12", "d2", today(-4), "18:00", "done"),
    A("p1", "s2", "d1", today(-5), "11:00", "done"),
    A("p5", "s1", "d1", today(-5), "13:00", "done"),
    A("p6", "s3", "d1", today(-6), "10:00", "done"),
    A("p3", "s1", "d1", today(-6), "12:30", "done"),
    A("p10", "s4", "d1", today(-6), "17:30", "done"),
  ];

  const I = (num: number, patientId: string, date: string, paid: number, items: InvoiceItem[]): Invoice =>
    ({ id: uid(), number: `INV-${num}`, patientId, date, items, paid });
  const invoices: Invoice[] = [
    I(1042, "p1", today(-1), 350, [{ serviceId: "s4", qty: 1, price: 250 }, { serviceId: "s1", qty: 1, price: 100 }]),
    I(1041, "p8", today(-2), 900, [{ serviceId: "s9", qty: 2, price: 900 }]),
    I(1040, "p5", today(-3), 0, [{ serviceId: "s1", qty: 1, price: 100 }]),
    I(1039, "p2", today(-4), 150, [{ serviceId: "s2", qty: 1, price: 150 }]),
    I(1038, "p3", today(-6), 700, [{ serviceId: "s5", qty: 1, price: 600 }, { serviceId: "s1", qty: 1, price: 100 }]),
    I(1037, "p10", today(-8), 270, [{ serviceId: "s2", qty: 1, price: 150 }, { serviceId: "s12", qty: 1, price: 120 }]),
    I(1036, "p7", today(-12), 100, [{ serviceId: "s4", qty: 1, price: 250 }]),
    I(1035, "p6", today(-15), 300, [{ serviceId: "s11", qty: 1, price: 300 }]),
    I(1034, "p9", today(-20), 300, [{ serviceId: "s1", qty: 1, price: 100 }, { serviceId: "s3", qty: 1, price: 200 }]),
    I(1033, "p4", today(-24), 100, [{ serviceId: "s1", qty: 1, price: 100 }]),
  ];

  const ago = (mins: number) => new Date(Date.now() - mins * 60000).toISOString();
  const activity: Activity[] = [
    { id: uid(), text: "بدأ علاج حشوة تجميلية للمريض محمد العبدالله", time: ago(12), kind: "appt" },
    { id: uid(), text: "تم تحصيل فاتورة INV-1042 بقيمة 350 ر.س", time: ago(95), kind: "invoice" },
    { id: uid(), text: "انضم المريض سعود الغامدي إلى سجل العيادة", time: ago(180), kind: "patient" },
    { id: uid(), text: "تحديث حالة السن 37 لفهد الدوسري — تسوس", time: ago(300), kind: "tooth" },
    { id: uid(), text: "حجز موعد تقويم للمريضة لمى الشهري غداً 12:00", time: ago(420), kind: "appt" },
  ];

  return { patients, doctors, services, appointments, invoices, activity, nextInv: 1043 };
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
    case "RESET":
      return seed();
    default:
      return db;
  }
}

const KEY = "lulua-dental-v1";

function load(): DB {
  let db: DB;
  try {
    const raw = localStorage.getItem(KEY);
    db = raw ? (JSON.parse(raw) as DB) : seed();
    if (!db.patients?.length) db = seed();
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
