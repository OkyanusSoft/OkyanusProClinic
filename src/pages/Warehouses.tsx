import React, { useState } from "react";
import { useStore, uid } from "../store";
import { IconPlus, IconTrash } from "../icons";
import { EmptyState, Field, Modal, TInput, TSelect, useToast } from "../components/ui";

interface Warehouse { id: string; name: string; location: string; accountId: string; }

export default function WarehousesPage() {
  const { db } = useStore();
  const { push } = useToast();
  const [list, setList] = useState<Warehouse[]>(() => { try { return JSON.parse(localStorage.getItem("warehouses") || "[]"); } catch { return []; } });
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [accountId, setAccountId] = useState(db.accounts.find((a) => a.isPosting && a.code.startsWith("113"))?.id ?? "");
  const persist = (u: Warehouse[]) => { setList(u); localStorage.setItem("warehouses", JSON.stringify(u)); };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display font-bold text-3xl text-ink">دليل المخازن</h1><p className="text-sm text-soft mt-1">{list.length} مخزن</p></div>
        <button className="btn-primary" onClick={() => setShow(true)}><IconPlus className="w-4.5 h-4.5" /> مخزن جديد</button>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<IconPlus className="w-6 h-6" />} title="لا مخازن" desc="أضف مخزناً واربطه بحساب المخزون." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line"><tr><th className="th">الاسم</th><th className="th">الموقع</th><th className="th">الحساب</th><th className="th"></th></tr></thead>
            <tbody>
              {list.map((w) => {
                const acc = db.accounts.find((a) => a.id === w.accountId);
                return (
                  <tr key={w.id} className="border-b border-line/60">
                    <td className="td font-bold">{w.name}</td>
                    <td className="td text-xs">{w.location}</td>
                    <td className="td text-xs">{acc ? `${acc.code} ${acc.name}` : "—"}</td>
                    <td className="td"><button onClick={() => persist(list.filter((x) => x.id !== w.id))} className="icon-btn !w-8 !h-8 hover:!bg-coral-soft hover:!text-coral"><IconTrash className="w-4 h-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {show && (
        <Modal open onClose={() => setShow(false)} title="مخزن جديد" footer={<><button className="btn-ghost" onClick={() => setShow(false)}>إلغاء</button><button className="btn-primary" onClick={() => { if (!name.trim()) return; persist([...list, { id: uid(), name: name.trim(), location: location.trim(), accountId }]); setName(""); setLocation(""); setShow(false); push("success", "تمت الإضافة"); }}>حفظ</button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="الاسم *"><TInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="الموقع"><TInput value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
            <div className="col-span-2"><Field label="حساب المخزون (رئيسي)"><TSelect value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {db.accounts.filter((a) => a.isPosting && a.code.startsWith("113")).map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </TSelect></Field></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
