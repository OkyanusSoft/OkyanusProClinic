import React, { useState } from "react";
import { useStore, uid } from "../store";
import { IconPlus, IconTrash } from "../icons";
import { EmptyState, Field, Modal, TInput, useToast } from "../components/ui";

interface Unit { id: string; name: string; symbol: string; }

export default function UnitsPage() {
  const { push } = useToast();
  const [units, setUnits] = useState<Unit[]>(() => {
    try { return JSON.parse(localStorage.getItem("units") || "[]"); } catch { return []; }
  });
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const persist = (u: Unit[]) => { setUnits(u); localStorage.setItem("units", JSON.stringify(u)); };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display font-bold text-3xl text-ink">الوحدات</h1><p className="text-sm text-soft mt-1">{units.length} وحدة</p></div>
        <button className="btn-primary" onClick={() => setShow(true)}><IconPlus className="w-4.5 h-4.5" /> وحدة جديدة</button>
      </div>
      {units.length === 0 ? (
        <EmptyState icon={<IconPlus className="w-6 h-6" />} title="لا وحدات" desc="أضف وحدة قياس (قطعة، صندوق، كرتون…)." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line"><tr><th className="th">الاسم</th><th className="th">الرمز</th><th className="th"></th></tr></thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="border-b border-line/60">
                  <td className="td font-bold">{u.name}</td>
                  <td className="td stat-num">{u.symbol}</td>
                  <td className="td"><button onClick={() => persist(units.filter((x) => x.id !== u.id))} className="icon-btn !w-8 !h-8 hover:!bg-coral-soft hover:!text-coral"><IconTrash className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {show && (
        <Modal open onClose={() => setShow(false)} title="وحدة جديدة" footer={<><button className="btn-ghost" onClick={() => setShow(false)}>إلغاء</button><button className="btn-primary" onClick={() => { if (!name.trim()) return; persist([...units, { id: uid(), name: name.trim(), symbol: symbol.trim() || name.trim() }]); setName(""); setSymbol(""); setShow(false); push("success", "تمت الإضافة"); }}>حفظ</button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="الاسم *"><TInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="الرمز"><TInput value={symbol} onChange={(e) => setSymbol(e.target.value)} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
