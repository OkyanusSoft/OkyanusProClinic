import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  APPT_META,
  DENTURE_TYPES,
  dentitionOf,
  DRUG_WATCH,
  EXTRACT_TYPES,
  FILL_TYPES,
  fmtDate,
  fmtDateFull,
  IMPLANT_BRANDS,
  IMPLANT_STATUS,
  invoiceStatus,
  invoiceTotal,
  INV_META,
  ORTHO_KINDS,
  PROSTHETIC_KINDS,
  RCT_FILLS,
  RCT_TYPES,
  RUBBER_TYPES,
  suggestFollowUp,
  today,
  TOOTH_META,
  uid,
  useAuth,
  useMoney,
  useStore,
  WIRE_TYPES,
  WORK_META,
  XRAY_KINDS,
  type ClinicalSession,
  type FollowUpStatus,
  type Implant,
  type OrthoCase,
  type Prosthetic,
  type SessionStage,
  type ToothStatus,
  type WorkItem,
  type WorkKind,
  type XrayRec,
} from "../store";
import {
  IconAlert,
  IconArrowLeft,
  IconBraces,
  IconCalendar,
  IconEye,
  IconCopy,
  IconPencil,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconCrown,
  IconImplant,
  IconPlus,
  IconPrinter,
  IconPulse,
  IconReceipt,
  IconSpark,
  IconStetho,
  IconTooth,
  IconTrash,
  IconUserPlus,
  IconWallet,
  IconXray,
} from "../icons";
import { Avatar, Badge, Drop, DropItem, EmptyState, Field, Modal, Switch, TArea, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";
import DentalChart from "../components/DentalChart";
import { InvoicePrint, PrintModal, RxPrint } from "../components/PrintSheet";

const pad = (n: number) => String(n).padStart(2, "0");
const FDI = [1, 2, 4, 3].flatMap((q) => Array.from({ length: 8 }, (_, i) => q * 10 + i + 1));

const MED_PRESETS = [
  { name: "أموكسيسيلين Amoxicillin", dose: "500 مجم", freq: "كل 8 ساعات", duration: "5 أيام" },
  { name: "باراسيتامول Paracetamol", dose: "500 مجم", freq: "كل 8 ساعات", duration: "3 أيام" },
  { name: "إيبوبروفين Ibuprofen", dose: "400 مجم", freq: "عند الألم — بعد الأكل", duration: "3 أيام" },
  { name: "كليندامايسين Clindamycin", dose: "300 مجم", freq: "كل 6 ساعات", duration: "7 أيام" },
  { name: "غسول كلورهيكسيدين", dose: "10 مل", freq: "مرتين يومياً", duration: "أسبوع" },
  { name: "ميترونيدازول Metronidazole", dose: "500 مجم", freq: "كل 12 ساعة", duration: "5 أيام" },
];

function useNowTick(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
const fmtClock = (iso: string) =>
  new Intl.DateTimeFormat("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const fmtDur = (ms: number) => {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m} دقيقة`;
  return `${Math.floor(m / 60)} س ${m % 60 ? `${m % 60} د` : ""}`.trim();
};

const watchFor = (name: string) => DRUG_WATCH.find((d) => name.includes(d.key));
const allergyHit = (medName: string, allergy: string) =>
  (allergy.includes("بنسلين") && medName.includes("أموكسيسيلين")) ||
  (allergy.toLowerCase().includes("أسبرين") && medName.includes("إيبوبروفين"));

/* ============================ الصفحة ============================ */

export default function SessionPage() {
  const { db, dispatch, patientById, serviceById, doctorById } = useStore();
  const { apptScope, patientScope } = useAuth();
  const { push } = useToast();
  const [doctorId, setDoctorId] = useState(db.doctors[0]?.id ?? "d1");
  const [adHoc, setAdHoc] = useState(false);
  const [adHocPatient, setAdHocPatient] = useState("");
  // جلسة سابقة تُعرض للقراءة فقط بعد إنهائها
  const [viewId, setViewId] = useState<string | null>(null);
  const viewSession = viewId ? db.sessions.find((s) => s.id === viewId && s.status === "done") : undefined;

  // الطبيب المقيَّد يعمل على كرسيّه فقط
  useEffect(() => {
    if (apptScope) setDoctorId(apptScope);
  }, [apptScope]);

  const open = db.sessions.find((s) => s.status === "open");

  const queue = useMemo(
    () =>
      db.appointments
        .filter((a) => (apptScope ? a.doctorId === apptScope : true))
        .filter((a) => a.date === today(0) && (a.status === "confirmed" || a.status === "waiting") && a.id !== open?.apptId)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [db.appointments, open, apptScope]
  );
  const doneToday = useMemo(
    () => db.sessions.filter((s) => s.status === "done" && s.date === today(0)).sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? "")),
    [db.sessions]
  );

  const start = (patientId: string, apptId?: string) => {
    if (open) {
      push("warn", "توجد جلسة علاج مفتوحة بالفعل", "أنهِ جلسة المريض الحالي أولاً قبل إدخال مريض آخر.");
      return;
    }
    dispatch({ type: "START_SESSION", patientId, doctorId, apptId });
    push("success", "بدأت الجلسة — المريض داخل الغرفة", patientById(patientId)?.name);
  };

  return (
    <div className="space-y-6">
      {/* الترويسة */}
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink flex items-center gap-3">
            محطة عمل الدكتور
            <span className="chip bg-jade-soft text-jade-deep !py-2"><IconPulse className="w-3.5 h-3.5" /> تشغيل مباشر</span>
          </h1>
          <p className="text-sm text-soft mt-1.5">{fmtDateFull(today(0))} — من دخول المريض حتى خروجه: الإجراءات تُفوَتَر تلقائياً والروشتة تُطبع والأسنان تُحدَّث.</p>
        </div>
        <div className="flex items-center gap-2">
          {apptScope ? (
            <span className="chip bg-amber-soft text-[#a06410] !py-2">
              <IconStetho className="w-3.5 h-3.5" />
              كرسي {doctorById(apptScope)?.name ?? "الطبيب"} — حسب صلاحياتك
            </span>
          ) : (
            db.doctors.map((d) => (
              <button
                key={d.id}
                onClick={() => setDoctorId(d.id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-all ${
                  doctorId === d.id ? "bg-pine border-pine text-white shadow-md" : "bg-white border-line text-ink hover:border-jade/50"
                }`}
              >
                <Avatar name={d.name} size="w-7 h-7 text-[9px]" />
                <span className="text-xs font-bold">{d.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* عرض جلسة سابقة للقراءة فقط */}
      {viewSession ? (
        <Workstation key={viewSession.id} session={viewSession} readonly onExit={() => setViewId(null)} />
      ) : (
        <>
          {/* الجلسة المفتوحة */}
          {open ? (
            <Workstation key={open.id} session={open} />
          ) : (
            <div className="card p-4 flex items-center gap-3 bg-jade-soft/60 !border-jade/30 anim-fade">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-jade text-white shrink-0"><IconPulse className="w-5 h-5" /></span>
              <p className="text-sm text-jade-deep font-semibold">الغرفة جاهزة — اختر مريضاً من قائمة الانتظار أدناه لبدء جلسة العلاج.</p>
            </div>
          )}

      {/* قائمة الانتظار */}
      <section className="anim-rise" style={{ animationDelay: "120ms" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full ${queue.length ? "bg-amber pulse-dot" : "bg-line"}`} />
            قائمة الانتظار — جاهزون للدخول
            <span className="chip bg-mist text-soft stat-num">{queue.length}</span>
          </h2>
          <button className="btn-ghost !h-9 !text-xs" onClick={() => { setAdHoc(true); setAdHocPatient(""); }}>
            <IconUserPlus className="w-4 h-4" />
            مريض غير مجدول
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="card">
            <EmptyState icon={<IconPulse className="w-6 h-6" />} title="لا مرضى بالانتظار" desc="كل مواعيد اليوم اكتملت أو قيد العلاج — يمكنك إدخال مريض غير مجدول." />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {queue.map((a, i) => {
              const p = patientById(a.patientId);
              const s = serviceById(a.serviceId);
              const d = doctorById(a.doctorId);
              const meta = APPT_META[a.status];
              const allergy = p?.allergies && p.allergies !== "لا يوجد";
              return (
                <div key={a.id} className="card card-hover p-4 anim-rise" style={{ animationDelay: `${160 + i * 60}ms`, borderInlineStartWidth: 4, borderInlineStartColor: s?.color }}>
                  <div className="flex items-center gap-3">
                    <Avatar name={p?.name ?? "؟"} size="w-11 h-11 text-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-ink truncate flex items-center gap-1.5">
                        {p?.name}
                        {allergy && <span title={`حساسية: ${p?.allergies}`}><IconAlert className="w-4 h-4 text-amber" /></span>}
                      </p>
                      <p className="text-[11px] text-soft mt-0.5 truncate">{s?.name} · {d?.name}</p>
                    </div>
                    <span className="stat-num font-display text-2xl text-jade-deep">{a.time}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-line/70">
                    <Badge cls={meta.cls}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                      {meta.label}
                    </Badge>
                    <button
                      className="btn-primary !h-9 !px-3.5 !text-xs"
                      disabled={!!open}
                      style={open ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
                      onClick={() => start(a.patientId, a.id)}
                    >
                      <IconPulse className="w-4 h-4" />
                      دخول المريض
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* جلسات اليوم المكتملة */}
      <section className="anim-rise" style={{ animationDelay: "220ms" }}>
        <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2.5 mb-3">
          <IconCheck className="w-5 h-5 text-mint" />
          جلسات اليوم المكتملة
          <span className="chip bg-mint-soft text-[#1d6b47] stat-num">{doneToday.length}</span>
        </h2>
        {doneToday.length === 0 ? (
          <div className="card">
            <EmptyState icon={<IconStetho className="w-6 h-6" />} title="لا جلسات مكتملة بعد" desc="عند إنهاء جلسة علاج ستظهر هنا بمدتها وإجراءاتها وفاتورتها." />
          </div>
        ) : (
          <ul className="space-y-3">
            {doneToday.map((s, i) => {
              const p = patientById(s.patientId);
              const d = doctorById(s.doctorId);
              const inv = s.invoiceId ? db.invoices.find((x) => x.id === s.invoiceId) : undefined;
              const val = s.procedures.reduce((sum, pr) => sum + pr.price * Math.max(1, pr.teeth.length), 0);
              return (
                <li key={s.id} className="card card-hover p-4 anim-fade" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name={p?.name ?? "؟"} size="w-10 h-10 text-xs" />
                    <div className="flex-1 min-w-44">
                      <p className="font-bold text-sm text-ink">{p?.name}</p>
                      <p className="text-[11px] text-soft mt-0.5 truncate">
                        {s.procedures.map((pr) => pr.name).join(" · ") || "استشارة"}
                        {s.diagnosis ? ` — ${s.diagnosis}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.teethTreated.length > 0 && (
                        <span className="chip bg-jade-soft text-jade-deep"><IconTooth className="w-3.5 h-3.5" /> {s.teethTreated.length} سن</span>
                      )}
                      {s.meds.length > 0 && (
                        <span className="chip bg-sky-soft text-sky"><IconSpark className="w-3.5 h-3.5" /> روشتة {s.meds.length}</span>
                      )}
                      {inv && <span className="chip bg-mint-soft text-[#1d6b47]"><IconReceipt className="w-3.5 h-3.5" /> {inv.number}</span>}
                      <span className="chip bg-mist text-soft"><IconClock className="w-3.5 h-3.5" /> {fmtDur(new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime())}</span>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="stat-num text-sm text-ink" dir="ltr">{fmtClock(s.startedAt)}–{fmtClock(s.endedAt!)}</p>
                      {val > 0 && <Money v={val} />}
                      <p className="text-[10px] text-soft mt-0.5">{d?.name}</p>
                    </div>
                    <button
                      onClick={() => setViewId(s.id)}
                      className="btn-soft !h-9 !px-3.5 !text-xs shrink-0"
                      title="إعادة فتح المحطة لعرض ما تم إنجازه"
                    >
                      <IconEye className="w-4 h-4" />
                      عرض الجلسة
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
        </>
      )}

      {/* مريض غير مجدول */}
      <Modal
        open={adHoc}
        onClose={() => setAdHoc(false)}
        title="إدخال مريض غير مجدول"
        subtitle={`ستبدأ جلسة علاج فورية باسم ${doctorById(doctorId)?.name}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setAdHoc(false)}>إلغاء</button>
            <button
              className="btn-primary"
              onClick={() => {
                if (!adHocPatient) return push("warn", "اختر المريض أولاً");
                start(adHocPatient);
                setAdHoc(false);
              }}
            >
              <IconPulse className="w-4.5 h-4.5" />
              بدء الجلسة
            </button>
          </>
        }
      >
        <Field label="المريض *">
          <TSelect value={adHocPatient} onChange={(e) => setAdHocPatient(e.target.value)}>
            <option value="">— اختر من السجل —</option>
            {db.patients.filter((p) => (patientScope ? patientScope.has(p.id) : true)).map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.phone}</option>
            ))}
          </TSelect>
        </Field>
      </Modal>
    </div>
  );
}

const Money = ({ v }: { v: number }) => {
  const money = useMoney();
  return <p className="stat-num text-sm font-bold text-jade-deep">{money(v)}</p>;
};

/* ============================ التبويبات ============================ */

type WTab = "treatment" | "accounts" | "rx" | "appts" | "implants" | "prosthetics" | "ortho" | "xrays";

const TABS: { key: WTab; label: string; icon: (c: string) => React.ReactNode }[] = [
  { key: "treatment", label: "الجلسة والعلاج", icon: (c) => <IconTooth className={c} /> },
  { key: "accounts", label: "حسابات المريض", icon: (c) => <IconWallet className={c} /> },
  { key: "rx", label: "الروشتة والأدوية", icon: (c) => <IconSpark className={c} /> },
  { key: "appts", label: "تواريخ الحجوزات", icon: (c) => <IconCalendar className={c} /> },
  { key: "implants", label: "الزراعة", icon: (c) => <IconImplant className={c} /> },
  { key: "prosthetics", label: "التركيبات", icon: (c) => <IconCrown className={c} /> },
  { key: "ortho", label: "التقويم", icon: (c) => <IconBraces className={c} /> },
  { key: "xrays", label: "الأشعة", icon: (c) => <IconXray className={c} /> },
];

/* ============================ محطة الجلسة ============================ */

function Workstation({ session, readonly = false, onExit }: { session: ClinicalSession; readonly?: boolean; onExit?: () => void }) {
  const { db, dispatch, patientById, serviceById, doctorById } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const p = patientById(session.patientId);
  const [tab, setTab] = useState<WTab>("treatment");
  const [paid, setPaid] = useState("0");
  const [fuEnabled, setFuEnabled] = useState(true);
  const [fuReason, setFuReason] = useState("");
  const [fuDate, setFuDate] = useState("");
  const [armCancel, setArmCancel] = useState(false);

  const now = useNowTick(readonly ? 0 : 1000);
  const elapsed = readonly
    ? Math.max(0, new Date(session.endedAt ?? session.startedAt).getTime() - new Date(session.startedAt).getTime())
    : Math.max(0, now - new Date(session.startedAt).getTime());
  const mm = Math.floor(elapsed / 60000);
  const ss = Math.floor((elapsed % 60000) / 1000);
  const hh = Math.floor(mm / 60);
  const timer = hh > 0 ? `${hh}:${pad(mm % 60)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;

  useEffect(() => {
    if (!armCancel) return;
    const t = setTimeout(() => setArmCancel(false), 2800);
    return () => clearTimeout(t);
  }, [armCancel]);

  const patch = (pp: Partial<ClinicalSession>) => {
    if (readonly) return push("info", "هذه الجلسة للقراءة فقط", "انقر «عودة لمحطة العمل» لبدء جلسة جديدة.");
    dispatch({ type: "PATCH_SESSION", id: session.id, patch: pp });
  };

  const pendingTeeth = useMemo(
    () => Object.fromEntries(session.teethTreated.map((t) => [t.tooth, t.status])) as Record<number, ToothStatus>,
    [session.teethTreated]
  );
  const mergedTeeth = { ...p?.teeth, ...pendingTeeth };

  const total = session.procedures.reduce((s, pr) => s + pr.price * Math.max(1, pr.teeth.length), 0);
  const paidNum = Math.min(Math.max(0, Number(paid) || 0), total);
  const remaining = total - paidNum;

  /* اقتراح عودة المتابعة حسب الإجراءات المنفذة */
  const suggestion = useMemo(
    () => suggestFollowUp(session.procedures.map((pr) => pr.name)),
    [session.procedures]
  );
  useEffect(() => {
    setFuReason(suggestion.reason);
    setFuDate(today(suggestion.days));
  }, [suggestion]);



  const stages = [
    { label: "دخول المريض", done: true },
    { label: "الفحص والتشخيص", done: !!(session.complaint.trim() || session.diagnosis.trim()) },
    { label: "الإجراءات العلاجية", done: session.procedures.length > 0 },
    { label: "الروشتة", done: session.meds.length > 0 },
    { label: "الفاتورة والخروج", done: false },
  ];

  const invoices = db.invoices.filter((i) => i.patientId === session.patientId);
  const appts = db.appointments.filter((a) => a.patientId === session.patientId);
  const implants = db.implants.filter((r) => r.patientId === session.patientId);
  const prosthetics = db.prosthetics.filter((r) => r.patientId === session.patientId);
  const orthos = db.orthoCases.filter((r) => r.patientId === session.patientId);
  const xrays = db.xrays.filter((r) => r.patientId === session.patientId);
  const rxs = db.prescriptions.filter((r) => r.patientId === session.patientId);

  const badges: Partial<Record<WTab, number>> = {
    treatment: session.procedures.length || undefined,
    accounts: invoices.length || undefined,
    rx: session.meds.length + rxs.length || undefined,
    appts: appts.length || undefined,
    implants: implants.length || undefined,
    prosthetics: prosthetics.length || undefined,
    ortho: orthos.length || undefined,
    xrays: xrays.length || undefined,
  };

  const setTooth = (tooth: number, status: ToothStatus) => {
    const existing = session.teethTreated.find((t) => t.tooth === tooth);
    const list =
      existing && existing.status === status
        ? session.teethTreated.filter((t) => t.tooth !== tooth)
        : [...session.teethTreated.filter((t) => t.tooth !== tooth), { tooth, status }];
    patch({ teethTreated: list });
  };

  const end = () => {
    const invNo = session.procedures.length > 0 ? `${db.settings.invoicePrefix}-${db.nextInv}` : null;
    const withFu = fuEnabled && fuReason.trim() && fuDate;
    const fuId = withFu ? uid() : undefined;
    if (withFu) {
      dispatch({
        type: "ADD_FOLLOWUP",
        f: {
          id: fuId!,
          patientId: session.patientId,
          doctorId: session.doctorId,
          reason: fuReason.trim(),
          dueDate: fuDate,
          status: "pending",
          createdAt: new Date().toISOString(),
        },
      });
    }
    dispatch({ type: "END_SESSION", id: session.id, paid: paidNum, fuId });
    push(
      "success",
      "انتهت الجلسة — خرج المريض",
      (invNo
        ? `أُصدرت الفاتورة ${invNo} بإجمالي ${money(total)}${session.meds.length ? " مع روشتة إلكترونية" : ""}`
        : session.meds.length
        ? "أُرفقت روشتة إلكترونية بالملف"
        : "جلسة استشارية بدون فوترة") + (withFu ? ` + عودة متابعة في ${fuDate}` : "")
    );
  };

  const cancel = () => {
    dispatch({ type: "CANCEL_SESSION", id: session.id });
    push("info", "أُلغيت الجلسة", "أُعيد الموعد إلى قائمة الانتظار دون أي تغييرات.");
  };

  if (!p) return null;
  const hasAllergy = p.allergies && p.allergies !== "لا يوجد";

  return (
    <div className={`card !rounded-2xl overflow-hidden anim-pop shadow-[0_20px_50px_-20px_rgba(11,47,43,0.35)] ${readonly ? "!border-amber/50" : "!border-jade/40"}`}>
      {/* شريط القراءة فقط */}
      {readonly && (
        <div className="bg-gradient-to-l from-amber-soft to-amber-soft/40 border-b border-amber/30 px-5 py-2.5 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber text-white shrink-0"><IconEye className="w-4 h-4" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#7a4c08]">عرض جلسة سابقة — للقراءة فقط</p>
            <p className="text-[10px] text-[#a06410]/80 mt-0.5">
              انتهت {session.endedAt ? fmtDate(session.endedAt.slice(0, 10)) : ""} · المدة {fmtDur(elapsed)} · لا يمكن تعديل البيانات
            </p>
          </div>
          {onExit && (
            <button onClick={onExit} className="btn-ghost !h-8 !px-3 !text-[11px] !bg-white">
              <IconArrowLeft className="w-3.5 h-3.5" />
              عودة لمحطة العمل
            </button>
          )}
        </div>
      )}
      {/* شريط الجلسة */}
      <div className="bg-pine sidebar-texture text-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-3 min-w-52">
            <span className="relative">
              <Avatar name={p.name} size="w-12 h-12 text-sm" />
              <span className="absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full bg-mint border-2 border-pine pulse-dot" />
            </span>
            <div>
              <p className="font-display font-bold text-lg leading-tight">{p.name}</p>
              <p className="text-[11px] text-white/60 font-semibold mt-0.5">
                {p.age} سنة · فصيلة {p.blood} · {doctorById(session.doctorId)?.name}
              </p>
            </div>
          </div>

          <ol className="flex items-center gap-2 flex-1 min-w-72">
            {stages.map((st, i) => (
              <li key={st.label} className="flex items-center gap-2 flex-1 last:flex-none">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                    st.done ? "bg-[#3fd0c0] text-pine" : i === stages.findIndex((x) => !x.done) ? "bg-white/20 text-white ring-2 ring-[#3fd0c0]/50" : "bg-white/10 text-white/50"
                  }`}
                >
                  {st.done ? <IconCheck className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className={`text-[10px] font-bold hidden 2xl:block whitespace-nowrap ${st.done ? "text-white" : "text-white/45"}`}>{st.label}</span>
                {i < stages.length - 1 && <span className={`h-0.5 flex-1 rounded-full ${st.done ? "bg-[#3fd0c0]/60" : "bg-white/12"}`} />}
              </li>
            ))}
          </ol>

          <div className="text-end shrink-0">
            <p className="text-[10px] font-bold text-white/55">زمن الجلسة — بدأ {fmtClock(session.startedAt)}</p>
            <p className="stat-num text-3xl text-[#7fe0d4] leading-none mt-1" dir="ltr">{timer}</p>
          </div>
        </div>
        {hasAllergy && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber/15 border border-amber/40 px-3 py-2 text-xs font-bold text-amber w-fit">
            <IconAlert className="w-4 h-4 shrink-0" />
            تنبيه سريري: حساسية من {p.allergies}
          </p>
        )}
      </div>

      {/* شريط التبويبات */}
      <div className="px-5 pt-4 pb-0 bg-mist/50 border-b border-line">
        <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1" role="tablist">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 rounded-xl px-3.5 h-10 text-xs font-bold whitespace-nowrap cursor-pointer transition-all border ${
                  active
                    ? "bg-pine text-white border-pine shadow-md -translate-y-0.5"
                    : "bg-white text-soft border-line hover:border-jade/50 hover:text-jade-deep"
                }`}
              >
                {t.icon("w-4 h-4")}
                {t.label}
                {badges[t.key] ? (
                  <span className={`stat-num !text-[9px] px-1.5 py-0.5 rounded-full ${active ? "bg-white/20 text-[#7fe0d4]" : "bg-mist text-soft"}`}>
                    {badges[t.key]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* محتوى التبويب */}
      <div className="p-5 bg-mist/50">
        <div key={tab} className="anim-fade">
          {tab === "treatment" && (
            <TreatmentTab
              session={session}
              patch={patch}
              mergedTeeth={mergedTeeth}
              setTooth={setTooth}
              fuEnabled={fuEnabled}
              fuReason={fuReason}
              fuDate={fuDate}
            />
          )}
          {tab === "accounts" && <AccountsTab patientId={p.id} invoices={invoices} />}
          {tab === "rx" && <RxTab session={session} patch={patch} patientId={p.id} allergy={p.allergies} />}
          {tab === "appts" && <ApptsTab appts={appts} />}
          {tab === "implants" && <ImplantsTab patientId={p.id} teeth={p.teeth} />}
          {tab === "prosthetics" && <ProstheticsTab patientId={p.id} />}
          {tab === "ortho" && <OrthoTab patientId={p.id} />}
          {tab === "xrays" && <XraysTab patientId={p.id} />}
        </div>
      </div>

      {/* شريط الخروج الدائم */}
      {!readonly && (
      <div className="border-t border-line bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-5">
            <div>
              <p className="text-[10px] font-bold text-soft">إجمالي جلسة اليوم</p>
              <p className="stat-num text-2xl text-ink leading-tight">{money(total)}</p>
            </div>
            <span className="chip bg-mist text-soft stat-num">{session.procedures.length} إجراء</span>
            {session.teethTreated.length > 0 && (
              <span className="chip bg-amber-soft text-[#a06410]">{session.teethTreated.length} تعديل أسنان معلّق</span>
            )}
            {/* جدولة عودة المتابعة */}
            <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-2 transition-all ${fuEnabled ? "border-jade bg-jade-soft/60" : "border-line bg-mist/70"}`}>
              <Switch on={fuEnabled} onChange={setFuEnabled} />
              <div>
                <p className="text-[10px] font-bold text-ink">عودة للمتابعة</p>
                {fuEnabled ? (
                  <div className="flex gap-1.5 mt-1">
                    <TInput value={fuReason} onChange={(e) => setFuReason(e.target.value)} className="!h-8 !w-52 !text-[11px]" placeholder="سبب العودة" />
                    <TInput type="date" value={fuDate} onChange={(e) => setFuDate(e.target.value)} className="!h-8 !w-36 !text-[11px]" />
                  </div>
                ) : (
                  <p className="text-[10px] text-soft mt-0.5">
                    مقترح: <b className="text-jade-deep">{suggestion.reason}</b> بعد {suggestion.days} يوم
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2.5 ms-auto flex-wrap">
            <div>
              <label className="label !mb-1">المدفوع عند الخروج</label>
              <TInput type="number" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" className="!w-32 !text-center" />
            </div>
            <div className="pb-1">
              <p className="text-[10px] font-bold text-soft">المتبقي</p>
              <p className={`stat-num text-lg leading-tight ${remaining > 0 ? "text-coral" : "text-mint"}`}>{money(remaining)}</p>
            </div>
            <button className="btn-primary !h-11 !px-6 !text-base" onClick={end}>
              <IconCheck className="w-5 h-5" />
              إنهاء الجلسة وخروج المريض
            </button>
            <button
              className={`btn !h-11 ${armCancel ? "bg-coral text-white" : "btn-danger"}`}
              onClick={() => (armCancel ? (cancel(), setArmCancel(false)) : setArmCancel(true))}
            >
              {armCancel ? "متأكد؟ ستُلغى التغييرات" : "إلغاء الجلسة"}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

/* ============================ مخطط العمل السريري ============================ */

const WORK_KINDS: WorkKind[] = ["قلع", "حشوات", "سحب عصب", "تركيب", "أطقم", "تقويم"];

/* رسم مصغر لقنوات العصب حسب العدد المختار */
function CanalMini({ n }: { n: number }) {
  const xs = n === 1 ? [16] : n === 2 ? [11, 21] : n === 3 ? [8, 16, 24] : [7, 13.5, 19.5, 25.5];
  return (
    <svg viewBox="0 0 32 40" className="w-12 h-15 shrink-0" aria-hidden="true">
      <path d="M6 14 Q5 6 10 4 Q16 2 22 4 Q27 6 26 14 Q25 20 22 24 L21 34 Q16 37 11 34 L10 24 Q7 20 6 14 Z" fill="#fdf4e2" stroke="#e2952b" strokeWidth="1.5" />
      {xs.map((x, i) => (
        <path key={i} d={`M ${x} 8 L ${x + (x < 16 ? -1.5 : 1.5)} 31`} stroke="#b9791f" strokeWidth="2" strokeLinecap="round" fill="none" />
      ))}
    </svg>
  );
}

function WorkPlanSection({
  session,
  patch,
  age,
  baseTeeth,
  onSetTooth,
}: {
  session: ClinicalSession;
  patch: (pp: Partial<ClinicalSession>) => void;
  age: number;
  baseTeeth: Partial<Record<number, ToothStatus>>;
  onSetTooth?: (tooth: number, status: ToothStatus) => void;
}) {
  const { db, dispatch, serviceById } = useStore();
  const money = useMoney();
  const { push } = useToast();

  /* ---- التبويبات تُولَّد تلقائياً من فئات الخدمات ---- */
  const categories = useMemo(() => db.serviceCats.filter((c) => db.services.some((s) => s.category === c && s.active)), [db.serviceCats, db.services]);
  const [activeCat, setActiveCat] = useState(categories[0] ?? "");
  useEffect(() => {
    if (!categories.includes(activeCat) && categories.length) setActiveCat(categories[0]);
  }, [categories, activeCat]);

  const [selection, setSelection] = useState<number[]>([]);
  const [stageId, setStageId] = useState(session.stages[0]?.id ?? "");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [price, setPrice] = useState("");
  const [canalsByTooth, setCanalsByTooth] = useState<Record<number, { channels: number; length: number }>>({});
  const [impression, setImpression] = useState("");
  const [color, setColor] = useState("");
  const [wireNum, setWireNum] = useState("");
  const [ligature, setLigature] = useState("");

  const mode = dentitionOf(age);

  /* تصنيف الفئة إلى نوع خاص أو عام */
  const catKey = (cat: string): "extraction" | "filling" | "rct" | "prosthetic" | "ortho" | "generic" => {
    if (cat.includes("قلع")) return "extraction";
    if (cat.includes("حشو")) return "filling";
    if (cat.includes("عصب")) return "rct";
    if (cat.includes("تركيب")) return "prosthetic";
    if (cat.includes("تقويم")) return "ortho";
    return "generic";
  };
  const key = catKey(activeCat);
  const catServices = useMemo(() => db.services.filter((s) => s.category === activeCat && s.active), [db.services, activeCat]);
  const selectedService = catServices.find((s) => s.id === selectedServiceId) ?? null;

  const workBadges = useMemo(() => {
    const m: Partial<Record<number, string>> = {};
    session.procedures.forEach((pr) => pr.teeth.forEach((t) => (m[t] = pr.category)));
    return m;
  }, [session.procedures]);

  const toggleTooth = (n: number) =>
    setSelection((sel) => (sel.includes(n) ? sel.filter((x) => x !== n) : [...sel, n]));

  const stageName = (id: string) => session.stages.find((s) => s.id === id)?.name ?? "—";

  const CAT_COLOR: Record<string, string> = {
    extraction: "#d9503a", filling: "#1273c4", rct: "#e2952b", prosthetic: "#2f9fe0", ortho: "#2c9c69", generic: "#5c7186",
  };

  const addProc = () => {
    const name = selectedService?.name ?? customName.trim();
    if (!name) return push("warn", "اختر خدمة أو اكتب اسم الإجراء");
    const priceNum = price !== "" ? Math.max(0, Number(price) || 0) : selectedService?.price ?? 0;
    const proc: SessionProc = {
      id: uid(),
      category: activeCat,
      name,
      serviceId: selectedService?.id,
      price: priceNum,
      teeth: [...selection],
      detail: selectedService?.name ?? customName.trim(),
      canals:
        (key === "rct" || key === "prosthetic") && selection.length
          ? selection.map((t) => ({ tooth: t, channels: canalsByTooth[t]?.channels ?? 1, length: canalsByTooth[t]?.length ?? 0 }))
          : undefined,
      impression: key === "prosthetic" ? impression.trim() || undefined : undefined,
      color: key === "prosthetic" ? color.trim() || undefined : undefined,
      wireNum: key === "ortho" ? wireNum.trim() || undefined : undefined,
      ligature: key === "ortho" ? ligature.trim() || undefined : undefined,
      stageId,
    };
    patch({ procedures: [...session.procedures, proc] });
    push("success", `أُضيف «${name}» إلى الإجراءات`, `${selection.length ? selection.length + " سن · " : ""}${money(priceNum)} — ${stageName(stageId)}`);
    setSelection([]);
    setSelectedServiceId(null);
    setCustomName("");
    setPrice("");
    setCanalsByTooth({});
    setImpression("");
    setColor("");
    setWireNum("");
    setLigature("");
  };

  const setCanal = (tooth: number, field: "channels" | "length", v: number) =>
    setCanalsByTooth((prev) => ({ ...prev, [tooth]: { channels: prev[tooth]?.channels ?? 1, length: prev[tooth]?.length ?? 0, [field]: v } }));

  /* ربط المرحلة بعودة/متابعة تلقائياً — الجلسة الثانية بتاريخ لاحق = عودة مسجلة */
  const stageReason = (name: string) => `${name} — متابعة خطة العلاج (${serviceById(session.procedures[0]?.serviceId ?? "")?.name ?? "علاج مستمر"})`;

  const addStage = () => {
    const n = session.stages.length + 1;
    const names = ["", "الجلسة الأولى", "الجلسة الثانية", "الجلسة الثالثة", "الجلسة الرابعة", "الجلسة الخامسة"];
    const st: SessionStage = { id: uid(), name: names[n] ?? `الجلسة ${n}`, date: today(7 * (n - 1)), done: false };
    // مرحلة بتاريخ قادم ← تُسجل عودة/متابعة في نظام المتابعات تلقائياً
    if (st.date >= today(0)) {
      st.fuId = uid();
      dispatch({
        type: "ADD_FOLLOWUP",
        f: { id: st.fuId, patientId: session.patientId, doctorId: session.doctorId, reason: stageReason(st.name), dueDate: st.date, status: "pending", createdAt: new Date().toISOString() },
      });
      push("success", `أُضيفت «${st.name}»`, "سُجّلت عودة/متابعة تلقائياً في نظام المتابعات.");
    } else {
      push("info", `أُضيفت «${st.name}»`);
    }
    patch({ stages: [...session.stages, st] });
    setStageId(st.id);
  };

  const toggleStage = (id: string) =>
    patch({ stages: session.stages.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) });

  const updateStage = (id: string, p: Partial<SessionStage>) => {
    const st = session.stages.find((s) => s.id === id);
    patch({ stages: session.stages.map((s) => (s.id === id ? { ...s, ...p } : s)) });
    // مزامنة العودة المرتبطة عند تغيير التاريخ أو الاسم
    if (st?.fuId && (p.date !== undefined || p.name !== undefined)) {
      const fu = db.followUps.find((f) => f.id === st.fuId);
      if (fu) {
        dispatch({ type: "UPDATE_FOLLOWUP", f: { ...fu, dueDate: p.date ?? fu.dueDate, reason: p.name ? stageReason(p.name) : fu.reason } });
      }
    }
  };

  /* ربط مرحلة قديمة (بلا عودة) بنظام المتابعات */
  const linkStageFollowUp = (id: string) => {
    const st = session.stages.find((s) => s.id === id);
    if (!st || st.fuId) return;
    const fuId = uid();
    patch({ stages: session.stages.map((s) => (s.id === id ? { ...s, fuId } : s)) });
    dispatch({
      type: "ADD_FOLLOWUP",
      f: { id: fuId, patientId: session.patientId, doctorId: session.doctorId, reason: stageReason(st.name), dueDate: st.date, status: "pending", createdAt: new Date().toISOString() },
    });
    push("success", "رُبطت المرحلة بعودة", "ظهرت الآن في نظام المتابعات.");
  };

  /* تغيير حالة العودة المرتبطة بالمرحلة (إرجاعها لمعلقة/محجوزة/مكتملة) */
  const setFuStatus = (fuId: string, status: FollowUpStatus) => {
    const fu = db.followUps.find((f) => f.id === fuId);
    if (!fu) return;
    dispatch({ type: "UPDATE_FOLLOWUP", f: { ...fu, status } });
    const labels: Record<FollowUpStatus, string> = { pending: "عودة معلقة (تنتظر المراجعة)", booked: "عودة محجوزة", done: "عودة مكتملة" };
    push("success", "تغيّرت حالة المتابعة", labels[status]);
  };

  const deleteStage = (id: string) => {
    if (session.stages.length <= 1) return push("warn", "لا يمكن حذف المرحلة الوحيدة");
    const st = session.stages.find((s) => s.id === id);
    // حذف العودة المرتبطة إن وُجدت
    if (st?.fuId) dispatch({ type: "DELETE_FOLLOWUP", id: st.fuId });
    patch({
      stages: session.stages.filter((s) => s.id !== id),
      workItems: session.workItems.map((w) => (w.stageId === id ? { ...w, stageId: session.stages.find((s) => s.id !== id)!.id } : w)),
    });
    if (st) push("info", `حُذفت مرحلة «${st.name}»`, st.fuId ? "أُزيلت عودتها المرتبطة من المتابعات." : "نُقلت أعمالها إلى مرحلة أخرى.");
  };

  const label = (n: number) => (mode === "child" ? "ABCDE"[(n % 10) - 1] : String(n));

  const kindBtn = (k: WorkKind) => {
    const active = kind === k;
    const m = WORK_META[k];
    return (
      <button
        key={k}
        onClick={() => setKind(active ? null : k)}
        className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold cursor-pointer transition-all flex items-center gap-2 ${
          active ? "shadow-md scale-[1.02]" : "border-line bg-white text-soft hover:border-jade/40"
        }`}
        style={active ? { borderColor: m.color, background: `${m.color}14`, color: m.color } : undefined}
      >
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color }} />
        {k}
      </button>
    );
  };

  return (
    <section className="card p-5 anim-fade">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-jade-soft text-jade-deep"><IconTooth className="w-4.5 h-4.5" /></span>
          مخطط العمل السريري
          <span className="chip bg-mist text-soft !text-[9px]">
            {mode === "child" ? "أسنان لبنية A–E" : "أسنان دائمة FDI"} · حسب العمر
          </span>
        </h3>
        {session.workItems.length > 0 && (
          <span className="chip bg-amber-soft text-[#a06410]">
            <IconClock className="w-3.5 h-3.5" />
            {session.workItems.length} عمل مخطط — يُثبَّت عند الخروج
          </span>
        )}
      </div>

      {/* الخريطة بالاختيار المتعدد — تعرض حالة المريض الحالية + الأعمال المعلقة */}
      <DentalChart
        teeth={baseTeeth}
        mode={mode}
        multiSelect
        selection={selection}
        onToggle={toggleTooth}
        workBadges={workBadges}
        onSet={onSetTooth}
        editorNote="تغيير حالة السن يُعلَّق هنا ويُثبَّت في ملف المريض عند إنهاء الجلسة."
      />

      {/* شريط الاختيار + نوع العمل */}
      <div className="mt-5 rounded-xl border border-line bg-mist/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-sky-soft text-sky stat-num text-lg font-bold">{selection.length}</span>
            <div>
              <p className="text-sm font-bold text-ink leading-tight">
                {selection.length === 0 ? "لم تُحدد أسناناً" : selection.length === 1 ? "سن واحد محدد" : `${selection.length} أسنان محددة`}
              </p>
              {selection.length > 0 && (
                <p className="text-[11px] font-semibold text-soft stat-num mt-0.5">{selection.map(label).join(" · ")}</p>
              )}
            </div>
          </div>
          <TSelect value={stageId} onChange={(e) => setStageId(e.target.value)} className="!w-44">
            {session.stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </TSelect>
        </div>

        {/* تبويبات فئات الخدمات — تُولَّد تلقائياً */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.length === 0 && (
            <p className="text-xs text-soft">لا توجد فئات خدمات بها خدمات مفعلة — أضفها من شاشة «فئات الخدمات» و«بيانات الخدمات».</p>
          )}
          {categories.map((c) => {
            const k = catKey(c);
            const active = c === activeCat;
            const clr = CAT_COLOR[k];
            return (
              <button
                key={c}
                onClick={() => { setActiveCat(c); setSelectedServiceId(null); }}
                className={`rounded-xl border-2 px-3 py-2 text-sm font-bold cursor-pointer transition-all flex items-center gap-2 ${active ? "shadow-md scale-[1.02]" : "border-line bg-white text-soft hover:border-jade/40"}`}
                style={active ? { borderColor: clr, background: `${clr}14`, color: clr } : undefined}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: clr }} />
                {c}
                <span className="stat-num !text-[9px] opacity-70">{db.services.filter((s) => s.category === c && s.active).length}</span>
              </button>
            );
          })}
        </div>

        {/* حقول الفئة المختارة — الخدمات + الحقول الخاصة */}
        {activeCat && (
          <div className="anim-pop rounded-xl border border-line bg-white p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold" style={{ color: CAT_COLOR[key] }}>
                فئة «{activeCat}» — اختر الخدمة أو اكتب إجراءً مخصصاً
              </p>
              <span className="chip bg-mist text-soft stat-num">عدد الأسنان: {selection.length}</span>
            </div>

            {/* خدمات الفئة — نفس آلية شاشة الخدمات */}
            {catServices.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {catServices.map((s) => {
                  const on = selectedServiceId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedServiceId(on ? null : s.id); setPrice(on ? "" : String(s.price)); setCustomName(""); }}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${on ? "border-jade bg-jade-soft text-jade-deep shadow-sm" : "border-line bg-white text-soft hover:border-jade/50"}`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      {s.name}
                      <span className="stat-num !text-[10px] opacity-80">{money(s.price)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-soft">لا خدمات مفعلة في هذه الفئة — اكتب اسم الإجراء يدوياً أدناه.</p>
            )}

            {/* اسم مخصص + السعر القابل للتعديل */}
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="اسم الإجراء / الخدمة">
                <TInput value={selectedService ? selectedService.name : customName} onChange={(e) => { setSelectedServiceId(null); setCustomName(e.target.value); }} placeholder="مثال: حشوة كمبوزيت" />
              </Field>
              <Field label="السعر (قابل للتعديل)">
                <TInput type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={selectedService ? String(selectedService.price) : "0"} />
              </Field>
            </div>

            {/* سحب العصب: قنوات كل سن على حدة */}
            {(key === "rct" || key === "prosthetic") && selection.length > 0 && (
              <div className="rounded-lg bg-amber-soft/40 border border-amber/30 p-3 space-y-2.5">
                <p className="text-xs font-bold text-[#a06410]">{key === "rct" ? "قنوات العصب لكل سن" : "قنوات العصب (إن ترافق التركيب مع سحب عصب)"}</p>
                {selection.map((t) => {
                  const c = canalsByTooth[t]?.channels ?? 1;
                  const l = canalsByTooth[t]?.length ?? 0;
                  return (
                    <div key={t} className="flex flex-wrap items-center gap-3 bg-white rounded-lg border border-line px-3 py-2">
                      <span className="chip bg-amber-soft text-[#a06410] stat-num">سن {label(t)}</span>
                      <label className="text-[11px] font-bold text-soft">عدد القنوات</label>
                      <div className="flex items-center gap-1 bg-mist rounded-md p-0.5" dir="ltr">
                        <button onClick={() => setCanal(t, "channels", Math.max(1, c - 1))} className="w-7 h-7 rounded bg-white border border-line font-bold cursor-pointer hover:border-jade">−</button>
                        <span className="stat-num text-sm w-7 text-center text-ink">{c}</span>
                        <button onClick={() => setCanal(t, "channels", Math.min(4, c + 1))} className="w-7 h-7 rounded bg-white border border-line font-bold cursor-pointer hover:border-jade">+</button>
                      </div>
                      <label className="text-[11px] font-bold text-soft">طول القناة (مم)</label>
                      <input type="number" value={l || ""} onChange={(e) => setCanal(t, "length", Number(e.target.value) || 0)} placeholder="0" className="input !w-20 !h-8 !text-xs text-center" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* تركيب: القياس + اللون */}
            {key === "prosthetic" && (
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="أخذ القياس"><TInput value={impression} onChange={(e) => setImpression(e.target.value)} placeholder="مثال: قياس سيلكون كامل" /></Field>
                <Field label="اللون"><TInput value={color} onChange={(e) => setColor(e.target.value)} placeholder="مثال: A2" /></Field>
              </div>
            )}

            {/* تقويم: رقم السلك + نوع الربل */}
            {key === "ortho" && (
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="رقم السلك"><TInput value={wireNum} onChange={(e) => setWireNum(e.target.value)} placeholder="مثال: 014 NiTi" /></Field>
                <Field label="نوع الربل"><TInput value={ligature} onChange={(e) => setLigature(e.target.value)} placeholder="مثال: ربلات شفافة" /></Field>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              <button className="btn-ghost !h-9 !text-xs" onClick={() => { setSelection([]); setSelectedServiceId(null); setCustomName(""); setPrice(""); }}>إلغاء</button>
              <button onClick={addProc} className="btn-primary !h-10" style={{ background: CAT_COLOR[key], boxShadow: `0 8px 18px -6px ${CAT_COLOR[key]}88` }}>
                <IconPlus className="w-4 h-4" />
                إضافة إلى الإجراءات — {stageName(stageId)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* خطة العمل المضافة */}
      {session.workItems.length > 0 && (
        <div className="mt-4">
          <p className="label !mb-2">الأعمال المخططة ({session.workItems.length})</p>
          <ul className="space-y-2">
            {session.workItems.map((w) => {
              const m = WORK_META[w.kind];
              const detail =
                w.kind === "قلع" ? w.extractType :
                w.kind === "حشوات" ? w.fillType :
                w.kind === "سحب عصب" ? `${w.rctType} · ${w.channels} قناة · ${w.rctFill}` :
                w.kind === "تركيب" ? `${w.prosType}${w.withRct ? ` · عصب ${w.channels} قناة` : ""}` :
                w.kind === "أطقم" ? w.dentureType :
                `${w.wireType} · سلك ${w.wireNum} · ${w.rubberType}`;
              return (
                <li key={w.id} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 anim-fade" style={{ borderInlineStartWidth: 4, borderInlineStartColor: m.color }}>
                  <span className="chip" style={{ background: `${m.color}14`, color: m.color }}>{w.kind}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{detail}</p>
                    <p className="text-[11px] text-soft mt-0.5">
                      {w.teeth.length > 0 ? <>الأسنان: <span className="stat-num font-bold">{w.teeth.map(label).join("، ")}</span> · </> : null}
                      {stageName(w.stageId)}
                      {w.note ? ` · ${w.note}` : ""}
                    </p>
                  </div>
                  <button className="icon-btn !w-8 !h-8 hover:!bg-coral-soft hover:!text-coral" onClick={() => removeWork(w.id)} aria-label="حذف العمل">
                    <IconTrash className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* جدول مراحل الجلسات */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="label !mb-0">مراحل الجلسات — للعلاج متعدد الزيارات</p>
          <button className="btn-soft !h-8 !px-3 !text-[11px]" onClick={addStage}>
            <IconPlus className="w-3.5 h-3.5" />
            مرحلة جديدة
          </button>
        </div>
        <div className="rounded-xl border border-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-mist/70">
                <tr>
                  <th className="th !py-2.5">المرحلة</th>
                  <th className="th !py-2.5">التاريخ المقرر</th>
                  <th className="th !py-2.5">المتابعة</th>
                  <th className="th !py-2.5">الأعمال</th>
                  <th className="th !py-2.5">الحالة</th>
                  <th className="th !py-2.5 text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {session.stages.map((s) => {
                  const items = session.workItems.filter((w) => w.stageId === s.id);
                  return (
                    <tr key={s.id} className={`border-t border-line/70 ${s.done ? "bg-mint-soft/30" : "bg-white"} transition-colors`}>
                      <td className="td !py-2">
                        <input
                          value={s.name}
                          onChange={(e) => updateStage(s.id, { name: e.target.value })}
                          className="font-bold text-ink bg-transparent border border-transparent hover:border-line focus:border-jade focus:bg-white rounded-md px-2 py-1 outline-none w-36 transition-all"
                          aria-label="اسم المرحلة"
                        />
                      </td>
                      <td className="td !py-2">
                        <input
                          type="date"
                          value={s.date}
                          onChange={(e) => updateStage(s.id, { date: e.target.value })}
                          className="text-soft stat-num bg-transparent border border-transparent hover:border-line focus:border-jade focus:bg-white rounded-md px-2 py-1 outline-none transition-all cursor-pointer"
                          aria-label="التاريخ المقرر"
                        />
                      </td>
                      <td className="td !py-2">
                        {s.fuId ? (
                          (() => {
                            const fu = db.followUps.find((f) => f.id === s.fuId);
                            if (!fu) return <span className="text-soft/50 text-xs">—</span>;
                            const overdue = fu.status === "pending" && fu.dueDate < today(0);
                            const chipCls = fu.status === "done" ? "bg-mint-soft text-[#1d6b47]" : fu.status === "booked" ? "bg-sky-soft text-sky" : overdue ? "bg-coral-soft text-coral" : "bg-jade-soft text-jade-deep";
                            const chipLabel = fu.status === "done" ? "عودة مكتملة" : fu.status === "booked" ? "عودة محجوزة" : overdue ? "عودة متأخرة" : "عودة مسجلة ✓";
                            const opts: { key: FollowUpStatus; label: string; dot: string }[] = [
                              { key: "pending", label: "عودة معلقة (تنتظر المراجعة)", dot: "#0d8f83" },
                              { key: "booked", label: "عودة محجوزة", dot: "#3a86c4" },
                              { key: "done", label: "عودة مكتملة", dot: "#2c9c69" },
                            ];
                            return (
                              <Drop
                                align="start"
                                direction="up"
                                fixed
                                panelCls="!min-w-56 !p-1.5"
                                button={
                                  <span className={`chip !text-[10px] cursor-pointer hover:opacity-80 transition-opacity ${chipCls}`} title="انقر لتغيير حالة المتابعة">
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    {chipLabel}
                                    <IconChevronDown className="w-3 h-3" />
                                  </span>
                                }
                              >
                                {opts
                                  .filter((o) => o.key !== fu.status)
                                  .map((o) => (
                                    <DropItem key={o.key}>
                                      <span onClick={() => setFuStatus(fu.id, o.key)} className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.dot }} />
                                        {o.label}
                                      </span>
                                    </DropItem>
                                  ))}
                              </Drop>
                            );
                          })()
                        ) : s.date >= today(0) ? (
                          <button onClick={() => linkStageFollowUp(s.id)} className="chip !text-[10px] bg-white border border-dashed border-line text-soft hover:border-jade hover:text-jade-deep cursor-pointer transition-all">
                            <IconPlus className="w-3 h-3" />
                            ربط بعودة
                          </button>
                        ) : (
                          <span className="text-soft/50 text-xs">—</span>
                        )}
                      </td>
                      <td className="td !py-2">
                        {items.length === 0 ? (
                          <span className="text-soft/60 text-xs">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {items.map((w) => (
                              <span key={w.id} className="chip !text-[9px]" style={{ background: `${WORK_META[w.kind].color}14`, color: WORK_META[w.kind].color }}>{w.kind}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="td !py-2">
                        <button
                          onClick={() => toggleStage(s.id)}
                          className={`chip cursor-pointer transition-all ${s.done ? "bg-mint-soft text-[#1d6b47]" : "bg-mist text-soft hover:bg-sky-soft hover:text-sky"}`}
                          title="تبديل الحالة"
                        >
                          {s.done ? <IconCheck className="w-3 h-3" /> : <IconClock className="w-3 h-3" />}
                          {s.done ? "منجزة" : "قيد التنفيذ"}
                        </button>
                      </td>
                      <td className="td !py-2 text-end">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              const name = prompt("اسم المرحلة:", s.name);
                              if (name?.trim()) updateStage(s.id, { name: name.trim() });
                            }}
                            className="icon-btn !w-7 !h-7"
                            aria-label="تعديل"
                            title="تعديل الاسم"
                          >
                            <IconPencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteStage(s.id)}
                            className="icon-btn !w-7 !h-7 hover:!bg-coral-soft hover:!text-coral"
                            aria-label="حذف"
                            title="حذف المرحلة"
                          >
                            <IconTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* سطر الملاحظات لكل مرحلة */}
          <div className="border-t border-line bg-mist/40 px-4 py-3 space-y-2">
            <p className="label !mb-0">ملاحظات المراحل</p>
            {session.stages.map((s) => (
              <div key={s.id} className="flex items-center gap-2.5">
                <span className="chip bg-white border border-line !text-[10px] shrink-0 stat-num">{s.name}</span>
                <input
                  value={s.notes ?? ""}
                  onChange={(e) => updateStage(s.id, { notes: e.target.value })}
                  placeholder={`ملاحظات ${s.name} — مثل: إحضار الأشعة، تخدير موضعي…`}
                  className="flex-1 input !h-8 !text-xs"
                  aria-label={`ملاحظات ${s.name}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ تبويب العلاج ============================ */

function TreatmentTab(props: {
  session: ClinicalSession;
  patch: (pp: Partial<ClinicalSession>) => void;
  mergedTeeth: Partial<Record<number, ToothStatus>>;
  setTooth: (tooth: number, status: ToothStatus) => void;
  fuEnabled: boolean;
  fuReason: string;
  fuDate: string;
}) {
  const { db, dispatch, serviceById, patientById } = useStore();
  const money = useMoney();
  const { session, patch } = props;
  const p = patientById(session.patientId);
  const total = session.procedures.reduce((s, pr) => s + pr.price * Math.max(1, pr.teeth.length), 0);

  /* ---- توليد تقرير العمل حرفاً حرفاً من بيانات الجلسة ---- */
  const [typing, setTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  const typeTimer = useRef<number | null>(null);
  useEffect(() => () => { if (typeTimer.current) window.clearTimeout(typeTimer.current); }, []);

  const generateReport = () => {
    if (typing) return;
    const procs = session.procedures
      .map((pr) => {
        const t = pr.teeth.length ? ` — الأسنان ${pr.teeth.join("، ")}` : "";
        const d = pr.detail && pr.detail !== pr.name ? ` (${pr.detail})` : "";
        return `${pr.name}${d}${t}`;
      })
      .filter(Boolean)
      .join("؛ ");
    const teeth = session.teethTreated.map((t) => `سن ${t.tooth}: ${TOOTH_META[t.status].label}`).join("، ");
    const meds = session.meds.map((m) => m.name.split(" ")[0]).join("، ");
    const lines = [
      `حضر المريض ${p?.name ?? ""} (${p?.age ?? ""} سنة) جلسة علاج بتاريخ ${fmtDate(session.date)}.`,
      session.complaint.trim() ? `الشكوى الرئيسية: ${session.complaint.trim()}.` : "",
      session.diagnosis.trim() ? `التشخيص السريري: ${session.diagnosis.trim()}.` : "",
      procs ? `الإجراءات المنفذة: ${procs}.` : "",
      teeth ? `تحديثات خريطة الأسنان: ${teeth}.` : "",
      meds ? `الأدوية الموصوفة: ${meds}.` : "",
      props.fuEnabled && props.fuReason.trim()
        ? `التوصية: ${props.fuReason.trim()}${props.fuDate ? ` — مراجعة ${fmtDate(props.fuDate)}` : ""}.`
        : "",
    ].filter(Boolean);
    const text = lines.join("\n");
    setTyping(true);
    let i = 0;
    const tick = () => {
      i = Math.min(text.length, i + 3);
      dispatch({ type: "PATCH_SESSION", id: session.id, patch: { summary: text.slice(0, i) } });
      if (i < text.length) typeTimer.current = window.setTimeout(tick, 20);
      else setTyping(false);
    };
    tick();
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(session.summary);
    } catch {
      /* بيئات لا تدعم الحافظة */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h3 className="font-display font-bold text-lg text-ink mb-4 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-jade-soft text-jade-deep"><IconStetho className="w-4.5 h-4.5" /></span>
          الفحص والتشخيص
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="الشكوى الرئيسية">
            <TArea value={session.complaint} onChange={(e) => patch({ complaint: e.target.value })} placeholder="مثال: ألم عند المضغ في الضرس العلوي الأيسر منذ 3 أيام…" />
          </Field>
          <Field label="التشخيص السريري">
            <TArea value={session.diagnosis} onChange={(e) => patch({ diagnosis: e.target.value })} placeholder="مثال: تسوس عميق ملامس للّب — السن 26…" />
          </Field>
        </div>
      </section>

      {/* تقرير العمل — يرتبط تلقائياً بالعودات والمتابعة */}
      <section className="card p-5 anim-fade relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-jade via-[#3fd0c0] to-transparent" />
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
          <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-pine text-[#7fe0d4]"><IconPencil className="w-4.5 h-4.5" /></span>
            تقرير العمل السريري
            <span className="chip bg-mist text-soft !text-[9px]">يُحفَظ لحظياً · يُرفق بملف المريض والعودات</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={copyReport}
              disabled={!session.summary.trim()}
              className={`btn-ghost !h-9 !px-3 !text-[11px] ${copied ? "!bg-mint-soft !text-[#1d6b47] !border-mint" : ""} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {copied ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
              {copied ? "نُسخ" : "نسخ التقرير"}
            </button>
            <button
              onClick={generateReport}
              disabled={typing || session.procedures.length === 0}
              className="btn-primary !h-9 !px-3.5 !text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
              title={session.procedures.length === 0 ? "أضف إجراءً واحداً على الأقل ليُبنى التقرير من بيانات الجلسة" : "يكتب التقرير من بيانات الجلسة حرفاً حرفاً"}
            >
              <IconSpark className={`w-3.5 h-3.5 ${typing ? "pulse-soft" : ""}`} />
              {typing ? "جارٍ التوليد…" : "توليد تلقائي"}
            </button>
          </div>
        </div>
        <div className="relative">
          <TArea
            value={session.summary}
            onChange={(e) => patch({ summary: e.target.value })}
            placeholder="اكتب تقرير العمل السريري… أو اضغط «توليد تلقائي» ليُكتب من الشكوى والتشخيص والإجراءات والأسنان والأدوية والتوصية."
            className="!min-h-28 leading-relaxed font-medium"
          />
          {typing && (
            <span className="absolute top-2.5 end-2.5 chip bg-pine text-[#7fe0d4] !py-1 anim-pop">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3fd0c0] pulse-dot" />
              يكتب الآن<span className="pulse-soft">▌</span>
            </span>
          )}
        </div>
        {session.summary.trim().length > 0 && !typing && (
          <p className="text-[10px] font-bold text-soft mt-2 stat-num" dir="ltr">{session.summary.length} حرفاً — يظهر في «الجلسات المكتملة» وملف المريض</p>
        )}
      </section>

      {/* مخطط العمل السريري — خريطة + اختيار متعدد + مراحل الجلسات */}
      <WorkPlanSection session={session} patch={patch} age={p?.age ?? 30} baseTeeth={props.mergedTeeth} onSetTooth={props.setTooth} />
    </div>
  );
}

/* ============================ تبويب الحسابات ============================ */

function AccountsTab({ patientId, invoices }: { patientId: string; invoices: import("../store").Invoice[] }) {
  const { patientBalance } = useStore();
  const money = useMoney();
  const [printInv, setPrintInv] = useState<import("../store").Invoice | null>(null);

  const billed = invoices.reduce((s, i) => s + invoiceTotal(i), 0);
  const paidSum = invoices.reduce((s, i) => s + Math.min(i.paid, invoiceTotal(i)), 0);
  const balance = patientBalance(patientId);

  const stats = [
    { label: "إجمالي المفوتر", v: billed, cls: "text-ink" },
    { label: "المحصَّل", v: paidSum, cls: "text-mint" },
    { label: "المتبقي (دين)", v: balance, cls: balance > 0 ? "text-coral" : "text-mint" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <div key={s.label} className="card card-hover p-4 anim-rise" style={{ animationDelay: `${i * 70}ms` }}>
            <p className="text-[11px] font-bold text-soft">{s.label}</p>
            <p className={`stat-num text-2xl mt-1 ${s.cls}`}>{money(s.v)}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-mint-soft text-[#1d6b47]"><IconReceipt className="w-4.5 h-4.5" /></span>
            فواتير المريض
          </h3>
          <span className="chip bg-mist text-soft stat-num">{invoices.length} فاتورة</span>
        </div>
        {invoices.length === 0 ? (
          <EmptyState icon={<IconWallet className="w-6 h-6" />} title="لا فواتير سابقة" desc="عند إنهاء الجلسة بإجراءات ستُنشأ الفاتورة هنا تلقائياً." />
        ) : (
          <ul className="divide-y divide-line/60">
            {invoices.map((inv, i) => {
              const st = invoiceStatus(inv);
              const t = invoiceTotal(inv);
              return (
                <li key={inv.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-jade-soft/25 transition-colors anim-fade" style={{ animationDelay: `${i * 40}ms` }}>
                  <span className="stat-num text-sm text-jade-deep w-24 shrink-0" dir="ltr">{inv.number}</span>
                  <span className="text-xs text-soft w-28">{fmtDate(inv.date)}</span>
                  <span className="text-xs text-soft flex-1 min-w-28">{inv.items.reduce((s, x) => s + x.qty, 0)} بنود</span>
                  <span className="stat-num text-sm text-ink">{money(t)}</span>
                  <Badge cls={INV_META[st].cls}>{INV_META[st].label}</Badge>
                  <button onClick={() => setPrintInv(inv)} className="icon-btn !w-8 !h-8" title="طباعة الفاتورة" aria-label="طباعة">
                    <IconPrinter className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {printInv && (
        <PrintModal open onClose={() => setPrintInv(null)} title={`طباعة الفاتورة ${printInv.number}`}>
          <InvoicePrint inv={printInv} />
        </PrintModal>
      )}
    </div>
  );
}

/* ============================ تبويب الروشتات والأدوية ============================ */

function RxTab({ session, patch, patientId, allergy }: { session: ClinicalSession; patch: (pp: Partial<ClinicalSession>) => void; patientId: string; allergy: string }) {
  const { db, doctorById } = useStore();
  const { push } = useToast();
  const [customMed, setCustomMed] = useState("");
  const [printRx, setPrintRx] = useState<import("../store").Prescription | null>(null);

  const pastRx = db.prescriptions.filter((r) => r.patientId === patientId);
  const hasAllergy = allergy && allergy !== "لا يوجد";
  const watched = session.meds.map((m) => ({ m, w: watchFor(m.name), hit: hasAllergy ? allergyHit(m.name, allergy) : false }));
  const anyDanger = watched.some((x) => x.hit);

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* منشئ روشتة الجلسة */}
      <section className="card p-5">
        <h3 className="font-display font-bold text-lg text-ink mb-3.5 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-soft text-sky"><IconSpark className="w-4.5 h-4.5" /></span>
          روشتة الجلسة الحالية
        </h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {MED_PRESETS.map((m) => (
            <button
              key={m.name}
              onClick={() => patch({ meds: [...session.meds, { ...m }] })}
              className="chip bg-mist text-soft hover:bg-sky-soft hover:text-sky cursor-pointer transition-colors !py-1.5"
            >
              <IconPlus className="w-3 h-3" />
              {m.name.split(" ")[0]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          <TInput value={customMed} onChange={(e) => setCustomMed(e.target.value)} placeholder="دواء آخر… مثال: أسيتيل سيستئين" />
          <button
            className="btn-soft !px-3 shrink-0"
            onClick={() => {
              if (customMed.trim().length < 2) return push("warn", "اكتب اسم الدواء");
              patch({ meds: [...session.meds, { name: customMed.trim(), dose: "حسب إرشاد الصيدلي", freq: "حسب الإرشاد", duration: "—" }] });
              setCustomMed("");
            }}
          >
            <IconPlus className="w-4 h-4" />
          </button>
        </div>
        {session.meds.length === 0 ? (
          <p className="text-xs text-soft bg-mist rounded-lg px-4 py-3.5 text-center">لا أدوية بعد — أضف من الاختصارات أعلاه.</p>
        ) : (
          <ul className="space-y-2">
            {watched.map(({ m, w, hit }, i) => (
              <li key={i} className={`rounded-lg border bg-white px-3 py-2.5 anim-fade ${hit ? "border-coral ring-2 ring-coral/20" : w ? "border-amber/60" : "border-line"}`}>
                <div className="flex items-start gap-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                      {m.name}
                      {hit && <IconAlert className="w-3.5 h-3.5 text-coral" />}
                      {w && !hit && <IconAlert className="w-3.5 h-3.5 text-amber" />}
                    </p>
                    <p className="text-[10px] text-soft mt-0.5">{m.dose} · {m.freq} · {m.duration}</p>
                    {hit && <p className="text-[10px] font-bold text-coral mt-1">تعارض مع حساسية المريض المسجلة ({allergy})!</p>}
                  </div>
                  <button className="icon-btn !w-7 !h-7 hover:!bg-coral-soft hover:!text-coral shrink-0" onClick={() => patch({ meds: session.meds.filter((_, j) => j !== i) })} aria-label="حذف">
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Field label="تعليمات تُطبع على الروشتة">
            <TArea value={session.medNotes} onChange={(e) => patch({ medNotes: e.target.value })} placeholder="مثال: مضمضة ماء وملح، كمادات باردة…" className="!min-h-16" />
          </Field>
        </div>
      </section>

      <div className="space-y-5">
        {/* رصد الأعراض الجانبية */}
        <section className={`card p-5 ${anyDanger ? "!border-coral/50" : ""}`}>
          <h3 className="font-display font-bold text-lg text-ink mb-3 flex items-center gap-2">
            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${anyDanger ? "bg-coral-soft text-coral" : "bg-amber-soft text-[#a06410]"}`}>
              <IconAlert className="w-4.5 h-4.5" />
            </span>
            أدوية ذات أعراض جانبية — رصد تلقائي
          </h3>
          {session.meds.length === 0 ? (
            <p className="text-xs text-soft bg-mist rounded-lg px-4 py-3.5 text-center">أضف أدوية للروشتة ليُفحص أمانها تلقائياً ضد حساسية المريض ومرجعية الأعراض.</p>
          ) : (
            <ul className="space-y-2.5">
              {watched.filter((x) => x.w || x.hit).map(({ m, w, hit }, i) => (
                <li key={i} className={`rounded-xl border p-3.5 anim-fade ${hit ? "border-coral/60 bg-coral-soft/50" : "border-amber/50 bg-amber-soft/40"}`}>
                  <p className={`text-xs font-bold ${hit ? "text-coral" : "text-[#7a4c08]"}`}>{m.name.split(" ")[0]} — {hit ? "تعارض مع الحساسية" : "أعراض جانبية محتملة"}</p>
                  {w && (
                    <>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {w.side.map((s) => (
                          <span key={s} className="chip bg-white/80 text-soft !text-[9px]">{s}</span>
                        ))}
                      </div>
                      <p className={`text-[10px] font-bold mt-2 leading-relaxed ${hit ? "text-coral" : "text-[#7a4c08]"}`}>{w.caution}</p>
                    </>
                  )}
                </li>
              ))}
              {!watched.some((x) => x.w || x.hit) && (
                <li className="rounded-xl border border-mint/50 bg-mint-soft/50 p-3.5 text-xs font-bold text-[#1d6b47] flex items-center gap-2">
                  <IconCheck className="w-4 h-4" />
                  أدوية الجلسة آمنة — لا أعراض جانبية مسجلة ولا تعارض مع الحساسية.
                </li>
              )}
            </ul>
          )}
        </section>

        {/* الروشتات السابقة */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
            <h3 className="font-display font-bold text-lg text-ink">روشتات سابقة</h3>
            <span className="chip bg-mist text-soft stat-num">{pastRx.length}</span>
          </div>
          {pastRx.length === 0 ? (
            <p className="text-xs text-soft px-5 py-5 text-center">لا روشتات سابقة في الملف.</p>
          ) : (
            <ul className="divide-y divide-line/60 max-h-56 overflow-y-auto">
              {pastRx.map((rx) => (
                <li key={rx.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="stat-num text-xs text-jade-deep w-20 shrink-0">{fmtDate(rx.date)}</span>
                  <p className="text-[11px] font-bold text-ink flex-1 truncate">{rx.items.map((it) => it.name.split(" ")[0]).join(" · ")}</p>
                  <span className="text-[10px] text-soft hidden sm:block">{doctorById(rx.doctorId)?.name}</span>
                  <button onClick={() => setPrintRx(rx)} className="icon-btn !w-8 !h-8" title="طباعة" aria-label="طباعة">
                    <IconPrinter className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {printRx && (
        <PrintModal open onClose={() => setPrintRx(null)} title="طباعة الروشتة">
          <RxPrint rx={printRx} />
        </PrintModal>
      )}
    </div>
  );
}

/* ============================ تبويب الحجوزات ============================ */

function ApptsTab({ appts }: { appts: import("../store").Appointment[] }) {
  const { serviceById, doctorById } = useStore();
  const sorted = [...appts].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
        <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-soft text-sky"><IconCalendar className="w-4.5 h-4.5" /></span>
          السجل الكامل للحجوزات
        </h3>
        <span className="chip bg-mist text-soft stat-num">{appts.length} موعد</span>
      </div>
      {sorted.length === 0 ? (
        <EmptyState icon={<IconCalendar className="w-6 h-6" />} title="لا حجوزات في السجل" />
      ) : (
        <ul className="divide-y divide-line/60 max-h-[520px] overflow-y-auto">
          {sorted.map((a, i) => {
            const meta = APPT_META[a.status];
            const upcoming = a.date >= today(0) && (a.status === "confirmed" || a.status === "waiting");
            return (
              <li key={a.id} className={`flex flex-wrap items-center gap-3 px-5 py-3.5 anim-fade ${upcoming ? "bg-jade-soft/30" : ""}`} style={{ animationDelay: `${i * 30}ms` }}>
                <span className={`stat-num text-sm w-24 shrink-0 ${upcoming ? "text-jade-deep" : "text-ink"}`}>{fmtDate(a.date)}</span>
                <span className="stat-num text-xs text-soft w-12 shrink-0">{a.time}</span>
                <div className="flex-1 min-w-36">
                  <p className="text-sm font-bold text-ink truncate">{serviceById(a.serviceId)?.name}</p>
                  <p className="text-[11px] text-soft">{doctorById(a.doctorId)?.name}</p>
                </div>
                {upcoming && <span className="chip bg-jade text-white !text-[9px]">قادم</span>}
                <Badge cls={meta.cls}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                  {meta.label}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ============================ تبويب الزراعة ============================ */

const IMP_STATUS_CLS: Record<Implant["status"], string> = {
  "مخطط له": "bg-sky-soft text-sky",
  "مرحلة الالتئام": "bg-amber-soft text-[#a06410]",
  "مكتمل": "bg-mint-soft text-[#1d6b47]",
};

function ImplantsTab({ patientId, teeth }: { patientId: string; teeth: Partial<Record<number, ToothStatus>> }) {
  const { db, dispatch, doctorById } = useStore();
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState<number | "new" | null>(null);
  const implants = db.implants.filter((r) => r.patientId === patientId);
  const missing = Object.entries(teeth).filter(([, s]) => s === "missing").map(([t]) => Number(t));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-jade-soft text-jade-deep"><IconImplant className="w-4.5 h-4.5" /></span>
            سجل الزراعة
          </h3>
          <span className="chip bg-mist text-soft stat-num">{implants.length}</span>
        </div>
        <button className="btn-soft !h-9 !text-xs" onClick={() => setShowAdd("new")}>
          <IconPlus className="w-3.5 h-3.5" />
          تسجيل زرعة
        </button>
      </div>

      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-amber/60 bg-amber-soft/40 px-4 py-3">
          <span className="text-[11px] font-bold text-[#7a4c08]">أسنان مفقودة مرشحة للزراعة:</span>
          {missing.map((t) => (
            <button key={t} onClick={() => setShowAdd(t)} className="chip bg-white text-[#a06410] border border-amber/50 cursor-pointer hover:bg-amber hover:text-white transition-colors stat-num">
              <IconTooth className="w-3 h-3" />
              سن {t}
            </button>
          ))}
        </div>
      )}

      {implants.length === 0 ? (
        <div className="card"><EmptyState icon={<IconImplant className="w-6 h-6" />} title="لا زراعة مسجلة" desc="سجّل الزرعات الحالية أو المخطط لها لهذا المريض." /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {implants.map((r, i) => (
            <div key={r.id} className="card card-hover p-4 anim-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-pine text-[#7fe0d4]">
                    <IconImplant className="w-6 h-6" />
                  </span>
                  <div>
                    <p className="font-display font-bold text-lg text-ink leading-none">سن <span className="stat-num">{r.tooth}</span></p>
                    <p className="text-[11px] text-soft mt-1 font-semibold">{r.brand}</p>
                  </div>
                </div>
                <Badge cls={IMP_STATUS_CLS[r.status]}>{r.status}</Badge>
              </div>
              {r.notes && <p className="text-[11px] text-soft mt-3 leading-relaxed bg-mist rounded-lg px-3 py-2">{r.notes}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-line/70">
                <p className="text-[10px] font-bold text-soft">{fmtDate(r.date)} · {doctorById(r.doctorId)?.name}</p>
                <TwoStepDelete onConfirm={() => { dispatch({ type: "DELETE_IMPLANT", id: r.id }); push("warn", "حُذف سجل الزرعة", `سن ${r.tooth}`); }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd !== null && <ImplantModal patientId={patientId} tooth={typeof showAdd === "number" ? showAdd : undefined} onClose={() => setShowAdd(null)} />}
    </div>
  );
}

function ImplantModal({ patientId, tooth, onClose }: { patientId: string; tooth?: number; onClose: () => void }) {
  const { db, dispatch, patientById } = useStore();
  const { push } = useToast();
  const [t, setT] = useState(String(tooth ?? ""));
  const [brand, setBrand] = useState(IMPLANT_BRANDS[0]);
  const [status, setStatus] = useState<Implant["status"]>("مخطط له");
  const [date, setDate] = useState(today(0));
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  const save = () => {
    if (!t) return setErr("اختر رقم السن.");
    const r: Implant = { id: uid(), patientId, tooth: Number(t), brand, date, status, doctorId: db.doctors[0]?.id ?? "d1", notes: notes.trim() || undefined };
    dispatch({ type: "ADD_IMPLANT", r });
    push("success", "سُجّلت الزرعة", `${patientById(patientId)?.name} — سن ${t} (${brand})`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="تسجيل زرعة جديدة" subtitle="تُحفظ في السجل الدائم لملف المريض"
      footer={<><button className="btn-ghost" onClick={onClose}>إلغاء</button><button className="btn-primary" onClick={save}>حفظ الزرعة</button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="رقم السن *">
          <TSelect value={t} onChange={(e) => setT(e.target.value)}>
            <option value="">— اختر —</option>
            {FDI.map((n) => <option key={n} value={n}>سن {n}</option>)}
          </TSelect>
        </Field>
        <Field label="نظام الزرعة">
          <TSelect value={brand} onChange={(e) => setBrand(e.target.value)}>
            {IMPLANT_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </TSelect>
        </Field>
        <Field label="الحالة">
          <TSelect value={status} onChange={(e) => setStatus(e.target.value as Implant["status"])}>
            {IMPLANT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </TSelect>
        </Field>
        <Field label="التاريخ">
          <TInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="ملاحظات جراحية">
            <TArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مقاس الغرسة، ارتفاع العظم، تعليمات ما بعد الجراحة…" />
          </Field>
        </div>
      </div>
      {err && <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}

/* ============================ تبويب التركيبات ============================ */

function ProstheticsTab({ patientId }: { patientId: string }) {
  const { db, dispatch, doctorById } = useStore();
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const list = db.prosthetics.filter((r) => r.patientId === patientId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-soft text-[#a06410]"><IconCrown className="w-4.5 h-4.5" /></span>
          التركيبات والتعويضات
          <span className="chip bg-mist text-soft stat-num">{list.length}</span>
        </h3>
        <button className="btn-soft !h-9 !text-xs" onClick={() => setShowAdd(true)}>
          <IconPlus className="w-3.5 h-3.5" />
          تركيبة جديدة
        </button>
      </div>

      {list.length === 0 ? (
        <div className="card"><EmptyState icon={<IconCrown className="w-6 h-6" />} title="لا تركيبات مسجلة" desc="تيجان، جسور، فينير أو أطقم — سجّلها هنا." /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map((r, i) => (
            <div key={r.id} className="card card-hover p-4 anim-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-soft text-[#a06410]"><IconCrown className="w-5 h-5" /></span>
                  <div>
                    <p className="font-bold text-sm text-ink">{r.kind}</p>
                    <p className="text-[11px] text-soft mt-0.5 stat-num">الأسنان: {r.teeth}</p>
                  </div>
                </div>
                <Badge cls={r.status === "مركّب" ? "bg-mint-soft text-[#1d6b47]" : "bg-amber-soft text-[#a06410]"}>{r.status}</Badge>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-line/70">
                <p className="text-[10px] font-bold text-soft">{r.lab} · {fmtDate(r.date)} · {doctorById(r.doctorId)?.name}</p>
                <TwoStepDelete onConfirm={() => { dispatch({ type: "DELETE_PROSTHETIC", id: r.id }); push("warn", "حُذفت التركيبة", r.kind); }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <ProstheticModal patientId={patientId} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function ProstheticModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const { db, dispatch, patientById } = useStore();
  const { push } = useToast();
  const [kind, setKind] = useState(PROSTHETIC_KINDS[0]);
  const [teeth, setTeeth] = useState("");
  const [lab, setLab] = useState("");
  const [status, setStatus] = useState<Prosthetic["status"]>("قيد التصنيع");
  const [date, setDate] = useState(today(0));
  const [err, setErr] = useState("");

  const save = () => {
    if (teeth.trim().length < 1) return setErr("حدد رقم السن أو الأسنان (مثل: 46 أو 14–16).");
    const r: Prosthetic = { id: uid(), patientId, kind, teeth: teeth.trim(), date, lab: lab.trim() || "مختبر خارجي", status, doctorId: db.doctors[0]?.id ?? "d1" };
    dispatch({ type: "ADD_PROSTHETIC", r });
    push("success", "سُجّلت التركيبة", `${patientById(patientId)?.name} — ${kind} (${r.teeth})`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="تركيبة جديدة" subtitle="تاج، جسر، فينير أو طقم"
      footer={<><button className="btn-ghost" onClick={onClose}>إلغاء</button><button className="btn-primary" onClick={save}>حفظ التركيبة</button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="النوع">
          <TSelect value={kind} onChange={(e) => setKind(e.target.value)}>
            {PROSTHETIC_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </TSelect>
        </Field>
        <Field label="الأسنان *">
          <TInput value={teeth} onChange={(e) => setTeeth(e.target.value)} placeholder="46 أو 14–16" dir="ltr" />
        </Field>
        <Field label="المختبر">
          <TInput value={lab} onChange={(e) => setLab(e.target.value)} placeholder="مختبر الأسنان الحديث" />
        </Field>
        <Field label="الحالة">
          <TSelect value={status} onChange={(e) => setStatus(e.target.value as Prosthetic["status"])}>
            <option value="قيد التصنيع">قيد التصنيع</option>
            <option value="مركّب">مركّب</option>
          </TSelect>
        </Field>
        <Field label="التاريخ">
          <TInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      {err && <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}

/* ============================ تبويب التقويم ============================ */

function OrthoTab({ patientId }: { patientId: string }) {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [modal, setModal] = useState<"new" | OrthoCase | null>(null);
  const cases = db.orthoCases.filter((r) => r.patientId === patientId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-soft text-sky"><IconBraces className="w-4.5 h-4.5" /></span>
          حالات التقويم
          <span className="chip bg-mist text-soft stat-num">{cases.length}</span>
        </h3>
        <button className="btn-soft !h-9 !text-xs" onClick={() => setModal("new")}>
          <IconPlus className="w-3.5 h-3.5" />
          حالة تقويم جديدة
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="card"><EmptyState icon={<IconBraces className="w-6 h-6" />} title="لا حالات تقويم" desc="افتح حالة تقويم وتابع تقدمها شهرياً." /></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {cases.map((c, i) => {
            const overdue = c.nextAdjust < today(0);
            return (
              <div key={c.id} className="card card-hover p-5 anim-rise" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display font-bold text-lg text-ink">{c.kind}</p>
                  <span className={`chip ${overdue ? "bg-coral-soft text-coral" : "bg-sky-soft text-sky"}`}>
                    <IconClock className="w-3 h-3" />
                    {overdue ? "تأخر موعد الشد!" : `الشد القادم ${fmtDate(c.nextAdjust)}`}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                    <span className="text-soft">تقدم الخطة العلاجية</span>
                    <span className="stat-num text-sky text-sm">{c.progress}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-mist overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-l from-sky to-jade anim-grow-w" style={{ width: `${c.progress}%` }} />
                  </div>
                </div>
                {c.notes && <p className="text-[11px] text-soft mt-3 leading-relaxed bg-mist rounded-lg px-3 py-2">{c.notes}</p>}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-line/70">
                  <p className="text-[10px] font-bold text-soft">بدأ {fmtDate(c.started)}</p>
                  <div className="flex items-center gap-2">
                    <button className="text-[11px] font-bold text-sky bg-sky-soft hover:bg-sky hover:text-white rounded-lg px-3 py-2 cursor-pointer transition-colors" onClick={() => setModal(c)}>
                      تحديث التقدم
                    </button>
                    <TwoStepDelete onConfirm={() => { dispatch({ type: "DELETE_ORTHO", id: c.id }); push("warn", "حُذفت حالة التقويم", c.kind); }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && <OrthoModal patientId={patientId} initial={modal === "new" ? undefined : modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function OrthoModal({ patientId, initial, onClose }: { patientId: string; initial?: OrthoCase; onClose: () => void }) {
  const { dispatch, patientById } = useStore();
  const { push } = useToast();
  const [kind, setKind] = useState(initial?.kind ?? ORTHO_KINDS[0]);
  const [started, setStarted] = useState(initial?.started ?? today(-30));
  const [nextAdjust, setNextAdjust] = useState(initial?.nextAdjust ?? today(7));
  const [progress, setProgress] = useState(initial?.progress ?? 10);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const save = () => {
    const r: OrthoCase = { id: initial?.id ?? uid(), patientId, kind, started, nextAdjust, progress, notes: notes.trim() || undefined };
    dispatch({ type: initial ? "UPDATE_ORTHO" : "ADD_ORTHO", r });
    push("success", initial ? "حُدّثت حالة التقويم" : "فُتحت حالة تقويم", `${patientById(patientId)?.name} — ${progress}%`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={initial ? "تحديث حالة التقويم" : "حالة تقويم جديدة"} subtitle="تابع نسبة الإنجاز ومواعيد شد الأقواس"
      footer={<><button className="btn-ghost" onClick={onClose}>إلغاء</button><button className="btn-primary" onClick={save}>{initial ? "حفظ التحديث" : "فتح الحالة"}</button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="نوع التقويم">
          <TSelect value={kind} onChange={(e) => setKind(e.target.value)}>
            {ORTHO_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </TSelect>
        </Field>
        <Field label="تاريخ البدء">
          <TInput type="date" value={started} onChange={(e) => setStarted(e.target.value)} />
        </Field>
        <Field label="موعد الشد القادم">
          <TInput type="date" value={nextAdjust} onChange={(e) => setNextAdjust(e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label={`التقدم العلاجي — ${progress}%`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-[#3a86c4] cursor-pointer"
            />
            <div className="h-2 rounded-full bg-mist overflow-hidden mt-2">
              <div className="h-full rounded-full bg-gradient-to-l from-sky to-jade transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="ملاحظات الخطة">
            <TArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مرحلة الإطباق، القلوع، المطاطات…" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

/* ============================ تبويب الأشعة ============================ */

function XrayThumb({ kind }: { kind: string }) {
  const isPano = kind.includes("بانورامية");
  const isCeph = kind.includes("سيفالومترية");
  const isCbct = kind.includes("CBCT");
  return (
    <svg viewBox="0 0 96 72" className="w-24 h-[72px] rounded-lg shrink-0 border border-line" aria-hidden="true">
      <rect width="96" height="72" rx="8" fill="#10211d" />
      <rect x="4" y="4" width="88" height="64" rx="5" fill="#17312b" />
      {isPano && (
        <g fill="none" stroke="#d8e6e2" strokeOpacity="0.85" strokeWidth="2">
          <path d="M14 46 Q48 18 82 46" strokeWidth="1.4" strokeOpacity="0.5" />
          {[16, 24, 32, 40, 48, 56, 64, 72, 80].map((x, i) => (
            <rect key={x} x={x - 3} y={34 + Math.abs(x - 48) * 0.22 - (i % 2) * 2} width="6" height="9" rx="2" fill="#d8e6e2" fillOpacity="0.8" stroke="none" />
          ))}
        </g>
      )}
      {isCeph && (
        <g fill="none" stroke="#d8e6e2" strokeOpacity="0.85" strokeWidth="1.6">
          <path d="M55 14 Q74 18 72 34 Q70 44 60 46 L58 56 L40 56 Q36 40 40 28 Q44 16 55 14 Z" />
          <path d="M60 46 L70 44 M46 34 L66 32" strokeOpacity="0.5" />
          <circle cx="52" cy="30" r="2.5" fill="#d8e6e2" stroke="none" />
        </g>
      )}
      {isCbct && (
        <g fill="none" stroke="#d8e6e2" strokeOpacity="0.85">
          <circle cx="48" cy="36" r="22" strokeWidth="1.6" />
          <circle cx="48" cy="36" r="14" strokeWidth="1.2" strokeOpacity="0.6" />
          <circle cx="48" cy="36" r="6" strokeWidth="1.2" strokeOpacity="0.5" />
          <path d="M48 10 V62 M22 36 H74" strokeWidth="0.8" strokeOpacity="0.4" />
          <circle cx="48" cy="36" r="2.5" fill="#d8e6e2" stroke="none" />
        </g>
      )}
      {!isPano && !isCeph && !isCbct && (
        <g fill="none" stroke="#d8e6e2" strokeOpacity="0.9" strokeWidth="1.8">
          <path d="M38 14 Q48 8 58 14 Q62 20 60 30 L56 58 Q52 62 50 54 L48 44 L46 54 Q44 62 40 58 L36 30 Q34 20 38 14 Z" />
          <path d="M48 20 V40" strokeWidth="1.2" strokeOpacity="0.5" />
        </g>
      )}
      <rect x="8" y="8" width="18" height="6" rx="2" fill="#3fd0c0" fillOpacity="0.25" />
    </svg>
  );
}

function XraysTab({ patientId }: { patientId: string }) {
  const { db, dispatch, doctorById } = useStore();
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const list = db.xrays.filter((r) => r.patientId === patientId).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-pine text-[#7fe0d4]"><IconXray className="w-4.5 h-4.5" /></span>
          سجل الأشعة والتصوير
          <span className="chip bg-mist text-soft stat-num">{list.length}</span>
        </h3>
        <button className="btn-soft !h-9 !text-xs" onClick={() => setShowAdd(true)}>
          <IconPlus className="w-3.5 h-3.5" />
          تسجيل أشعة
        </button>
      </div>

      {list.length === 0 ? (
        <div className="card"><EmptyState icon={<IconXray className="w-6 h-6" />} title="لا صور شعاعية" desc="سجّل البانوراما والسيفالو والتقارير الشعاعية هنا." /></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map((r, i) => (
            <div key={r.id} className="card card-hover p-4 flex gap-4 anim-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <XrayThumb kind={r.kind} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm text-ink truncate">{r.kind}</p>
                  <TwoStepDelete onConfirm={() => { dispatch({ type: "DELETE_XRAY", id: r.id }); push("warn", "حُذف سجل الأشعة", r.kind); }} />
                </div>
                <p className="text-[10px] font-bold text-soft mt-0.5">{fmtDate(r.date)} · {doctorById(r.doctorId)?.name}</p>
                <p className="text-[11px] text-soft mt-2 leading-relaxed bg-mist rounded-lg px-3 py-2">{r.findings}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <XrayModal patientId={patientId} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function XrayModal({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const { db, dispatch, patientById } = useStore();
  const { push } = useToast();
  const [kind, setKind] = useState(XRAY_KINDS[0]);
  const [date, setDate] = useState(today(0));
  const [findings, setFindings] = useState("");
  const [err, setErr] = useState("");

  const save = () => {
    if (findings.trim().length < 5) return setErr("اكتب التقرير الشعاعي (النتائج).");
    const r: XrayRec = { id: uid(), patientId, kind, date, findings: findings.trim(), doctorId: db.doctors[0]?.id ?? "d1" };
    dispatch({ type: "ADD_XRAY", r });
    push("success", "سُجّلت الأشعة", `${patientById(patientId)?.name} — ${kind}`);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="تسجيل أشعة جديدة" subtitle="النوع والتاريخ والتقرير الشعاعي"
      footer={<><button className="btn-ghost" onClick={onClose}>إلغاء</button><button className="btn-primary" onClick={save}>حفظ السجل</button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="نوع الأشعة">
          <TSelect value={kind} onChange={(e) => setKind(e.target.value)}>
            {XRAY_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </TSelect>
        </Field>
        <Field label="التاريخ">
          <TInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="col-span-2">
          <Field label="التقرير الشعاعي *">
            <TArea value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="النتائج والملاحظات التشخيصية…" />
          </Field>
        </div>
      </div>
      {err && <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}
