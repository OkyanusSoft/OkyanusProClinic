import React, { useEffect, useMemo, useState } from "react";
import {
  addMinutes,
  APPT_META,
  consultServiceOf,
  dayName,
  dstr,
  fmtDate,
  fmtDateFull,
  FU_META,
  invoiceTotal,
  today,
  clinicOf,
  TOOTH_META,
  uid,
  useAuth,
  useMoney,
  useStore,
  type Appointment,
  type ApptStatus,
  type FollowUp,
} from "../store";
import {
  IconAlert,
  IconCalendar,
  IconCalendarPlus,
  IconChat,
  IconCheck,
  IconCopy,
  IconChevronDown,
  IconIdCard,
  IconClock,
  IconPencil,
  IconPlus,
  IconPrinter,
  IconTrash,
  IconReceipt,
  IconSpark,
  IconStetho,
  IconTooth,
  IconUserPlus,
  IconX,
} from "../icons";
import { Avatar, Badge, DateInput, Drop, DropItem, EmptyState, Field, Modal, TArea, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";
import { AppointmentCardPrint, AppointmentsDayPrint, CardPrintModal, CardSheet, FollowUpCardPrint, PrintModal } from "../components/PrintSheet";
import { AddPatientModal } from "./Patients";

/* ساعات الحجز — تُشتق من إعدادات الدوام العامة */
const hoursBetween = (start: string, end: string) => {
  const s = parseInt(start.slice(0, 2), 10);
  const e = parseInt(end.slice(0, 2), 10);
  const arr: string[] = [];
  for (let h = s; h < e; h++) arr.push(`${String(h).padStart(2, "0")}:00`);
  return arr.length ? arr : ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
};

type View = "schedule" | "followups" | "history";

/* أدوات التاريخ */
const dayDiff = (d: string) =>
  Math.round((new Date(d + "T12:00:00").getTime() - new Date(today(0) + "T12:00:00").getTime()) / 86400000);
const dueLabel = (d: string) => {
  const diff = dayDiff(d);
  if (diff < 0) return `متأخرة ${-diff} ${-diff === 1 ? "يوم" : "أيام"}`;
  if (diff === 0) return "مستحقة اليوم";
  if (diff === 1) return "غداً";
  return `بعد ${diff} أيام`;
};
const dueTone = (f: FollowUp) => {
  if (f.status !== "pending") return "bg-mist text-soft";
  const diff = dayDiff(f.dueDate);
  if (diff < 0) return "bg-coral-soft text-coral";
  if (diff === 0) return "bg-amber-soft text-[#a06410]";
  return "bg-sky-soft text-sky";
};
const fmtClock = (iso: string) =>
  new Intl.DateTimeFormat("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const fmtDur = (ms: number) => {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m} دقيقة`;
  return `${Math.floor(m / 60)} س ${m % 60 ? `${m % 60} د` : ""}`.trim();
};

/* ============================ الصفحة ============================ */

interface Props {
  onOpenPatient: (id: string) => void;
  onBook: (patientId?: string, time?: string) => void;
}

export default function AppointmentsPage({ onOpenPatient, onBook }: Props) {
  const { db, dispatch, patientById } = useStore();
  const { apptScope, doctorScopeId } = useAuth();
  const [view, setView] = useState<View>("schedule");
  const [day, setDay] = useState(today(0));
  const [showFu, setShowFu] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);

  const visible = useMemo(
    () => (apptScope ? db.appointments.filter((a) => a.doctorId === apptScope) : db.appointments),
    [db.appointments, apptScope]
  );
  const dayCount = visible.filter((a) => a.date === day && a.status !== "cancelled").length;
  const fuScoped = useMemo(
    () => (doctorScopeId ? db.followUps.filter((f) => f.doctorId === doctorScopeId) : db.followUps),
    [db.followUps, doctorScopeId]
  );
  const pendingCount = fuScoped.filter((f) => f.status === "pending").length;
  const doneSessions = useMemo(
    () => db.sessions.filter((s) => s.status === "done" && (!doctorScopeId || s.doctorId === doctorScopeId)),
    [db.sessions, doctorScopeId]
  );

  const TABS: { key: View; label: string; count: number; icon: (c: string) => React.ReactNode }[] = [
    { key: "schedule", label: "جدول اليوم", count: dayCount, icon: (c) => <IconClock className={c} /> },
    { key: "followups", label: "العودات والمتابعة", count: pendingCount, icon: (c) => <IconCalendarPlus className={c} /> },
    { key: "history", label: "الجلسات المكتملة", count: doneSessions.length, icon: (c) => <IconCheck className={c} /> },
  ];

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">المواعيد والعودات</h1>
          <p className="text-sm text-soft mt-1 flex items-center gap-2.5 flex-wrap">
            {fmtDateFull(day)}
            {apptScope && (
              <span className="chip bg-amber-soft text-[#a06410] !py-1.5">
                <IconStetho className="w-3.5 h-3.5" />
                نطاق {db.doctors.find((d) => d.id === doctorScopeId)?.name ?? "الطبيب"} فقط
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view === "followups" && (
            <button className="btn-soft" onClick={() => setShowFu(true)}>
              <IconPlus className="w-4 h-4" />
              عودة جديدة
            </button>
          )}
          <button className="btn-soft" onClick={() => setShowNewPatient(true)}>
            <IconUserPlus className="w-4 h-4" />
            مريض جديد
          </button>
          <button className="btn-primary" onClick={() => onBook()}>
            <IconCalendarPlus className="w-4.5 h-4.5" />
            موعد جديد
          </button>
        </div>
      </div>

      {/* التبويبات */}
      <div className="card p-1.5 inline-flex gap-1 flex-wrap anim-rise" style={{ animationDelay: "60ms" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 h-10 text-xs font-bold cursor-pointer transition-all ${
              view === t.key ? "bg-pine text-white shadow-md" : "text-soft hover:bg-mist"
            }`}
          >
            {t.icon("w-4 h-4")}
            {t.label}
            <span className={`stat-num !text-[10px] px-1.5 py-0.5 rounded ${view === t.key ? "bg-white/15 text-[#7fe0d4]" : "bg-mist"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {view === "schedule" && <ScheduleView day={day} setDay={setDay} onOpenPatient={onOpenPatient} onBook={onBook} />}
      {view === "followups" && <FollowUpsView fus={fuScoped} onOpenPatient={onOpenPatient} />}
      {view === "history" && <HistoryView sessions={doneSessions} onOpenPatient={onOpenPatient} />}

      {showFu && <FollowUpModal onClose={() => setShowFu(false)} />}
      {showNewPatient && (
        <AddPatientModal
          open
          dispatch={dispatch}
          onClose={() => setShowNewPatient(false)}
          onSaved={(p) => {
            setShowNewPatient(false);
            /* بعد حفظ المريض يُفتح الحجز له مباشرة */
            onBook(p.id);
          }}
          onBook={(pid) => {
            setShowNewPatient(false);
            onBook(pid);
          }}
        />
      )}
    </div>
  );
}

/* ============================ تبويب: جدول اليوم ============================ */

function ScheduleView({
  day,
  setDay,
  onOpenPatient,
  onBook,
}: {
  day: string;
  setDay: (d: string) => void;
  onOpenPatient: (id: string) => void;
  onBook: (patientId?: string, time?: string) => void;
}) {
  const { db, dispatch, patientById, serviceById, doctorById } = useStore();
  const { apptScope } = useAuth();
  const { push } = useToast();
  const HOURS = useMemo(() => hoursBetween(clinicOf(db).workStart, clinicOf(db).workEnd), [db]);
  const [remindFor, setRemindFor] = useState<Appointment | null>(null);
  const [printDay, setPrintDay] = useState<string | null>(null);
  const [cardAppt, setCardAppt] = useState<Appointment | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => today(i)), []);
  const visible = useMemo(
    () => (apptScope ? db.appointments.filter((a) => a.doctorId === apptScope) : db.appointments),
    [db.appointments, apptScope]
  );
  const dayAppts = useMemo(
    () => visible.filter((a) => a.date === day).sort((a, b) => a.time.localeCompare(b.time)),
    [visible, day]
  );
  const countFor = (d: string) => visible.filter((a) => a.date === d && a.status !== "cancelled").length;

  const setStatus = (a: Appointment, status: ApptStatus) => {
    dispatch({ type: "SET_APPT_STATUS", id: a.id, status });
    if (status === "done") push("success", "اكتمل الموعد", `${patientById(a.patientId)?.name} — ${serviceById(a.serviceId)?.name}`);
    else if (status === "cancelled") push("warn", "أُلغي الموعد", `${patientById(a.patientId)?.name} — ${a.time}`);
  };

  return (
    <>
      {/* أدوات اليوم المعروض */}
      <div className="flex flex-wrap items-center justify-between gap-3 anim-rise" style={{ animationDelay: "60ms" }}>
        <p className="text-xs font-bold text-soft">
          جدول الأسبوع — اليوم المعروض: <span className="text-jade-deep">{fmtDate(day)}</span>
          <span className="chip bg-white border border-line ms-2 stat-num !text-[10px]">{countFor(day)} موعداً</span>
        </p>
        <button className="btn-soft !h-9 !text-xs" onClick={() => setPrintDay(day)} title="طباعة كشف مواعيد اليوم المعروض مع المتابعات المستحقة">
          <IconPrinter className="w-4 h-4" />
          طباعة كشف اليوم
        </button>
      </div>

      {/* شريط الأيام */}
      <div className="grid grid-cols-7 gap-2 anim-rise" style={{ animationDelay: "100ms" }}>
        {days.map((d, i) => {
          const active = d === day;
          const n = countFor(d);
          return (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`card card-hover p-3 text-center cursor-pointer transition-all ${active ? "!bg-pine !border-pine text-white" : ""}`}
            >
              <p className={`text-[11px] font-bold ${active ? "text-white/70" : "text-soft"}`}>{i === 0 ? "اليوم" : dayName(d)}</p>
              <p className={`stat-num text-xl mt-1 ${active ? "text-white" : "text-ink"}`}>{Number(d.slice(8))}</p>
              <p className={`text-[10px] font-bold mt-1 ${active ? "text-[#3fd0c0]" : n > 0 ? "text-jade-deep" : "text-soft/50"}`}>
                {n > 0 ? `${n} موعد` : "فارغ"}
              </p>
            </button>
          );
        })}
      </div>

      {/* الخط الزمني */}
      <div className="card overflow-visible anim-rise" style={{ animationDelay: "150ms" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2">
            <IconClock className="w-5 h-5 text-jade-deep" />
            خط سير اليوم
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.keys(APPT_META) as ApptStatus[]).map((s) => (
              <span key={s} className="chip bg-mist text-soft">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: APPT_META[s].dot }} />
                {APPT_META[s].label}
              </span>
            ))}
          </div>
        </div>

        {dayAppts.length === 0 ? (
          <EmptyState icon={<IconCalendar className="w-6 h-6" />} title="يوم فارغ تماماً" desc="اضغط على أي خانة ساعة أدناه أو زر «موعد جديد» للحجز." />
        ) : null}

        <ul className="divide-y divide-line/70">
          {HOURS.map((h) => {
            const cell = dayAppts.filter((a) => a.time.startsWith(h.slice(0, 2)));
            return (
              <li key={h} className="flex gap-4 px-5 py-3 hover:bg-mist/50 transition-colors group">
                <div className="w-16 shrink-0 pt-2">
                  <span className="stat-num text-sm text-ink">{h}</span>
                </div>
                <div className="flex-1 flex flex-wrap gap-2.5 items-center min-h-10">
                  {cell.length === 0 ? (
                    <button
                      onClick={() => onBook(undefined, h)}
                      className="opacity-0 group-hover:opacity-100 transition-all text-[11px] font-bold text-jade-deep bg-jade-soft hover:bg-jade hover:text-white rounded-lg px-3 py-2 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <IconCalendarPlus className="w-3.5 h-3.5" />
                      حجز {h}
                    </button>
                  ) : (
                    cell.map((a) => {
                      const p = patientById(a.patientId);
                      const s = serviceById(a.serviceId);
                      const d = doctorById(a.doctorId);
                      const meta = APPT_META[a.status];
                      return (
                        <div
                          key={a.id}
                          className="anim-pop relative rounded-xl border border-line bg-white p-3 w-full sm:w-[calc(50%-6px)] xl:w-[calc(33.33%-8px)] transition-all hover:shadow-md hover:-translate-y-0.5"
                          style={{ borderInlineStartWidth: 4, borderInlineStartColor: s?.color }}
                        >
                          <div className="flex items-center gap-2.5">
                            <button onClick={() => p && onOpenPatient(p.id)} className="cursor-pointer shrink-0">
                              <Avatar name={p?.name ?? "؟"} size="w-9 h-9 text-xs" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <button onClick={() => p && onOpenPatient(p.id)} className="font-bold text-sm text-ink truncate block hover:text-jade-deep cursor-pointer transition-colors w-full text-start">
                                {p?.name}
                              </button>
                              <p className="text-[11px] text-soft mt-0.5 truncate">
                                {s?.name} · <span className="stat-num">{a.time}–{addMinutes(a.time, s?.duration ?? 30)}</span>
                              </p>
                            </div>
                            <Drop
                              align="end"
                              button={
                                <span className={`chip ${meta.cls} cursor-pointer`}>
                                  {meta.label}
                                  <IconChevronDown className="w-3 h-3" />
                                </span>
                              }
                            >
                              {(Object.keys(APPT_META) as ApptStatus[]).filter((x) => x !== a.status).map((x) => (
                                <DropItem key={x} danger={x === "cancelled"}>
                                  <span onClick={() => setStatus(a, x)} className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ background: APPT_META[x].dot }} />
                                    {APPT_META[x].label}
                                  </span>
                                </DropItem>
                              ))}
                            </Drop>
                          </div>
                          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-line/70">
                            <span className="text-[11px] font-bold text-soft flex items-center gap-1.5 min-w-0">
                              <span style={{ color: d?.color }} className="inline-flex shrink-0"><IconStetho className="w-3.5 h-3.5" /></span>
                              <span className="truncate">{d?.name}</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setCardAppt(a)} className="icon-btn !w-7 !h-7 hover:!bg-jade-soft hover:!text-jade-deep" aria-label="كرت الموعد" title="طباعة كرت الموعد">
                                <IconIdCard className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setRemindFor(a)} className="icon-btn !w-7 !h-7 hover:!bg-sky-soft hover:!text-sky" aria-label="رسالة تذكير" title="رسالة تذكير للمريض">
                                <IconChat className="w-3.5 h-3.5" />
                              </button>
                              {(a.status === "confirmed" || a.status === "waiting") && (
                                <button onClick={() => setStatus(a, "inprogress")} className="text-[11px] font-bold text-jade-deep bg-jade-soft hover:bg-jade hover:text-white rounded-md px-2.5 py-1.5 cursor-pointer transition-colors">
                                  بدء العلاج
                                </button>
                              )}
                              {a.status === "inprogress" && (
                                <button onClick={() => setStatus(a, "done")} className="text-[11px] font-bold text-white bg-mint hover:bg-[#1d6b47] rounded-md px-2.5 py-1.5 cursor-pointer transition-colors">
                                  إتمام ✓
                                </button>
                              )}
                              {a.status !== "done" && a.status !== "cancelled" && (
                                <button onClick={() => setStatus(a, "cancelled")} className="icon-btn !w-7 !h-7 hover:!bg-coral-soft hover:!text-coral" aria-label="إلغاء">
                                  <IconX className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {remindFor && <ReminderModal appt={remindFor} onClose={() => setRemindFor(null)} />}
      {printDay && (
        <PrintModal open onClose={() => setPrintDay(null)} title={`طباعة كشف مواعيد ${fmtDate(printDay)}`}>
          <AppointmentsDayPrint date={printDay} />
        </PrintModal>
      )}
      {cardAppt && (
        <CardPrintModal
          open
          onClose={() => setCardAppt(null)}
          title={`كرت الموعد — ${patientById(cardAppt.patientId)?.name ?? ""}`}
          render={(count) => (
            <CardSheet units={Array.from({ length: count }, (_, i) => <AppointmentCardPrint key={i} a={cardAppt} />)} cols={count === 1 ? 1 : 2} caption={`موعد ${fmtDate(cardAppt.date)} · ${cardAppt.time}`} scale={count === 1 ? 2 : 1} />
          )}
        />
      )}
    </>
  );
}

/* ============================ رسالة تذكير ============================ */

function ReminderModal({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const { patientById, serviceById, doctorById } = useStore();
  const { push } = useToast();
  const p = patientById(appt.patientId);
  const s = serviceById(appt.serviceId);
  const d = doctorById(appt.doctorId);
  const [copied, setCopied] = useState(false);

  const T = (body: string) =>
    `السلام عليكم ${p?.name ?? ""}،\nمعكم عيادة الأسنان — نودّ تذكيركم بما يلي:\n\n${body}\n\nنرجو الحضور قبل الموعد بعشر دقائق، ولأي استفسار أو تعديل يسعدنا تواصلكم.`;

  const templates = [
    { key: "appt", label: "تذكير بالموعد", text: T(`موعدكم: ${s?.name ?? "جلسة علاج"}\nالتاريخ: ${fmtDate(appt.date)}\nالوقت: ${appt.time}\nالطبيب: ${d?.name ?? "طبيب العيادة"}`) },
    { key: "confirm", label: "طلب تأكيد الحضور", text: T(`لديكم حجز ${s?.name ?? "جلسة"} بتاريخ ${fmtDate(appt.date)} الساعة ${appt.time}.\nنرجو الرد بـ «نعم» لتأكيد الحضور أو «تأجيل» لإعادة الجدولة.`) },
    { key: "fasting", label: "تعليمات قبل الجراحة", text: T(`موعدكم لإجراء ${s?.name ?? "الجراحة"} بتاريخ ${fmtDate(appt.date)} الساعة ${appt.time}.\nالتعليمات: الامتناع عن الأكل والشرب قبل الموعد بست ساعات، وإحضار التقارير الطبية والأدوية التي تتناولونها.`) },
    { key: "thanks", label: "شكر بعد الزيارة", text: `شكراً لثقتكم بنا، ${p?.name ?? ""}.\nنتمنى لكم دوام الصحة والعافية، ويسعدنا استقبال ملاحظاتكم في أي وقت.` },
  ];
  const [text, setText] = useState(templates[0].text);
  const [active, setActive] = useState("appt");

  const pick = (k: string) => {
    setActive(k);
    setText(templates.find((t) => t.key === k)!.text);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* تجاهل */
    }
    setCopied(true);
    push("success", "نُسخت الرسالة", "الصقها في واتساب أو تطبيق الرسائل وأرسلها للمريض.");
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`رسالة تذكير — ${p?.name ?? "المريض"}`}
      subtitle={`${s?.name ?? ""} · ${fmtDate(appt.date)} ${appt.time}`}
      width="max-w-xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إغلاق</button>
          <button className="btn-primary" onClick={copy}>
            <IconCopy className="w-4.5 h-4.5" />
            {copied ? "نُسخت ✓" : "نسخ الرسالة"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.key}
              onClick={() => pick(t.key)}
              className={`h-9 px-3.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                active === t.key ? "bg-pine text-white border-pine shadow-sm" : "bg-white text-soft border-line hover:border-jade/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div>
          <p className="label">نص الرسالة (قابل للتعديل)</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="input !h-44 py-3 leading-relaxed text-[13px]" dir="rtl" />
        </div>
        <p className="text-[11px] text-soft leading-relaxed">
          تُعوَّض بيانات المريض والموعد والطبيب تلقائياً من السجل. انسخ النص وأرسله عبر واتساب أو الرسائل النصية.
        </p>
      </div>
    </Modal>
  );
}

/* ============================ تبويب: العودات والمتابعة ============================ */

function FollowUpsView({ fus, onOpenPatient }: { fus: FollowUp[]; onOpenPatient: (id: string) => void }) {
  const { db, dispatch, patientById } = useStore();
  const { push } = useToast();
  const [filter, setFilter] = useState<"all" | "pending" | "overdue" | "booked" | "done">("all");
  const [cardFu, setCardFu] = useState<FollowUp | null>(null);

  const pending = fus.filter((f) => f.status === "pending");
  const overdue = pending.filter((f) => dayDiff(f.dueDate) < 0).length;
  const dueToday = pending.filter((f) => dayDiff(f.dueDate) === 0).length;
  const alertWindow = clinicOf(db).followUpAlertDays;
  const inWeek = pending.filter((f) => {
    const d = dayDiff(f.dueDate);
    return d > 0 && d <= alertWindow;
  }).length;
  const doneCount = fus.filter((f) => f.status === "done").length;

  const list = useMemo(() => {
    let arr = [...fus];
    if (filter === "pending") arr = arr.filter((f) => f.status === "pending");
    if (filter === "overdue") arr = arr.filter((f) => f.status === "pending" && dayDiff(f.dueDate) < 0);
    if (filter === "booked") arr = arr.filter((f) => f.status === "booked");
    if (filter === "done") arr = arr.filter((f) => f.status === "done");
    const rank = (f: FollowUp) => (f.status === "pending" ? 0 : f.status === "booked" ? 1 : 2);
    return arr.sort((a, b) => rank(a) - rank(b) || a.dueDate.localeCompare(b.dueDate));
  }, [fus, filter]);

  const bookFollowUp = (f: FollowUp) => {
    const date = f.dueDate >= today(0) ? f.dueDate : today(0);
    let time = "12:00";
    outer: for (let h = 9; h <= 20; h++)
      for (const m of [0, 30]) {
        const t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        if (!db.appointments.some((a) => a.date === date && a.doctorId === f.doctorId && a.time === t && a.status !== "cancelled")) {
          time = t;
          break outer;
        }
      }
    const a: Appointment = {
      id: uid(),
      patientId: f.patientId,
      serviceId: "s1",
      doctorId: f.doctorId,
      date,
      time,
      status: "confirmed",
      notes: `عودة: ${f.reason}`,
    };
    dispatch({ type: "ADD_APPT", a });
    dispatch({ type: "UPDATE_FOLLOWUP", f: { ...f, status: "booked", apptId: a.id } });
    push("success", "حُجز موعد العودة", `${patientById(f.patientId)?.name} — ${fmtDate(date)} ${time} · يظهر في جدول اليوم`);
  };

  const arrive = (f: FollowUp) => {
    dispatch({ type: "UPDATE_FOLLOWUP", f: { ...f, status: "done" } });
    push("success", "سُجلت مراجعة المريض", `${patientById(f.patientId)?.name} — ${f.reason}`);
  };

  const postpone = (f: FollowUp) => {
    const base = f.dueDate >= today(0) ? f.dueDate : today(0);
    const d = new Date(base + "T12:00:00");
    d.setDate(d.getDate() + 7);
    dispatch({ type: "UPDATE_FOLLOWUP", f: { ...f, dueDate: dstr(d) } });
    push("info", "أُجلت العودة أسبوعاً", `${patientById(f.patientId)?.name} — الموعد الجديد ${fmtDate(dstr(d))}`);
  };

  const STATS = [
    { label: "متأخرة", value: overdue, cls: "bg-coral-soft text-coral", icon: <IconAlert className="w-4.5 h-4.5" /> },
    { label: "مستحقة اليوم", value: dueToday, cls: "bg-amber-soft text-[#a06410]", icon: <IconClock className="w-4.5 h-4.5" /> },
    { label: `خلال ${alertWindow} أيام`, value: inWeek, cls: "bg-sky-soft text-sky", icon: <IconCalendar className="w-4.5 h-4.5" /> },
    { label: "مكتملة", value: doneCount, cls: "bg-mint-soft text-[#1d6b47]", icon: <IconCheck className="w-4.5 h-4.5" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {STATS.map((s, i) => (
          <div key={s.label} className="card card-hover p-4 flex items-center gap-3 anim-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${s.cls}`}>{s.icon}</span>
            <div>
              <p className="stat-num text-2xl text-ink leading-none">{s.value}</p>
              <p className="text-[11px] font-bold text-soft mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "الكل"],
            ["pending", "بانتظار المراجعة"],
            ["overdue", "المتأخرة فقط"],
            ["booked", "محجوزة"],
            ["done", "مكتملة"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`h-9 px-3.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all border ${
              filter === k ? "bg-pine text-white border-pine shadow-sm" : "bg-white text-soft border-line hover:border-jade/50"
            }`}
          >
            {l}
          </button>
        ))}
        <p className="text-[11px] text-soft font-medium ms-auto hidden md:block">
          اضغط «حجز موعد» لتحويل العودة إلى موعد حقيقي في جدول الطبيب
        </p>
      </div>

      <div className="card overflow-hidden anim-rise" style={{ animationDelay: "120ms" }}>
        {list.length === 0 ? (
          <EmptyState
            icon={<IconCalendarPlus className="w-6 h-6" />}
            title="لا عودات في هذا التصنيف"
            desc="تُنشأ العودات تلقائياً عند إنهاء جلسات العلاج، أو يدوياً بزر «عودة جديدة»."
          />
        ) : (
          <ul className="divide-y divide-line/60">
            {list.map((f, i) => {
              const p = patientById(f.patientId);
              const d = db.doctors.find((x) => x.id === f.doctorId);
              const linkedAppt = f.apptId ? db.appointments.find((a) => a.id === f.apptId) : undefined;
              const late = f.status === "pending" && dayDiff(f.dueDate) < 0;
              return (
                <li
                  key={f.id}
                  className={`flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors anim-fade ${late ? "bg-coral-soft/25 hover:bg-coral-soft/40" : "hover:bg-jade-soft/25"}`}
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <button onClick={() => p && onOpenPatient(p.id)} className="cursor-pointer shrink-0">
                    <Avatar name={p?.name ?? "؟"} size="w-10 h-10 text-xs" />
                  </button>
                  <div className="flex-1 min-w-44">
                    <button onClick={() => p && onOpenPatient(p.id)} className="font-bold text-sm text-ink hover:text-jade-deep cursor-pointer transition-colors">
                      {p?.name}
                    </button>
                    <p className="text-[11px] text-soft mt-0.5 truncate flex items-center gap-1.5">
                      <IconCalendarPlus className="w-3 h-3 shrink-0" />
                      {f.reason}
                    </p>
                  </div>
                  <span className="chip bg-mist text-soft hidden sm:inline-flex">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: d?.color }} />
                    {d?.name}
                  </span>
                  <div className="text-center min-w-24">
                    <p className="stat-num text-xs text-ink">{fmtDate(f.dueDate)}</p>
                    <span className={`chip mt-1 ${dueTone(f)}`}>{f.status === "pending" ? dueLabel(f.dueDate) : FU_META[f.status].label}</span>
                  </div>
                  {linkedAppt && (
                    <span className="chip bg-jade-soft text-jade-deep hidden md:inline-flex">
                      <IconClock className="w-3 h-3" />
                      موعد {fmtDate(linkedAppt.date)} {linkedAppt.time}
                    </span>
                  )}
                  <Badge cls={FU_META[f.status].cls}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: FU_META[f.status].dot }} />
                    {FU_META[f.status].label}
                  </Badge>
                  <div className="flex items-center gap-1.5 ms-auto">
                    {f.status === "pending" && (
                      <>
                        <button onClick={() => bookFollowUp(f)} className="text-[11px] font-bold text-white bg-jade hover:bg-jade-deep rounded-md px-3 py-2 cursor-pointer transition-colors inline-flex items-center gap-1.5">
                          <IconCalendarPlus className="w-3.5 h-3.5" />
                          حجز موعد
                        </button>
                        <button onClick={() => arrive(f)} className="text-[11px] font-bold text-[#1d6b47] bg-mint-soft hover:bg-mint hover:text-white rounded-md px-2.5 py-2 cursor-pointer transition-colors">
                          وصل
                        </button>
                        <button onClick={() => postpone(f)} className="text-[11px] font-bold text-soft bg-mist hover:bg-line rounded-md px-2.5 py-2 cursor-pointer transition-colors" title="تأجيل أسبوع">
                          +7 أيام
                        </button>
                      </>
                    )}
                    {f.status === "booked" && (
                      <button onClick={() => arrive(f)} className="text-[11px] font-bold text-[#1d6b47] bg-mint-soft hover:bg-mint hover:text-white rounded-md px-2.5 py-2 cursor-pointer transition-colors">
                        وصل
                      </button>
                    )}
                    {(f.status === "pending" || f.status === "booked") && (
                      <button
                        onClick={() => setCardFu(f)}
                        className="icon-btn !w-8 !h-8 hover:!bg-jade-soft hover:!text-jade-deep"
                        title="طباعة كرت الرجوع"
                        aria-label="كرت الرجوع"
                      >
                        <IconIdCard className="w-4 h-4" />
                      </button>
                    )}
                    <TwoStepDelete
                      onConfirm={() => {
                        dispatch({ type: "DELETE_FOLLOWUP", id: f.id });
                        push("warn", "حُذفت العودة", f.reason);
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {cardFu && (
        <CardPrintModal
          open
          onClose={() => setCardFu(null)}
          title={`كرت الرجوع — ${patientById(cardFu.patientId)?.name ?? ""}`}
          render={(count) => (
            <CardSheet units={Array.from({ length: count }, (_, i) => <FollowUpCardPrint key={i} f={cardFu} />)} cols={count === 1 ? 1 : 2} caption={`موعد المراجعة: ${fmtDate(cardFu.dueDate)}`} scale={count === 1 ? 2 : 1} />
          )}
        />
      )}
    </div>
  );
}

/* ============================ تبويب: الجلسات المكتملة ============================ */

function HistoryView({ sessions, onOpenPatient }: { sessions: import("../store").ClinicalSession[]; onOpenPatient: (id: string) => void }) {
  const { db, patientById, serviceById, doctorById } = useStore();
  const money = useMoney();
  const [docFilter, setDocFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [fuFor, setFuFor] = useState<string | null>(null);

  const list = useMemo(
    () =>
      sessions
        .filter((s) => docFilter === "all" || s.doctorId === docFilter)
        .sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? "")),
    [sessions, docFilter]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setDocFilter("all")}
          className={`h-9 px-3.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all border ${
            docFilter === "all" ? "bg-pine text-white border-pine shadow-sm" : "bg-white text-soft border-line hover:border-jade/50"
          }`}
        >
          كل الأطباء
        </button>
        {db.doctors.map((d) => (
          <button
            key={d.id}
            onClick={() => setDocFilter(d.id)}
            className={`h-9 px-3.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all border inline-flex items-center gap-1.5 ${
              docFilter === d.id ? "bg-pine text-white border-pine shadow-sm" : "bg-white text-soft border-line hover:border-jade/50"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
            {d.name}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState icon={<IconCheck className="w-6 h-6" />} title="لا جلسات مكتملة" desc="عند إنهاء جلسة علاج من محطة العمل ستظهر هنا بكل تفاصيلها." />
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((s, i) => {
            const p = patientById(s.patientId);
            const d = doctorById(s.doctorId);
            const inv = s.invoiceId ? db.invoices.find((x) => x.id === s.invoiceId) : undefined;
            const invTotal = inv ? invoiceTotal(inv) : 0;
            const val = s.procedures.reduce((sum, pr) => sum + pr.price * Math.max(1, pr.teeth.length), 0);
            const fu = s.fuId ? db.followUps.find((f) => f.id === s.fuId) : undefined;
            const fuOverdue = !!fu && fu.status === "pending" && fu.dueDate < today(0);
            const isOpen = openId === s.id;
            return (
              <li key={s.id} className={`card p-4 anim-fade transition-all ${isOpen ? "!border-jade/60 shadow-[0_12px_30px_-14px_rgba(11,47,43,0.3)]" : "card-hover"}`} style={{ animationDelay: `${i * 50}ms`, borderInlineStartWidth: 4, borderInlineStartColor: d?.color }}>
                <div className="flex flex-wrap items-center gap-3 cursor-pointer" onClick={() => setOpenId(isOpen ? null : s.id)}>
                  <button onClick={(e) => { e.stopPropagation(); p && onOpenPatient(p.id); }} className="cursor-pointer shrink-0">
                    <Avatar name={p?.name ?? "؟"} size="w-11 h-11 text-sm" />
                  </button>
                  <div className="flex-1 min-w-56">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => p && onOpenPatient(p.id)} className="font-bold text-sm text-ink hover:text-jade-deep cursor-pointer transition-colors">
                        {p?.name}
                      </button>
                      <span className="text-[10px] font-bold text-soft">· {d?.name}</span>
                    </div>
                    <p className="text-[11px] text-soft mt-1 truncate">
                      {s.procedures.map((pr) => pr.name).join(" · ") || "استشارة وفحص"}
                      {s.diagnosis ? ` — ${s.diagnosis}` : ""}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      {s.procedures.filter((pr) => pr.teeth.length).map((pr, j) => (
                        <span key={j} className="chip bg-amber-soft text-[#a06410]">
                          <IconTooth className="w-3 h-3" />
                          {pr.teeth.length === 1 ? `سن ${pr.teeth[0]}` : `${pr.teeth.length} أسنان`}
                        </span>
                      ))}
                      {s.meds.length > 0 && (
                        <span className="chip bg-sky-soft text-sky">
                          <IconSpark className="w-3 h-3" />
                          روشتة {s.meds.length} أدوية
                        </span>
                      )}
                      {inv && (
                        <span className="chip bg-mint-soft text-[#1d6b47]">
                          <IconReceipt className="w-3 h-3" />
                          {inv.number} · {money(val)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="stat-num text-sm text-ink">{fmtDate(s.date)}</p>
                    <p className="stat-num text-[11px] text-soft mt-0.5" dir="ltr">
                      {fmtClock(s.startedAt)}–{fmtClock(s.endedAt!)}
                    </p>
                    <span className="chip bg-mist text-soft mt-1.5">
                      <IconClock className="w-3 h-3" />
                      {fmtDur(new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime())}
                    </span>
                  </div>
                  <span className={`icon-btn transition-transform duration-300 ${isOpen ? "rotate-180 !text-jade-deep" : ""}`} aria-label="التفاصيل">
                    <IconChevronDown className="w-5 h-5" />
                  </span>
                </div>

                {/* التفاصيل الموسعة: تقرير العمل وكل ما تم في الجلسة */}
                {isOpen && (
                  <div className="anim-pop mt-4 pt-4 border-t border-line/70 grid md:grid-cols-2 gap-5">
                    <div className="space-y-4">
                      <div>
                        <p className="label !mb-1.5">تقرير العمل السريري</p>
                        {s.summary.trim() ? (
                          <p className="text-[12.5px] leading-relaxed text-ink bg-mist/70 border border-line rounded-lg px-3.5 py-3 whitespace-pre-line">
                            {s.summary}
                          </p>
                        ) : (
                          <p className="text-xs text-soft bg-mist/60 rounded-lg px-3.5 py-3">لم يُكتب تقرير لهذه الجلسة.</p>
                        )}
                      </div>
                      <div>
                        <p className="label !mb-1.5">الإجراءات المنفذة ({s.procedures.length})</p>
                        {s.procedures.length === 0 ? (
                          <p className="text-xs text-soft">استشارة وفحص فقط.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {s.procedures.map((pr, j) => {
                              const cat = pr.category ?? "";
                              const clr = cat.includes("قلع") ? "#d9503a" : cat.includes("حشو") ? "#1273c4" : cat.includes("عصب") ? "#e2952b" : cat.includes("تركيب") ? "#2f9fe0" : cat.includes("تقويم") ? "#2c9c69" : "#5c7186";
                              return (
                                <li key={j} className="flex items-center gap-2 text-xs font-semibold text-ink flex-wrap">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: clr }} />
                                  {pr.name}
                                  {pr.teeth.length > 0 && (
                                    <span className="chip bg-amber-soft text-[#a06410] !py-0.5"><IconTooth className="w-3 h-3" /> {pr.teeth.length === 1 ? `سن ${pr.teeth[0]}` : `${pr.teeth.length} أسنان`}</span>
                                  )}
                                  {pr.canals?.length ? <span className="text-soft font-medium">{pr.canals.map((c) => `${c.channels}ق`).join("·")}</span> : null}
                                  <span className="stat-num text-soft ms-auto">{money(pr.price * Math.max(1, pr.teeth.length))}</span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      {s.meds.length > 0 && (
                        <div>
                          <p className="label !mb-1.5">الأدوية الموصوفة</p>
                          <div className="flex flex-wrap gap-1.5">
                            {s.meds.map((m, j) => (
                              <span key={j} className="chip bg-sky-soft text-sky">{m.name} — {m.dose}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="label !mb-1.5">الأسنان المعدَّلة ({s.teethTreated.length})</p>
                        {s.teethTreated.length === 0 ? (
                          <p className="text-xs text-soft">لا تغييرات على خريطة الأسنان.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {s.teethTreated.map((t, j) => (
                              <span key={j} className="chip" style={{ background: TOOTH_META[t.status].fill === "#ffffff" ? "#eef4f2" : TOOTH_META[t.status].fill, color: TOOTH_META[t.status].stroke }}>
                                سن {t.tooth} — {TOOTH_META[t.status].label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="label !mb-1.5">الفاتورة</p>
                        {inv ? (
                          <div className="rounded-lg border border-line bg-white px-3.5 py-2.5 text-xs space-y-1">
                            <div className="flex justify-between"><span className="text-soft font-semibold">الرقم</span><b className="stat-num" dir="ltr">{inv.number}</b></div>
                            <div className="flex justify-between"><span className="text-soft font-semibold">الإجمالي</span><b className="stat-num">{money(invTotal)}</b></div>
                            <div className="flex justify-between"><span className="text-soft font-semibold">المدفوع</span><b className="stat-num text-mint">{money(inv.paid)}</b></div>
                            <div className="flex justify-between border-t border-line/70 pt-1"><span className="text-soft font-semibold">المتبقي</span><b className={`stat-num ${invTotal - inv.paid > 0 ? "text-coral" : "text-mint"}`}>{money(Math.max(0, invTotal - inv.paid))}</b></div>
                          </div>
                        ) : (
                          <p className="text-xs text-soft">جلسة بدون فوترة.</p>
                        )}
                      </div>
                      <div>
                        <p className="label !mb-1.5">العودة المرتبطة بالجلسة</p>
                        {fu ? (
                          <span className={`chip ${fu.status === "done" ? "bg-mint-soft text-[#1d6b47]" : fu.status === "booked" ? "bg-sky-soft text-sky" : fuOverdue ? "bg-coral-soft text-coral" : "bg-amber-soft text-[#a06410]"}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {fu.status === "done" ? "عودة مكتملة" : fu.status === "booked" ? `عودة محجوزة — ${fmtDate(fu.dueDate)}` : fuOverdue ? `عودة متأخرة — ${fmtDate(fu.dueDate)}` : `عودة مقررة — ${fmtDate(fu.dueDate)}`}
                          </span>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setFuFor(s.patientId); }} className="btn-soft !h-8 !px-3 !text-[11px]">
                            <IconCalendarPlus className="w-3.5 h-3.5" />
                            جدولة عودة متابعة
                          </button>
                        )}
                        <p className="text-[10px] text-soft mt-1.5">{fu ? fu.reason : "لم تُسجَّل عودة — يمكن جدولتها الآن وستظهر في تبويب العودات."}</p>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {fuFor && <FollowUpModal patientId={fuFor} onClose={() => setFuFor(null)} />}
    </div>
  );
}

/* ============================ نافذة: عودة جديدة ============================ */

export function FollowUpModal({
  patientId,
  onClose,
  defaultDoctor,
}: {
  patientId?: string;
  onClose: () => void;
  defaultDoctor?: string;
}) {
  const { db, dispatch, patientById } = useStore();
  const { apptScope } = useAuth();
  const { push } = useToast();
  const [pid, setPid] = useState(patientId ?? "");
  const [doctorId, setDoctorId] = useState(apptScope ?? defaultDoctor ?? "d1");
  const [reason, setReason] = useState("");
  const [dueDate, setDueDate] = useState(today(7));
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  /* مكتبة الأسباب */
  const [showLib, setShowLib] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newReason, setNewReason] = useState("");

  const reasons = db.followUpReasons;

  const pickReason = (t: string) => {
    setReason(t);
    setErr("");
  };

  const saveReasonToLib = () => {
    const t = newReason.trim();
    if (t.length < 3) return push("warn", "اكتب سبباً (3 أحرف على الأقل)");
    if (reasons.some((r) => r.text === t)) return push("info", "السبب موجود بالفعل في المكتبة");
    dispatch({ type: "ADD_FOLLOWUP_REASON", text: t });
    setNewReason("");
    push("success", "حُفظ السبب في المكتبة", "أصبح متاحاً للاختيار في كل جدولات العودة.");
  };

  const save = () => {
    if (!pid) return setErr("اختر المريض أولاً.");
    if (reason.trim().length < 3) return setErr("اكتب سبب العودة.");
    if (!dueDate) return setErr("حدد تاريخ الاستحقاق.");
    /* حفظ تلقائي: إن كان السبب جديداً يُضاف للمكتبة */
    if (!reasons.some((r) => r.text === reason.trim())) {
      dispatch({ type: "ADD_FOLLOWUP_REASON", text: reason.trim() });
    }
    dispatch({
      type: "ADD_FOLLOWUP",
      f: { id: uid(), patientId: pid, doctorId, reason: reason.trim(), dueDate, status: "pending", createdAt: new Date().toISOString(), notes: notes.trim() || undefined },
    });
    push("success", "جُدولت العودة", `${patientById(pid)?.name} — ${reason.trim()} · ${fmtDate(dueDate)}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="جدولة عودة للمتابعة"
      subtitle="ستظهر في تبويب «العودات والمتابعة» ويُنبَّه الفريق عند استحقاقها"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>
            <IconCalendarPlus className="w-4 h-4" />
            جدولة العودة
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="المريض *">
            <TSelect value={pid} onChange={(e) => setPid(e.target.value)} disabled={!!patientId}>
              <option value="">— اختر من السجل —</option>
              {db.patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.phone}
                </option>
              ))}
            </TSelect>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="سبب العودة *">
            <TInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اكتب السبب أو اختره من المكتبة أدناه…" />
          </Field>

          {/* مكتبة الأسباب — اختيار / تعديل / حذف / إضافة */}
          <div className="mt-3 rounded-xl border border-line bg-mist/40 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-line">
              <button onClick={() => setShowLib((v) => !v)} className="flex items-center gap-2 text-xs font-bold text-ink cursor-pointer">
                <IconCalendar className="w-4 h-4 text-jade-deep" />
                مكتبة أسباب العودة
                <span className="chip bg-mist text-soft !text-[9px] stat-num">{reasons.length}</span>
                <IconChevronDown className={`w-3.5 h-3.5 text-soft transition-transform ${showLib ? "rotate-180" : ""}`} />
              </button>
              <div className="flex items-center gap-1.5">
                <TInput value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="سبب جديد…" className="!h-8 !w-40 !text-xs" />
                <button onClick={saveReasonToLib} className="btn-primary !h-8 !px-2.5 !text-[11px]" title="حفظ السبب الجديد في المكتبة">
                  <IconPlus className="w-3.5 h-3.5" />
                  حفظ
                </button>
              </div>
            </div>

            {showLib && (
              <div className="max-h-44 overflow-y-auto">
                {reasons.length === 0 ? (
                  <p className="text-xs text-soft text-center py-5">لا أسباب محفوظة — أضف أول سبب من الحقل أعلاه.</p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {reasons.map((r) => (
                        <tr key={r.id} className={`border-b border-line/50 last:border-0 transition-colors ${reason === r.text ? "bg-jade-soft/50" : "bg-white hover:bg-mist/60"}`}>
                          <td className="px-3.5 py-2">
                            {editId === r.id ? (
                              <div className="flex items-center gap-1.5">
                                <TInput value={editText} onChange={(e) => setEditText(e.target.value)} className="!h-8 !text-xs" autoFocus />
                                <button
                                  onClick={() => {
                                    dispatch({ type: "UPDATE_FOLLOWUP_REASON", id: r.id, text: editText });
                                    setEditId(null);
                                    push("success", "عُدّل السبب");
                                  }}
                                  className="icon-btn !w-7 !h-7 !bg-mint-soft !text-[#1d6b47]"
                                  title="حفظ التعديل"
                                >
                                  <IconCheck className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditId(null)} className="icon-btn !w-7 !h-7" title="إلغاء">
                                  <IconX className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-ink">{r.text}</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-end whitespace-nowrap">
                            <div className="flex items-center justify-end gap-0.5">
                              <button onClick={() => pickReason(r.text)} className="icon-btn !w-7 !h-7 !text-jade-deep hover:!bg-jade-soft" title="اختيار هذا السبب">
                                <IconCheck className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { setEditId(r.id); setEditText(r.text); }} className="icon-btn !w-7 !h-7" title="تعديل">
                                <IconPencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  dispatch({ type: "DELETE_FOLLOWUP_REASON", id: r.id });
                                  push("info", "حُذف السبب من المكتبة");
                                }}
                                className="icon-btn !w-7 !h-7 hover:!bg-coral-soft hover:!text-coral"
                                title="حذف"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
        <Field label="طبيب المتابعة">
          <TSelect value={doctorId} onChange={(e) => setDoctorId(e.target.value)} disabled={!!apptScope}>
            {db.doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.specialty}
              </option>
            ))}
          </TSelect>
        </Field>
        <Field label="تاريخ الاستحقاق *">
          <DateInput value={dueDate} onChange={setDueDate} />
        </Field>
        <div className="col-span-2">
          <Field label="ملاحظات">
            <TArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="تفاصيل تهم فريق الاستقبال عند الاتصال بالمريض…" />
          </Field>
        </div>
      </div>
      {err && <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}

/* ============================ نافذة الحجز ============================ */

export function AddAppointmentModal({
  open,
  onClose,
  defaultPatient,
  defaultTime,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  defaultPatient?: string;
  defaultTime?: string;
  defaultDate?: string;
}) {
  const { db, dispatch, patientById } = useStore();
  const { apptScope } = useAuth();
  const money = useMoney();
  const { push } = useToast();
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("d1");
  const [date, setDate] = useState(today(0));
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  /* خدمة الكشف/الاستشارة تُثبَّت تلقائياً عند الحجز — لا تختارها السكرتارية */
  const consultSvc = useMemo(() => consultServiceOf(db.services), [db.services]);

  useEffect(() => {
    if (open) {
      setPatientId(defaultPatient ?? "");
      setDoctorId(apptScope ?? "d1");
      setDate(defaultDate ?? today(0));
      setTime(defaultTime ?? "10:00");
      setNotes("");
      setErr("");
    }
  }, [open, defaultPatient, defaultTime, defaultDate]);

  const times = useMemo(() => {
    const { workStart, workEnd } = clinicOf(db);
    const s = parseInt(workStart.slice(0, 2), 10);
    const e = parseInt(workEnd.slice(0, 2), 10);
    const arr: string[] = [];
    for (let h = s; h < e; h++) {
      arr.push(`${String(h).padStart(2, "0")}:00`);
      arr.push(`${String(h).padStart(2, "0")}:30`);
    }
    return arr.length ? arr : ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30"];
  }, [db]);

  const busy = (t: string) => db.appointments.some((a) => a.date === date && a.doctorId === doctorId && a.time === t && a.status !== "cancelled");

  const save = () => {
    if (!patientId) return setErr("اختر المريض أولاً.");
    if (!consultSvc) return setErr("لا توجد خدمة كشف/استشارة مفعلة — فعّلها من شاشة «بيانات الخدمات».");
    if (busy(time)) return setErr("هذا الوقت محجوز لدى الطبيب نفسه — اختر وقتاً آخر.");
    const a: Appointment = { id: uid(), patientId, serviceId: consultSvc.id, doctorId, date, time, status: "confirmed", notes: notes.trim() || undefined };
    dispatch({ type: "ADD_APPT", a });
    push("success", "تم تأكيد الحجز", `${patientById(patientId)?.name} — ${fmtDate(date)} ${time}`);
    onClose();
  };

  const svc = consultSvc ?? undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="حجز موعد جديد"
      subtitle="سيُرسل الموعد إلى جدول الطبيب المحدد فور التأكيد"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>تأكيد الحجز</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="المريض *">
            <TSelect value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">— اختر من السجل —</option>
              {db.patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {p.phone}</option>
              ))}
            </TSelect>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="نوع الزيارة" hint="تُثبَّت تلقائياً — خدمة الكشف والاستشارة من فئة التشخيص">
            <div className="input !bg-mist/60 !cursor-default border-dashed !h-auto !py-2.5 flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-jade-soft text-jade-deep shrink-0">
                <IconStetho className="w-4.5 h-4.5" />
              </span>
              <div className="flex-1 min-w-0 text-start">
                <p className="text-sm font-bold text-ink truncate leading-tight">{consultSvc?.name ?? "—"}</p>
                <p className="text-[10px] font-semibold text-soft mt-0.5">
                  {consultSvc ? `فئة ${consultSvc.category} · ${money(consultSvc.price)}` : "لا توجد خدمة كشف مفعلة"}
                </p>
              </div>
              <span className="chip bg-jade-soft text-jade-deep !text-[9px] shrink-0">
                <IconCheck className="w-3 h-3" />
                مثبتة تلقائياً
              </span>
            </div>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="الطبيب" hint={apptScope ? "مقيّد بطبيبك حسب صلاحياتك — تغيّره الإدارة" : undefined}>
            <TSelect value={doctorId} onChange={(e) => setDoctorId(e.target.value)} disabled={!!apptScope} className={apptScope ? "opacity-70 cursor-not-allowed" : ""}>
              {db.doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
              ))}
            </TSelect>
          </Field>
        </div>
        <Field label="التاريخ">
          <DateInput value={date} onChange={setDate} />
        </Field>
        <Field label="الوقت" hint={svc ? `المدة المتوقعة: ${svc.duration} دقيقة` : undefined}>
          <TSelect value={time} onChange={(e) => setTime(e.target.value)}>
            {times.map((t) => (
              <option key={t} value={t} disabled={busy(t)}>
                {t} {busy(t) ? "— محجوز" : ""}
              </option>
            ))}
          </TSelect>
        </Field>
        <div className="col-span-2">
          <Field label="ملاحظات">
            <TArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي تفاصيل إضافية للموعد…" />
          </Field>
        </div>
      </div>
      {err && <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}
