import React, { useState } from "react";
import { useStore, useMoney, uid, type CostCenter } from "../store";
import { IconPlus, IconTrash, IconPencil } from "../icons";
import { EmptyState, Field, Modal, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";

const CC_TYPE_LABEL: Record<CostCenter["type"], string> = { clinic: "عيادة", department: "قسم", doctor: "طبيب", project: "مشروع" };

export default function CostCentersPage() {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<CostCenter | null>(null);

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">دليل مراكز التكلفة</h1>
          <p className="text-sm text-soft mt-1">{db.costCenters.length} مركز</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><IconPlus className="w-4.5 h-4.5" /> مركز جديد</button>
      </div>
      {db.costCenters.length === 0 ? (
        <EmptyState icon={<IconPlus className="w-6 h-6" />} title="لا مراكز" desc="أضف مركز تكلفة." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line"><tr><th className="th">الرمز</th><th className="th">الاسم</th><th className="th">النوع</th><th className="th"></th></tr></thead>
            <tbody>
              {db.costCenters.map((c) => (
                <tr key={c.id} className="border-b border-line/60">
                  <td className="td stat-num">{c.code}</td>
                  <td className="td font-bold">{c.name}</td>
                  <td className="td">{CC_TYPE_LABEL[c.type]}</td>
                  <td className="td">
                    <button onClick={() => setEdit(c)} className="icon-btn !w-8 !h-8"><IconPencil className="w-3.5 h-3.5" /></button>
                    <TwoStepDelete onConfirm={() => { dispatch({ type: "DELETE_COST_CENTER", id: c.id }); push("warn", "حُذف المركز", c.name); }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showAdd && <CCModal onClose={() => setShowAdd(false)} />}
      {edit && <CCModal initial={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function CCModal({ initial, onClose }: { initial?: CostCenter; onClose: () => void }) {
  const { dispatch } = useStore();
  const { push } = useToast();
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<CostCenter["type"]>(initial?.type ?? "department");
  const save = () => {
    if (!name.trim()) { push("error", "أدخل الاسم"); return; }
    const c: CostCenter = { id: initial?.id ?? uid(), code: code.trim() || "CC", name: name.trim(), type, active: true, updatedAt: Date.now() };
    dispatch({ type: initial ? "UPDATE_COST_CENTER" : "ADD_COST_CENTER", c });
    push("success", initial ? "تم التحديث" : "تمت الإضافة", name);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={initial ? "تعديل مركز" : "مركز جديد"} footer={<><button className="btn-ghost" onClick={onClose}>إلغاء</button><button className="btn-primary" onClick={save}>حفظ</button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="الرمز"><TInput value={code} onChange={(e) => setCode(e.target.value)} /></Field>
        <Field label="الاسم *"><TInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="col-span-2"><Field label="النوع"><TSelect value={type} onChange={(e) => setType(e.target.value as any)}>
          {Object.entries(CC_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </TSelect></Field></div>
      </div>
    </Modal>
  );
}
