import React, { useMemo, useState } from "react";
import { useStore, useMoney, today } from "../store";
import { IconPrinter, IconUsers } from "../icons";
import { EmptyState, Field, TSelect } from "../components/ui";

export default function PatientStatementPage() {
  const { db, patientById } = useStore();
  const money = useMoney();
  const [patientId, setPatientId] = useState(db.patients[0]?.id ?? "");

  const invoices = useMemo(() => db.invoices.filter((i) => i.patientId === patientId).sort((a, b) => a.date.localeCompare(b.date)), [db.invoices, patientId]);
  const totalBilled = invoices.reduce((s, i) => s + i.items.reduce((ss, it) => ss + it.qty * it.price, 0) * (1 - (i.discount || 0) / 100), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.paid || 0), 0);
  const balance = totalBilled - totalPaid;

  const patient = patientById(patientId);

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">كشف حساب المريض</h1>
          <p className="text-sm text-soft mt-1">{patient?.name} — {patient?.phone}</p>
        </div>
        <button className="btn-soft" onClick={() => window.print()}><IconPrinter className="w-4 h-4" /> طباعة</button>
      </div>
      <div className="card p-4">
        <Field label="المريض"><TSelect value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          {db.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </TSelect></Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5"><p className="text-xs font-bold text-soft">إجمالي المفوتر</p><p className="stat-num text-2xl text-ink mt-1">{money(totalBilled)}</p></div>
        <div className="card p-5"><p className="text-xs font-bold text-soft">إجمالي المدفوع</p><p className="stat-num text-2xl text-mint mt-1">{money(totalPaid)}</p></div>
        <div className="card p-5"><p className="text-xs font-bold text-soft">الرصيد (مستحق)</p><p className={`stat-num text-2xl mt-1 ${balance > 0 ? "text-coral" : "text-jade-deep"}`}>{money(balance)}</p></div>
      </div>
      {invoices.length === 0 ? (
        <EmptyState icon={<IconUsers className="w-6 h-6" />} title="لا فواتير" desc="لا توجد فواتير لهذا المريض." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line"><tr><th className="th">التاريخ</th><th className="th">الرقم</th><th className="th">البنود</th><th className="th">المبلغ</th><th className="th">المدفوع</th><th className="th">الحالة</th></tr></thead>
            <tbody>
              {invoices.map((inv) => {
                const total = inv.items.reduce((s, i) => s + i.qty * i.price, 0) * (1 - (inv.discount || 0) / 100);
                return (
                  <tr key={inv.id} className="border-b border-line/60">
                    <td className="td">{inv.date}</td>
                    <td className="td stat-num">{inv.number}</td>
                    <td className="td text-xs">{inv.items.map((it) => `${it.qty}×${it.price}`).join(", ")}</td>
                    <td className="td stat-num">{money(total)}</td>
                    <td className="td stat-num">{money(inv.paid || 0)}</td>
                    <td className="td">{inv.paid >= total - 0.01 ? "مدفوعة" : inv.paid > 0 ? "جزئية" : "غير مدفوعة"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
