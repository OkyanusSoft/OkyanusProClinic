import React, { useMemo } from "react";
import { clinicOf, fmtDate, today, useMoney, useStore } from "../store";
import { IconGrid, IconPrinter, IconTooth } from "../icons";
import { EmptyState } from "../components/ui";

export default function PriceListPage() {
  const { db } = useStore();
  const money = useMoney();
  const clinic = clinicOf(db);

  const grouped = useMemo(
    () =>
      db.serviceCats
        .map((cat) => ({ cat, items: db.services.filter((s) => s.category === cat && s.active) }))
        .filter((g) => g.items.length > 0),
    [db.serviceCats, db.services]
  );

  const totalActive = db.services.filter((s) => s.active).length;

  return (
    <div className="space-y-6">
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4 no-print">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-pine text-ice"><IconGrid className="w-6 h-6" /></span>
            قائمة الأسعار
          </h1>
          <p className="text-sm text-soft mt-1.5">قائمة جاهزة للطباعة والنشر — الخدمات المتاحة فقط، مصنفة حسب الفئات.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="chip bg-white border border-line !py-2.5 text-soft">
            <span className="w-1.5 h-1.5 rounded-full bg-mint pulse-dot" />
            {grouped.length} فئة · {totalActive} خدمة
          </span>
          <button className="btn-primary" onClick={() => window.print()}>
            <IconPrinter className="w-4.5 h-4.5" />
            طباعة القائمة
          </button>
        </div>
      </div>

      {/* الورقة القابلة للطباعة */}
      <div className="print-sheet bg-white border border-line rounded-xl shadow-sm p-10 anim-rise" style={{ animationDelay: "80ms" }}>
        {/* ترويسة */}
        <div className="flex items-center justify-between pb-5 border-b-4 border-pine">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-jade text-white"><IconTooth className="w-8 h-8" /></span>
            <div>
              <p className="font-display font-bold text-2xl text-ink">{clinic.clinicName}</p>
              <p className="text-[11px] text-soft tracking-widest mt-0.5" dir="ltr">{clinic.clinicLatin}</p>
            </div>
          </div>
          <div className="text-end">
            <p className="font-display font-bold text-xl text-jade-deep">قائمة الأسعار</p>
            <p className="text-[11px] text-soft mt-1">صادرة في {fmtDate(today(0))}</p>
          </div>
        </div>

        {grouped.length === 0 ? (
          <EmptyState icon={<IconTooth className="w-6 h-6" />} title="لا خدمات متاحة" desc="فعّل خدمات من شاشة بيانات الخدمات لتظهر هنا." />
        ) : (
          <div className="space-y-7 mt-7">
            {grouped.map((g, gi) => (
              <section key={g.cat} className="anim-fade" style={{ animationDelay: `${gi * 60}ms` }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-jade-soft text-jade-deep font-display font-bold text-sm">{gi + 1}</span>
                  <h2 className="font-display font-bold text-lg text-ink">{g.cat}</h2>
                  <span className="flex-1 border-b-2 border-dashed border-line" />
                  <span className="chip bg-mist text-soft stat-num">{g.items.length}</span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-mist/70">
                      <th className="th !py-2">الخدمة</th>
                      <th className="th !py-2 text-center">المدة</th>
                      <th className="th !py-2 text-end">السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((s) => (
                      <tr key={s.id} className="border-b border-line/50 last:border-0">
                        <td className="td !py-2.5 font-semibold text-ink">{s.name}</td>
                        <td className="td !py-2.5 text-center text-soft stat-num">{s.duration} د</td>
                        <td className="td !py-2.5 text-end font-display font-bold text-jade-deep">{money(s.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        )}

        {/* تذييل */}
        <div className="mt-9 pt-4 border-t-2 border-line flex items-center justify-between">
          <p className="text-[11px] text-soft leading-relaxed">
            {clinic.invoiceFooter || "الأسعار شاملة الكشف الأولي · قابلة للتغيير دون إشعار مسبق"}
          </p>
          <p className="text-[11px] font-bold text-soft" dir="ltr">{clinic.phone}</p>
        </div>
      </div>
    </div>
  );
}
