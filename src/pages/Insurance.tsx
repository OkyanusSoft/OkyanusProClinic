import React, { useState } from "react";
import { useStore, useMoney, uid, today, type InsuranceCompany, type InsuranceClaim, type ClaimStatus } from "../store";
import { IconPlus } from "../icons";
import { EmptyState, Field, Modal, TInput, TSelect, useToast } from "../components/ui";

const CLAIM_LABEL: Record<ClaimStatus, string> = { submitted: "مُقدَّمة", approved: "معتمدة", partial: "جزئية", denied: "مرفوضة", paid: "مدفوعة" };

export default function InsurancePage() {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [tab, setTab] = useState<"companies" | "claims">("companies");
  const [showCompany, setShowCompany] = useState(false);
  const [showClaim, setShowClaim] = useState(false);

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">التأمين (Insurance)</h1>
          <p className="text-sm text-soft mt-1">{db.insuranceCompanies.length} شركة · {db.insuranceClaims.length} مطالبة</p>
        </div>
        <div className="flex gap-2">
          {tab === "companies" ? (
            <button className="btn-primary" onClick={() => setShowCompany(true)}><IconPlus className="w-4.5 h-4.5" /> شركة جديدة</button>
          ) : (
            <button className="btn-primary" onClick={() => setShowClaim(true)}><IconPlus className="w-4.5 h-4.5" /> مطالبة جديدة</button>
          )}
        </div>
      </div>
      <div className="card p-1.5 inline-flex gap-1">
        <button onClick={() => setTab("companies")} className={`rounded-lg px-4 h-9 text-xs font-bold ${tab === "companies" ? "bg-pine text-white" : "text-soft hover:bg-mist"}`}>الشركات</button>
        <button onClick={() => setTab("claims")} className={`rounded-lg px-4 h-9 text-xs font-bold ${tab === "claims" ? "bg-pine text-white" : "text-soft hover:bg-mist"}`}>المطالبات</button>
      </div>
      {tab === "companies" && (
        db.insuranceCompanies.length === 0 ? (
          <EmptyState icon={<IconPlus className="w-6 h-6" />} title="لا شركات" desc="أضف شركة تأمين." />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-mist/70 border-b border-line"><tr><th className="th">الاسم</th><th className="th">الرمز</th><th className="th">التواصل</th><th className="th">أيام</th></tr></thead>
              <tbody>
                {db.insuranceCompanies.map((c) => (
                  <tr key={c.id} className="border-b border-line/60">
                    <td className="td font-bold">{c.name}</td>
                    <td className="td stat-num">{c.code}</td>
                    <td className="td text-xs">{c.contact}</td>
                    <td className="td stat-num">{c.claimDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      {tab === "claims" && (
        db.insuranceClaims.length === 0 ? (
          <EmptyState icon={<IconPlus className="w-6 h-6" />} title="لا مطالبات" desc="أنشئ مطالبة من فاتورة." />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-mist/70 border-b border-line"><tr><th className="th">المريض</th><th className="th">الشركة</th><th className="th">مُقدَّم</th><th className="th">معتمد</th><th className="th">الحالة</th><th className="th">إجراء</th></tr></thead>
              <tbody>
                {db.insuranceClaims.map((c) => {
                  const patient = db.patients.find((p) => p.id === c.patientId);
                  const company = db.insuranceCompanies.find((x) => x.id === c.companyId);
                  return (
                    <tr key={c.id} className="border-b border-line/60">
                      <td className="td font-bold">{patient?.name ?? "—"}</td>
                      <td className="td">{company?.name ?? "—"}</td>
                      <td className="td stat-num">{money(c.submittedAmount)}</td>
                      <td className="td stat-num">{money(c.approvedAmount)}</td>
                      <td className="td">
                        <TSelect value={c.status} onChange={(e) => dispatch({ type: "UPDATE_INSURANCE_CLAIM", c: { ...c, status: e.target.value as ClaimStatus, decidedAt: new Date().toISOString() } })}>
                          {Object.entries(CLAIM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </TSelect>
                      </td>
                      <td className="td">
                        <input type="number" className="input !w-24" placeholder="معتمد" value={c.approvedAmount || ""} onChange={(e) => dispatch({ type: "UPDATE_INSURANCE_CLAIM", c: { ...c, approvedAmount: Number(e.target.value) } })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
      {showCompany && <CompanyModal onClose={() => setShowCompany(false)} />}
      {showClaim && <ClaimModal onClose={() => setShowClaim(false)} />}
    </div>
  );
}


function CompanyModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [contact, setContact] = useState("");
  const [claimDays, setClaimDays] = useState("30");
  const save = () => {
    if (!name.trim()) { push("error", "أدخل اسم الشركة"); return; }
    const c: InsuranceCompany = { id: uid(), name: name.trim(), code: code.trim() || name.slice(0, 4).toUpperCase(), contact: contact.trim(), claimDays: Number(claimDays) || 30, active: true, updatedAt: Date.now() };
    dispatch({ type: "ADD_INSURANCE_COMPANY", c });
    push("success", "تمت الإضافة", name);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="شركة تأمين جديدة" footer={<><button className="btn-ghost" onClick={onClose}>إلغاء</button><button className="btn-primary" onClick={save}>حفظ</button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="الاسم *"><TInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="الرمز"><TInput value={code} onChange={(e) => setCode(e.target.value)} /></Field>
        <Field label="التواصل"><TInput value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
        <Field label="أيام المطالبة"><TInput type="number" value={claimDays} onChange={(e) => setClaimDays(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function ClaimModal({ onClose }: { onClose: () => void }) {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [patientId, setPatientId] = useState("");
  const [companyId, setCompanyId] = useState(db.insuranceCompanies[0]?.id ?? "");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const save = () => {
    if (!patientId || !companyId) { push("error", "اختر مريضاً وشركة"); return; }
    const c: InsuranceClaim = { id: uid(), invoiceId: invoiceId || "", patientId, companyId, submittedAmount: Number(amount) || 0, approvedAmount: 0, status: "submitted", submittedAt: new Date().toISOString(), updatedAt: Date.now() };
    dispatch({ type: "ADD_INSURANCE_CLAIM", c });
    push("success", "تم إنشاء المطالبة");
    onClose();
  };
  const patientInvoices = db.invoices.filter((i) => i.patientId === patientId);
  return (
    <Modal open onClose={onClose} title="مطالبة تأمين جديدة" footer={<><button className="btn-ghost" onClick={onClose}>إلغاء</button><button className="btn-primary" onClick={save}>حفظ</button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="المريض"><TSelect value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">— اختر —</option>
          {db.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </TSelect></Field>
        <Field label="الشركة"><TSelect value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
          {db.insuranceCompanies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </TSelect></Field>
        <Field label="الفاتورة (اختياري)"><TSelect value={invoiceId} onChange={(e) => { setInvoiceId(e.target.value); const inv = db.invoices.find((i) => i.id === e.target.value); if (inv) setAmount(String(inv.items.reduce((s, i) => s + i.qty * i.price, 0))); }}>
          <option value="">— لا يوجد —</option>
          {patientInvoices.map((i) => <option key={i.id} value={i.id}>{i.number}</option>)}
        </TSelect></Field>
        <Field label="المبلغ المُقدَّم"><TInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
