import React, { useEffect, useMemo, useState } from "react";
import {
  APPT_META,
  fmtDate,
  FU_META,
  TOOTH_META,
  invoiceStatus,
  invoiceTotal,
  INV_META,
  today,
  uid,
  useAuth,
  useMoney,
  useStore,
  YEMEN_CITIES,
  type FollowUp,
  type Patient,
} from "../store";
import { IconCalendar, IconCalendarPlus, IconChevronDown, IconClock, IconIdCard, IconPencil, IconPhone, IconPlus, IconPrinter, IconSearch, IconSpark, IconUserPlus, IconUsers, IconAlert } from "../icons";
import { Avatar, Badge, EmptyState, Field, Modal, TArea, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";
import DentalChart from "../components/DentalChart";
import { CardPrintModal, PatientCardSheet, PatientPrint, PrintModal, RxPrint } from "../components/PrintSheet";
import { FollowUpModal } from "./Appointments";
import type { Prescription, RxItem } from "../store";

/* فرق الأيام بين تاريخ واليوم */
const dayDiff = (d: string) =>
  Math.round((new Date(d + "T12:00:00").getTime() - new Date(today(0) + "T12:00:00").getTime()) / 86400000);
const dueLabel = (d: string) => {
  const diff = dayDiff(d);
  if (diff < 0) return `متأخرة ${-diff} ${-diff === 1 ? "يوم" : "أيام"}`;
  if (diff === 0) return "مستحقة اليوم";
  if (diff === 1) return "غداً";
  return `بعد ${diff} أيام`;
};

/* ============================ صفحة المرضى ============================ */

interface PageProps {
  addSignal: number;
  onOpenPatient: (id: string) => void;
  onBook: (patientId: string) => void;
}

export default function PatientsPage({ addSignal, onOpenPatient, onBook }: PageProps) {
  const { db, dispatch, patientBalance, lastVisit } = useStore();
  const { patientScope } = useAuth();
  const money = useMoney();
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [printId, setPrintId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  // مرضى أُضيفوا للتو — يُظهرون فورًا لمن أضافهم حتى لو كانوا خارج نطاق رؤيته المعتاد
  const [justAdded, setJustAdded] = useState<string[]>([]);

  useEffect(() => {
    if (addSignal > 0) setShowAdd(true);
  }, [addSignal]);

  const scopedPatients = useMemo(
    () =>
      patientScope
        ? db.patients.filter((p) => patientScope.has(p.id) || justAdded.includes(p.id))
        : db.patients,
    [db.patients, patientScope, justAdded]
  );

  const list = useMemo(() => {
    let arr = [...scopedPatients].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    if (q.trim()) arr = arr.filter((p) => p.name.includes(q.trim()) || p.phone.includes(q.trim()));
    if (filter === "balance") arr = arr.filter((p) => patientBalance(p.id) > 0);
    if (filter === "new") arr = arr.filter((p) => p.joined >= today(-30));
    if (filter === "caries") arr = arr.filter((p) => Object.values(p.teeth).includes("caries"));
    return arr;
  }, [scopedPatients, q, filter, patientBalance]);

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">سجل المرضى</h1>
          <p className="text-sm text-soft mt-1">
            {scopedPatients.length} مريضاً {patientScope ? "في نطاقك" : "مسجلاً"} · {scopedPatients.filter((p) => Object.values(p.teeth).includes("caries")).length} لديهم تسوس نشط
          </p>
          {patientScope && (
            <span className="chip bg-amber-soft text-[#a06410] mt-2 !py-1.5">
              <IconAlert className="w-3.5 h-3.5" />
              رؤية مقيّدة — مرضاك فقط
            </span>
          )}
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <IconUserPlus className="w-4.5 h-4.5" />
          إضافة مريض
        </button>
      </div>

      {/* أدوات البحث */}
      <div className="card p-3.5 anim-rise flex flex-wrap items-center gap-3" style={{ animationDelay: "80ms" }}>
        <div className="relative flex-1 min-w-56">
          <span className="absolute inset-y-0 start-3 flex items-center text-soft pointer-events-none">
            <IconSearch className="w-4.5 h-4.5" />
          </span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو رقم الجوال…" className="input !ps-10" />
        </div>
        <div className="flex items-center gap-2">
          {(
            [
              ["all", "الكل"],
              ["balance", "عليه مستحقات"],
              ["new", "جدد هذا الشهر"],
              ["caries", "لديه تسوس"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`h-10 px-3.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                filter === k ? "bg-pine text-white border-pine shadow-sm" : "bg-white text-soft border-line hover:border-jade/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* الجدول */}
      <div className="card overflow-hidden anim-rise" style={{ animationDelay: "140ms" }}>
        {list.length === 0 ? (
          <EmptyState icon={<IconUsers className="w-6 h-6" />} title="لا نتائج مطابقة" desc="جرّب تعديل البحث أو الفلاتر." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-mist/70 border-b border-line">
                <tr>
                  <th className="th">المريض</th>
                  <th className="th">العمر</th>
                  <th className="th">المدينة</th>
                  <th className="th">آخر زيارة</th>
                  <th className="th">مستحقات</th>
                  <th className="th">حالة الفم</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((p, i) => {
                  const bal = patientBalance(p.id);
                  const caries = Object.values(p.teeth).filter((s) => s === "caries").length;
                  const treated = Object.values(p.teeth).filter((s) => s === "filled" || s === "root" || s === "crown").length;
                  const lv = lastVisit(p.id);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => onOpenPatient(p.id)}
                      className="border-b border-line/60 last:border-0 hover:bg-jade-soft/40 cursor-pointer transition-colors anim-fade"
                      style={{ animationDelay: `${i * 35}ms` }}
                    >
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} />
                          <div>
                            <p className="font-bold text-ink">{p.name}</p>
                            <p className="text-[11px] text-soft mt-0.5" dir="ltr">{p.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td text-soft">{p.age} سنة</td>
                      <td className="td text-soft">{p.city || "—"}</td>
                      <td className="td text-soft">{lv ? fmtDate(lv) : "لم يزر بعد"}</td>
                      <td className="td">
                        {bal > 0 ? <span className="font-display font-bold text-coral">{money(bal)}</span> : <span className="text-mint font-bold text-xs">مسدَّد</span>}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1.5">
                          {caries > 0 && <span className="chip bg-coral-soft text-coral">{caries} تسوس</span>}
                          {treated > 0 && <span className="chip bg-jade-soft text-jade-deep">{treated} معالَج</span>}
                          {caries === 0 && treated === 0 && <span className="chip bg-mint-soft text-[#1d6b47]">سليم</span>}
                        </div>
                      </td>
                      <td className="td" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setCardId(p.id)}
                            className="icon-btn !w-8 !h-8 hover:!bg-jade-soft"
                            aria-label="طباعة كرت المريض"
                            title="كرت المريض (بطاقة تعريف)"
                          >
                            <IconIdCard className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPrintId(p.id)}
                            className="icon-btn !w-8 !h-8"
                            aria-label="طباعة ملف المريض"
                            title="طباعة الملف الطبي (A4)"
                          >
                            <IconPrinter className="w-4 h-4" />
                          </button>
                          <TwoStepDelete
                            onConfirm={() => {
                              dispatch({ type: "DELETE_PATIENT", id: p.id });
                              push("info", "تم حذف المريض", `أُزيل ${p.name} مع مواعيده وفواتيره.`);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddPatientModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={(p) => {
          setShowAdd(false);
          setJustAdded((prev) => [...prev, p.id]);
          push("success", "تمت إضافة المريض", `${p.name} أُضيف إلى السجل بنجاح.`);
          onOpenPatient(p.id);
        }}
        onBook={onBook}
        dispatch={dispatch}
      />
      {printId && (
        <PrintModal open onClose={() => setPrintId(null)} title="طباعة الملف الطبي للمريض">
          <PatientPrint patientId={printId} />
        </PrintModal>
      )}
      {cardId && (() => {
        const cp = db.patients.find((x) => x.id === cardId);
        return cp ? (
          <CardPrintModal open onClose={() => setCardId(null)} title={`كرت المريض — ${cp.name}`} render={(count) => <PatientCardSheet p={cp} count={count} />} />
        ) : null;
      })()}
    </div>
  );
}

/* ============================ نافذة إضافة مريض ============================ */

function AddPatientModal({
  open,
  onClose,
  onSaved,
  onBook,
  dispatch,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (p: Patient) => void;
  onBook: (patientId: string) => void;
  dispatch: React.Dispatch<any>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"m" | "f">("m");
  const [blood, setBlood] = useState("O+");
  const [city, setCity] = useState("");
  const [allergies, setAllergies] = useState("لا يوجد");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setName(""); setPhone(""); setAge(""); setGender("m"); setBlood("O+"); setCity(""); setAllergies("لا يوجد"); setNotes(""); setErr("");
    }
  }, [open]);

  const save = () => {
    if (name.trim().length < 3) return setErr("أدخل الاسم الثلاثي على الأقل.");
    const cleanPhone = phone.replace(/[\s\-().]/g, "");
    if (!/^7\d{8,14}$/.test(cleanPhone)) return setErr("رقم الجوال يجب أن يبدأ بـ 7 ويتكون من 9 أرقام على الأقل (مثل 771234567).");
    const p: Patient = {
      id: uid(),
      name: name.trim(),
      phone: cleanPhone,
      age: Number(age) || 25,
      gender,
      blood,
      allergies: allergies.trim() || "لا يوجد",
      city: city.trim(),
      notes: notes.trim(),
      joined: today(0),
      teeth: {},
    };
    dispatch({ type: "ADD_PATIENT", p });
    onSaved(p);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="مريض جديد"
      subtitle="أدخل البيانات الأساسية لفتح ملف في العيادة"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>حفظ الملف</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="الاسم الكامل *">
            <TInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: وائل عبدالله الشرفي" />
          </Field>
        </div>
        <Field label="رقم الجوال *">
          <TInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="77xxxxxxx" dir="ltr" className="!text-start" />
        </Field>
        <Field label="العمر">
          <TInput type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="30" />
        </Field>
        <Field label="الجنس">
          <TSelect value={gender} onChange={(e) => setGender(e.target.value as "m" | "f")}>
            <option value="m">ذكر</option>
            <option value="f">أنثى</option>
          </TSelect>
        </Field>
        <Field label="فصيلة الدم">
          <TSelect value={blood} onChange={(e) => setBlood(e.target.value)}>
            {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </TSelect>
        </Field>
        <div className="col-span-2">
          <Field label="المدينة">
            <TInput list="yemen-cities" value={city} onChange={(e) => setCity(e.target.value)} placeholder="صنعاء" />
            <datalist id="yemen-cities">
              {YEMEN_CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="الحساسية الدوائية" hint="تظهر كتنبيه في ملف المريض">
            <TInput value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="لا يوجد" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="ملاحظات طبية">
            <TArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أمراض مزمنة، أدوية مستمرة…" />
          </Field>
        </div>
      </div>
      {err && (
        <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>
      )}
    </Modal>
  );
}

/* ============================ درج ملف المريض ============================ */

export function PatientDrawer({
  id,
  onClose,
  onBook,
}: {
  id: string | null;
  onClose: () => void;
  onBook: (patientId: string) => void;
}) {
  const { db, dispatch, patientById, serviceById, doctorById, patientBalance, lastVisit } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const p = id ? patientById(id) : undefined;
  const [showRx, setShowRx] = useState(false);
  const [showFu, setShowFu] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [printRx, setPrintRx] = useState<Prescription | null>(null);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, onClose]);

  if (!p) return null;

  const visits = db.appointments
    .filter((a) => a.patientId === p.id)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const invoices = db.invoices.filter((i) => i.patientId === p.id);
  const rxs = db.prescriptions.filter((r) => r.patientId === p.id);
  const fus = db.followUps
    .filter((f) => f.patientId === p.id)
    .sort((a, b) => (a.status === b.status ? a.dueDate.localeCompare(b.dueDate) : a.status === "pending" ? -1 : 1));

  /* سجل الأعمال: جلسات العلاج المكتملة (غنية) + الزيارات بدون جلسة */
  const workLog = useMemo(() => {
    const sess = db.sessions.filter((s) => s.patientId === p.id && s.status === "done");
    const sessAppts = new Set(sess.map((s) => s.apptId).filter(Boolean));
    const plain = visits.filter((a) => a.status === "done" && !sessAppts.has(a.id));
    return [
      ...sess.map((s) => ({ kind: "session" as const, id: s.id, date: s.date, sort: s.endedAt ?? s.startedAt, s })),
      ...plain.map((a) => ({ kind: "visit" as const, id: a.id, date: a.date, sort: a.date + "T" + a.time + ":00", a })),
    ].sort((x, y) => y.sort.localeCompare(x.sort));
  }, [db.sessions, visits, p.id]);

  const fuChip = (fuId?: string) => {
    const fu = fuId ? db.followUps.find((f) => f.id === fuId) : undefined;
    if (!fu) return null;
    const overdue = fu.status === "pending" && fu.dueDate < today(0);
    const cls =
      fu.status === "done"
        ? "bg-mint-soft text-[#1d6b47]"
        : fu.status === "booked"
        ? "bg-sky-soft text-sky"
        : overdue
        ? "bg-coral-soft text-coral"
        : "bg-amber-soft text-[#a06410]";
    const label =
      fu.status === "done"
        ? "عودة مكتملة"
        : fu.status === "booked"
        ? `عودة محجوزة — ${fmtDate(fu.dueDate)}`
        : overdue
        ? `عودة متأخرة — ${fmtDate(fu.dueDate)}`
        : `عودة مقررة — ${fmtDate(fu.dueDate)}`;
    return (
      <span className={`chip ${cls}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {label}
      </span>
    );
  };
  const nextFu = fus.find((f) => f.status === "pending");
  const bal = patientBalance(p.id);
  const hasAllergy = p.allergies && p.allergies !== "لا يوجد";

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-pine/45 anim-overlay" onClick={onClose} />
      <aside className="anim-drawer absolute inset-y-0 end-0 w-full max-w-2xl bg-mist shadow-2xl flex flex-col">
        {/* الترويسة */}
        <div className="bg-pine sidebar-texture text-white px-6 pt-6 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <Avatar name={p.name} size="w-14 h-14 text-lg" />
              <div>
                <h2 className="font-display font-bold text-2xl leading-tight">{p.name}</h2>
                <p className="text-white/60 text-xs mt-1 flex items-center gap-1.5" dir="ltr">
                  <IconPhone className="w-3.5 h-3.5" />
                  {p.phone}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="icon-btn !text-white/70 hover:!bg-white/10 hover:!text-white" aria-label="إغلاق">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="chip bg-white/10 text-white">{p.age} سنة</span>
            <span className="chip bg-white/10 text-white">{p.gender === "m" ? "ذكر" : "أنثى"}</span>
            <span className="chip bg-white/10 text-white">دم {p.blood}</span>
            {p.city && <span className="chip bg-white/10 text-white">{p.city}</span>}
            <span className="chip bg-white/10 text-white/80">انضم {fmtDate(p.joined)}</span>
          </div>
          {hasAllergy && (
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber/15 border border-amber/30 px-3 py-2.5 text-xs font-bold text-amber">
              <IconAlert className="w-4 h-4 shrink-0" />
              تنبيه: حساسية من {p.allergies}
            </p>
          )}
        </div>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card p-4 text-center">
              <p className="text-[11px] font-bold text-soft">المستحقات</p>
              <p className={`stat-num text-xl mt-1 ${bal > 0 ? "text-coral" : "text-mint"}`}>{bal > 0 ? money(bal) : "لا يوجد"}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-[11px] font-bold text-soft">آخر زيارة</p>
              <p className="stat-num text-xl mt-1 text-ink">{lastVisit(p.id) ? fmtDate(lastVisit(p.id)!) : "—"}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-[11px] font-bold text-soft">الزيارات</p>
              <p className="stat-num text-xl mt-1 text-ink">{visits.filter((v) => v.status !== "cancelled").length}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-[11px] font-bold text-soft">العودة القادمة</p>
              {nextFu ? (
                <>
                  <p className={`stat-num text-xl mt-1 ${dayDiff(nextFu.dueDate) < 0 ? "text-coral" : "text-jade-deep"}`}>{fmtDate(nextFu.dueDate)}</p>
                  <p className="text-[9px] font-bold text-soft mt-0.5 truncate">{dueLabel(nextFu.dueDate)}</p>
                </>
              ) : (
                <p className="stat-num text-xl mt-1 text-soft/50">—</p>
              )}
            </div>
          </div>

          <section className="card p-5">
            <h3 className="font-display font-bold text-lg text-ink mb-4">خريطة الأسنان <span className="text-xs font-body font-medium text-soft">(ترقيم FDI)</span></h3>
            <DentalChart
              teeth={p.teeth}
              onSet={(tooth, status) => {
                dispatch({ type: "SET_TOOTH", patientId: p.id, tooth, status });
                push("success", `تم تحديث السن ${tooth}`, status === "healthy" ? "عُدِّلت الحالة إلى سليم." : undefined);
              }}
            />
          </section>

          {/* الروشتات الإلكترونية */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
              <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
                <IconSpark className="w-5 h-5 text-jade-deep" />
                الروشتات الإلكترونية
              </h3>
              <button onClick={() => setShowRx(true)} className="text-[11px] font-bold text-jade-deep bg-jade-soft hover:bg-jade hover:text-white rounded-lg px-3 py-2 cursor-pointer transition-colors inline-flex items-center gap-1.5">
                <IconPlus className="w-3.5 h-3.5" />
                روشتة جديدة
              </button>
            </div>
            {rxs.length === 0 ? (
              <EmptyState icon={<IconSpark className="w-6 h-6" />} title="لا روشتات لهذا المريض" desc="أضف وصفة طبية إلكترونية قابلة للطباعة." />
            ) : (
              <ul className="divide-y divide-line/60">
                {rxs.map((rx) => (
                  <li key={rx.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="stat-num text-sm text-jade-deep w-24 shrink-0">{fmtDate(rx.date)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink truncate">
                          {rx.items.map((it) => it.name.split(" ")[0]).join(" · ")}
                        </p>
                        <p className="text-[11px] text-soft mt-0.5">
                          {doctorById(rx.doctorId)?.name} · {rx.items.length} {rx.items.length === 1 ? "دواء" : "أدوية"}
                        </p>
                      </div>
                      <button onClick={() => setPrintRx(rx)} className="icon-btn !w-8 !h-8" aria-label="طباعة الروشتة" title="طباعة">
                        <IconPrinter className="w-4 h-4" />
                      </button>
                      <TwoStepDelete
                        label=""
                        onConfirm={() => {
                          dispatch({ type: "DELETE_PRESCRIPTION", id: rx.id });
                          push("warn", "حُذفت الروشتة", fmtDate(rx.date));
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* العودات المقررة */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
              <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
                <IconCalendarPlus className="w-5 h-5 text-jade-deep" />
                العودات المقررة
              </h3>
              <button onClick={() => setShowFu(true)} className="text-[11px] font-bold text-jade-deep bg-jade-soft hover:bg-jade hover:text-white rounded-lg px-3 py-2 cursor-pointer transition-colors inline-flex items-center gap-1.5">
                <IconPlus className="w-3.5 h-3.5" />
                جدولة عودة
              </button>
            </div>
            {fus.length === 0 ? (
              <EmptyState icon={<IconCalendar className="w-6 h-6" />} title="لا عودات مقررة" desc="جدولة عودة تظهر في تنبيهات الفريق عند استحقاقها." />
            ) : (
              <ul className="divide-y divide-line/60">
                {fus.map((f) => {
                  const d = db.doctors.find((x) => x.id === f.doctorId);
                  const late = f.status === "pending" && dayDiff(f.dueDate) < 0;
                  return (
                    <li key={f.id} className={`flex items-center gap-3 px-5 py-3 ${late ? "bg-coral-soft/25" : ""}`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${late ? "bg-coral" : ""}`} style={late ? undefined : { background: FU_META[f.status].dot }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink truncate">{f.reason}</p>
                        <p className="text-[11px] text-soft mt-0.5">
                          {fmtDate(f.dueDate)} · {d?.name}
                        </p>
                      </div>
                      <span className={`chip ${late ? "bg-coral-soft text-coral" : FU_META[f.status].cls}`}>
                        {f.status === "pending" ? dueLabel(f.dueDate) : FU_META[f.status].label}
                      </span>
                      <TwoStepDelete
                        label=""
                        onConfirm={() => {
                          dispatch({ type: "DELETE_FOLLOWUP", id: f.id });
                          push("warn", "حُذفت العودة", f.reason);
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
              <h3 className="font-display font-bold text-lg text-ink">سجل الأعمال والمتابعة</h3>
              <span className="chip bg-mist text-soft stat-num">{workLog.length}</span>
            </div>
            {workLog.length === 0 ? (
              <EmptyState icon={<IconCalendarPlus className="w-6 h-6" />} title="لا أعمال سابقة" desc="جلسات العلاج والزيارات المكتملة تُدوَّن هنا مع عوداتها." />
            ) : (
              <div className="px-5 py-5">
                <ul className="relative ms-2 border-s-2 border-line space-y-4">
                  {workLog.slice(0, 12).map((w) => {
                    if (w.kind === "visit") {
                      return (
                        <li key={w.id} className="relative ps-4 anim-fade">
                          <span className="absolute top-1.5 -start-[7px] w-3 h-3 rounded-full bg-line border-2 border-white" />
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="stat-num text-xs font-bold text-ink">{fmtDate(w.date)}</span>
                            <span className="text-xs font-semibold text-soft">{serviceById(w.a.serviceId)?.name}</span>
                            <span className="text-[10px] text-soft">· {doctorById(w.a.doctorId)?.name}</span>
                            <span className="chip bg-mist text-soft ms-auto">زيارة</span>
                          </div>
                        </li>
                      );
                    }
                    const s = w.s;
                    const inv = s.invoiceId ? db.invoices.find((x) => x.id === s.invoiceId) : undefined;
                    return (
                      <li key={w.id} className="relative ps-4 anim-fade">
                        <span className="absolute top-1.5 -start-[7px] w-3 h-3 rounded-full bg-jade border-2 border-white pulse-soft" />
                        <div className="rounded-xl border border-line bg-gradient-to-b from-white to-mist/50 p-3.5 hover:border-jade/50 hover:shadow-md transition-all">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="stat-num text-xs font-bold text-ink">{fmtDate(s.date)}</span>
                            <span className="text-[10px] font-bold text-soft">· {doctorById(s.doctorId)?.name}</span>
                            <span className="chip bg-jade-soft text-jade-deep ms-auto"><IconSpark className="w-3 h-3" /> جلسة علاج</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {s.procedures.map((pr, j) => (
                              <span key={j} className="chip bg-mist text-ink">
                                {serviceById(pr.serviceId)?.name}
                                {pr.tooth && <b className="stat-num text-[#a06410]">· سن {pr.tooth}</b>}
                              </span>
                            ))}
                            {s.teethTreated.map((t, j) => (
                              <span key={`t${j}`} className="chip" style={{ background: TOOTH_META[t.status].fill === "#ffffff" ? "#eef4f2" : TOOTH_META[t.status].fill, color: TOOTH_META[t.status].stroke }}>
                                سن {t.tooth} — {TOOTH_META[t.status].label}
                              </span>
                            ))}
                            {s.meds.length > 0 && <span className="chip bg-sky-soft text-sky">روشتة {s.meds.length}</span>}
                            {inv && <span className="chip bg-mint-soft text-[#1d6b47]">{inv.number} · {money(invoiceTotal(inv))}</span>}
                          </div>
                          {s.summary.trim() && (
                            <details className="group mt-2.5">
                              <summary className="text-[11px] font-bold text-jade-deep cursor-pointer list-none inline-flex items-center gap-1.5 hover:underline">
                                <IconPencil className="w-3 h-3" />
                                تقرير العمل
                                <span className="text-soft group-open:rotate-180 transition-transform inline-flex"><IconChevronDown className="w-3 h-3" /></span>
                              </summary>
                              <p className="text-[11.5px] leading-relaxed text-soft mt-2 whitespace-pre-line bg-mist/70 rounded-lg px-3 py-2.5 border border-line/70">{s.summary}</p>
                            </details>
                          )}
                          <div className="mt-2.5">{fuChip(s.fuId)}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <section className="card overflow-hidden">
            <h3 className="font-display font-bold text-lg text-ink px-5 pt-4 pb-3 border-b border-line">الفواتير</h3>
            {invoices.length === 0 ? (
              <p className="text-xs text-soft px-5 py-5">لا فواتير لهذا المريض بعد.</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {invoices.map((inv) => {
                  const st = invoiceStatus(inv);
                  return (
                    <li key={inv.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="stat-num text-sm text-jade-deep w-24 shrink-0" dir="ltr">{inv.number}</span>
                      <span className="text-xs text-soft flex-1">{fmtDate(inv.date)}</span>
                      <span className="stat-num text-sm text-ink">{money(invoiceTotal(inv))}</span>
                      <Badge cls={INV_META[st].cls}>{INV_META[st].label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {p.notes && (
            <section className="card p-5">
              <h3 className="font-display font-bold text-base text-ink mb-2">ملاحظات طبية</h3>
              <p className="text-sm text-soft leading-relaxed">{p.notes}</p>
            </section>
          )}
        </div>

        {/* الإجراءات */}
        <div className="border-t border-line bg-white px-6 py-4 flex items-center gap-3">
          <button className="btn-primary flex-1" onClick={() => onBook(p.id)}>
            <IconCalendarPlus className="w-4.5 h-4.5" />
            حجز موعد لهذا المريض
          </button>
          <button className="btn-soft" onClick={() => setShowPrint(true)} title="طباعة الملف الطبي الكامل">
            <IconPrinter className="w-4.5 h-4.5" />
            طباعة الملف
          </button>
          <button className="btn-ghost !px-3" onClick={() => setShowCard(true)} title="طباعة بطاقة تعريف للمريض">
            <IconIdCard className="w-4.5 h-4.5" />
            الكرت
          </button>
          <button className="btn-ghost" onClick={onClose}>إغلاق</button>
        </div>
      </aside>

      {showRx && <RxModal patientId={p.id} onClose={() => setShowRx(false)} />}
      {showFu && <FollowUpModal patientId={p.id} onClose={() => setShowFu(false)} />}
      {showPrint && (
        <PrintModal open onClose={() => setShowPrint(false)} title={`طباعة الملف الطبي — ${p.name}`}>
          <PatientPrint patientId={p.id} />
        </PrintModal>
      )}
      {showCard && (
        <CardPrintModal open onClose={() => setShowCard(false)} title={`كرت المريض — ${p.name}`} render={(count) => <PatientCardSheet p={p} count={count} />} />
      )}
      {printRx && (
        <PrintModal open onClose={() => setPrintRx(null)} title="طباعة الروشتة">
          <RxPrint rx={printRx} />
        </PrintModal>
      )}
    </div>
  );
}

/* ============================ روشتة جديدة ============================ */

function RxModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const { db, dispatch, patientById } = useStore();
  const { push } = useToast();
  const [doctorId, setDoctorId] = useState(db.doctors[0]?.id ?? "");
  const [rows, setRows] = useState<RxItem[]>([{ name: "", dose: "", freq: "مرتين يومياً", duration: "5 أيام" }]);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const patient = patientById(patientId);

  const FREQS = ["مرة يومياً", "مرتين يومياً", "كل 8 ساعات", "كل 6 ساعات", "عند اللزوم"];

  const save = () => {
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) return setErr("أضف دواءً واحداً على الأقل.");
    const rx: Prescription = {
      id: uid(),
      patientId,
      doctorId,
      date: today(0),
      items: valid,
      notes: notes.trim() || undefined,
    };
    dispatch({ type: "ADD_PRESCRIPTION", rx });
    push("success", "أُصدرت الروشتة", `${patient?.name} — ${valid.length} ${valid.length === 1 ? "دواء" : "أدوية"}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="روشتة إلكترونية جديدة"
      subtitle={`المريض: ${patient?.name ?? ""} — قابلة للطباعة فور الحفظ`}
      width="max-w-2xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>حفظ الروشتة</button>
        </>
      }
    >
      <Field label="الطبيب المعالج">
        <TSelect value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          {db.doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
          ))}
        </TSelect>
      </Field>

      <div className="mt-4">
        <p className="label">الأدوية</p>
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1.6fr_0.9fr_1fr_0.9fr_auto] gap-2 items-center">
              <TInput value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="اسم الدواء" />
              <TInput value={r.dose} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, dose: e.target.value } : x)))} placeholder="الجرعة" />
              <TSelect value={r.freq} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, freq: e.target.value } : x)))}>
                {FREQS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </TSelect>
              <TInput value={r.duration} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, duration: e.target.value } : x)))} placeholder="المدة" />
              <button
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
                disabled={rows.length === 1}
                className="icon-btn !w-9 !h-9 disabled:opacity-30 hover:!bg-coral-soft hover:!text-coral"
                aria-label="حذف الدواء"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setRows([...rows, { name: "", dose: "", freq: "مرتين يومياً", duration: "5 أيام" }])}
          className="mt-3 text-xs font-bold text-jade-deep bg-jade-soft hover:bg-jade hover:text-white rounded-lg px-3.5 py-2.5 cursor-pointer transition-colors inline-flex items-center gap-1.5"
        >
          <IconPlus className="w-3.5 h-3.5" />
          إضافة دواء
        </button>
      </div>

      <div className="mt-4">
        <Field label="تعليمات إضافية">
          <TArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: بعد الأكل، تجنب المشروبات الباردة…" />
        </Field>
      </div>
      {patient?.allergies && patient.allergies !== "لا يوجد" && (
        <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 flex items-center gap-2">
          <IconAlert className="w-4 h-4 shrink-0" />
          تنبيه: المريض لديه حساسية مسجلة — {patient.allergies}
        </p>
      )}
      {err && <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}
