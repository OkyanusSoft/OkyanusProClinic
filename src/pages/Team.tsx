import React, { useState } from "react";
import { STAFF_ROLES, today, uid, useStore, type Doctor, type Staff } from "../store";
import { IconCalendar, IconIdCard, IconPencil, IconPhone, IconPlus, IconStetho } from "../icons";
import { Avatar, EmptyState, Field, Modal, Switch, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";

const COLORS = ["#0d8f83", "#3a86c4", "#e2952b", "#b23a48", "#2c9c69", "#0a6158"];
const SPECIALTIES = [
  "طب أسنان عام وترميم",
  "تقويم الأسنان",
  "جراحة الفم والوجه",
  "طب أسنان الأطفال",
  "علاج الجذور والعصب",
  "طب الفم واللثة",
  "تركيبات وتعويضات",
];

export default function TeamPage() {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [docModal, setDocModal] = useState<{ open: boolean; doc?: Doctor }>({ open: false });
  const [staffModal, setStaffModal] = useState<{ open: boolean; st?: Staff }>({ open: false });

  const todayCount = (docId: string) =>
    db.appointments.filter((a) => a.doctorId === docId && a.date === today(0) && a.status !== "cancelled").length;

  return (
    <div className="space-y-6">
      {/* الترويسة */}
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">الفريق الطبي والطاقم</h1>
          <p className="text-sm text-soft mt-1">
            {db.doctors.length} طبيب · {db.staff.length} موظف مساند — إدارة الكادر الكامل للعيادة.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="btn-soft" onClick={() => setStaffModal({ open: true })}>
            <IconIdCard className="w-4.5 h-4.5" />
            إضافة موظف
          </button>
          <button className="btn-primary" onClick={() => setDocModal({ open: true })}>
            <IconPlus className="w-4.5 h-4.5" />
            إضافة طبيب
          </button>
        </div>
      </div>

      {/* الأطباء */}
      <section>
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-jade-soft text-jade-deep"><IconStetho className="w-4.5 h-4.5" /></span>
          <h2 className="font-display font-bold text-xl text-ink">الأطباء</h2>
          <span className="chip bg-mist text-soft">{db.doctors.filter((d) => d.active).length} نشط</span>
        </div>

        {db.doctors.length === 0 ? (
          <div className="card"><EmptyState icon={<IconStetho className="w-6 h-6" />} title="لا يوجد أطباء" desc="أضف أول طبيب لبدء جدولة المواعيد." /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {db.doctors.map((d, i) => {
              const n = todayCount(d.id);
              return (
                <div key={d.id} className={`card card-hover anim-rise p-4 relative overflow-hidden ${d.active ? "" : "opacity-65"}`} style={{ animationDelay: `${i * 70}ms` }}>
                  <span className="absolute top-0 start-0 end-0 h-1" style={{ background: d.color }} />
                  <div className="flex items-start gap-3">
                    <span className="relative shrink-0">
                      <Avatar name={d.name} size="w-12 h-12 text-sm" />
                      <span className={`absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${d.active ? "bg-mint pulse-dot" : "bg-line"}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-[15px] text-ink leading-snug truncate">{d.name}</p>
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: d.color }}>{d.specialty}</p>
                      <p className="text-[11px] text-soft mt-1 flex items-center gap-1.5" dir="ltr">
                        <IconPhone className="w-3 h-3" /> +967 {d.phone}
                      </p>
                    </div>
                    <Switch on={d.active} onChange={(v) => {
                      dispatch({ type: "UPDATE_DOCTOR", d: { ...d, active: v } });
                      push("info", v ? "عاد الطبيب للجدول" : "أُوقف الطبيب مؤقتاً", d.name);
                    }} />
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-line/70">
                    <button className="chip bg-sky-soft text-sky cursor-default">
                      <IconCalendar className="w-3.5 h-3.5" />
                      {n > 0 ? `${n} موعد اليوم` : "لا مواعيد اليوم"}
                    </button>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setDocModal({ open: true, doc: d })} className="icon-btn !w-8 !h-8" aria-label="تعديل">
                        <IconPencil className="w-4 h-4" />
                      </button>
                      <TwoStepDelete onConfirm={() => {
                        dispatch({ type: "DELETE_DOCTOR", id: d.id });
                        push("warn", "حُذف الطبيب من الفريق", d.name);
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* الموظفون */}
      <section>
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-soft text-sky"><IconIdCard className="w-4.5 h-4.5" /></span>
          <h2 className="font-display font-bold text-xl text-ink">الطاقم المساند</h2>
          <span className="chip bg-mist text-soft">{db.staff.filter((s) => s.active).length} في الخدمة</span>
        </div>

        <div className="card overflow-hidden anim-rise" style={{ animationDelay: "160ms" }}>
          {db.staff.length === 0 ? (
            <EmptyState icon={<IconIdCard className="w-6 h-6" />} title="لا يوجد موظفون" desc="أضف موظفي الاستقبال والمساعدين وفنيي التعقيم." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-mist/70 border-b border-line">
                  <tr>
                    <th className="th">الموظف</th>
                    <th className="th">المسمى الوظيفي</th>
                    <th className="th">رقم التواصل</th>
                    <th className="th">في الخدمة</th>
                    <th className="th"></th>
                  </tr>
                </thead>
                <tbody>
                  {db.staff.map((s, i) => (
                    <tr key={s.id} className="border-b border-line/60 last:border-0 hover:bg-sky-soft/25 transition-colors anim-fade" style={{ animationDelay: `${i * 40}ms` }}>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} size="w-9 h-9 text-xs" />
                          <span className={`font-bold ${s.active ? "text-ink" : "text-soft line-through"}`}>{s.name}</span>
                        </div>
                      </td>
                      <td className="td"><span className="chip bg-sky-soft text-sky">{s.role}</span></td>
                      <td className="td text-soft"><span dir="ltr" className="stat-num text-xs">+967 {s.phone}</span></td>
                      <td className="td">
                        <Switch on={s.active} onChange={(v) => {
                          dispatch({ type: "UPDATE_STAFF", s: { ...s, active: v } });
                          push("info", v ? "عاد الموظف للخدمة" : "أُوقف الموظف مؤقتاً", s.name);
                        }} />
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => setStaffModal({ open: true, st: s })} className="icon-btn !w-8 !h-8" aria-label="تعديل">
                            <IconPencil className="w-4 h-4" />
                          </button>
                          <TwoStepDelete onConfirm={() => {
                            dispatch({ type: "DELETE_STAFF", id: s.id });
                            push("warn", "حُذف الموظف من الطاقم", s.name);
                          }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {docModal.open && <DoctorModal initial={docModal.doc} onClose={() => setDocModal({ open: false })} />}
      {staffModal.open && <StaffModal initial={staffModal.st} onClose={() => setStaffModal({ open: false })} />}
    </div>
  );
}

/* ============================ نافذة طبيب ============================ */

function DoctorModal({ initial, onClose }: { initial?: Doctor; onClose: () => void }) {
  const { dispatch } = useStore();
  const { push } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [specialty, setSpecialty] = useState(initial?.specialty ?? SPECIALTIES[0]);
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [err, setErr] = useState("");

  const save = () => {
    if (name.trim().length < 3) return setErr("أدخل اسم الطبيب الكامل.");
    const d: Doctor = {
      id: initial?.id ?? uid(),
      name: name.trim(),
      specialty,
      phone: phone.trim() || "7XXXXXXXX",
      color,
      active: initial?.active ?? true,
    };
    dispatch({ type: initial ? "UPDATE_DOCTOR" : "ADD_DOCTOR", d });
    push("success", initial ? "تم تعديل بيانات الطبيب" : "انضم طبيب جديد للفريق", d.name);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? `تعديل «${initial.name}»` : "إضافة طبيب جديد"}
      subtitle="سيظهر الطبيب مباشرة في قوائم جدولة المواعيد"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>{initial ? "حفظ التعديلات" : "إضافة الطبيب"}</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="الاسم الكامل *">
            <TInput value={name} onChange={(e) => setName(e.target.value)} placeholder="د. ..." />
          </Field>
        </div>
        <Field label="التخصص">
          <TSelect value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </TSelect>
        </Field>
        <Field label="رقم الجوال">
          <TInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7XXXXXXXX" dir="ltr" />
        </Field>
        <div className="col-span-2">
          <Field label="اللون المميز في الجدول">
            <div className="flex gap-2.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 ${color === c ? "ring-2 ring-offset-2 ring-ink scale-110" : ""}`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </Field>
        </div>
      </div>
      {err && <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}

/* ============================ نافذة موظف ============================ */

function StaffModal({ initial, onClose }: { initial?: Staff; onClose: () => void }) {
  const { dispatch } = useStore();
  const { push } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? STAFF_ROLES[0]);
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [err, setErr] = useState("");

  const save = () => {
    if (name.trim().length < 3) return setErr("أدخل اسم الموظف الكامل.");
    const s: Staff = {
      id: initial?.id ?? uid(),
      name: name.trim(),
      role,
      phone: phone.trim() || "7XXXXXXXX",
      active: initial?.active ?? true,
    };
    dispatch({ type: initial ? "UPDATE_STAFF" : "ADD_STAFF", s });
    push("success", initial ? "تم تعديل بيانات الموظف" : "انضم موظف جديد للطاقم", s.name);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? `تعديل «${initial.name}»` : "إضافة موظف جديد"}
      subtitle="المساعدون والاستقبال وفنيو التعقيم والمختبر"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>{initial ? "حفظ التعديلات" : "إضافة الموظف"}</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="الاسم الكامل *">
            <TInput value={name} onChange={(e) => setName(e.target.value)} placeholder="أ. ..." />
          </Field>
        </div>
        <Field label="المسمى الوظيفي">
          <TSelect value={role} onChange={(e) => setRole(e.target.value)}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </TSelect>
        </Field>
        <Field label="رقم الجوال">
          <TInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7XXXXXXXX" dir="ltr" />
        </Field>
      </div>
      {err && <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}
