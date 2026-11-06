import React, { useState } from "react";
import { useStore, useMoney, uid, today, type LabOrder, type LabOrderStatus } from "../store";
import { IconPlus } from "../icons";
import { EmptyState, Field, Modal, TInput, TSelect, useToast } from "../components/ui";

const STATUS_LABEL: Record<LabOrderStatus, string> = { sent: "مُرسل", inprogress: "قيد العمل", received: "مستلم", delivered: "مُسلَّم", cancelled: "ملغى" };

export default function LabOrdersPage() {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [show, setShow] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState(db.doctors[0]?.id ?? "");
  const [labName, setLabName] = useState("");
  const [workType, setWorkType] = useState("تاج");
  const [shade, setShade] = useState("");
  const [sentDate, setSentDate] = useState(today(0));
  const [dueDate, setDueDate] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const save = () => {
    if (!patientId || !labName.trim()) { push("error", "اختر مريضاً ومختبراً"); return; }
    const o: LabOrder = { id: uid(), patientId, doctorId, labName: labName.trim(), workType, shade: shade.trim() || undefined, sentDate, dueDate: dueDate || undefined, status: "sent", cost: cost ? Number(cost) : undefined, notes: notes.trim() || undefined, updatedAt: Date.now() };
    dispatch({ type: "ADD_LAB_ORDER", o });
    push("success", "تم إرسال العمل للمختبر");
    setShow(false);
  };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display font-bold text-3xl text-ink">مختبر </h1><p className="text-sm text-soft mt-1">{db.labOrders.length} أمر</p></div>
        <button className="btn-primary" onClick={() => setShow(true)}><IconPlus className="w-4.5 h-4.5" /> أمر جديد</button>
      </div>
      {db.labOrders.length === 0 ? (
        <div className="card p-10 text-center text-soft">لا أوامر. أرسل عملاً للمختبر.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mist/70 border-b border-line"><tr><th className="th">المريض</th><th className="th">المختبر</th><th className="th">العمل</th><th className="th">الإرسال</th><th className="th">الاستحقاق</th><th className="th">الحالة</th><th className="th">التكلفة</th></tr></thead>
            <tbody>
              {db.labOrders.map((o) => {
                const patient = db.patients.find((p) => p.id === o.patientId);
                return (
                  <tr key={o.id} className="border-b border-line/60">
                    <td className="td font-bold">{patient?.name ?? "—"}</td>
                    <td className="td text-xs">{o.labName}</td>
                    <td className="td text-xs">{o.workType} {o.shade && `· ${o.shade}`}</td>
                    <td className="td text-xs">{o.sentDate}</td>
                    <td className="td text-xs">{o.dueDate ?? "—"}</td>
                    <td className="td">
                      <TSelect value={o.status} onChange={(e) => dispatch({ type: "UPDATE_LAB_ORDER", o: { ...o, status: e.target.value as LabOrderStatus, receivedDate: e.target.value === "received" ? today(0) : o.receivedDate } })}>
                        {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </TSelect>
                    </td>
                    <td className="td stat-num">{o.cost ? money(o.cost) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {show && (
        <Modal open onClose={() => setShow(false)} title="أمر مختبر جديد" footer={<><button className="btn-ghost" onClick={() => setShow(false)}>إلغاء</button><button className="btn-primary" onClick={save}>إرسال</button></>}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="المريض *"><TSelect value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">— اختر —</option>
              {db.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </TSelect></Field>
            <Field label="الطبيب"><TSelect value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              {db.doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </TSelect></Field>
            <Field label="اسم المختبر *"><TInput value={labName} onChange={(e) => setLabName(e.target.value)} /></Field>
            <Field label="نوع العمل"><TSelect value={workType} onChange={(e) => setWorkType(e.target.value)}>
              {["تاج", "جسر", "طقم", "فينير", " abide", "أخرى"].map((w) => <option key={w} value={w}>{w}</option>)}
            </TSelect></Field>
            <Field label="اللون (Shade)"><TInput value={shade} onChange={(e) => setShade(e.target.value)} /></Field>
            <Field label="الإرسال"><TInput type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} /></Field>
            <Field label="الاستحقاق"><TInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
            <Field label="التكلفة"><TInput type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
            <div className="col-span-2"><Field label="ملاحظات"><TInput value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
