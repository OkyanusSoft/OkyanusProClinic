import React, { useState } from "react";
import { useStore, useMoney, uid, today, type SupplyMove } from "../store";
import { IconPlus, IconBox, IconPrinter } from "../icons";
import { EmptyState, Field, Modal, TInput, TSelect, useToast } from "../components/ui";
import { PrintModal, StockMovementPrint } from "../components/PrintSheet";

const MOVE_TYPES = [
  { key: "opening", label: "سند قيد افتتاحي", delta: 1 },
  { key: "in", label: "سند توريد", delta: 1 },
  { key: "out", label: "سند صرف", delta: -1 },
  { key: "transfer", label: "سند تحويل", delta: 0 },
  { key: "adjustment", label: "سند تسوية", delta: 0 },
  { key: "count", label: "جرد مخزني", delta: 0 },
];

export default function StockMovementsPage() {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [show, setShow] = useState(false);
  const [printMove, setPrintMove] = useState<SupplyMove | null>(null);
  const [type, setType] = useState(MOVE_TYPES[0].key);
  const [itemId, setItemId] = useState(db.supplies[0]?.id ?? "");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [newQty, setNewQty] = useState("");

  const save = () => {
    const item = db.supplies.find((s) => s.id === itemId);
    if (!item) return;
    const mt = MOVE_TYPES.find((m) => m.key === type)!;
    let delta = 0;
    if (type === "opening" || type === "in") delta = Number(qty) || 0;
    else if (type === "out") delta = -(Number(qty) || 0);
    else if (type === "adjustment" || type === "count") delta = (Number(newQty) || 0) - item.qty;
    if (type !== "transfer" && delta === 0 && type !== "count") { push("error", "أدخل كمية"); return; }
    if (type === "out" && (Number(qty) || 0) > item.qty) { push("error", "الكمية تتجاوز الرصيد"); return; }
    dispatch({ type: "MOVE_SUPPLY", itemId, delta, note: `${mt.label}: ${note}`.trim() });
    push("success", "تم تسجيل الحركة", `${item.name}`);
    setShow(false); setQty(""); setNote(""); setNewQty("");
  };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display font-bold text-3xl text-ink">حركات المخزون</h1><p className="text-sm text-soft mt-1"> opening / توريد / صرف / تحويل / تسوية / جرد</p></div>
        <button className="btn-primary" onClick={() => setShow(true)}><IconPlus className="w-4.5 h-4.5" /> حركة جديدة</button>
      </div>
      {db.supplyMoves.length === 0 ? (
        <EmptyState icon={<IconBox className="w-6 h-6" />} title="لا حركات" desc="سجّل حركة مخزون." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line"><tr><th className="th">التاريخ</th><th className="th">الصنف</th><th className="th">الΔ</th><th className="th">الرصيد بعد</th><th className="th">البيان</th></tr></thead>
            <tbody>
              {db.supplyMoves.slice(0, 100).map((m) => {
                const item = db.supplies.find((s) => s.id === m.itemId);
                return (
                  <tr key={m.id} className="border-b border-line/60">
                    <td className="td text-xs">{new Date(m.date).toLocaleDateString("ar")}</td>
                    <td className="td font-bold">{item?.name ?? m.itemId}</td>
                    <td className={`td stat-num ${m.delta >= 0 ? "text-mint" : "text-coral"}`}>{m.delta >= 0 ? "+" : ""}{m.delta}</td>
                    <td className="td stat-num">{item?.qty ?? "—"}</td>
                    <td className="td text-xs truncate max-w-[200px]">{m.note}</td>
                    <td className="td">
                      <button onClick={() => setPrintMove(m)} className="icon-btn !w-8 !h-8 hover:!bg-jade-soft hover:!text-jade-deep" title="طباعة">
                        <IconPrinter className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {printMove && (
        <PrintModal open onClose={() => setPrintMove(null)} title={`طباعة حركة مخزون ${printMove.id.slice(0, 6).toUpperCase()}`}>
          <StockMovementPrint move={printMove} />
        </PrintModal>
      )}
      {show && (
        <Modal open onClose={() => setShow(false)} title="حركة مخزون" footer={<><button className="btn-ghost" onClick={() => setShow(false)}>إلغاء</button><button className="btn-primary" onClick={save}>حفظ</button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="نوع الحركة"><TSelect value={type} onChange={(e) => setType(e.target.value)}>
              {MOVE_TYPES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </TSelect></Field>
            <Field label="الصنف"><TSelect value={itemId} onChange={(e) => setItemId(e.target.value)}>
              {db.supplies.map((s) => <option key={s.id} value={s.id}>{s.name} (رصيد: {s.qty})</option>)}
            </TSelect></Field>
            {(type === "opening" || type === "in" || type === "out") && (
              <Field label="الكمية"><TInput type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
            )}
            {(type === "adjustment" || type === "count") && (
              <Field label="الرصيد الجديد"><TInput type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} /></Field>
            )}
            <div className="col-span-2"><Field label="بيان"><TInput value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
