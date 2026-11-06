import React, { useState } from "react";
import { useStore, uid, today, type FiscalYear, type FiscalPeriod, type Voucher } from "../store";
import { IconPlus, IconClock } from "../icons";
import { EmptyState, Field, Modal, TInput, useToast } from "../components/ui";

export default function FiscalYearsPage() {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [start, setStart] = useState(today(0).slice(0, 4) + "-01-01");
  const [end, setEnd] = useState(today(0).slice(0, 4) + "-12-31");
  const [showOpening, setShowOpening] = useState(false);
  const [openingFy, setOpeningFy] = useState<string | null>(null);
  const [openingVals, setOpeningVals] = useState<Record<string, { d: string; c: string }>>({});

  const createYear = () => {
    if (!label.trim()) { push("error", "أدخل اسم السنة"); return; }
    const fy: FiscalYear = { id: uid(), label: label.trim(), startDate: start, endDate: end, status: "open", updatedAt: Date.now() };
    dispatch({ type: "ADD_FISCAL_YEAR" as any, fy } as any);
    // create 12 periods
    for (let i = 1; i <= 12; i++) {
      const m = String(i).padStart(2, "0");
      const p: FiscalPeriod = { id: uid(), fiscalYearId: fy.id, periodNo: i, startDate: `${start.slice(0, 4)}-${m}-01`, endDate: `${start.slice(0, 4)}-${m}-28`, status: "open", updatedAt: Date.now() };
      dispatch({ type: "ADD_FISCAL_PERIOD" as any, p } as any);
    }
    push("success", "تم إنشاء السنة المالية", label);
    setShowAdd(false);
    setLabel("");
  };

  // Note: actions not yet in store; fallback to direct dispatch not available. We'll instead add actions.
  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">السنوات/الفترات المالية</h1>
          <p className="text-sm text-soft mt-1">{db.fiscalYears.length} سنة · {db.fiscalPeriods.length} فترة</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><IconPlus className="w-4.5 h-4.5" /> سنة جديدة</button>
      </div>
      {db.fiscalYears.length === 0 ? (
        <EmptyState icon={<IconPlus className="w-6 h-6" />} title="لا توجد سنوات مالية" desc="أنشئ سنة مالية (2026) مع 12 فترة." />
      ) : (
        <div className="space-y-4">
          {db.fiscalYears.map((fy) => (
            <div key={fy.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-lg text-ink">{fy.label} <span className={`chip ms-2 ${fy.status === "closed" ? "bg-coral-soft text-coral" : "bg-mint-soft text-[#1d6b47]"}`}>{fy.status === "closed" ? "مغلقة" : "مفتوحة"}</span></h3>
                <span className="text-xs text-soft">{fy.startDate} → {fy.endDate}</span>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                {db.fiscalPeriods.filter((p) => p.fiscalYearId === fy.id).sort((a, b) => a.periodNo - b.periodNo).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const next = p.status === "open" ? "locked" : p.status === "locked" ? "open" : p.status;
                      if (p.status === "closed") return;
                      dispatch({ type: "UPDATE_FISCAL_PERIOD", p: { ...p, status: next as any } });
                    }}
                    className={`rounded-lg px-2 py-1.5 text-center text-[10px] font-bold border cursor-pointer ${p.status === "locked" ? "bg-amber-soft text-[#a06410] border-amber/30" : p.status === "closed" ? "bg-mist text-soft border-line" : "bg-jade-soft text-jade-deep border-jade/30"}`}
                    title={p.status === "closed" ? "مغلقة (لا تعديل)" : "انقر للقفل/الفتح"}
                  >
                    {p.periodNo}
                    <div className="mt-0.5">{p.status === "locked" ? "🔒" : p.status === "closed" ? "✓" : "○"}</div>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="btn-soft !h-8 !text-xs"
                  onClick={() => {
                    if (!confirm(`إقفال السنة ${fy.label}؟ سيتم إقفال كل الفترات.`)) return;
                    db.fiscalPeriods.filter((p) => p.fiscalYearId === fy.id).forEach((p) => dispatch({ type: "UPDATE_FISCAL_PERIOD", p: { ...p, status: "closed" } }));
                    dispatch({ type: "UPDATE_FISCAL_YEAR" as any, fy: { ...fy, status: "closed" } } as any);
                    push("success", "تم إقفال السنة", fy.label);
                  }}
                >
                  إقفال السنة
                </button>
                <button
                  className="btn-primary !h-8 !text-xs"
                  onClick={() => {
                    if (fy.status === "closed") { push("error", "السنة مغلقة"); return; }
                    if (!confirm(`إقفال سنوي (Year-end closing) للسنة ${fy.label}؟`)) return;
                    const posted = db.vouchers.filter((v) => v.status === "posted");
                    const revAccs = db.accounts.filter((a) => a.isPosting && a.type === "revenue");
                    const expAccs = db.accounts.filter((a) => a.isPosting && a.type === "expense");
                    const retained = db.accounts.find((a) => a.code === "232101");
                    if (!retained) { push("error", "حساب أرباح مبقاة (232101) غير موجود"); return; }
                    const lines: any[] = [];
                    for (const a of revAccs) {
                      const bal = posted.reduce((s, v) => s + v.lines.reduce((ss, l) => l.accountId === a.id ? ss + (l.credit - l.debit) : ss, 0), 0);
                      if (Math.abs(bal) > 0.001) { lines.push({ id: uid(), accountId: a.id, debit: bal > 0 ? bal : 0, credit: bal < 0 ? -bal : 0 }); lines.push({ id: uid(), accountId: retained.id, debit: bal < 0 ? -bal : 0, credit: bal > 0 ? bal : 0 }); }
                    }
                    for (const a of expAccs) {
                      const bal = posted.reduce((s, v) => s + v.lines.reduce((ss, l) => l.accountId === a.id ? ss + (l.debit - l.credit) : ss, 0), 0);
                      if (Math.abs(bal) > 0.001) { lines.push({ id: uid(), accountId: retained.id, debit: bal > 0 ? bal : 0, credit: bal < 0 ? -bal : 0 }); lines.push({ id: uid(), accountId: a.id, debit: bal < 0 ? -bal : 0, credit: bal > 0 ? bal : 0 }); }
                    }
                    if (lines.length === 0) { push("info", "لا توجد أرصدة للإقفال"); return; }
                    const v: Voucher = { id: uid(), number: "CLS-" + fy.label, type: "journal", date: fy.endDate, description: `إقفال سنوي ${fy.label}`, status: "posted", lines, createdBy: db.users[0]?.id, createdAt: new Date().toISOString(), postedAt: new Date().toISOString() };
                    dispatch({ type: "ADD_VOUCHER", v });
                    db.fiscalPeriods.filter((p) => p.fiscalYearId === fy.id).forEach((p) => dispatch({ type: "UPDATE_FISCAL_PERIOD", p: { ...p, status: "closed" } }));
                    dispatch({ type: "UPDATE_FISCAL_YEAR", fy: { ...fy, status: "closed" } });
                    push("success", "تم الإقفال السنوي", fy.label);
                  }}
                >
                  إقفال سنوي (Closing)
                </button>
                <button
                  className="btn-soft !h-8 !text-xs"
                  onClick={() => { setOpeningFy(fy.id); setShowOpening(true); setOpeningVals({}); }}
                >
                  أرصدة افتتاحية
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd && (
        <Modal open onClose={() => setShowAdd(false)} title="سنة مالية جديدة" subtitle="ستُنشأ 12 فترة (شهر) تلقائياً"
          footer={<><button className="btn-ghost" onClick={() => setShowAdd(false)}>إلغاء</button><button className="btn-primary" onClick={createYear}>إنشاء</button></>}>
          <div className="grid grid-cols-1 gap-4">
            <Field label="الاسم (مثال: 2026)"><TInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2026" /></Field>
            <Field label="تاريخ البداية"><TInput type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="تاريخ النهاية"><TInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          </div>
        </Modal>
      )}
      {showOpening && (
        <Modal open onClose={() => setShowOpening(false)} title="أرصدة افتتاحية" subtitle="أدخل رصيد كل حساب (مدين/دائن) · تُرحّل كـ سند افتتاح"
          footer={<><button className="btn-ghost" onClick={() => setShowOpening(false)}>إلغاء</button><button className="btn-primary" onClick={() => {
            const fy = db.fiscalYears.find((f) => f.id === openingFy);
            if (!fy) return;
            const lines: any[] = [];
            for (const a of db.accounts.filter((x) => x.isPosting)) {
              const v = openingVals[a.id];
              const d = Number(v?.d || 0); const c = Number(v?.c || 0);
              if (d === 0 && c === 0) continue;
              lines.push({ id: uid(), accountId: a.id, debit: d, credit: c });
            }
            if (lines.length === 0) { push("error", "أدخل رصيداً واحداً على الأقل"); return; }
            const voucher: Voucher = { id: uid(), number: "OPN-" + (fy.label || ""), type: "opening", date: fy.startDate, description: `أرصدة افتتاحية ${fy.label}`, status: "posted", lines, createdBy: db.users[0]?.id, createdAt: new Date().toISOString(), postedAt: new Date().toISOString() };
            dispatch({ type: "ADD_VOUCHER", v: voucher });
            push("success", "تم حفظ الأرصدة الافتتاحية");
            setShowOpening(false);
          }}>حفظ</button></>}>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {db.accounts.filter((a) => a.isPosting).map((a) => (
              <div key={a.id} className="grid grid-cols-3 gap-2 items-center">
                <span className="text-xs font-bold truncate">{a.code} {a.name}</span>
                <TInput type="number" placeholder="مدين" value={openingVals[a.id]?.d ?? ""} onChange={(e) => setOpeningVals((s) => ({ ...s, [a.id]: { d: e.target.value, c: s[a.id]?.c ?? "" } }))} />
                <TInput type="number" placeholder="دائن" value={openingVals[a.id]?.c ?? ""} onChange={(e) => setOpeningVals((s) => ({ ...s, [a.id]: { d: s[a.id]?.d ?? "", c: e.target.value } }))} />
              </div>
            ))}
          </div>
        </Modal>
      )}

    </div>
  );
}
