import React, { useMemo } from "react";
import { relTime, useMoney, useStore } from "../store";
import { IconAlert, IconBox, IconClock, IconTrendUp, IconWallet } from "../icons";
import { AnimatedNumber, EmptyState } from "../components/ui";

export default function InventoryPage({ onGoItems }: { onGoItems?: () => void }) {
  const { db } = useStore();
  const money = useMoney();

  const low = useMemo(() => db.supplies.filter((s) => s.qty <= s.minQty).sort((a, b) => a.qty / a.minQty - b.qty / b.minQty), [db.supplies]);
  const totalValue = db.supplies.reduce((sum, s) => sum + s.qty * s.cost, 0);
  const todayMoves = db.supplyMoves.filter((m) => new Date(m.date).toDateString() === new Date().toDateString()).length;
  const expiringSoon = db.supplies.filter((s) => {
    if (!s.expiry) return false;
    const d = Math.round((new Date(s.expiry + "T12:00:00").getTime() - Date.now()) / 86400000);
    return d <= 60;
  }).length;

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-pine text-ice"><IconBox className="w-6 h-6" /></span>
            المخزون والمستهلكات
            {low.length > 0 && (
              <span className="chip bg-coral-soft text-coral !py-2 pulse-soft">
                <IconAlert className="w-4 h-4" />
                {low.length} صنف دون الحد الأدنى
              </span>
            )}
          </h1>
          <p className="text-sm text-soft mt-1.5">لوحة متابعة حية للمواد الطبية — تنبيهات النفاد والصلاحية وآخر الحركات.</p>
        </div>
        {onGoItems && (
          <button className="btn-primary" onClick={onGoItems}>
            <IconBox className="w-4.5 h-4.5" />
            إدارة بيانات الأصناف
          </button>
        )}
      </div>

      {/* بطاقات سريعة */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "أصناف منخفضة", value: low.length, icon: <IconAlert className="w-5 h-5" />, tint: "bg-coral-soft text-coral", sub: low.length ? "تحتاج طلب توريد عاجل" : "المخزون مطمئن" },
          { label: "إجمالي الأصناف", value: db.supplies.length, icon: <IconBox className="w-5 h-5" />, tint: "bg-jade-soft text-jade-deep", sub: `${db.itemCats.length} فئة` },
          { label: "قيمة المخزون", value: totalValue, money: true, icon: <IconWallet className="w-5 h-5" />, tint: "bg-mint-soft text-[#1d6b47]", sub: "بسعر التكلفة الحالي" },
          { label: "حركات اليوم", value: todayMoves, icon: <IconTrendUp className="w-5 h-5" />, tint: "bg-sky-soft text-sky", sub: `${db.supplyMoves.length} حركة إجمالاً` },
        ].map((k, i) => (
          <div key={k.label} className="card card-hover p-5 anim-rise" style={{ animationDelay: `${80 + i * 60}ms` }}>
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold text-soft">{k.label}</p>
              <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${k.tint}`}>{k.icon}</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <AnimatedNumber value={k.value} className="stat-num text-[30px] text-ink" />
              {k.money && <span className="text-xs font-bold text-soft">ر.ي</span>}
            </div>
            <p className="text-[11px] mt-1.5 font-medium text-soft">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5 items-start">
        {/* تنبيهات النفاد والصلاحية */}
        <div className="col-span-12 xl:col-span-7 card overflow-hidden anim-rise" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
            <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2"><IconAlert className="w-5 h-5 text-coral" /> تنبيهات تحتاج إجراء</h2>
            <span className="chip bg-mist text-soft stat-num">{low.length + expiringSoon}</span>
          </div>
          {low.length === 0 && expiringSoon === 0 ? (
            <EmptyState icon={<IconBox className="w-6 h-6" />} title="كل شيء تحت السيطرة" desc="لا أصناف منخفضة ولا مواد تقترب من انتهاء الصلاحية." />
          ) : (
            <ul className="divide-y divide-line/60 max-h-[480px] overflow-y-auto">
              {low.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3 bg-coral-soft/20 anim-fade" style={{ animationDelay: `${i * 40}ms` }}>
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-coral-soft text-coral shrink-0"><IconAlert className="w-4.5 h-4.5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink truncate">{s.name}</p>
                    <p className="text-[11px] text-soft mt-0.5">{s.category} · الرصيد {s.qty} / الحد {s.minQty} {s.unit}</p>
                  </div>
                  <span className="chip bg-coral text-white">نفاد وشيك</span>
                </li>
              ))}
              {db.supplies.filter((s) => s.expiry && Math.round((new Date(s.expiry + "T12:00:00").getTime() - Date.now()) / 86400000) <= 60).map((s, i) => {
                const d = Math.round((new Date(s.expiry! + "T12:00:00").getTime() - Date.now()) / 86400000);
                return (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3 anim-fade" style={{ animationDelay: `${(low.length + i) * 40}ms` }}>
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-soft text-[#a06410] shrink-0"><IconClock className="w-4.5 h-4.5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink truncate">{s.name}</p>
                      <p className="text-[11px] text-soft mt-0.5">{s.category} · الرصيد {s.qty} {s.unit}</p>
                    </div>
                    <span className={`chip ${d < 0 ? "bg-coral text-white" : "bg-amber-soft text-[#a06410]"}`}>{d < 0 ? "منتهي!" : `${d} يوم للصلاحية`}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* سجل الحركات */}
        <div className="col-span-12 xl:col-span-5 card overflow-hidden anim-rise" style={{ animationDelay: "360ms" }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
            <h2 className="font-display font-bold text-lg text-ink">آخر الحركات</h2>
            <span className="chip bg-mist text-soft stat-num">{db.supplyMoves.length}</span>
          </div>
          {db.supplyMoves.length === 0 ? (
            <EmptyState icon={<IconTrendUp className="w-6 h-6" />} title="لا حركات بعد" desc="كل صرف أو توريد يُسجَّل هنا من شاشة بيانات الأصناف." />
          ) : (
            <ul className="divide-y divide-line/60 max-h-[480px] overflow-y-auto">
              {db.supplyMoves.slice(0, 16).map((m, i) => {
                const item = db.supplies.find((s) => s.id === m.itemId);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3 anim-fade" style={{ animationDelay: `${i * 35}ms` }}>
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0 stat-num text-sm font-bold ${m.delta > 0 ? "bg-mint-soft text-[#1d6b47]" : "bg-coral-soft text-coral"}`}>
                      {m.delta > 0 ? "+" : ""}{m.delta}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink truncate">{item?.name ?? "صنف محذوف"}</p>
                      <p className="text-[10px] text-soft mt-0.5 truncate">{m.note} · {relTime(m.date)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
