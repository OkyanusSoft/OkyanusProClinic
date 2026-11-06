import React, { useEffect, useState } from "react";
import {
  useStore,
  useMoney,
  uid,
  today,
  nextVoucherNumber,
  checkPostingDate,
  PAY_METHODS,
  type Voucher,
  type VoucherLine,
  type VoucherType,
} from "../store";
import { Field, TInput, TSelect, useToast } from "./ui";
import { IconPlus, IconTrash, IconEye } from "../icons";
import { PrintModal, VoucherPrint } from "./PrintSheet";
const TYPE_LABEL: Record<VoucherType, string> = {
  receipt: "سند قبض",
  payment: "سند صرف",
  journal: "قيد يومي",
  transfer: "سند تحويل",
  opening: "سند افتتاحي",
};

type Props = {
  voucherType: VoucherType;
  initial?: Voucher;
  onSaved?: () => void;
};

export function VoucherForm({ voucherType, initial, onSaved }: Props) {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();  const accounts = db.accounts.filter((a) => a.isPosting && a.active);
  const cashBoxes = accounts.filter((a) => a.code.startsWith("111"));
  const branches = db.branches.filter((b) => b.active !== false);
  const costCenters = db.costCenters.filter((c) => c.active !== false);
  const currencies = db.currencies;

  const [date, setDate] = useState(initial?.date ?? today());
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [ref, setRef] = useState(initial?.reference ?? "");
  const [branchId, setBranchId] = useState(initial?.branchId ?? branches[0]?.id ?? "");
  const [costCenterId, setCostCenterId] = useState(initial?.costCenterId ?? "");
  const [partyName, setPartyName] = useState(initial?.partyName ?? "");
  const [method, setMethod] = useState(initial?.method ?? "cash");
  const [cashBoxId, setCashBoxId] = useState(initial?.cashBoxId ?? cashBoxes[0]?.id ?? "");
  const [currencyId, setCurrencyId] = useState(currencies[0]?.code ?? "YER");
  const [lines, setLines] = useState<VoucherLine[]>(() =>
    initial?.lines?.map((l) => ({ ...l, id: l.id || uid() })) ?? [
      { id: uid(), accountId: "", debit: 0, credit: 0, costCenterId: "", description: "" },
      { id: uid(), accountId: "", debit: 0, credit: 0, costCenterId: "", description: "" },
    ]
  );
  const [printV, setPrintV] = useState<Voucher | null>(null);
  const [asDraft, setAsDraft] = useState(true);

  const number = nextVoucherNumber(db.vouchers, voucherType, date);
  const dateCheck = checkPostingDate(db, date);

  useEffect(() => {
    if (initial) return;
    const l = (acc: string, descText: string): VoucherLine => ({
      id: uid(),
      accountId: acc,
      debit: 0,
      credit: 0,
      description: descText,
    });
    const ar = accounts.find((a) => a.code.startsWith("112101"))?.id ?? "";
    const cash = cashBoxes[0]?.id ?? "";
    const exp = accounts.find((a) => a.type === "expense")?.id ?? "";
    if (voucherType === "receipt" && cash && ar) setLines([l(cash, "صندوق/بنك — قبض"), l(ar, "ذمم مرضى — قبض")]);
    else if (voucherType === "payment" && exp && cash)
      setLines([l(exp, "مصروف/جهة الصرف"), l(cash, "صندوق/بنك — صرف")]);
    else if (voucherType === "transfer" && cash)
      setLines([l(cash, "من صندوق/بنك"), l(cash, "إلى صندوق/بنك")]);
  }, [voucherType, initial]);

  const totals = lines.reduce(
    (s, l) => ({ debit: s.debit + (Number(l.debit) || 0), credit: s.credit + (Number(l.credit) || 0) }),
    { debit: 0, credit: 0 }
  );
  const balanced = Math.abs(totals.debit - totals.credit) < 0.001 && lines.length >= 2;

  const updateLine = (id: string, patch: Partial<VoucherLine>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines((prev) => [...prev, { id: uid(), accountId: "", debit: 0, credit: 0, costCenterId: "", description: "" }]);
  const removeLine = (id: string) =>
    setLines((prev) => (prev.length > 2 ? prev.filter((l) => l.id !== id) : prev));

  const validate = (): string | null => {
    if (!desc.trim()) return "البيان مطلوب.";
    if (lines.length < 2) return "أدخل بندين على الأقل.";
    if (lines.some((l) => !l.accountId)) return "اختر حساباً لكل بند.";
    if (!balanced) return `السند غير متوازن: مدين ${money(totals.debit)} مقابل دائن ${money(totals.credit)}.`;
    if (!dateCheck.ok) return dateCheck.reason ?? "الفترة المالية غير متاحة.";
    if ((voucherType === "receipt" || voucherType === "payment" || voucherType === "transfer") && !cashBoxId)
      return "اختر صندوقاً أو بنكاً.";
    return null;
  };

  const save = () => {
    const err = validate();
    if (err) return push("error", "تعذّر حفظ السند", err);
    const now = new Date().toISOString();
    const v: Voucher = {
      id: initial?.id ?? uid(),
      number: initial?.number ?? number,
      type: voucherType,
      date,
      description: desc.trim(),
      status: asDraft ? "draft" : "posted",
      lines: lines.map((l) => ({ ...l, debit: Math.max(0, Number(l.debit) || 0), credit: Math.max(0, Number(l.credit) || 0) })),
      branchId: branchId || undefined,
      costCenterId: costCenterId || undefined,
      cashBoxId: voucherType === "receipt" || voucherType === "payment" || voucherType === "transfer" ? cashBoxId || undefined : undefined,
      partyName: partyName.trim() || undefined,
      method: voucherType === "receipt" || voucherType === "payment" ? method : undefined,
      reference: ref.trim() || undefined,
      createdBy: db.users[0]?.id,
      createdAt: now,
      postedAt: asDraft ? undefined : now,
      updatedAt: Date.now(),
    };
    dispatch({ type: "ADD_VOUCHER", v });
    push("success", asDraft ? "تم حفظ المسودة" : "تم ترحيل السند", `${TYPE_LABEL[voucherType]} ${v.number}`);
    setPrintV(v);
    onSaved?.();
  };

  const showCashFields = voucherType === "receipt" || voucherType === "payment" || voucherType === "transfer";
  const showPartyField = voucherType === "receipt" || voucherType === "payment";

  // RENDER_PART_1_START
  return (
    <div className="space-y-5">
      {/* ===== Header ===== */}
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">{TYPE_LABEL[voucherType]} جديد</h1>
          <p className="text-sm text-soft mt-1">
            الرقم المتوقع: <b className="stat-num" dir="ltr">{number}</b> · التاريخ: {date}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-soft" onClick={() => setAsDraft(true)}>حفظ كمسودة</button>
          <button className="btn-primary" disabled={!balanced || !dateCheck.ok} onClick={save}>
            {asDraft ? "حفظ كمسودة" : "ترحيل السند"}
          </button>
        </div>
      </div>

      {/* ===== Voucher Header Fields ===== */}
      <div className="card p-5 anim-rise space-y-4">
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="التاريخ"><TInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="الفرع">
            <TSelect value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">— بدون فرع —</option>
              {branches.map((b) => (<option key={b.id} value={b.id}>{b.code} — {b.name}</option>))}
            </TSelect>
          </Field>
          <Field label="مركز التكلفة">
            <TSelect value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)}>
              <option value="">— بدون مركز —</option>
              {costCenters.map((c) => (<option key={c.id} value={c.id}>{c.code} — {c.name}</option>))}
            </TSelect>
          </Field>
          <Field label="العملة">
            <TSelect value={currencyId} onChange={(e) => setCurrencyId(e.target.value)}>
              {currencies.map((c) => (<option key={c.code} value={c.code}>{c.name} ({c.code})</option>))}
            </TSelect>
          </Field>
        </div>

        {showCashFields && (
          <div className="grid md:grid-cols-3 gap-3">
            <Field label="الصندوق / البنك">
              <TSelect value={cashBoxId} onChange={(e) => setCashBoxId(e.target.value)}>
                <option value="">— اختر الصندوق —</option>
                {cashBoxes.map((a) => (<option key={a.id} value={a.id}>{a.code} — {a.name}</option>))}
              </TSelect>
            </Field>
            <Field label="طريقة الدفع">
              <TSelect value={method} onChange={(e) => setMethod(e.target.value)}>
                {Object.entries(PAY_METHODS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
              </TSelect>
            </Field>
            {showPartyField && (
              <Field label={voucherType === "receipt" ? "اسم الدافع" : "اسم المستفيد"}>
                <TInput value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder={voucherType === "receipt" ? "اسم المريض / العميل" : "اسم المورد / الجهة"} />
              </Field>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <Field label="البيان / الوصف"><TInput value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف رسمي يظهر في الطباعة" /></Field>
          <Field label="المرجع"><TInput value={ref} onChange={(e) => setRef(e.target.value)} placeholder="شيك / حوالة / مرجع داخلي" /></Field>
        </div>

        {!dateCheck.ok && (<p className="text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2">{dateCheck.reason}</p>)}
      </div>

      {/* ===== Voucher Lines ===== */}
 <div className="card p-5 anim-rise space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="font-display font-bold text-lg text-ink">بنود القيد</h3>
 <button className="btn-soft !h-8 !text-xs" onClick={addLine}>
 <IconPlus className="w-3.5 h-3.5" /> إضافة بند
 </button>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-mist text-[11px]">
 <th className="th" style={{ width: 32 }}>#</th>
 <th className="th">الحساب</th>
 <th className="th">مركز التكلفة</th>
 <th className="th">وصف البند</th>
 <th className="th">مدين</th>
 <th className="th">دائن</th>
 <th className="th"></th>
 </tr>
 </thead>
 <tbody>
 {lines.map((l, i) => {
 const account = accounts.find((a) => a.id === l.accountId);
 return (
 <tr key={l.id} className="border-b border-line/60">
 <td className="td text-xs text-soft">{i + 1}</td>
 <td className="td">
 <TSelect
 value={l.accountId}
 onChange={(e) => updateLine(l.id, { accountId: e.target.value })}
 className="!h-9 !text-xs"
 >
 <option value="">— اختر الحساب —</option>
 {accounts.map((a) => (
 <option key={a.id} value={a.id}>
 {a.code} {a.name}
 </option>
 ))}
 </TSelect>
 {account && <p className="text-[10px] text-soft mt-1">{account.type}</p>}
 </td>
 <td className="td">
 <TSelect
 value={l.costCenterId ?? costCenterId}
 onChange={(e) => updateLine(l.id, { costCenterId: e.target.value })}
 className="!h-9 !text-xs"
 >
 <option value="">—</option>
 {costCenters.map((c) => (
 <option key={c.id} value={c.id}>{c.name}</option>
 ))}
 </TSelect>
 </td>
 <td className="td">
 <TInput
 placeholder="وصف البند"
 value={l.description ?? ""}
 onChange={(e) => updateLine(l.id, { description: e.target.value })}
 className="!h-9 !text-xs"
 />
 </td>
 <td className="td">
 <TInput
 type="number"
 min={0}
 placeholder="0.00"
 value={l.debit || ""}
 onChange={(e) => updateLine(l.id, { debit: Number(e.target.value) || 0 })}
 className="!h-9 !text-xs w-28 text-center stat-num"
 />
 </td>
 <td className="td">
 <TInput
 type="number"
 min={0}
 placeholder="0.00"
 value={l.credit || ""}
 onChange={(e) => updateLine(l.id, { credit: Number(e.target.value) || 0 })}
 className="!h-9 !text-xs w-28 text-center stat-num"
 />
 </td>
 <td className="td">
 <button
 onClick={() => removeLine(l.id)}
 disabled={lines.length <= 2}
 className="icon-btn !w-8 !h-8 hover:!bg-coral-soft hover:!text-coral disabled:opacity-30"
 aria-label="حذف البند"
 >
 <IconTrash className="w-3.5 h-3.5" />
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 <tfoot>
 <tr className="bg-mist/70 font-bold">
 <td className="td" colSpan={4}>المجموع</td>
 <td className="td stat-num">{money(totals.debit)}</td>
 <td className="td stat-num">{money(totals.credit)}</td>
 <td className="td"></td>
 </tr>
 </tfoot>
 </table>
 </div>
 </div>

  <div className={`text-xs font-bold ${balanced ? "text-mint" : "text-coral"}`}>
    {balanced ? "✓ السند متوازن" : `السند غير متوازن: مدين ${money(totals.debit)} مقابل دائن ${money(totals.credit)}`}
  </div>


 {/* ===== Print Modal ===== */}
 {printV && (
 <PrintModal open onClose={() => setPrintV(null)} title={`طباعة ${TYPE_LABEL[voucherType]} ${printV.number}`}>
 <VoucherPrint voucher={printV} />
 </PrintModal>
 )}

{/* ===== زر عرض المرحّل ===== */}
 {!asDraft && initial?.status === "posted" && (
 <div className="flex justify-end mt-4 pt-4 border-t border-line">
 <button
 onClick={onSaved}
 className="btn-soft flex items-center gap-2"
 >
 <IconEye className="w-4 h-4" />
 عرض السند المرحّل في القائمة
 </button>
 </div>
 )}
  </div>
  );
  // RENDER_PART_1_END
}