import React, { useState } from "react";
import { useStore, uid } from "../store";
import { IconPlus, IconTrash } from "../icons";
import { EmptyState, Field, Modal, TInput, useToast } from "../components/ui";

export default function BranchesPage() {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display font-bold text-3xl text-ink">الفروع </h1><p className="text-sm text-soft mt-1">{db.branches.length} فرع</p></div>
        <button className="btn-primary" onClick={() => setShow(true)}><IconPlus className="w-4.5 h-4.5" /> فرع جديد</button>
      </div>
      {db.branches.length === 0 ? (
        <EmptyState icon={<IconPlus className="w-6 h-6" />} title="لا فروع" desc="أضف فرعاً." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line"><tr><th className="th">الرمز</th><th className="th">الاسم</th><th className="th">العنوان</th><th className="th">الهاتف</th><th className="th">الحالة</th><th className="th"></th></tr></thead>
            <tbody>
              {db.branches.map((b) => (
                <tr key={b.id} className="border-b border-line/60">
                  <td className="td stat-num">{b.code}</td>
                  <td className="td font-bold">{b.name} {b.isDefault && <span className="chip bg-jade-soft text-jade-deep !text-[9px] ms-1">افتراضي</span>}</td>
                  <td className="td text-xs">{b.address}</td>
                  <td className="td text-xs">{b.phone}</td>
                  <td className="td"><span className={`chip ${b.active ? "bg-mint-soft text-[#1d6b47]" : "bg-mist text-soft"}`}>{b.active ? "نشط" : "موقوف"}</span></td>
                  <td className="td"><button onClick={() => { if (confirm(`حذف ${b.name}؟`)) dispatch({ type: "DELETE_BRANCH", id: b.id }); }} className="icon-btn !w-8 !h-8 hover:!bg-coral-soft hover:!text-coral"><IconTrash className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {show && (
        <Modal open onClose={() => setShow(false)} title="فرع جديد" footer={<><button className="btn-ghost" onClick={() => setShow(false)}>إلغاء</button><button className="btn-primary" onClick={() => {
          if (!name.trim()) return;
          const b = { id: uid(), code: code.trim() || `BR${db.branches.length + 1}`.padStart(4, "0"), name: name.trim(), address: address.trim(), phone: phone.trim(), active: true, updatedAt: Date.now() };
          dispatch({ type: "ADD_BRANCH", b });
          push("success", "تمت الإضافة", name);
          setShow(false); setName(""); setCode(""); setAddress(""); setPhone("");
        }}>حفظ</button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="الاسم *"><TInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="الرمز"><TInput value={code} onChange={(e) => setCode(e.target.value)} /></Field>
            <Field label="العنوان"><TInput value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
            <Field label="الهاتف"><TInput value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
