import React, { useState } from "react";
import { useStore, uid } from "../store";
import { IconPlus, IconTrash } from "../icons";
import { EmptyState, Field, Modal, TInput, useToast } from "../components/ui";

interface Supplier { id: string; name: string; contact: string; phone: string; address: string; }

export default function SuppliersPage() {
  const { push } = useToast();
  const [list, setList] = useState<Supplier[]>(() => { try { return JSON.parse(localStorage.getItem("suppliers") || "[]"); } catch { return []; } });
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const persist = (u: Supplier[]) => { setList(u); localStorage.setItem("suppliers", JSON.stringify(u)); };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display font-bold text-3xl text-ink">إدارة الموردين</h1><p className="text-sm text-soft mt-1">{list.length} مورد</p></div>
        <button className="btn-primary" onClick={() => setShow(true)}><IconPlus className="w-4.5 h-4.5" /> مورد جديد</button>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<IconPlus className="w-6 h-6" />} title="لا موردون" desc="أضف مورداً." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line"><tr><th className="th">الاسم</th><th className="th">المسؤول</th><th className="th">الهاتف</th><th className="th">العنوان</th><th className="th"></th></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-b border-line/60">
                  <td className="td font-bold">{s.name}</td>
                  <td className="td text-xs">{s.contact}</td>
                  <td className="td stat-num text-xs">{s.phone}</td>
                  <td className="td text-xs">{s.address}</td>
                  <td className="td"><button onClick={() => persist(list.filter((x) => x.id !== s.id))} className="icon-btn !w-8 !h-8 hover:!bg-coral-soft hover:!text-coral"><IconTrash className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {show && (
        <Modal open onClose={() => setShow(false)} title="مورد جديد" footer={<><button className="btn-ghost" onClick={() => setShow(false)}>إلغاء</button><button className="btn-primary" onClick={() => { if (!name.trim()) return; persist([...list, { id: uid(), name: name.trim(), contact: contact.trim(), phone: phone.trim(), address: address.trim() }]); setName(""); setContact(""); setPhone(""); setAddress(""); setShow(false); push("success", "تمت الإضافة"); }}>حفظ</button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="الاسم *"><TInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="المسؤول"><TInput value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
            <Field label="الهاتف"><TInput value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" /></Field>
            <Field label="العنوان"><TInput value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
