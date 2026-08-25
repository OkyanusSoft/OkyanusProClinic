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
