import React, { useState } from "react";
import { useStore, today, uid } from "../store";
import { IconCalendar, IconCheck } from "../icons";
import { EmptyState, Field, TInput, TSelect, useToast } from "../components/ui";

export default function BookingPage() {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [doctorId, setDoctorId] = useState(db.doctors[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(db.services[0]?.id ?? "");
  const [date, setDate] = useState(today(0));
  const [time, setTime] = useState("09:00");
  const [done, setDone] = useState(false);

  const submit = () => {
    if (!name.trim() || !phone.trim()) { push("error", "أدخل الاسم ورقم الجوال"); return; }
    let patient = db.patients.find((p) => p.phone === phone.trim());
    if (!patient) {
      patient = { id: uid(), name: name.trim(), phone: phone.trim(), age: 25, gender: "m", blood: "O+", allergies: "لا يوجد", city: "", notes: "حجز عبر البوابة", joined: today(0), teeth: {} };
      dispatch({ type: "ADD_PATIENT", p: patient });
    }
    const svc = db.services.find((s) => s.id === serviceId);
    const appt = { id: uid(), patientId: patient.id, serviceId, doctorId, date, time, status: "confirmed" as const, notes: "حجز ذاتي (بوابة)" };
    dispatch({ type: "ADD_APPT", a: appt });
    setDone(true);
    push("success", "تم الحجز", `${patient.name} — ${date} ${time}`);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mist p-6">
        <div className="card p-8 max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-mint-soft text-[#1d6b47] flex items-center justify-center"><IconCheck className="w-8 h-8" /></div>
          <h1 className="font-display font-bold text-2xl text-ink">تم حجز موعدك بنجاح!</h1>
          <p className="text-sm text-soft">سيتم التواصل معك لتأكيد الموعد. شكراً لاختيارك {db.settings?.clinicName ?? "العيادة"}.</p>
          <button className="btn-primary" onClick={() => setDone(false)}>حجز موعد آخر</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mist p-6">
      <div className="card p-8 max-w-lg w-full space-y-5">
        <div className="text-center">
          <h1 className="font-display font-bold text-2xl text-ink">حجز موعد (بوابة المريض)</h1>
          <p className="text-sm text-soft mt-1">احجز موعدك إلكترونياً — بدون تسجيل دخول</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="الاسم الكامل *"><TInput value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" /></Field></div>
          <div className="col-span-2"><Field label="رقم الجوال *"><TInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="77xxxxxxxx" dir="ltr" /></Field></div>
          <Field label="الطبيب"><TSelect value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            {db.doctors.filter((d) => d.active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </TSelect></Field>
          <Field label="الخدمة"><TSelect value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {db.services.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </TSelect></Field>
          <Field label="التاريخ"><TInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="الوقت"><TInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <button className="btn-primary w-full" onClick={submit}><IconCalendar className="w-4.5 h-4.5" /> تأكيد الحجز</button>
      </div>
    </div>
  );
}
