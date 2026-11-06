import React, { useMemo, useState } from "react";
import { useStore, useMoney } from "../store";
import { IconPrinter, IconShield } from "../icons";
import { EmptyState, Field, TSelect } from "../components/ui";

export default function InsuranceStatementPage() {
  const { db } = useStore();
  const money = useMoney();
  const [companyId, setCompanyId] = useState(db.insuranceCompanies[0]?.id ?? "");

  const claims = useMemo(() => db.insuranceClaims.filter((c) => c.companyId === companyId), [db.insuranceClaims, companyId]);
  const totalSubmitted = claims.reduce((s, c) => s + (c.submittedAmount || 0), 0);
  const totalApproved = claims.reduce((s, c) => s + (c.approvedAmount || 0), 0);
  const totalPaid = claims.filter((c) => c.status === "paid").reduce((s, c) => s + (c.approvedAmount || 0), 0);
  const pending = totalApproved - totalPaid;
  const company = db.insuranceCompanies.find((c) => c.id === companyId);

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">كشف التأمين</h1>
          <p className="text-sm text-soft mt-1">{company?.name} — {claims.length} مطالبة</p>
        </div>
        <button className="btn-soft" onClick={() => window.print()}><IconPrinter className="w-4 h-4" /> طباعة</button>
      </div>
      <div className="card p-4">
        <Field label="الشركة"><TSelect value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          {db.insuranceCompanies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </TSelect></Field>
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="card p-5"><p className="text-xs font-bold text-soft">مُقدَّم</p><p className="stat-num text-2xl text-ink mt-1">{money(totalSubmitted)}</p></div>
        <div className="card p-5"><p className="text-xs font-bold text-soft">معتمد</p><p className="stat-num text-2xl text-mint mt-1">{money(totalApproved)}</p></div>
        <div className="card p-5"><p className="text-xs font-bold text-soft">مدفوع</p><p className="stat-num text-2xl text-jade-deep mt-1">{money(totalPaid)}</p></div>
        <div className="card p-5"><p className="text-xs font-bold text-soft">مستحق (pending)</p><p className="stat-num text-2xl text-coral mt-1">{money(pending)}</p></div>
      </div>
      {claims.length === 0 ? (
        <EmptyState icon={<IconShield className="w-6 h-6" />} title="لا مطالبات" desc="لا توجد مطالبات لهذه الشركة." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line"><tr><th className="th">المريض</th><th className="th">الفاتورة</th><th className="th">مُقدَّم</th><th className="th">معتمد</th><th className="th">الحالة</th><th className="th">الإرسال</th></tr></thead>
            <tbody>
              {claims.map((c) => {
                const patient = db.patients.find((p) => p.id === c.patientId);
                const inv = db.invoices.find((i) => i.id === c.invoiceId);
                return (
                  <tr key={c.id} className="border-b border-line/60">
                    <td className="td font-bold">{patient?.name ?? "—"}</td>
                    <td className="td stat-num text-xs">{inv?.number ?? "—"}</td>
                    <td className="td stat-num">{money(c.submittedAmount)}</td>
                    <td className="td stat-num">{money(c.approvedAmount)}</td>
                    <td className="td">{c.status}</td>
                    <td className="td text-xs">{c.submittedAt?.slice(0, 10)}</td>
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
