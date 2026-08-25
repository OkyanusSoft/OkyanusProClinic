import React, { useEffect, useMemo, useState } from "react";
import {
  addMinutes,
  APPT_META,
  dayName,
  fmtDate,
  fmtDateFull,
  today,
  uid,
  useMoney,
  useStore,
  type Appointment,
  type ApptStatus,
} from "../store";
import { IconCalendar, IconCalendarPlus, IconChevronDown, IconClock, IconStetho, IconX } from "../icons";
import { Avatar, Badge, Drop, DropItem, EmptyState, Field, Modal, TArea, TInput, TSelect, useToast } from "../components/ui";

const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

/* ============================ الصفحة ============================ */

interface Props {
  onOpenPatient: (id: string) => void;
  onBook: (patientId?: string, time?: string) => void;
}

export default function AppointmentsPage({ onOpenPatient, onBook }: Props) {
  const { db, dispatch, patientById, serviceById, doctorById } = useStore();
  const { push } = useToast();
  const [day, setDay] = useState(today(0));

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => today(i)), []);
  const dayAppts = useMemo(
    () => db.appointments.filter((a) => a.date === day).sort((a, b) => a.time.localeCompare(b.time)),
    [db.appointments, day]
  );
  const countFor = (d: string) => db.appointments.filter((a) => a.date === d && a.status !== "cancelled").length;

  const setStatus = (a: Appointment, status: ApptStatus) => {
    dispatch({ type: "SET_APPT_STATUS", id: a.id, status });
    if (status === "done") push("success", "اكتمل الموعد", `${patientById(a.patientId)?.name} — ${serviceById(a.serviceId)?.name}`);
    else if (status === "cancelled") push("warn", "أُلغي الموعد", `${patientById(a.patientId)?.name} — ${a.time}`);
  };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">جدول المواعيد</h1>
          <p className="text-sm text-soft mt-1">{fmtDateFull(day)}</p>
        </div>
        <button className="btn-primary" onClick={() => onBook()}>
          <IconCalendarPlus className="w-4.5 h-4.5" />
          موعد جديد
        </button>
      </div>

      {/* شريط الأيام */}
      <div className="grid grid-cols-7 gap-2 anim-rise" style={{ animationDelay: "80ms" }}>
        {days.map((d, i) => {
          const active = d === day;
          const n = countFor(d);
          return (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`card card-hover p-3 text-center cursor-pointer transition-all ${active ? "!bg-pine !border-pine text-white" : ""}`}
            >
              <p className={`text-[11px] font-bold ${active ? "text-white/70" : "text-soft"}`}>{i === 0 ? "اليوم" : dayName(d)}</p>
              <p className={`stat-num text-xl mt-1 ${active ? "text-white" : "text-ink"}`}>{Number(d.slice(8))}</p>
              <p className={`text-[10px] font-bold mt-1 ${active ? "text-[#3fd0c0]" : n > 0 ? "text-jade-deep" : "text-soft/50"}`}>
                {n > 0 ? `${n} موعد` : "فارغ"}
              </p>
            </button>
          );
        })}
      </div>

      {/* الخط الزمني */}
      <div className="card overflow-visible anim-rise" style={{ animationDelay: "150ms" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2">
            <IconClock className="w-5 h-5 text-jade-deep" />
            خط سير اليوم
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.keys(APPT_META) as ApptStatus[]).map((s) => (
              <span key={s} className="chip bg-mist text-soft">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: APPT_META[s].dot }} />
                {APPT_META[s].label}
              </span>
            ))}
          </div>
        </div>

        {dayAppts.length === 0 ? (
          <EmptyState icon={<IconCalendar className="w-6 h-6" />} title="يوم فارغ تماماً" desc="اضغط على أي خانة ساعة أدناه أو زر «موعد جديد» للحجز." />
        ) : null}

        <ul className="divide-y divide-line/70">
          {HOURS.map((h) => {
            const cell = dayAppts.filter((a) => a.time.startsWith(h.slice(0, 2)));
            return (
              <li key={h} className="flex gap-4 px-5 py-3 hover:bg-mist/50 transition-colors group">
                <div className="w-16 shrink-0 pt-2">
                  <span className="stat-num text-sm text-ink">{h}</span>
                </div>
                <div className="flex-1 flex flex-wrap gap-2.5 items-center min-h-10">
                  {cell.length === 0 ? (
                    <button
                      onClick={() => onBook(undefined, h)}
                      className="opacity-0 group-hover:opacity-100 transition-all text-[11px] font-bold text-jade-deep bg-jade-soft hover:bg-jade hover:text-white rounded-lg px-3 py-2 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <IconCalendarPlus className="w-3.5 h-3.5" />
                      حجز {h}
                    </button>
                  ) : (
                    cell.map((a) => {
                      const p = patientById(a.patientId);
                      const s = serviceById(a.serviceId);
                      const d = doctorById(a.doctorId);
                      const meta = APPT_META[a.status];
                      return (
                        <div
                          key={a.id}
                          className="anim-pop relative rounded-xl border border-line bg-white p-3 w-full sm:w-[calc(50%-6px)] xl:w-[calc(33.33%-8px)] transition-all hover:shadow-md hover:-translate-y-0.5"
                          style={{ borderInlineStartWidth: 4, borderInlineStartColor: s?.color }}
                        >
                          <div className="flex items-center gap-2.5">
                            <button onClick={() => p && onOpenPatient(p.id)} className="cursor-pointer shrink-0">
                              <Avatar name={p?.name ?? "؟"} size="w-9 h-9 text-xs" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <button onClick={() => p && onOpenPatient(p.id)} className="font-bold text-sm text-ink truncate block hover:text-jade-deep cursor-pointer transition-colors w-full text-start">
                                {p?.name}
                              </button>
                              <p className="text-[11px] text-soft mt-0.5 truncate">
                                {s?.name} · <span className="stat-num">{a.time}–{addMinutes(a.time, s?.duration ?? 30)}</span>
                              </p>
                            </div>
                            <Drop
                              align="end"
                              button={
                                <span className={`chip ${meta.cls} cursor-pointer`}>
                                  {meta.label}
                                  <IconChevronDown className="w-3 h-3" />
                                </span>
                              }
                            >
                              {(Object.keys(APPT_META) as ApptStatus[]).filter((x) => x !== a.status).map((x) => (
                                <DropItem key={x} danger={x === "cancelled"}>
                                  <span onClick={() => setStatus(a, x)} className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ background: APPT_META[x].dot }} />
                                    {APPT_META[x].label}
                                  </span>
                                </DropItem>
                              ))}
                            </Drop>
                          </div>
                          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-line/70">
                            <span className="text-[11px] font-bold text-soft flex items-center gap-1.5">
                              <span style={{ color: d?.color }} className="inline-flex"><IconStetho className="w-3.5 h-3.5" /></span>
                              {d?.name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {(a.status === "confirmed" || a.status === "waiting") && (
                                <button onClick={() => setStatus(a, "inprogress")} className="text-[11px] font-bold text-jade-deep bg-jade-soft hover:bg-jade hover:text-white rounded-md px-2.5 py-1.5 cursor-pointer transition-colors">
                                  بدء العلاج
                                </button>
                              )}
                              {a.status === "inprogress" && (
                                <button onClick={() => setStatus(a, "done")} className="text-[11px] font-bold text-white bg-mint hover:bg-[#1d6b47] rounded-md px-2.5 py-1.5 cursor-pointer transition-colors">
                                  إتمام ✓
                                </button>
                              )}
                              {a.status !== "done" && a.status !== "cancelled" && (
                                <button onClick={() => setStatus(a, "cancelled")} className="icon-btn !w-7 !h-7 hover:!bg-coral-soft hover:!text-coral" aria-label="إلغاء">
                                  <IconX className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ============================ نافذة الحجز ============================ */

export function AddAppointmentModal({
  open,
  onClose,
  defaultPatient,
  defaultTime,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  defaultPatient?: string;
  defaultTime?: string;
  defaultDate?: string;
}) {
  const { db, dispatch, patientById, serviceById } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [patientId, setPatientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [doctorId, setDoctorId] = useState("d1");
  const [date, setDate] = useState(today(0));
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setPatientId(defaultPatient ?? "");
      setServiceId("");
      setDoctorId("d1");
      setDate(defaultDate ?? today(0));
      setTime(defaultTime ?? "10:00");
      setNotes("");
      setErr("");
    }
  }, [open, defaultPatient, defaultTime, defaultDate]);

  const times = useMemo(() => {
    const arr: string[] = [];
    for (let h = 9; h <= 20; h++) {
      arr.push(`${String(h).padStart(2, "0")}:00`);
      arr.push(`${String(h).padStart(2, "0")}:30`);
    }
    return arr;
  }, []);

  const busy = (t: string) => db.appointments.some((a) => a.date === date && a.doctorId === doctorId && a.time === t && a.status !== "cancelled");

  const save = () => {
    if (!patientId) return setErr("اختر المريض أولاً.");
    if (!serviceId) return setErr("اختر نوع العلاج.");
    if (busy(time)) return setErr("هذا الوقت محجوز لدى الطبيب نفسه — اختر وقتاً آخر.");
    const a: Appointment = { id: uid(), patientId, serviceId, doctorId, date, time, status: "confirmed", notes: notes.trim() || undefined };
    dispatch({ type: "ADD_APPT", a });
    push("success", "تم تأكيد الحجز", `${patientById(patientId)?.name} — ${fmtDate(date)} ${time}`);
    onClose();
  };

  const svc = serviceId ? serviceById(serviceId) : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="حجز موعد جديد"
      subtitle="سيُرسل الموعد إلى جدول الطبيب المحدد فور التأكيد"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>تأكيد الحجز</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="المريض *">
            <TSelect value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">— اختر من السجل —</option>
              {db.patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · {p.phone}</option>
              ))}
            </TSelect>
          </Field>
        </div>
        <Field label="العلاج *">
          <TSelect value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">— اختر —</option>
            {db.services.filter((s) => s.active).map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.price} ر.س</option>
            ))}
          </TSelect>
        </Field>
        <Field label="الطبيب">
          <TSelect value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            {db.doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
            ))}
          </TSelect>
        </Field>
        <Field label="التاريخ">
          <TInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="الوقت" hint={svc ? `المدة المتوقعة: ${svc.duration} دقيقة` : undefined}>
          <TSelect value={time} onChange={(e) => setTime(e.target.value)}>
            {times.map((t) => (
              <option key={t} value={t} disabled={busy(t)}>
                {t} {busy(t) ? "— محجوز" : ""}
              </option>
            ))}
          </TSelect>
        </Field>
        <div className="col-span-2">
          <Field label="ملاحظات">
            <TArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي تفاصيل إضافية للموعد…" />
          </Field>
        </div>
      </div>
      {err && <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}
