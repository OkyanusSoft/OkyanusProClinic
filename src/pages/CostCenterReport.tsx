import React, { useMemo } from "react";
import { useStore, useMoney } from "../store";
import { IconPrinter } from "../icons";
import { EmptyState } from "../components/ui";

export default function CostCenterReportPage() {
  const { db } = useStore();
  const money = useMoney();
  const posted = db.vouchers.filter((v) => v.status === "posted");
  const rows = useMemo(() => db.costCenters.map((cc) => {
    let debit = 0, credit = 0;
    for (const v of posted) for (const l of v.lines) {
      if (l.costCenterId !== cc.id) continue;
      debit += l.debit || 0; credit += l.credit || 0;
    }
    return { cc, debit, credit, net: debit - credit };
  }).filter((r) => r.debit !== 0 || r.credit !== 0), [db, posted]);

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display font-bold text-3xl text-ink">تقرير مراكز التكلفة</h1><p className="text-sm text-soft mt-1">إيرادات/مصروفات per center (السندات المرحّلة)</p></div>
        <button className="btn-soft" onClick={() => window.print()}><IconPrinter className="w-4 h-4" /> طباعة</button>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<IconPrinter className="w-6 h-6" />} title="لا حركات" desc="أضف costCenterId على بنود السندات." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line"><tr><th className="th">الرمز</th><th className="th">المركز</th><th className="th">مدين</th><th className="th">دائن</th><th className="th">صافي</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cc.id} className="border-b border-line/60">
                  <td className="td stat-num">{r.cc.code}</td>
                  <td className="td font-bold">{r.cc.name}</td>
                  <td className="td stat-num">{money(r.debit)}</td>
                  <td className="td stat-num">{money(r.credit)}</td>
                  <td className="td stat-num font-bold">{money(r.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
