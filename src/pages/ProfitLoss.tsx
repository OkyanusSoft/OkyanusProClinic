import React, { useMemo } from "react";
import { useStore, useMoney } from "../store";
import { IconPrinter } from "../icons";
import { EmptyState } from "../components/ui";

export default function ProfitLossPage() {
  const { db } = useStore();
  const money = useMoney();
  const posted = db.vouchers.filter((v) => v.status === "posted");
  const balanceOf = (type: "revenue" | "expense") => {
    let total = 0;
    for (const v of posted) for (const l of v.lines) {
      const acc = db.accounts.find((a) => a.id === l.accountId);
      if (acc?.type === type) total += (l.credit || 0) - (l.debit || 0) * (type === "expense" ? -1 : 1);
    }
    // simpler: revenue = credit-debit, expense = debit-credit
    return 0;
  };
  // compute properly
  const revenue = posted.reduce((s, v) => s + v.lines.reduce((ss, l) => {
    const acc = db.accounts.find((a) => a.id === l.accountId);
    return ss + (acc?.type === "revenue" ? (l.credit - l.debit) : 0);
  }, 0), 0);
  const expense = posted.reduce((s, v) => s + v.lines.reduce((ss, l) => {
    const acc = db.accounts.find((a) => a.id === l.accountId);
    return ss + (acc?.type === "expense" ? (l.debit - l.credit) : 0);
  }, 0), 0);
  const net = revenue - expense;

  const revAccounts = db.accounts.filter((a) => a.isPosting && a.type === "revenue");
  const expAccounts = db.accounts.filter((a) => a.isPosting && a.type === "expense");

  const accTotal = (accId: string, kind: "rev" | "exp") => posted.reduce((s, v) => s + v.lines.reduce((ss, l) => {
    if (l.accountId !== accId) return ss;
    return ss + (kind === "rev" ? (l.credit - l.debit) : (l.debit - l.credit));
  }, 0), 0);

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">الأرباح والخسائر (P&L)</h1>
          <p className="text-sm text-soft mt-1">إيرادات − مصروفات = صافي ربح/خسارة (السندات المرحّلة)</p>
        </div>
        <button className="btn-soft" onClick={() => window.print()}><IconPrinter className="w-4 h-4" /> طباعة</button>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5"><p className="text-xs font-bold text-soft">إجمالي الإيرادات</p><p className="stat-num text-2xl text-mint mt-1">{money(revenue)}</p></div>
        <div className="card p-5"><p className="text-xs font-bold text-soft">إجمالي المصروفات</p><p className="stat-num text-2xl text-coral mt-1">{money(expense)}</p></div>
        <div className="card p-5"><p className="text-xs font-bold text-soft">صافي الربح/الخسارة</p><p className={`stat-num text-2xl mt-1 ${net >= 0 ? "text-jade-deep" : "text-coral"}`}>{money(net)}</p></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-line font-bold text-sm text-ink">الإيرادات</div>
          <table className="w-full text-sm">
            <tbody>
              {revAccounts.map((a) => {
                const t = accTotal(a.id, "rev");
                if (t === 0) return null;
                return <tr key={a.id} className="border-b border-line/60"><td className="td">{a.code} {a.name}</td><td className="td stat-num text-end">{money(t)}</td></tr>;
              })}
              <tr className="bg-mist/70 font-bold"><td className="td">المجموع</td><td className="td stat-num text-end">{money(revenue)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-line font-bold text-sm text-ink">المصروفات</div>
          <table className="w-full text-sm">
            <tbody>
              {expAccounts.map((a) => {
                const t = accTotal(a.id, "exp");
                if (t === 0) return null;
                return <tr key={a.id} className="border-b border-line/60"><td className="td">{a.code} {a.name}</td><td className="td stat-num text-end">{money(t)}</td></tr>;
              })}
              <tr className="bg-mist/70 font-bold"><td className="td">المجموع</td><td className="td stat-num text-end">{money(expense)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
