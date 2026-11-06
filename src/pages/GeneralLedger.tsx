import React, { useMemo } from "react";
import { useStore, useMoney } from "../store";
import { IconPrinter } from "../icons";
import { EmptyState } from "../components/ui";

export default function GeneralLedgerPage() {
  const { db } = useStore();
  const money = useMoney();
  const rows = useMemo(() => {
    const out: { date: string; voucher: string; account: string; desc: string; debit: number; credit: number }[] = [];
    for (const v of db.vouchers.filter((x) => x.status === "posted").sort((a, b) => a.date.localeCompare(b.date))) {
      for (const l of v.lines) {
        const acc = db.accounts.find((a) => a.id === l.accountId);
        out.push({ date: v.date, voucher: v.number, account: acc ? `${acc.code} ${acc.name}` : l.accountId, desc: l.description || v.description, debit: l.debit || 0, credit: l.credit || 0 });
      }
    }
    return out;
  }, [db]);

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">تقرير ميزان العمومية</h1>
          <p className="text-sm text-soft mt-1">جميع حركات السندات المرحّلة (chronological)</p>
        </div>
        <button className="btn-soft" onClick={() => window.print()}><IconPrinter className="w-4 h-4" /> طباعة</button>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<IconPrinter className="w-6 h-6" />} title="لا حركات" desc="رحّل سندات لعرض العمومية." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line">
              <tr><th className="th">التاريخ</th><th className="th">السند</th><th className="th">الحساب</th><th className="th">البيان</th><th className="th">مدين</th><th className="th">دائن</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="td">{r.date}</td>
                  <td className="td stat-num">{r.voucher}</td>
                  <td className="td text-xs">{r.account}</td>
                  <td className="td truncate max-w-[200px]">{r.desc}</td>
                  <td className="td stat-num">{money(r.debit)}</td>
                  <td className="td stat-num">{money(r.credit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
