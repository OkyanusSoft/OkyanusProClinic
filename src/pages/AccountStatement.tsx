import React, { useMemo, useState } from "react";
import { useStore, useMoney } from "../store";
import { IconPrinter } from "../icons";
import { EmptyState, Field, TSelect } from "../components/ui";

export default function AccountStatementPage() {
  const { db } = useStore();
  const money = useMoney();
  const [accountId, setAccountId] = useState(db.accounts.find((a) => a.isPosting)?.id ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const lines = useMemo(() => {
    const out: { date: string; voucher: string; desc: string; debit: number; credit: number; balance: number }[] = [];
    let bal = 0;
    const vs = db.vouchers.filter((v) => v.status === "posted").sort((a, b) => a.date.localeCompare(b.date));
    for (const v of vs) {
      if (from && v.date < from) continue;
      if (to && v.date > to) continue;
      for (const l of v.lines) {
        if (l.accountId !== accountId) continue;
        bal += (l.debit || 0) - (l.credit || 0);
        out.push({ date: v.date, voucher: v.number, desc: l.description || v.description, debit: l.debit || 0, credit: l.credit || 0, balance: bal });
      }
    }
    return out;
  }, [db, accountId, from, to]);

  const acc = db.accounts.find((a) => a.id === accountId);

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">كشف حساب</h1>
          <p className="text-sm text-soft mt-1">{acc ? `${acc.code} · ${acc.name}` : "اختر حساباً"}</p>
        </div>
        <button className="btn-soft" onClick={() => window.print()}><IconPrinter className="w-4 h-4" /> طباعة</button>
      </div>
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="الحساب"><TSelect value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {db.accounts.filter((a) => a.isPosting).map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
        </TSelect></Field>
        <Field label="من"><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="إلى"><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      {lines.length === 0 ? (
        <EmptyState icon={<IconPrinter className="w-6 h-6" />} title="لا حركات" desc="لا توجد حركات لهذا الحساب." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line">
              <tr><th className="th">التاريخ</th><th className="th">السند</th><th className="th">البيان</th><th className="th">مدين</th><th className="th">دائن</th><th className="th">الرصيد</th></tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="td">{l.date}</td>
                  <td className="td stat-num">{l.voucher}</td>
                  <td className="td truncate max-w-[240px]">{l.desc}</td>
                  <td className="td stat-num">{money(l.debit)}</td>
                  <td className="td stat-num">{money(l.credit)}</td>
                  <td className="td stat-num font-bold">{money(l.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
