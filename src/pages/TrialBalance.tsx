import React, { useMemo } from "react";
import { useStore, useMoney } from "../store";
import { IconPrinter } from "../icons";
import { EmptyState } from "../components/ui";

export default function TrialBalancePage() {
  const { db } = useStore();
  const money = useMoney();
  const rows = useMemo(() => {
    const map = new Map<string, { debit: number; credit: number }>();
    for (const v of db.vouchers) {
      if (v.status !== "posted") continue;
      for (const l of v.lines) {
        const cur = map.get(l.accountId) ?? { debit: 0, credit: 0 };
        cur.debit += l.debit || 0;
        cur.credit += l.credit || 0;
        map.set(l.accountId, cur);
      }
    }
    return db.accounts.filter((a) => a.isPosting).map((a) => {
      const m = map.get(a.id) ?? { debit: 0, credit: 0 };
      return { account: a, debit: m.debit, credit: m.credit, balance: m.debit - m.credit };
    }).filter((r) => r.debit !== 0 || r.credit !== 0);
  }, [db]);
  const totalD = rows.reduce((s, r) => s + r.debit, 0);
  const totalC = rows.reduce((s, r) => s + r.credit, 0);

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">ميزان المراجعة</h1>
          <p className="text-sm text-soft mt-1">مجاميع المدين/الدائن لكل حساب حركي (السندات المرحّلة)</p>
        </div>
        <button className="btn-soft" onClick={() => window.print()}><IconPrinter className="w-4 h-4" /> طباعة</button>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<IconPrinter className="w-6 h-6" />} title="لا حركات" desc="رحّل سندات لعرض الميزان." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line">
              <tr><th className="th">الرمز</th><th className="th">الحساب</th><th className="th">مدين</th><th className="th">دائن</th><th className="th">الرصيد</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.account.id} className="border-b border-line/60">
                  <td className="td stat-num">{r.account.code}</td>
                  <td className="td font-bold">{r.account.name}</td>
                  <td className="td stat-num">{money(r.debit)}</td>
                  <td className="td stat-num">{money(r.credit)}</td>
                  <td className="td stat-num">{money(r.balance)}</td>
                </tr>
              ))}
              <tr className="bg-mist/70 font-bold">
                <td className="td" colSpan={2}>المجموع</td>
                <td className="td stat-num">{money(totalD)}</td>
                <td className="td stat-num">{money(totalC)}</td>
                <td className="td stat-num">{money(totalD - totalC)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {Math.abs(totalD - totalC) > 0.001 && <p className="text-sm font-bold text-coral">⚠️ الميزان غير متوازن!</p>}
    </div>
  );
}
