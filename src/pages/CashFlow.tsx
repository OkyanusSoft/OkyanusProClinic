import React, { useMemo } from "react";
import { useStore, useMoney } from "../store";
import { IconPrinter } from "../icons";
import { EmptyState } from "../components/ui";

export default function CashFlowPage() {
  const { db } = useStore();
  const money = useMoney();
  const posted = db.vouchers.filter((v) => v.status === "posted");
  const cashIds = new Set(db.accounts.filter((a) => a.code.startsWith("111")).map((a) => a.id));
  let inflow = 0, outflow = 0;
  for (const v of posted) for (const l of v.lines) {
    if (!cashIds.has(l.accountId)) continue;
    inflow += l.debit || 0;
    outflow += l.credit || 0;
  }
  const net = inflow - outflow;
  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display font-bold text-3xl text-ink">التدفق النقدي (Cash Flow)</h1><p className="text-sm text-soft mt-1">حركات الصناديق/البنوك (السندات المرحّلة)</p></div>
        <button className="btn-soft" onClick={() => window.print()}><IconPrinter className="w-4 h-4" /> طباعة</button>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5"><p className="text-xs font-bold text-soft">وارد (قبض)</p><p className="stat-num text-2xl text-mint mt-1">{money(inflow)}</p></div>
        <div className="card p-5"><p className="text-xs font-bold text-soft">صادر (صرف)</p><p className="stat-num text-2xl text-coral mt-1">{money(outflow)}</p></div>
        <div className="card p-5"><p className="text-xs font-bold text-soft">صافي التدفق</p><p className={`stat-num text-2xl mt-1 ${net >= 0 ? "text-jade-deep" : "text-coral"}`}>{money(net)}</p></div>
      </div>
    </div>
  );
}
