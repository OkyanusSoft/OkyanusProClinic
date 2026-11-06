import React, { useMemo } from "react";
import { useStore, useMoney } from "../store";
import { IconPrinter } from "../icons";
import { EmptyState } from "../components/ui";

export default function BalanceSheetPage() {
  const { db } = useStore();
  const money = useMoney();
  const posted = db.vouchers.filter((v) => v.status === "posted");
  const totalByType = (type: "asset" | "liability" | "equity") => posted.reduce((s, v) => s + v.lines.reduce((ss, l) => {
    const acc = db.accounts.find((a) => a.id === l.accountId);
    if (acc?.type !== type) return ss;
    return ss + (type === "asset" ? (l.debit - l.credit) : (l.credit - l.debit));
  }, 0), 0);
  const assets = totalByType("asset");
  const liabilities = totalByType("liability");
  const equity = totalByType("equity");
  const net = assets - liabilities - equity;

  const groups = (type: "asset" | "liability" | "equity") => db.accounts.filter((a) => a.isPosting && a.type === type).map((a) => {
    const t = posted.reduce((s, v) => s + v.lines.reduce((ss, l) => l.accountId === a.id ? ss + (type === "asset" ? (l.debit - l.credit) : (l.credit - l.debit)) : ss, 0), 0);
    return { account: a, total: t };
  }).filter((r) => r.total !== 0);

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">الميزانية (Balance Sheet)</h1>
          <p className="text-sm text-soft mt-1">الأصول = الخصوم + حقوق الملكية (السندات المرحّلة)</p>
        </div>
        <button className="btn-soft" onClick={() => window.print()}><IconPrinter className="w-4 h-4" /> طباعة</button>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5"><p className="text-xs font-bold text-soft">الأصول</p><p className="stat-num text-2xl text-mint mt-1">{money(assets)}</p></div>
        <div className="card p-5"><p className="text-xs font-bold text-soft">الخصوم</p><p className="stat-num text-2xl text-coral mt-1">{money(liabilities)}</p></div>
        <div className="card p-5"><p className="text-xs font-bold text-soft">حقوق الملكية</p><p className="stat-num text-2xl text-jade-deep mt-1">{money(equity)}</p></div>
      </div>
      {Math.abs(net) > 0.001 && <p className="text-sm font-bold text-coral">⚠️ فرق: {money(net)} (أرصدة افتتاحية/ترحيل ناقص)</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        {(["asset", "liability"] as const).map((type) => (
          <div key={type} className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-line font-bold text-sm text-ink">{type === "asset" ? "الأصول" : "الخصوم"}</div>
            <table className="w-full text-sm">
              <tbody>
                {groups(type).map((r) => (
                  <tr key={r.account.id} className="border-b border-line/60"><td className="td">{r.account.code} {r.account.name}</td><td className="td stat-num text-end">{money(r.total)}</td></tr>
                ))}
                <tr className="bg-mist/70 font-bold"><td className="td">المجموع</td><td className="td stat-num text-end">{money(type === "asset" ? assets : liabilities)}</td></tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-line font-bold text-sm text-ink">حقوق الملكية</div>
        <table className="w-full text-sm">
          <tbody>
            {groups("equity").map((r) => (
              <tr key={r.account.id} className="border-b border-line/60"><td className="td">{r.account.code} {r.account.name}</td><td className="td stat-num text-end">{money(r.total)}</td></tr>
            ))}
            <tr className="bg-mist/70 font-bold"><td className="td">المجموع</td><td className="td stat-num text-end">{money(equity)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
