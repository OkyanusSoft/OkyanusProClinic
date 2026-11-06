import React, { useMemo } from "react";
import { useStore, useMoney } from "../store";
import { IconPrinter } from "../icons";
import { EmptyState } from "../components/ui";

export default function PurchaseReportsPage() {
  const { db } = useStore();
  const money = useMoney();
  const purchases = useMemo(() => db.supplyMoves.filter((m) => m.delta > 0 && /شراء|توريد/i.test(m.note || "")), [db.supplyMoves]);
  const totalQty = purchases.reduce((s, m) => s + (m.delta || 0), 0);
  const byItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of purchases) map.set(m.itemId, (map.get(m.itemId) ?? 0) + (m.delta || 0));
    return Array.from(map.entries()).map(([id, q]) => ({ item: db.supplies.find((s) => s.id === id), q })).filter((r) => r.item);
  }, [purchases, db.supplies]);

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display font-bold text-3xl text-ink">تقارير المشتريات</h1><p className="text-sm text-soft mt-1">ملخص توريدات المخزون (supply moves)</p></div>
        <button className="btn-soft" onClick={() => window.print()}><IconPrinter className="w-4 h-4" /> طباعة</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5"><p className="text-xs font-bold text-soft">عدد حركات التوريد</p><p className="stat-num text-2xl text-mint mt-1">{purchases.length}</p></div>
        <div className="card p-5"><p className="text-xs font-bold text-soft">إجمالي الكمية الموردة</p><p className="stat-num text-2xl text-jade-deep mt-1">{totalQty}</p></div>
      </div>
      {byItem.length === 0 ? (
        <EmptyState icon={<IconPrinter className="w-6 h-6" />} title="لا مشتريات" desc="سجّل توريدات (MOVE_SUPPLY موجب) لعرض التقرير." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line"><tr><th className="th">الصنف</th><th className="th">الكمية الموردة</th></tr></thead>
            <tbody>
              {byItem.map((r, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="td font-bold">{r.item!.name}</td>
                  <td className="td stat-num">{r.q}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
