import React, { useEffect, useMemo, useState } from "react";
import {
  APPT_META,
  fmtDate,
  invoiceStatus,
  invoiceTotal,
  INV_META,
  today,
  uid,
  useMoney,
  useStore,
  YEMEN_CITIES,
  type Patient,
} from "../store";
import { IconCalendarPlus, IconPhone, IconSearch, IconUserPlus, IconUsers, IconAlert } from "../icons";
import { Avatar, Badge, EmptyState, Field, Modal, TArea, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";
import DentalChart from "../components/DentalChart";

/* ============================ صفحة المرضى ============================ */

interface PageProps {
  addSignal: number;
  onOpenPatient: (id: string) => void;
  onBook: (patientId: string) => void;
}

export default function PatientsPage({ addSignal, onOpenPatient, onBook }: PageProps) {
  const { db, dispatch, patientBalance, lastVisit } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (addSignal > 0) setShowAdd(true);
  }, [addSignal]);

  const list = useMemo(() => {
    let arr = [...db.patients].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    if (q.trim()) arr = arr.filter((p) => p.name.includes(q.trim()) || p.phone.includes(q.trim()));
    if (filter === "balance") arr = arr.filter((p) => patientBalance(p.id) > 0);
    if (filter === "new") arr = arr.filter((p) => p.joined >= today(-30));
    if (filter === "caries") arr = arr.filter((p) => Object.values(p.teeth).includes("caries"));
    return arr;
  }, [db.patients, q, filter, patientBalance]);

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">سجل المرضى</h1>
          <p className="text-sm text-soft mt-1">
            {db.patients.length} مريضاً مسجلاً · {db.patients.filter((p) => Object.values(p.teeth).includes("caries")).length} لديهم تسوس نشط
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <IconUserPlus className="w-4.5 h-4.5" />
          إضافة مريض
        </button>
      </div>

      {/* أدوات البحث */}
      <div className="card p-3.5 anim-rise flex flex-wrap items-center gap-3" style={{ animationDelay: "80ms" }}>
        <div className="relative flex-1 min-w-56">
          <span className="absolute inset-y-0 start-3 flex items-center text-soft pointer-events-none">
            <IconSearch className="w-4.5 h-4.5" />
          </span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو رقم الجوال…" className="input !ps-10" />
        </div>
        <div className="flex items-center gap-2">
          {(
            [
              ["all", "الكل"],
              ["balance", "عليه مستحقات"],
              ["new", "جدد هذا الشهر"],
              ["caries", "لديه تسوس"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`h-10 px-3.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                filter === k ? "bg-pine text-white border-pine shadow-sm" : "bg-white text-soft border-line hover:border-jade/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* الجدول */}
      <div className="card overflow-hidden anim-rise" style={{ animationDelay: "140ms" }}>
        {list.length === 0 ? (
          <EmptyState icon={<IconUsers className="w-6 h-6" />} title="لا نتائج مطابقة" desc="جرّب تعديل البحث أو الفلاتر." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-mist/70 border-b border-line">
                <tr>
                  <th className="th">المريض</th>
                  <th className="th">العمر</th>
                  <th className="th">المدينة</th>
                  <th className="th">آخر زيارة</th>
                  <th className="th">مستحقات</th>
                  <th className="th">حالة الفم</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((p, i) => {
                  const bal = patientBalance(p.id);
                  const caries = Object.values(p.teeth).filter((s) => s === "caries").length;
                  const treated = Object.values(p.teeth).filter((s) => s === "filled" || s === "root" || s === "crown").length;
                  const lv = lastVisit(p.id);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => onOpenPatient(p.id)}
                      className="border-b border-line/60 last:border-0 hover:bg-jade-soft/40 cursor-pointer transition-colors anim-fade"
                      style={{ animationDelay: `${i * 35}ms` }}
                    >
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} />
                          <div>
                            <p className="font-bold text-ink">{p.name}</p>
                            <p className="text-[11px] text-soft mt-0.5" dir="ltr">{p.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td text-soft">{p.age} سنة</td>
                      <td className="td text-soft">{p.city || "—"}</td>
                      <td className="td text-soft">{lv ? fmtDate(lv) : "لم يزر بعد"}</td>
                      <td className="td">
                        {bal > 0 ? <span className="font-display font-bold text-coral">{money(bal)}</span> : <span className="text-mint font-bold text-xs">مسدَّد</span>}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1.5">
                          {caries > 0 && <span className="chip bg-coral-soft text-coral">{caries} تسوس</span>}
                          {treated > 0 && <span className="chip bg-jade-soft text-jade-deep">{treated} معالَج</span>}
                          {caries === 0 && treated === 0 && <span className="chip bg-mint-soft text-[#1d6b47]">سليم</span>}
                        </div>
                      </td>
                      <td className="td" onClick={(e) => e.stopPropagation()}>
                        <TwoStepDelete
                          onConfirm={() => {
                            dispatch({ type: "DELETE_PATIENT", id: p.id });
                            push("info", "تم حذف المريض", `أُزيل ${p.name} مع مواعيده وفواتيره.`);
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddPatientModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={(p) => {
          setShowAdd(false);
          push("success", "تمت إضافة المريض", `${p.name} أُضيف إلى السجل بنجاح.`);
          onOpenPatient(p.id);
        }}
        onBook={onBook}
        dispatch={dispatch}
      />
    </div>
  );
}

/* ============================ نافذة إضافة مريض ============================ */

function AddPatientModal({
  open,
  onClose,
  onSaved,
  onBook,
  dispatch,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (p: Patient) => void;
  onBook: (patientId: string) => void;
  dispatch: React.Dispatch<any>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"m" | "f">("m");
  const [blood, setBlood] = useState("O+");
  const [city, setCity] = useState("");
  const [allergies, setAllergies] = useState("لا يوجد");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setName(""); setPhone(""); setAge(""); setGender("m"); setBlood("O+"); setCity(""); setAllergies("لا يوجد"); setNotes(""); setErr("");
    }
  }, [open]);

  const save = () => {
    if (name.trim().length < 3) return setErr("أدخل الاسم الثلاثي على الأقل.");
    if (!/^05\d{8}$/.test(phone.trim())) return setErr("رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx.");
    const p: Patient = {
      id: uid(),
      name: name.trim(),
      phone: phone.trim(),
      age: Number(age) || 25,
      gender,
      blood,
      allergies: allergies.trim() || "لا يوجد",
      city: city.trim(),
      notes: notes.trim(),
      joined: today(0),
      teeth: {},
    };
    dispatch({ type: "ADD_PATIENT", p });
    onSaved(p);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="مريض جديد"
      subtitle="أدخل البيانات الأساسية لفتح ملف في العيادة"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>حفظ الملف</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="الاسم الكامل *">
            <TInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: سلمان عبدالعزيز الراشد" />
          </Field>
        </div>
        <Field label="رقم الجوال *">
          <TInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr" className="!text-start" />
        </Field>
        <Field label="العمر">
          <TInput type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="30" />
        </Field>
        <Field label="الجنس">
          <TSelect value={gender} onChange={(e) => setGender(e.target.value as "m" | "f")}>
            <option value="m">ذكر</option>
            <option value="f">أنثى</option>
          </TSelect>
        </Field>
        <Field label="فصيلة الدم">
          <TSelect value={blood} onChange={(e) => setBlood(e.target.value)}>
            {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </TSelect>
        </Field>
        <div className="col-span-2">
          <Field label="المدينة">
            <TInput list="yemen-cities" value={city} onChange={(e) => setCity(e.target.value)} placeholder="صنعاء" />
            <datalist id="yemen-cities">
              {YEMEN_CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="الحساسية الدوائية" hint="تظهر كتنبيه في ملف المريض">
            <TInput value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="لا يوجد" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="ملاحظات طبية">
            <TArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أمراض مزمنة، أدوية مستمرة…" />
          </Field>
        </div>
      </div>
      {err && (
        <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>
      )}
    </Modal>
  );
}

/* ============================ درج ملف المريض ============================ */

export function PatientDrawer({
  id,
  onClose,
  onBook,
}: {
  id: string | null;
  onClose: () => void;
  onBook: (patientId: string) => void;
}) {
  const { db, dispatch, patientById, serviceById, doctorById, patientBalance, lastVisit } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const p = id ? patientById(id) : undefined;

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, onClose]);

  if (!p) return null;

  const visits = db.appointments
    .filter((a) => a.patientId === p.id)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const invoices = db.invoices.filter((i) => i.patientId === p.id);
  const bal = patientBalance(p.id);
  const hasAllergy = p.allergies && p.allergies !== "لا يوجد";

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-pine/45 anim-overlay" onClick={onClose} />
      <aside className="anim-drawer absolute inset-y-0 end-0 w-full max-w-2xl bg-mist shadow-2xl flex flex-col">
        {/* الترويسة */}
        <div className="bg-pine sidebar-texture text-white px-6 pt-6 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <Avatar name={p.name} size="w-14 h-14 text-lg" />
              <div>
                <h2 className="font-display font-bold text-2xl leading-tight">{p.name}</h2>
                <p className="text-white/60 text-xs mt-1 flex items-center gap-1.5" dir="ltr">
                  <IconPhone className="w-3.5 h-3.5" />
                  {p.phone}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="icon-btn !text-white/70 hover:!bg-white/10 hover:!text-white" aria-label="إغلاق">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="chip bg-white/10 text-white">{p.age} سنة</span>
            <span className="chip bg-white/10 text-white">{p.gender === "m" ? "ذكر" : "أنثى"}</span>
            <span className="chip bg-white/10 text-white">دم {p.blood}</span>
            {p.city && <span className="chip bg-white/10 text-white">{p.city}</span>}
            <span className="chip bg-white/10 text-white/80">انضم {fmtDate(p.joined)}</span>
          </div>
          {hasAllergy && (
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber/15 border border-amber/30 px-3 py-2.5 text-xs font-bold text-amber">
              <IconAlert className="w-4 h-4 shrink-0" />
              تنبيه: حساسية من {p.allergies}
            </p>
          )}
        </div>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center">
              <p className="text-[11px] font-bold text-soft">المستحقات</p>
              <p className={`stat-num text-xl mt-1 ${bal > 0 ? "text-coral" : "text-mint"}`}>{bal > 0 ? money(bal) : "لا يوجد"}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-[11px] font-bold text-soft">آخر زيارة</p>
              <p className="stat-num text-xl mt-1 text-ink">{lastVisit(p.id) ? fmtDate(lastVisit(p.id)!) : "—"}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-[11px] font-bold text-soft">الزيارات</p>
              <p className="stat-num text-xl mt-1 text-ink">{visits.filter((v) => v.status !== "cancelled").length}</p>
            </div>
          </div>

          <section className="card p-5">
            <h3 className="font-display font-bold text-lg text-ink mb-4">خريطة الأسنان <span className="text-xs font-body font-medium text-soft">(ترقيم FDI)</span></h3>
            <DentalChart
              teeth={p.teeth}
              onSet={(tooth, status) => {
                dispatch({ type: "SET_TOOTH", patientId: p.id, tooth, status });
                push("success", `تم تحديث السن ${tooth}`, status === "healthy" ? "عُدِّلت الحالة إلى سليم." : undefined);
              }}
            />
          </section>

          <section className="card overflow-hidden">
            <h3 className="font-display font-bold text-lg text-ink px-5 pt-4 pb-3 border-b border-line">سجل الزيارات</h3>
            {visits.length === 0 ? (
              <EmptyState icon={<IconCalendarPlus className="w-6 h-6" />} title="لا زيارات سابقة" />
            ) : (
              <ul className="divide-y divide-line/60">
                {visits.slice(0, 7).map((v) => {
                  const meta = APPT_META[v.status];
                  return (
                    <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="stat-num text-sm text-ink w-24 shrink-0">{fmtDate(v.date)}</span>
                      <span className="stat-num text-xs text-soft w-12 shrink-0">{v.time}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-ink truncate">{serviceById(v.serviceId)?.name}</p>
                        <p className="text-[11px] text-soft">{doctorById(v.doctorId)?.name}</p>
                      </div>
                      <Badge cls={meta.cls}>{meta.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card overflow-hidden">
            <h3 className="font-display font-bold text-lg text-ink px-5 pt-4 pb-3 border-b border-line">الفواتير</h3>
            {invoices.length === 0 ? (
              <p className="text-xs text-soft px-5 py-5">لا فواتير لهذا المريض بعد.</p>
            ) : (
              <ul className="divide-y divide-line/60">
                {invoices.map((inv) => {
                  const st = invoiceStatus(inv);
                  return (
                    <li key={inv.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="stat-num text-sm text-jade-deep w-24 shrink-0" dir="ltr">{inv.number}</span>
                      <span className="text-xs text-soft flex-1">{fmtDate(inv.date)}</span>
                      <span className="stat-num text-sm text-ink">{money(invoiceTotal(inv))}</span>
                      <Badge cls={INV_META[st].cls}>{INV_META[st].label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {p.notes && (
            <section className="card p-5">
              <h3 className="font-display font-bold text-base text-ink mb-2">ملاحظات طبية</h3>
              <p className="text-sm text-soft leading-relaxed">{p.notes}</p>
            </section>
          )}
        </div>

        {/* الإجراءات */}
        <div className="border-t border-line bg-white px-6 py-4 flex items-center gap-3">
          <button className="btn-primary flex-1" onClick={() => onBook(p.id)}>
            <IconCalendarPlus className="w-4.5 h-4.5" />
            حجز موعد لهذا المريض
          </button>
          <button className="btn-ghost" onClick={onClose}>إغلاق</button>
        </div>
      </aside>
    </div>
  );
}
