 
 
import { expCatColor, fmtDate, useMoney, type Expense } from "../store";

/* ============================================================================
   قالب «سند صرف مصروف» للطباعة على A4
   — ضع هذا الملف الجديد في: src/components/ExpensePrint.tsx
   — يعمل داخل PrintModal الموجود مسبقاً (بترويسة العيادة والتوقيعات)
   ========================================================================== */

export function ExpensePrint({ expense }: { expense: Expense }) {
  const money = useMoney();
  const clr = expCatColor(expense.category);

  return (
    <div className="text-ink">
      {/* رأس السند */}
      <div className="flex items-center justify-between py-4">
        <div>
          <p className="font-display font-bold text-xl">سند صرف مصروف</p>
          <p className="text-xs text-soft mt-1">
            رقم السند: <b className="stat-num" dir="ltr">EXP-{expense.id.slice(0, 6).toUpperCase()}</b> · التاريخ: {fmtDate(expense.date)}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
          style={{ background: `${clr}1a`, color: clr }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: clr }} />
          {expense.category}
        </span>
      </div>

      {/* جسم السند — البيان والمبلغ */}
      <div className="rounded-xl border-2 border-pine/25 bg-mist/60 p-5 flex flex-wrap items-center justify-between gap-4 my-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-soft">بيان المصروف</p>
          <p className="font-display font-bold text-lg mt-1 leading-snug">{expense.title}</p>
        </div>
        <div className="text-end">
          <p className="text-[11px] font-bold text-soft">المبلغ المصروف</p>
          <p className="stat-num font-bold text-3xl text-coral mt-1">{money(expense.amount)}</p>
        </div>
      </div>

      {/* الملاحظات */}
      {expense.notes && (
        <div className="mt-4">
          <p className="text-[11px] font-bold text-soft mb-1.5">ملاحظات</p>
          <p className="text-[12px] text-ink leading-relaxed bg-mist/40 border border-line rounded-lg px-3.5 py-2.5">
            {expense.notes}
          </p>
        </div>
      )}

      {/* نص نظامي */}
      <p className="text-[10px] text-soft mt-5 leading-relaxed">
        يُصرف هذا المبلغ من خزينة العيادة ويُقيَّد في السجل المالي تحت فئة «{expense.category}»،
        ويظهر في التقارير المالية ومركز التقارير تلقائياً.
      </p>
    </div>
  );
}
