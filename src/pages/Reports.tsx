import React, { useMemo, useState } from "react";
import {
  clinicOf,
  expCatColor,
  EXPENSE_CATS,
  fmtDate,
  FU_META,
  INV_META,
  invoiceStatus,
  invoiceTotal,
  monthName,
  today,
  useMoney,
  useStore,
} from "../store";
import {
  IconCalendar,
  IconCalendarPlus,
  IconCheck,
  IconCoins,
  IconPrinter,
  IconReceipt,
  IconSpark,
  IconStetho,
  IconTooth,
  IconTrendUp,
  IconUsers,
  IconWallet,
} from "../icons";
import { AnimatedNumber, Avatar, Badge, EmptyState } from "../components/ui";

const AR = "ar-EG-u-nu-latn";

type Period = "month" | "last" | "q" | "year" | "all";
type Tab = "overview" | "financial" | "doctors" | "followups" | "services" | "expenses";

const PERIODS: { key: Period; label: string }[] = [
  { key: "month", label: "هذا الشهر" },
  { key: "last", label: "الشهر السابق" },
  { key: "q", label: "آخر 3 أشهر" },
  { key: "year", label: "هذه السنة" },
  { key: "all", label: "كل الفترات" },
];

const dayDiff = (d: string) =>
  Math.round((new Date(d + "T12:00:00").getTime() - new Date(today(0) + "T12:00:00").getTime()) / 86400000);

/* تصدير CSV (بترويسة BOM لدعم العربية في Excel) */
function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${today(0)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ReportsPage() {
  const { db, serviceById, patientById, doctorById } = useStore();
  const clinic = clinicOf(db);
  const money = useMoney();
  const cur = db.currencies.find((c) => c.code === db.defaultCurrency) ?? db.currencies[0];
  const sym = cur?.symbol ?? "ر.ي";

  const [tab, setTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<Period>("month");

  const monthPrefix = today(0).slice(0, 7);
  const lastMonthPrefix = (() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();
  const yearPrefix = today(0).slice(0, 4);

  const inPeriod = (date: string) => {
    if (period === "all") return true;
    if (period === "month") return date.startsWith(monthPrefix);
    if (period === "last") return date.startsWith(lastMonthPrefix);
    if (period === "q") return date >= today(-90);
    if (period === "year") return date.startsWith(yearPrefix);
    return true;
  };
  const periodLabel = PERIODS.find((p) => p.key === period)!.label;

  /* ============ بيانات مشتركة ============ */
  const inv = useMemo(() => db.invoices.filter((i) => inPeriod(i.date)), [db.invoices, period]);
  const exp = useMemo(() => db.expenses.filter((e) => inPeriod(e.date)), [db.expenses, period]);
  const appts = useMemo(() => db.appointments.filter((a) => inPeriod(a.date)), [db.appointments, period]);
  const sessions = useMemo(() => db.sessions.filter((s) => inPeriod(s.date)), [db.sessions, period]);

  const billed = inv.reduce((s, i) => s + invoiceTotal(i), 0);
  const collected = inv.reduce((s, i) => s + Math.min(i.paid, invoiceTotal(i)), 0);
  const outstanding = inv.reduce((s, i) => s + Math.max(0, invoiceTotal(i) - i.paid), 0);
  const collectionRate = billed > 0 ? Math.round((collected / billed) * 100) : 0;
  const expTotal = exp.reduce((s, e) => s + e.amount, 0);
  const net = collected - expTotal;
  const doneAppts = appts.filter((a) => a.status === "done").length;
  const newPatients = db.patients.filter((p) => inPeriod(p.joined)).length;

  /* 6 أشهر للرسم */
  const months = useMemo(() => {
    const arr: { key: string; label: string; revenue: number; expenses: number }[] = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 5; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
      arr.push({
        key,
        label: new Intl.DateTimeFormat(AR, { month: "short" }).format(m),
        revenue: db.invoices.filter((x) => x.date.startsWith(key)).reduce((s, x) => s + Math.min(x.paid, invoiceTotal(x)), 0),
        expenses: db.expenses.filter((x) => x.date.startsWith(key)).reduce((s, x) => s + x.amount, 0),
      });
    }
    return arr;
  }, [db.invoices, db.expenses]);
  const maxMonth = Math.max(1, ...months.map((m) => Math.max(m.revenue, m.expenses)));

  /* الأطباء */
  const doctorStats = db.doctors.map((d) => {
    const all = appts.filter((a) => a.doctorId === d.id);
    const done = all.filter((a) => a.status === "done").length;
    const cancelled = all.filter((a) => a.status === "cancelled").length;
    const sess = sessions.filter((s) => s.doctorId === d.id);
    const sessRevenue = sess.reduce((sum, s) => {
      const i = s.invoiceId ? db.invoices.find((x) => x.id === s.invoiceId) : undefined;
      return sum + (i ? invoiceTotal(i) : 0);
    }, 0);
    const fuPending = db.followUps.filter((f) => f.doctorId === d.id && f.status === "pending").length;
    const rate = all.length ? Math.round((done / all.length) * 100) : 0;
    return { d, total: all.length, done, cancelled, sess: sess.length, sessRevenue, fuPending, rate };
  });

  /* العودات */
  const fuPending = db.followUps.filter((f) => f.status === "pending");
  const fuOverdue = fuPending.filter((f) => dayDiff(f.dueDate) < 0);
  const fuBooked = db.followUps.filter((f) => f.status === "booked");
  const fuDone = db.followUps.filter((f) => f.status === "done");
  const fuRate = db.followUps.length ? Math.round((fuDone.length / db.followUps.length) * 100) : 0;

  /* الخدمات */
  const serviceStats = useMemo(() => {
    const agg = new Map<string, { qty: number; rev: number }>();
    inv.forEach((i) =>
      i.items.forEach((it) => {
        const cur2 = agg.get(it.serviceId) ?? { qty: 0, rev: 0 };
        agg.set(it.serviceId, { qty: cur2.qty + it.qty, rev: cur2.rev + it.qty * it.price });
      })
    );
    return [...agg.entries()]
      .map(([id, v]) => ({ s: serviceById(id), ...v }))
      .filter((x) => x.s)
      .sort((a, b) => b.rev - a.rev);
  }, [inv, serviceById]);
  const maxRev = Math.max(1, ...serviceStats.map((t) => t.rev));

  /* المصروفات بالفئات */
  const expByCat = useMemo(() => {
    const agg = new Map<string, number>();
    exp.forEach((e) => agg.set(e.category, (agg.get(e.category) ?? 0) + e.amount));
    return [...agg.entries()].sort((a, b) => b[1] - a[1]);
  }, [exp]);
  const maxCat = Math.max(1, ...expByCat.map(([, v]) => v));

  const TABS: { key: Tab; label: string; icon: (c: string) => React.ReactNode }[] = [
    { key: "overview", label: "نظرة عامة", icon: (c) => <IconTrendUp className={c} /> },
    { key: "financial", label: "المالي", icon: (c) => <IconWallet className={c} /> },
    { key: "doctors", label: "الأطباء", icon: (c) => <IconStetho className={c} /> },
    { key: "followups", label: "العودات", icon: (c) => <IconCalendarPlus className={c} /> },
    { key: "services", label: "الخدمات", icon: (c) => <IconTooth className={c} /> },
    { key: "expenses", label: "المصروفات", icon: (c) => <IconReceipt className={c} /> },
  ];

  const exportCurrent = () => {
    if (tab === "financial")
      downloadCsv("التقرير-المالي", [
        ["رقم الفاتورة", "المريض", "التاريخ", "الإجمالي", "المدفوع", "المتبقي", "الحالة"],
        ...inv.map((i) => [i.number, patientById(i.patientId)?.name ?? "", i.date, invoiceTotal(i), i.paid, invoiceTotal(i) - i.paid, INV_META[invoiceStatus(i)].label]),
      ]);
    else if (tab === "doctors")
      downloadCsv("تقرير-الأطباء", [
        ["الطبيب", "المواعيد", "المكتملة", "الملغاة", "الجلسات", "عودات معلقة", "إيراد الجلسات"],
        ...doctorStats.map((x) => [x.d.name, x.total, x.done, x.cancelled, x.sess, x.fuPending, x.sessRevenue]),
      ]);
    else if (tab === "followups")
      downloadCsv("تقرير-العودات", [
        ["المريض", "السبب", "الطبيب", "الاستحقاق", "الحالة"],
        ...db.followUps.map((f) => [patientById(f.patientId)?.name ?? "", f.reason, doctorById(f.doctorId)?.name ?? "", f.dueDate, FU_META[f.status].label]),
      ]);
    else if (tab === "services")
      downloadCsv("تقرير-الخدمات", [["الخدمة", "الفئة", "عدد المرات", "الإيراد"], ...serviceStats.map((x) => [x.s!.name, x.s!.category, x.qty, x.rev])]);
    else if (tab === "expenses")
      downloadCsv("تقرير-المصروفات", [["البند", "الفئة", "التاريخ", "المبلغ"], ...exp.map((e) => [e.title, e.category, e.date, e.amount])]);
    else
      downloadCsv("ملخص-عام", [["المؤشر", "القيمة"], ["الإيراد المحصل", collected], ["المصروفات", expTotal], ["الصافي", net], ["المواعيد المكتملة", doneAppts], ["مرضى جدد", newPatients]]);
  };

  const Kpi = ({ label, value, suffix, tint, icon, sub }: { label: string; value: number; suffix?: string; tint: string; icon: React.ReactNode; sub?: string }) => (
    <div className="card card-hover p-5 anim-rise">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold text-soft">{label}</p>
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${tint}`}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <AnimatedNumber value={value} className="stat-num text-[30px] text-ink" />
        {suffix && <span className="text-xs font-bold text-soft">{suffix}</span>}
      </div>
      {sub && <p className="text-[11px] mt-1.5 font-medium text-soft">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">مركز التقارير</h1>
          <p className="text-sm text-soft mt-1">تقارير مالية وتشغيلية احترافية — قابلة للطباعة والتصدير</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="input !w-auto cursor-pointer !bg-white">
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          <button className="btn-soft" onClick={exportCurrent}>
            <IconCoins className="w-4 h-4" />
            تصدير CSV
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            <IconPrinter className="w-4 h-4" />
            طباعة التقرير
          </button>
        </div>
      </div>

      {/* تبويبات التقارير */}
      <div className="card p-1.5 inline-flex gap-1 flex-wrap anim-rise" style={{ animationDelay: "60ms" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 h-10 text-xs font-bold cursor-pointer transition-all ${
              tab === t.key ? "bg-pine text-white shadow-md" : "text-soft hover:bg-mist"
            }`}
          >
            {t.icon("w-4 h-4")}
            {t.label}
          </button>
        ))}
      </div>

      {/* ====== جسم التقرير (قابل للطباعة) ====== */}
      <div className="print-sheet">
        {/* ترويسة الطباعة */}
        <div className="hidden print:flex items-center justify-between pb-4 mb-5 border-b-2 border-pine">
          <div>
            <p className="font-display font-bold text-xl">{clinic.clinicName}</p>
            <p className="text-[10px] text-soft tracking-wider" dir="ltr">{clinic.clinicLatin}</p>
          </div>
          <div className="text-end">
            <p className="font-bold text-sm">{TABS.find((t) => t.key === tab)!.label} — {periodLabel}</p>
            <p className="text-[10px] text-soft mt-0.5">طُبع بتاريخ {fmtDate(today(0))}</p>
          </div>
        </div>

        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Kpi label={`إيراد محصل — ${periodLabel}`} value={collected} suffix={sym} tint="bg-mint-soft text-[#1d6b47]" icon={<IconWallet className="w-5 h-5" />} sub={`من ${money(billed)} مفوتر · تحصيل ${collectionRate}%`} />
              <Kpi label={`مصروفات — ${periodLabel}`} value={expTotal} suffix={sym} tint="bg-coral-soft text-coral" icon={<IconReceipt className="w-5 h-5" />} sub={`${exp.length} عملية صرف`} />
              <Kpi label="الصافي" value={net} suffix={sym} tint={net >= 0 ? "bg-jade-soft text-jade-deep" : "bg-coral-soft text-coral"} icon={<IconTrendUp className="w-5 h-5" />} sub={net >= 0 ? "ربح تشغيلي" : "عجز — راجع المصروفات"} />
              <Kpi label="مواعيد مكتملة" value={doneAppts} tint="bg-sky-soft text-sky" icon={<IconCalendar className="w-5 h-5" />} sub={`${newPatients} مريض جديد · ${sessions.length} جلسة`} />
            </div>

            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-12 xl:col-span-7 card anim-rise">
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
                  <h2 className="font-display font-bold text-lg text-ink">الإيرادات مقابل المصروفات — 6 أشهر</h2>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-soft">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-jade" /> إيرادات</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-coral/70" /> مصروفات</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-end gap-4 h-52" dir="ltr">
                    {months.map((m, i) => (
                      <div key={m.key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="flex items-end gap-1.5 h-full w-full justify-center">
                          <div className="w-1/3 max-w-7 rounded-t-md bg-jade anim-bar" style={{ height: `${Math.max(4, (m.revenue / maxMonth) * 100)}%`, animationDelay: `${i * 80}ms` }} title={money(m.revenue)} />
                          <div className="w-1/3 max-w-7 rounded-t-md bg-coral/70 anim-bar" style={{ height: `${Math.max(4, (m.expenses / maxMonth) * 100)}%`, animationDelay: `${i * 80 + 60}ms` }} title={money(m.expenses)} />
                        </div>
                        <span className={`text-[11px] font-bold ${i === 5 ? "text-jade-deep" : "text-soft"}`}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-12 xl:col-span-5 card anim-rise">
                <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
                  <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2"><IconUsers className="w-5 h-5 text-jade-deep" /> مؤشرات سريعة</h2>
                  <span className="chip bg-mist text-soft">{periodLabel}</span>
                </div>
                <ul className="p-5 space-y-3">
                  {[
                    { l: "فواتير صادرة", v: inv.length, d: "" },
                    { l: "مستحقات غير محصلة", v: outstanding, d: sym },
                    { l: "جلسات علاج مكتملة", v: sessions.length, d: "" },
                    { l: "عودات متابعة مستحقة", v: fuPending.length, d: "" },
                    { l: "مواعيد ملغاة", v: appts.filter((a) => a.status === "cancelled").length, d: "" },
                  ].map((r, i) => (
                    <li key={r.l} className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5 anim-fade" style={{ animationDelay: `${i * 60}ms` }}>
                      <span className="text-xs font-bold text-ink">{r.l}</span>
                      <span className="stat-num text-sm text-jade-deep">{typeof r.v === "number" && r.d ? money(r.v) : r.v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === "financial" && (
          <div className="card overflow-hidden anim-rise">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
              <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2"><IconWallet className="w-5 h-5 text-jade-deep" /> التقرير المالي — {periodLabel}</h2>
              <span className="chip bg-mist text-soft stat-num">{inv.length} فاتورة</span>
            </div>
            {inv.length === 0 ? (
              <EmptyState icon={<IconWallet className="w-6 h-6" />} title="لا فواتير في هذه الفترة" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-mist/70 border-b border-line">
                    <tr>
                      <th className="th">الفاتورة</th>
                      <th className="th">المريض</th>
                      <th className="th">التاريخ</th>
                      <th className="th">الإجمالي</th>
                      <th className="th">المدفوع</th>
                      <th className="th">المتبقي</th>
                      <th className="th">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.map((i, x) => {
                      const st = invoiceStatus(i);
                      return (
                        <tr key={i.id} className="border-b border-line/60 last:border-0 hover:bg-jade-soft/25 transition-colors anim-fade" style={{ animationDelay: `${x * 30}ms` }}>
                          <td className="td stat-num text-jade-deep" dir="ltr">{i.number}</td>
                          <td className="td font-bold text-ink">{patientById(i.patientId)?.name}</td>
                          <td className="td text-soft">{fmtDate(i.date)}</td>
                          <td className="td stat-num">{money(invoiceTotal(i))}</td>
                          <td className="td stat-num text-mint">{money(i.paid)}</td>
                          <td className="td stat-num text-coral">{money(Math.max(0, invoiceTotal(i) - i.paid))}</td>
                          <td className="td"><Badge cls={INV_META[st].cls}>{INV_META[st].label}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-pine text-white">
                      <td className="td font-display font-bold" colSpan={3}>الإجمالي — {periodLabel}</td>
                      <td className="td stat-num font-bold">{money(billed)}</td>
                      <td className="td stat-num font-bold">{money(collected)}</td>
                      <td className="td stat-num font-bold">{money(outstanding)}</td>
                      <td className="td"><span className="chip bg-white/15 text-white">تحصيل {collectionRate}%</span></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "doctors" && (
          <div className="card overflow-hidden anim-rise">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
              <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2"><IconStetho className="w-5 h-5 text-jade-deep" /> تقرير أداء الأطباء — {periodLabel}</h2>
              <span className="chip bg-mist text-soft">{db.doctors.length} طبيب</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-mist/70 border-b border-line">
                  <tr>
                    <th className="th">الطبيب</th>
                    <th className="th">المواعيد</th>
                    <th className="th">مكتملة</th>
                    <th className="th">ملغاة</th>
                    <th className="th">الجلسات</th>
                    <th className="th">عودات معلقة</th>
                    <th className="th">إيراد الجلسات</th>
                    <th className="th">الإنجاز</th>
                  </tr>
                </thead>
                <tbody>
                  {doctorStats.map((x, i) => (
                    <tr key={x.d.id} className="border-b border-line/60 last:border-0 hover:bg-jade-soft/25 transition-colors anim-fade" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={x.d.name} size="w-9 h-9 text-xs" />
                          <div>
                            <p className="font-bold text-ink text-sm">{x.d.name}</p>
                            <p className="text-[10px] text-soft">{x.d.specialty}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td stat-num">{x.total}</td>
                      <td className="td stat-num text-mint">{x.done}</td>
                      <td className="td stat-num text-coral">{x.cancelled}</td>
                      <td className="td stat-num">{x.sess}</td>
                      <td className="td stat-num text-sky">{x.fuPending}</td>
                      <td className="td stat-num text-jade-deep">{money(x.sessRevenue)}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-mist overflow-hidden">
                            <div className="h-full rounded-full anim-grow-w" style={{ width: `${x.rate}%`, background: x.d.color }} />
                          </div>
                          <span className="stat-num text-xs text-soft">{x.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "followups" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
              {[
                { l: "معلقة", v: fuPending.length, cls: "bg-sky-soft text-sky", icon: <IconCalendarPlus className="w-4.5 h-4.5" /> },
                { l: "متأخرة", v: fuOverdue.length, cls: "bg-coral-soft text-coral", icon: <IconTrendUp className="w-4.5 h-4.5" /> },
                { l: "محجوزة", v: fuBooked.length, cls: "bg-jade-soft text-jade-deep", icon: <IconCalendar className="w-4.5 h-4.5" /> },
                { l: "مكتملة", v: fuDone.length, cls: "bg-mint-soft text-[#1d6b47]", icon: <IconCheck className="w-4.5 h-4.5" /> },
                { l: "نسبة الإنجاز", v: fuRate, cls: "bg-amber-soft text-[#a06410]", icon: <IconSpark className="w-4.5 h-4.5" />, suf: "%" },
              ].map((s, i) => (
                <div key={s.l} className="card card-hover p-4 flex items-center gap-3 anim-rise" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${s.cls}`}>{s.icon}</span>
                  <div>
                    <p className="stat-num text-2xl text-ink leading-none">{s.v}{s.suf ?? ""}</p>
                    <p className="text-[11px] font-bold text-soft mt-1">{s.l}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="card overflow-hidden anim-rise">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
                <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2"><IconCalendarPlus className="w-5 h-5 text-jade-deep" /> سجل العودات والمتابعة</h2>
                <span className="chip bg-mist text-soft stat-num">{db.followUps.length} عودة</span>
              </div>
              {db.followUps.length === 0 ? (
                <EmptyState icon={<IconCalendarPlus className="w-6 h-6" />} title="لا عودات مسجلة" desc="تُنشأ العودات من محطة العمل أو من ملف المريض." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-mist/70 border-b border-line">
                      <tr>
                        <th className="th">المريض</th>
                        <th className="th">سبب العودة</th>
                        <th className="th">الطبيب</th>
                        <th className="th">الاستحقاق</th>
                        <th className="th">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...db.followUps].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((f, i) => {
                        const late = f.status === "pending" && dayDiff(f.dueDate) < 0;
                        return (
                          <tr key={f.id} className={`border-b border-line/60 last:border-0 anim-fade ${late ? "bg-coral-soft/25" : "hover:bg-jade-soft/25"}`} style={{ animationDelay: `${i * 30}ms` }}>
                            <td className="td font-bold text-ink">{patientById(f.patientId)?.name}</td>
                            <td className="td text-soft">{f.reason}</td>
                            <td className="td text-soft">{doctorById(f.doctorId)?.name}</td>
                            <td className={`td stat-num ${late ? "text-coral font-bold" : ""}`}>{fmtDate(f.dueDate)}{late ? " · متأخرة" : ""}</td>
                            <td className="td"><Badge cls={FU_META[f.status].cls}>{FU_META[f.status].label}</Badge></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "services" && (
          <div className="card overflow-hidden anim-rise">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
              <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2"><IconTooth className="w-5 h-5 text-jade-deep" /> تقرير الخدمات — {periodLabel}</h2>
              <span className="chip bg-mist text-soft stat-num">{serviceStats.length} خدمة</span>
            </div>
            {serviceStats.length === 0 ? (
              <EmptyState icon={<IconTooth className="w-6 h-6" />} title="لا خدمات منفذة في هذه الفترة" />
            ) : (
              <ul className="p-5 space-y-3.5">
                {serviceStats.map(({ s, qty, rev }, i) => (
                  <li key={s!.id} className="anim-fade" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="flex items-center gap-2 text-sm font-bold text-ink">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s!.color }} />
                        {s!.name}
                        <span className="chip bg-mist text-soft !text-[9px]">{s!.category}</span>
                      </span>
                      <span className="stat-num text-sm text-jade-deep shrink-0">{money(rev)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-mist overflow-hidden">
                        <div className="h-full rounded-full anim-grow-w" style={{ width: `${(rev / maxRev) * 100}%`, background: s!.color, animationDelay: `${i * 70}ms` }} />
                      </div>
                      <span className="stat-num text-xs text-soft w-16 text-end shrink-0">{qty} مرة</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "expenses" && (
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 xl:col-span-5 card anim-rise">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
                <h2 className="font-display font-bold text-lg text-ink">المصروفات بالفئات — {periodLabel}</h2>
                <span className="chip bg-mist text-soft stat-num">{money(expTotal)}</span>
              </div>
              <div className="p-5 space-y-3.5">
                {expByCat.length === 0 && <p className="text-xs text-soft text-center py-6">لا مصروفات في هذه الفترة.</p>}
                {expByCat.map(([cat, val], i) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="flex items-center gap-2 text-ink">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: expCatColor(cat) }} />
                        {cat}
                      </span>
                      <span className="stat-num text-soft">{money(val)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-mist overflow-hidden">
                      <div className="h-full rounded-full anim-grow-w" style={{ width: `${(val / maxCat) * 100}%`, background: expCatColor(cat), animationDelay: `${i * 80}ms` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 xl:col-span-7 card overflow-hidden anim-rise">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
                <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2"><IconReceipt className="w-5 h-5 text-jade-deep" /> تفاصيل المصروفات</h2>
                <span className="chip bg-mist text-soft stat-num">{exp.length} عملية</span>
              </div>
              {exp.length === 0 ? (
                <EmptyState icon={<IconReceipt className="w-6 h-6" />} title="لا مصروفات مسجلة" />
              ) : (
                <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                  <table className="w-full min-w-[520px]">
                    <thead className="bg-mist/70 border-b border-line sticky top-0">
                      <tr>
                        <th className="th">البند</th>
                        <th className="th">الفئة</th>
                        <th className="th">التاريخ</th>
                        <th className="th">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exp.map((e, i) => (
                        <tr key={e.id} className="border-b border-line/60 last:border-0 hover:bg-jade-soft/25 transition-colors anim-fade" style={{ animationDelay: `${i * 25}ms` }}>
                          <td className="td font-bold text-ink">{e.title}</td>
                          <td className="td"><span className="chip" style={{ background: `${expCatColor(e.category)}22`, color: expCatColor(e.category) }}>{e.category}</span></td>
                          <td className="td text-soft">{fmtDate(e.date)}</td>
                          <td className="td stat-num text-coral">{money(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
