import React, { useEffect, useMemo, useState } from "react";
import {
  APPT_META,
  fmtDateFull,
  today,
  useMoney,
  useStore,
  type ClinicalSession,
  type ToothStatus,
} from "../store";
import {
  IconAlert,
  IconCheck,
  IconClock,
  IconPlus,
  IconPulse,
  IconReceipt,
  IconSpark,
  IconStetho,
  IconTooth,
  IconTrash,
  IconUserPlus,
} from "../icons";
import { Avatar, Badge, EmptyState, Field, Modal, TArea, TInput, TSelect, useToast } from "../components/ui";
import DentalChart from "../components/DentalChart";

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

/* ============================ الصفحة ============================ */

export default function SessionPage() {
  const { db, dispatch, patientById, serviceById, doctorById } = useStore();
  const { push } = useToast();
  const [doctorId, setDoctorId] = useState(db.doctors[0]?.id ?? "d1");
  const [adHoc, setAdHoc] = useState(false);
  const [adHocPatient, setAdHocPatient] = useState("");

  const open = db.sessions.find((s) => s.status === "open");

  const queue = useMemo(
    () =>
      db.appointments
        .filter((a) => a.date === today(0) && (a.status === "confirmed" || a.status === "waiting") && a.id !== open?.apptId)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [db.appointments, open]
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
          {db.doctors.map((d) => (
            <button
              key={d.id}
              onClick={() => setDoctorId(d.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-all ${
                doctorId === d.id ? "bg-pine border-pine text-white shadow-md" : "bg-white border-line text-ink hover:border-jade/50"
              }`}
            >
              <Avatar name={d.name} size="w-7 h-7 text-[9px]" />
              <span className="text-xs font-bold">{d.name.replace("د. ", "د. ")}</span>
            </button>
          ))}
        </div>
      </div>

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
              const val = s.procedures.reduce((sum, pr) => sum + (serviceById(pr.serviceId)?.price ?? 0), 0);
              return (
                <li key={s.id} className="card card-hover p-4 anim-fade" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name={p?.name ?? "؟"} size="w-10 h-10 text-xs" />
                    <div className="flex-1 min-w-44">
                      <p className="font-bold text-sm text-ink">{p?.name}</p>
                      <p className="text-[11px] text-soft mt-0.5 truncate">
                        {s.procedures.map((pr) => serviceById(pr.serviceId)?.name).join(" · ") || "استشارة"}
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
                      {inv ? (
                        <span className="chip bg-mint-soft text-[#1d6b47]"><IconReceipt className="w-3.5 h-3.5" /> {inv.number}</span>
                      ) : val > 0 ? (
                        <span className="chip bg-mist text-soft">قيمة الإجراءات</span>
                      ) : null}
                      <span className="chip bg-mist text-soft"><IconClock className="w-3.5 h-3.5" /> {fmtDur(new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime())}</span>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="stat-num text-sm text-ink" dir="ltr">{fmtClock(s.startedAt)}–{fmtClock(s.endedAt!)}</p>
                      {val > 0 && <Money v={val} />}
                      <p className="text-[10px] text-soft mt-0.5">{d?.name}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
            {db.patients.map((p) => (
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

/* ============================ محطة الجلسة ============================ */

function Workstation({ session }: { session: ClinicalSession }) {
  const { db, dispatch, patientById, serviceById, doctorById } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const p = patientById(session.patientId);
  const [paid, setPaid] = useState("0");
  const [procService, setProcService] = useState("");
  const [procTooth, setProcTooth] = useState("");
  const [customMed, setCustomMed] = useState("");
  const [armCancel, setArmCancel] = useState(false);

  const now = useNowTick(1000);
  const elapsed = Math.max(0, now - new Date(session.startedAt).getTime());
  const mm = Math.floor(elapsed / 60000);
  const ss = Math.floor((elapsed % 60000) / 1000);
  const hh = Math.floor(mm / 60);
  const timer = hh > 0 ? `${hh}:${pad(mm % 60)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;

  useEffect(() => {
    if (!armCancel) return;
    const t = setTimeout(() => setArmCancel(false), 2800);
    return () => clearTimeout(t);
  }, [armCancel]);

  const patch = (pp: Partial<ClinicalSession>) => dispatch({ type: "PATCH_SESSION", id: session.id, patch: pp });

  const pendingTeeth = useMemo(
    () => Object.fromEntries(session.teethTreated.map((t) => [t.tooth, t.status])) as Record<number, ToothStatus>,
    [session.teethTreated]
  );
  const mergedTeeth = { ...p?.teeth, ...pendingTeeth };

  const total = session.procedures.reduce((s, pr) => s + (serviceById(pr.serviceId)?.price ?? 0), 0);
  const paidNum = Math.min(Math.max(0, Number(paid) || 0), total);
  const remaining = total - paidNum;

  const stages = [
    { label: "دخول المريض", done: true },
    { label: "الفحص والتشخيص", done: !!(session.complaint.trim() || session.diagnosis.trim()) },
    { label: "الإجراءات العلاجية", done: session.procedures.length > 0 },
    { label: "الروشتة", done: session.meds.length > 0 },
    { label: "الفاتورة والخروج", done: false },
  ];

  const addProc = () => {
    if (!procService) return push("warn", "اختر الإجراء أولاً");
    patch({ procedures: [...session.procedures, { serviceId: procService, tooth: procTooth ? Number(procTooth) : undefined }] });
    setProcService("");
    setProcTooth("");
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
    const invNo = session.procedures.length > 0 ? `INV-${db.nextInv}` : null;
    dispatch({ type: "END_SESSION", id: session.id, paid: paidNum });
    push(
      "success",
      "انتهت الجلسة — خرج المريض",
      invNo
        ? `أُصدرت الفاتورة ${invNo} بإجمالي ${money(total)}${session.meds.length ? " مع روشتة إلكترونية" : ""}`
        : session.meds.length
        ? "أُرفقت روشتة إلكترونية بالملف"
        : "جلسة استشارية بدون فوترة"
    );
  };

  const cancel = () => {
    dispatch({ type: "CANCEL_SESSION", id: session.id });
    push("info", "أُلغيت الجلسة", "أُعيد الموعد إلى قائمة الانتظار دون أي تغييرات.");
  };

  if (!p) return null;
  const hasAllergy = p.allergies && p.allergies !== "لا يوجد";

  return (
    <div className="card !rounded-2xl overflow-hidden anim-pop !border-jade/40 shadow-[0_20px_50px_-20px_rgba(11,47,43,0.35)]">
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

      {/* جسم الجلسة */}
      <div className="p-5 grid lg:grid-cols-3 gap-5 bg-mist/50">
        <div className="lg:col-span-2 space-y-5">
          {/* الفحص والتشخيص */}
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

          {/* الإجراءات */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-mint-soft text-[#1d6b47]"><IconTooth className="w-4.5 h-4.5" /></span>
                الإجراءات والخدمات المنفذة
              </h3>
              <span className="chip bg-mist text-soft stat-num">{session.procedures.length} إجراء</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <TSelect value={procService} onChange={(e) => setProcService(e.target.value)} className="!w-auto flex-1 min-w-44">
                <option value="">— اختر إجراءً من قائمة الأسعار —</option>
                {db.services.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {money(s.price)}</option>
                ))}
              </TSelect>
              <TSelect value={procTooth} onChange={(e) => setProcTooth(e.target.value)} className="!w-32">
                <option value="">بدون سن</option>
                {FDI.map((t) => (
                  <option key={t} value={t}>سن {t}</option>
                ))}
              </TSelect>
              <button className="btn-soft !h-10" onClick={addProc}>
                <IconPlus className="w-4 h-4" />
                إضافة
              </button>
            </div>
            {session.procedures.length === 0 ? (
              <p className="text-xs text-soft bg-mist rounded-lg px-4 py-4 text-center">لم تُضف إجراءات بعد — كل إجراء يُضاف هنا يدخل فاتورة المريض تلقائياً.</p>
            ) : (
              <ul className="divide-y divide-line/70 rounded-xl border border-line overflow-hidden">
                {session.procedures.map((pr, i) => {
                  const s = serviceById(pr.serviceId);
                  return (
                    <li key={i} className="flex items-center gap-3 px-4 py-2.5 bg-white anim-fade">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s?.color }} />
                      <span className="text-sm font-bold text-ink flex-1 truncate">{s?.name}</span>
                      {pr.tooth && <span className="chip bg-amber-soft text-[#a06410]"><IconTooth className="w-3 h-3" /> سن {pr.tooth}</span>}
                      <span className="stat-num text-sm text-ink">{money(s?.price ?? 0)}</span>
                      <button className="icon-btn !w-8 !h-8 hover:!bg-coral-soft hover:!text-coral" onClick={() => patch({ procedures: session.procedures.filter((_, j) => j !== i) })} aria-label="حذف">
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
                <li className="flex items-center justify-between px-4 py-3 bg-jade-soft/60">
                  <span className="text-xs font-bold text-jade-deep">إجمالي الإجراءات — يُضاف للفاتورة</span>
                  <span className="stat-num text-xl font-bold text-jade-deep">{money(total)}</span>
                </li>
              </ul>
            )}
          </section>

          {/* خريطة الأسنان */}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-ink">خريطة الأسنان أثناء الجلسة</h3>
              {session.teethTreated.length > 0 && (
                <span className="chip bg-amber-soft text-[#a06410]">{session.teethTreated.length} تغيير معلّق — يُثبَّت عند الخروج</span>
              )}
            </div>
            <DentalChart teeth={mergedTeeth} onSet={setTooth} />
          </section>
        </div>

        {/* العمود الجانبي */}
        <div className="space-y-5">
          {/* الروشتة */}
          <section className="card p-5">
            <h3 className="font-display font-bold text-lg text-ink mb-3.5 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-soft text-sky"><IconSpark className="w-4.5 h-4.5" /></span>
              الروشتة الإلكترونية
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
                {session.meds.map((m, i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5 anim-fade">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-ink">{m.name}</p>
                      <p className="text-[10px] text-soft mt-0.5">{m.dose} · {m.freq} · {m.duration}</p>
                    </div>
                    <button className="icon-btn !w-7 !h-7 hover:!bg-coral-soft hover:!text-coral shrink-0" onClick={() => patch({ meds: session.meds.filter((_, j) => j !== i) })} aria-label="حذف">
                      <IconTrash className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Field label="تعليمات تُطبع على الروشتة">
              <TArea value={session.medNotes} onChange={(e) => patch({ medNotes: e.target.value })} placeholder="مثال: مضمضة ماء وملح، كمادات باردة، تجنب المضغ على الجهة المعالجة…" className="!min-h-16" />
            </Field>
          </section>

          {/* الفاتورة */}
          <section className="card p-5">
            <h3 className="font-display font-bold text-lg text-ink mb-3.5 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-mint-soft text-[#1d6b47]"><IconReceipt className="w-4.5 h-4.5" /></span>
              فاتورة الجلسة
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-soft font-medium">الإجراءات</span><b className="stat-num">{session.procedures.length}</b></div>
              <div className="flex justify-between"><span className="text-soft font-medium">الإجمالي المستحق</span><b className="stat-num text-lg text-ink">{money(total)}</b></div>
              <div className="pt-2 border-t border-line">
                <label className="label">المبلغ المدفوع عند الخروج</label>
                <TInput type="number" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-soft font-medium">المتبقي على المريض</span>
                <b className={`stat-num ${remaining > 0 ? "text-coral" : "text-mint"}`}>{money(remaining)}</b>
              </div>
            </div>
            <p className="text-[11px] text-soft leading-relaxed mt-3 bg-mist rounded-lg px-3 py-2.5">
              تُنشأ الفاتورة تلقائياً برقم تسلسلي <b className="stat-num" dir="ltr">INV-{db.nextInv}</b> عند إنهاء الجلسة وتُربط بملف المريض.
            </p>
          </section>

          {/* الإجراءات النهائية */}
          <div className="space-y-2.5">
            <button className="btn-primary w-full !h-13 !text-base !rounded-xl shadow-lg" onClick={end} style={{ height: 52 }}>
              <IconCheck className="w-5 h-5" />
              إنهاء الجلسة وخروج المريض
            </button>
            <button
              className={`btn w-full !rounded-xl ${armCancel ? "bg-coral text-white" : "btn-danger"}`}
              onClick={() => (armCancel ? (cancel(), setArmCancel(false)) : setArmCancel(true))}
            >
              {armCancel ? "متأكد؟ ستُلغى كل تغييرات الجلسة" : "إلغاء الجلسة وإعادة المريض للانتظار"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
