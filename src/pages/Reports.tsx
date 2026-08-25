import React, { useMemo } from "react";
import {
  APPT_META,
  expCatColor,
  fmtDate,
  invoiceTotal,
  monthName,
  today,
  useMoney,
  useStore,
} from "../store";
import { IconCalendar, IconReceipt, IconStetho, IconTrendUp, IconUsers, IconWallet } from "../icons";
import { AnimatedNumber, Avatar } from "../components/ui";

const AR = "ar-EG-u-nu-latn";

export default function ReportsPage() {
  const { db, serviceById } = useStore();
  const money = useMoney();
  const cur = db.currencies.find((c) => c.code === db.defaultCurrency) ?? db.currencies[0];
  const sym = cur?.symbol ?? "ر.ي";

  const monthPrefix = today(0).slice(0, 7);
  const lastMonthPrefix = (() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  /* الإيرادات آخر 6 أشهر */
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

  const thisMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];
  const growth = prevMonth.revenue > 0 ? Math.round(((thisMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100) : 100;

  const monthInvoices = db.invoices.filter((i) => i.date.startsWith(monthPrefix));
  const billed = monthInvoices.reduce((s, i) => s + invoiceTotal(i), 0);
  const collected = monthInvoices.reduce((s, i) => s + Math.min(i.paid, invoiceTotal(i)), 0);
  const collectionRate = billed > 0 ? Math.round((collected / billed) * 100) : 0;

  const monthAppts = db.appointments.filter((a) => a.date.startsWith(monthPrefix));
  const doneAppts = monthAppts.filter((a) => a.status === "done").length;
  const monthPatients = db.patients.filter((p) => p.joined.startsWith(monthPrefix)).length;

  /* تقرير الأطباء */
  const doctorStats = useMemo(
    () =>
      db.doctors.map((d) => {
        const all = db.appointments.filter((a) => a.doctorId === d.id);
        const done = all.filter((a) => a.status === "done").length;
        const upcoming = all.filter((a) => a.date >= today(0) && (a.status === "confirmed" || a.status === "waiting")).length;
        const cancelled = all.filter((a) => a.status === "cancelled").length;
        const rate = all.length ? Math.round((done / all.length) * 100) : 0;
        return { d, total: all.length, done, upcoming, cancelled, rate };
      }),
    [db.doctors, db.appointments]
  );

  /* أعلى الخدمات إيراداً */
  const topRevenue = useMemo(() => {
    const agg = new Map<string, number>();
    db.invoices.forEach((inv) =>
      inv.items.forEach((it) => agg.set(it.serviceId, (agg.get(it.serviceId) ?? 0) + it.qty * it.price))
    );
    return [...agg.entries()]
      .map(([id, rev]) => ({ s: serviceById(id), rev }))
      .filter((x) => x.s)
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 6);
  }, [db.invoices, serviceById]);
  const maxRev = Math.max(1, ...topRevenue.map((t) => t.rev));

  /* المصروفات حسب الفئة هذا الشهر */
  const expByCat = useMemo(() => {
    const agg = new Map<string, number>();
    db.expenses.filter((e) => e.date.startsWith(monthPrefix)).forEach((e) => agg.set(e.category, (agg.get(e.category) ?? 0) + e.amount));
    return [...agg.entries()].sort((a, b) => b[1] - a[1]);
  }, [db.expenses, monthPrefix]);
  const monthExpTotal = expByCat.reduce((s, [, v]) => s + v, 0);

  /* آخر العمليات المكتملة */
  const recentDone = useMemo(
    () =>
      db.appointments
        .filter((a) => a.status === "done")
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
        .slice(0, 6),
    [db.appointments]
  );

  const kpis = [
    { label: `إيرادات ${monthName()}`, value: thisMonth.revenue, money: true, icon: <IconWallet className="w-5 h-5" />, tint: "bg-mint-soft text-[#1d6b47]", sub: <span className={growth >= 0 ? "text-mint" : "text-coral"}>{growth >= 0 ? "▲" : "▼"} {Math.abs(growth)}% عن الشهر السابق</span> },
    { label: `مصروفات ${monthName()}`, value: thisMonth.expenses, money: true, icon: <IconReceipt className="w-5 h-5" />, tint: "bg-coral-soft text-coral", sub: <span className="text-soft">صافي الشهر: <b className={thisMonth.revenue - thisMonth.expenses >= 0 ? "text-mint" : "text-coral"}>{money(thisMonth.revenue - thisMonth.expenses)}</b></span> },
    { label: "نسبة التحصيل", value: collectionRate, money: false, suffix: "%", icon: <IconTrendUp className="w-5 h-5" />, tint: "bg-jade-soft text-jade-deep", sub: <span className="text-soft">من إجمالي {money(billed)} مفوتر</span> },
    { label: "عمليات مكتملة", value: doneAppts, money: false, icon: <IconCalendar className="w-5 h-5" />, tint: "bg-sky-soft text-sky", sub: <span className="text-soft">{monthPatients} مريض جديد هذا الشهر</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">التقارير والإحصائيات</h1>
          <p className="text-sm text-soft mt-1">الوضع المالي والتشغيلي للعيادة — {monthName()}</p>
        </div>
        <span className="chip bg-white border border-line !py-2.5 text-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-mint pulse-dot" />
          تحديث مباشر من السجلات
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={k.label} className="card card-hover p-5 anim-rise" style={{ animationDelay: `${80 + i * 70}ms` }}>
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold text-soft">{k.label}</p>
              <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${k.tint}`}>{k.icon}</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <AnimatedNumber value={k.value} className="stat-num text-[30px] text-ink" />
              {k.money ? <span className="text-xs font-bold text-soft">{sym}</span> : k.suffix ? <span className="text-sm font-bold text-soft">{k.suffix}</span> : null}
            </div>
            <p className="text-[11px] mt-1.5 font-medium">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* إيرادات مقابل مصروفات */}
        <div className="col-span-12 xl:col-span-7 card anim-rise" style={{ animationDelay: "320ms" }}>
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
                    <div className="w-1/3 max-w-7 rounded-t-md bg-jade anim-bar relative" style={{ height: `${Math.max(4, (m.revenue / maxMonth) * 100)}%`, animationDelay: `${i * 80}ms` }} title={money(m.revenue)} />
                    <div className="w-1/3 max-w-7 rounded-t-md bg-coral/70 anim-bar" style={{ height: `${Math.max(4, (m.expenses / maxMonth) * 100)}%`, animationDelay: `${i * 80 + 60}ms` }} title={money(m.expenses)} />
                  </div>
                  <span className={`text-[11px] font-bold ${i === 5 ? "text-jade-deep" : "text-soft"}`}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* مصروفات الشهر حسب الفئة */}
        <div className="col-span-12 xl:col-span-5 card anim-rise" style={{ animationDelay: "380ms" }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
            <h2 className="font-display font-bold text-lg text-ink">مصروفات الشهر بالفئات</h2>
            <span className="chip bg-mist text-soft stat-num">{money(monthExpTotal)}</span>
          </div>
          <div className="p-5 space-y-3.5">
            {expByCat.length === 0 && <p className="text-xs text-soft text-center py-6">لا مصروفات مسجلة هذا الشهر.</p>}
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
                  <div className="h-full rounded-full anim-grow-w" style={{ width: `${(val / (expByCat[0]?.[1] || 1)) * 100}%`, background: expCatColor(cat), animationDelay: `${i * 80}ms` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* تقرير الأطباء */}
        <div className="col-span-12 xl:col-span-7 card anim-rise" style={{ animationDelay: "440ms" }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
            <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2"><IconStetho className="w-5 h-5 text-jade-deep" /> تقرير أداء الأطباء</h2>
            <span className="chip bg-mist text-soft">{db.doctors.length} طبيب</span>
          </div>
          <div className="divide-y divide-line/60">
            {doctorStats.map(({ d, total, done, upcoming, cancelled, rate }) => (
              <div key={d.id} className="flex items-center gap-4 px-5 py-4 hover:bg-jade-soft/25 transition-colors">
                <Avatar name={d.name} size="w-11 h-11 text-sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-ink truncate">{d.name}</p>
                    <span className="stat-num text-xs text-soft">{done}/{total} مكتمل</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-mist overflow-hidden mt-2">
                    <div className="h-full rounded-full anim-grow-w" style={{ width: `${rate}%`, background: d.color }} />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-bold">
                    <span className="text-mint">مكتملة {done}</span>
                    <span className="text-sky">قادمة {upcoming}</span>
                    <span className="text-coral">ملغاة {cancelled}</span>
                    <span className="text-soft ms-auto">نسبة الإنجاز {rate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* أعلى الخدمات */}
        <div className="col-span-12 xl:col-span-5 card anim-rise" style={{ animationDelay: "500ms" }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
            <h2 className="font-display font-bold text-lg text-ink">الأعلى إيراداً</h2>
            <span className="chip bg-mist text-soft">منذ البداية</span>
          </div>
          <ul className="p-5 space-y-3">
            {topRevenue.map(({ s, rev }, i) => (
              <li key={s!.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 stat-num" style={{ background: s!.color }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-bold text-ink truncate">{s!.name}</p>
                    <span className="stat-num text-[11px] text-soft shrink-0">{money(rev)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-mist overflow-hidden">
                    <div className="h-full rounded-full anim-grow-w" style={{ width: `${(rev / maxRev) * 100}%`, background: s!.color, animationDelay: `${i * 80}ms` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* آخر العمليات */}
        <div className="col-span-12 card anim-rise" style={{ animationDelay: "560ms" }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
            <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2"><IconUsers className="w-5 h-5 text-jade-deep" /> آخر العمليات المكتملة</h2>
            <span className="chip bg-mint-soft text-[#1d6b47]">{doneAppts} هذا الشهر</span>
          </div>
          <ul className="grid sm:grid-cols-2 xl:grid-cols-3">
            {recentDone.map((a, i) => {
              const p = db.patients.find((x) => x.id === a.patientId);
              const s = serviceById(a.serviceId);
              const d = db.doctors.find((x) => x.id === a.doctorId);
              return (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-line/60 anim-fade" style={{ animationDelay: `${600 + i * 50}ms` }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: APPT_META.done.dot }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-ink truncate">{p?.name} — {s?.name}</p>
                    <p className="text-[10px] text-soft mt-0.5">{fmtDate(a.date)} · {a.time} · {d?.name}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
