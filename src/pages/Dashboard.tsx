import React, { useMemo } from "react";
import {
  APPT_META,
  fmtDateFull,
  fmtMoney,
  invoiceTotal,
  monthName,
  relTime,
  today,
  useStore,
} from "../store";
import {
  IconAlert,
  IconArrowLeft,
  IconCalendar,
  IconCalendarPlus,
  IconReceipt,
  IconTooth,
  IconTrendUp,
  IconUserPlus,
  IconUsers,
  IconWallet,
} from "../icons";
import { AnimatedNumber, Avatar, Badge, EmptyState } from "../components/ui";

interface Props {
  onOpenPatient: (id: string) => void;
  onQuickBook: () => void;
  onNewPatient: () => void;
  onNav: (tab: string) => void;
}

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير";
  if (h < 17) return "طاب يومُك";
  return "مساء الخير";
};

export default function Dashboard({ onOpenPatient, onQuickBook, onNewPatient, onNav }: Props) {
  const { db, patientById, serviceById, doctorById, patientBalance } = useStore();

  const todayAppts = useMemo(
    () =>
      db.appointments
        .filter((a) => a.date === today(0))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [db.appointments]
  );
  const doneToday = todayAppts.filter((a) => a.status === "done").length;
  const activeToday = todayAppts.filter((a) => a.status !== "cancelled").length;

  const newThisWeek = db.patients.filter((p) => p.joined >= today(-7)).length;

  const monthPrefix = today(0).slice(0, 7);
  const monthInvoices = db.invoices.filter((i) => i.date.startsWith(monthPrefix));
  const monthRevenue = monthInvoices.reduce((s, i) => s + Math.min(i.paid, invoiceTotal(i)), 0);

  const outstanding = db.invoices.reduce((s, i) => s + Math.max(0, invoiceTotal(i) - i.paid), 0);
  const outstandingCount = db.invoices.filter((i) => i.paid < invoiceTotal(i)).length;

  const week = useMemo(() => {
    const days: { d: string; label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = today(-i);
      days.push({
        d,
        label: new Intl.DateTimeFormat("ar-EG-u-nu-latn", { weekday: "short" }).format(new Date(d + "T12:00:00")),
        count: db.appointments.filter((a) => a.date === d && a.status !== "cancelled").length,
      });
    }
    return days;
  }, [db.appointments]);
  const maxWeek = Math.max(1, ...week.map((w) => w.count));

  const topServices = useMemo(() => {
    const agg = new Map<string, number>();
    db.invoices.forEach((inv) => inv.items.forEach((it) => agg.set(it.serviceId, (agg.get(it.serviceId) ?? 0) + it.qty)));
    return [...agg.entries()]
      .map(([id, qty]) => ({ s: serviceById(id), qty }))
      .filter((x) => x.s)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [db.invoices, serviceById]);
  const maxTop = Math.max(1, ...topServices.map((t) => t.qty));

  const cariesPatients = useMemo(
    () =>
      db.patients
        .map((p) => ({ p, n: Object.values(p.teeth).filter((s) => s === "caries").length }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n)
        .slice(0, 4),
    [db.patients]
  );

  const stats = [
    {
      label: "المرضى المسجلون",
      value: db.patients.length,
      money: false,
      sub: `${newThisWeek} انضموا هذا الأسبوع`,
      icon: <IconUsers className="w-5 h-5" />,
      tint: "bg-jade-soft text-jade-deep",
      extra: (
        <div className="flex gap-1 items-end h-7 mt-3" dir="ltr">
          {[3, 5, 2, 6, 4, 7, newThisWeek + 3].map((v, i) => (
            <span key={i} className="w-1.5 rounded-full bg-jade/25 anim-bar" style={{ height: `${(v / 8) * 100}%`, animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      ),
    },
    {
      label: "مواعيد اليوم",
      value: activeToday,
      money: false,
      sub: `${doneToday} مكتمل · ${Math.max(0, activeToday - doneToday)} متبقٍ`,
      icon: <IconCalendar className="w-5 h-5" />,
      tint: "bg-sky-soft text-sky",
      extra: (
        <div className="h-1.5 rounded-full bg-line mt-4 overflow-hidden">
          <div className="h-full rounded-full bg-sky anim-grow-w" style={{ width: `${activeToday ? (doneToday / activeToday) * 100 : 0}%` }} />
        </div>
      ),
    },
    {
      label: `إيرادات ${monthName()}`,
      value: monthRevenue,
      money: true,
      sub: `${monthInvoices.length} فاتورة هذا الشهر`,
      icon: <IconWallet className="w-5 h-5" />,
      tint: "bg-mint-soft text-[#1d6b47]",
      extra: (
        <div className="flex items-center gap-1.5 mt-3.5 text-[11px] font-bold text-mint">
          <IconTrendUp className="w-4 h-4" />
          تحصيل نشط
        </div>
      ),
    },
    {
      label: "مستحقات معلّقة",
      value: outstanding,
      money: true,
      sub: `${outstandingCount} فاتورة غير مسددة`,
      icon: <IconAlert className="w-5 h-5" />,
      tint: "bg-coral-soft text-coral",
      extra: (
        <button onClick={() => onNav("invoices")} className="mt-3 text-[11px] font-bold text-coral hover:underline cursor-pointer inline-flex items-center gap-1">
          مراجعة الفواتير
          <IconArrowLeft className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  const actIcon = (kind: string) =>
    kind === "patient" ? <IconUserPlus className="w-4 h-4" /> : kind === "appt" ? <IconCalendar className="w-4 h-4" /> : kind === "invoice" ? <IconReceipt className="w-4 h-4" /> : <IconTooth className="w-4 h-4" />;

  return (
    <div className="space-y-5">
      {/* الترويسة */}
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-soft font-medium">{fmtDateFull(today(0))}</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink mt-1 leading-tight flex items-center gap-3">
            {greeting()}، د. أحمد
            <span className="inline-flex text-jade"><IconTooth className="w-8 h-8" /></span>
          </h1>
          <p className="text-sm text-soft mt-1.5">
            لديك <b className="text-jade-deep">{activeToday - doneToday}</b> موعداً متبقياً اليوم — الجدول يسير بسلاسة.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="btn-soft" onClick={onNewPatient}>
            <IconUserPlus className="w-4.5 h-4.5" />
            مريض جديد
          </button>
          <button className="btn-primary" onClick={onQuickBook}>
            <IconCalendarPlus className="w-4.5 h-4.5" />
            حجز موعد
          </button>
        </div>
      </div>

      {/* البطاقات الإحصائية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={s.label} className="card card-hover p-5 anim-rise" style={{ animationDelay: `${80 + i * 70}ms` }}>
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold text-soft">{s.label}</p>
              <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${s.tint}`}>{s.icon}</span>
            </div>
            <AnimatedNumber value={s.value} className="stat-num text-[32px] text-ink mt-1" />
            {s.money && <span className="text-xs font-bold text-soft me-1">ر.س</span>}
            <p className="text-[11px] text-soft mt-1.5 font-medium">{s.sub}</p>
            {s.extra}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* مواعيد اليوم */}
        <div className="col-span-12 xl:col-span-7 card anim-rise" style={{ animationDelay: "320ms" }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
            <h2 className="font-display font-bold text-lg text-ink">جدول اليوم</h2>
            <button onClick={() => onNav("appointments")} className="text-xs font-bold text-jade-deep hover:underline inline-flex items-center gap-1 cursor-pointer">
              إدارة المواعيد
              <IconArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-5 max-h-[430px] overflow-y-auto">
            {todayAppts.length === 0 ? (
              <EmptyState icon={<IconCalendar className="w-6 h-6" />} title="لا مواعيد اليوم" desc="استمتع بيوم هادئ، أو احجز موعداً جديداً." />
            ) : (
              <ol className="relative">
                {todayAppts.map((a, i) => {
                  const p = patientById(a.patientId);
                  const s = serviceById(a.serviceId);
                  const d = doctorById(a.doctorId);
                  const meta = APPT_META[a.status];
                  const dimmed = a.status === "done" || a.status === "cancelled";
                  return (
                    <li key={a.id} className="relative flex gap-4 pb-4 last:pb-0">
                      {/* الخط الزمني */}
                      <div className="flex flex-col items-center">
                        <span className="stat-num text-sm text-ink w-12 text-center pt-2">{a.time}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span
                          className={`mt-2.5 w-3 h-3 rounded-full border-2 border-white shadow z-10 shrink-0 ${a.status === "inprogress" ? "pulse-dot" : ""}`}
                          style={{ background: meta.dot }}
                        />
                        {i < todayAppts.length - 1 && <span className="w-px flex-1 bg-line mt-1" />}
                      </div>
                      <button
                        onClick={() => p && onOpenPatient(p.id)}
                        className={`flex-1 text-start rounded-xl border border-line bg-white p-3.5 mb-0 transition-all hover:border-jade/50 hover:shadow-md cursor-pointer ${
                          dimmed ? "opacity-55" : ""
                        } ${a.status === "inprogress" ? "border-jade/60 shadow-[0_0_0_3px_rgba(13,143,131,0.1)]" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={p?.name ?? "؟"} size="w-9 h-9 text-xs" />
                          <div className="min-w-0 flex-1">
                            <p className={`font-bold text-sm text-ink truncate ${a.status === "cancelled" ? "line-through" : ""}`}>{p?.name}</p>
                            <p className="text-[11px] text-soft mt-0.5 truncate">
                              {s?.name} · {d?.name}
                            </p>
                          </div>
                          <Badge cls={meta.cls}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                            {meta.label}
                          </Badge>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* العمود الجانبي */}
        <div className="col-span-12 xl:col-span-5 space-y-5">
          {/* زيارات الأسبوع */}
          <div className="card p-5 anim-rise" style={{ animationDelay: "390ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-ink">زيارات آخر ٧ أيام</h2>
              <span className="chip bg-jade-soft text-jade-deep">{week.reduce((s, w) => s + w.count, 0)} زيارة</span>
            </div>
            <div className="flex items-end gap-2.5 h-32" dir="ltr">
              {week.map((w, i) => (
                <div key={w.d} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="stat-num text-xs text-soft group-hover:text-jade-deep transition-colors">{w.count}</span>
                  <div
                    className={`w-full max-w-9 rounded-t-lg anim-bar ${i === 6 ? "bg-jade" : "bg-jade/20 group-hover:bg-jade/40"} transition-colors`}
                    style={{ height: `${Math.max(8, (w.count / maxWeek) * 78)}%`, animationDelay: `${i * 70}ms` }}
                  />
                  <span className={`text-[10px] font-bold ${i === 6 ? "text-jade-deep" : "text-soft"}`}>{w.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* تنبيهات سريرية */}
          <div className="card p-5 anim-rise" style={{ animationDelay: "450ms" }}>
            <h2 className="font-display font-bold text-lg text-ink mb-3.5">حالات تسوس تحتاج متابعة</h2>
            {cariesPatients.length === 0 ? (
              <p className="text-xs text-soft">لا توجد حالات تسوس مسجلة — عمل رائع!</p>
            ) : (
              <ul className="space-y-2.5">
                {cariesPatients.map(({ p, n }) => (
                  <li key={p.id}>
                    <button
                      onClick={() => onOpenPatient(p.id)}
                      className="w-full flex items-center gap-3 rounded-xl border border-line p-2.5 hover:border-coral/50 hover:bg-coral-soft/40 transition-all cursor-pointer text-start"
                    >
                      <Avatar name={p.name} size="w-9 h-9 text-xs" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink truncate">{p.name}</p>
                        <p className="text-[11px] text-soft mt-0.5">
                          {patientBalance(p.id) > 0 ? `مستحقات ${fmtMoney(patientBalance(p.id))}` : "لا مستحقات"}
                        </p>
                      </div>
                      <span className="chip bg-coral-soft text-coral">{n} تسوس</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* أكثر العلاجات */}
          <div className="card p-5 anim-rise" style={{ animationDelay: "510ms" }}>
            <h2 className="font-display font-bold text-lg text-ink mb-3.5">الأكثر طلباً</h2>
            <ul className="space-y-3">
              {topServices.map(({ s, qty }, i) => (
                <li key={s!.id} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s!.color }} />
                  <span className="text-xs font-bold text-ink flex-1 truncate">{s!.name}</span>
                  <div className="w-24 h-1.5 rounded-full bg-line overflow-hidden">
                    <div className="h-full rounded-full anim-grow-w" style={{ width: `${(qty / maxTop) * 100}%`, background: s!.color, animationDelay: `${i * 90}ms` }} />
                  </div>
                  <span className="stat-num text-xs text-soft w-6 text-end">{qty}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* النشاط الأخير */}
        <div className="col-span-12 card anim-rise" style={{ animationDelay: "560ms" }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
            <h2 className="font-display font-bold text-lg text-ink">النشاط الأخير في العيادة</h2>
            <span className="chip bg-mist text-soft">يُحدَّث تلقائياً</span>
          </div>
          <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-6">
            {db.activity.slice(0, 6).map((a, i) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3.5 border-b border-line/60 last:border-0 anim-fade" style={{ animationDelay: `${600 + i * 60}ms` }}>
                <span className="mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-jade-soft text-jade-deep shrink-0">{actIcon(a.kind)}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink leading-relaxed">{a.text}</p>
                  <p className="text-[11px] text-soft mt-0.5">{relTime(a.time)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
