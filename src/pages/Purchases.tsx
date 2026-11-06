import React, { useState } from "react";
import { useStore, useMoney, uid, today } from "../store";
import { IconPlus, IconReceipt } from "../icons";
import { EmptyState, Field, Modal, TInput, TSelect, useToast } from "../components/ui";
import { PrintModal, PurchaseInvoicePrint, type PurchasePrintData } from "../components/PrintSheet";

export default function PurchasesPage() {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [show, setShow] = useState(false);
  const [printData, setPrintData] = useState<PurchasePrintData | null>(null);
  const suppliers: { id: string; name: string }[] = (() => { try { return JSON.parse(localStorage.getItem("suppliers") || "[]"); } catch { return []; } })();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [itemId, setItemId] = useState(db.supplies[0]?.id ?? "");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [credit, setCredit] = useState(false);
  const [date, setDate] = useState(today(0));

  const save = () => {
    const q = Number(qty); const p = Number(price);
    if (!itemId || q <= 0 || p <= 0) { push("error", "أدخل صنفاً وكمية وسعر"); return; }
    const item = db.supplies.find((s) => s.id === itemId);
    if (!item) return;
    dispatch({ type: "MOVE_SUPPLY", itemId, delta: q, note: `شراء من مورد (cost ${p})` });
    push("success", "تم تسجيل الشراء", `${item.name} +${q}`);
    setPrintData({
      supplier: suppliers.find((s) => s.id === supplierId)?.name ?? "—",
      date,
      item: item.name,
      category: item.category,
      unit: item.unit,
      qty: q,
      price: p,
      credit,
    });
    setShow(false);
    setQty(""); setPrice("");
  };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display font-bold text-3xl text-ink">المشتريات</h1><p className="text-sm text-soft mt-1">تسجيل مشتريات (نقدی/آجل) — تُضاف للمخزون</p></div>
        <button className="btn-primary" onClick={() => setShow(true)}><IconPlus className="w-4.5 h-4.5" /> فاتورة مشتريات</button>
      </div>
      <div className="card p-6">
        <p className="text-sm text-soft">استخدم «بيانات الأصناف» لعرض الأرصدة. مشتريات جديدة تُضاف عبر الزر أعلاه.</p>
      </div>
      {show && (
        <Modal open onClose={() => setShow(false)} title="فاتورة مشتريات" footer={<><button className="btn-ghost" onClick={() => setShow(false)}>إلغاء</button><button className="btn-primary" onClick={save}>حفظ</button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="المورد"><TSelect value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {suppliers.length === 0 ? <option value="">— لا موردون —</option> : suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </TSelect></Field>
            <Field label="التاريخ"><TInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="الصنف"><TSelect value={itemId} onChange={(e) => setItemId(e.target.value)}>
              {db.supplies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </TSelect></Field>
            <Field label="الكمية"><TInput type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
            <Field label="سعر الوحدة"><TInput type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
            <div className="flex items-end"><label className="flex items-center gap-2 text-xs font-bold cursor-pointer pb-2"><input type="checkbox" checked={credit} onChange={(e) => setCredit(e.target.checked)} /> آجل (ذمم داينة)</label></div>
          </div>
        </Modal>
      )}
      {printData && (
        <PrintModal open onClose={() => setPrintData(null)} title="طباعة فاتورة مشتريات">
          <PurchaseInvoicePrint data={printData} />
        </PrintModal>
      )}
    </div>
  );
}