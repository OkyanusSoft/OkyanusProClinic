/* =====================================================================
   الحزمة الثالثة عشرة — دمج التقويم والوقت وحقل المرضى الذكي
   الهدف: src/pages/Appointments.tsx
   ---------------------------------------------------------------------
   ٥ تعديلات مرقمة — نفّذها بالترتيب.
   ===================================================================== */

/* ============================================================
   التعديل ١ — الاستيراد (أعلى الملف)
   أضف هذين السطرين مع بقية الاستيرادات:
   ============================================================ */

import { DatePicker, TimePicker } from "../components/DateTimePickers";
import { PatientPicker } from "../components/PatientPicker";

/* ============================================================
   التعديل ٢ — حقل المريض في AddAppointmentModal
   ------------------------------------------------
   ابحث عن:
   ============================================================ */
/*
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
*/
/* واستبدله بـ: */
/*
        <div className="col-span-2">
          <Field label="المريض *" hint="ابحث بالاسم أو الجوال — أو أضف مريضاً جديداً من الزر المجاور">
            <PatientPicker value={patientId} onChange={setPatientId} />
          </Field>
        </div>
*/

/* ============================================================
   التعديل ٣ — قائمة الأوقات المشغولة (لتمريرها لمنتقي الوقت)
   ------------------------------------------------
   ابحث عن السطر الذي يعرّف `busy`:
       const busy = (t: string) => db.appointments.some(...)
   وأضف تحته مباشرة:
   ============================================================ */

const busySlots = times.filter((t) => busy(t));

/* ============================================================
   التعديل ٤ — حقلا التاريخ والوقت في AddAppointmentModal
   ------------------------------------------------
   ابحث عن:
   ============================================================ */
/*
        <Field label="التاريخ">
          <DateInput value={date} onChange={setDate} />
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
*/
/* واستبدله بـ: */
/*
        <Field label="التاريخ">
          <DatePicker value={date} onChange={setDate} />
        </Field>
        <Field label="الوقت" hint={svc ? `المدة المتوقعة: ${svc.duration} دقيقة` : undefined}>
          <TimePicker
            value={time}
            onChange={setTime}
            start={clinicOf(db).workStart}
            end={clinicOf(db).workEnd}
            busyTimes={busySlots}
          />
        </Field>
*/

/* ============================================================
   التعديل ٥ — حقل التاريخ في FollowUpModal (جدولة عودة)
   ------------------------------------------------
   ابحث عن:
   ============================================================ */
/*
        <Field label="تاريخ الاستحقاق *">
          <DateInput value={dueDate} onChange={setDueDate} />
        </Field>
*/
/* واستبدله بـ: */
/*
        <Field label="تاريخ الاستحقاق *">
          <DatePicker value={dueDate} onChange={setDueDate} />
        </Field>
*/

/* ============================================================
   ملاحظات:
   • clinicOf مستورد مسبقاً في ملفك (يُستخدم في hoursBetween).
   • DateInput يبقى مستخدماً في بقية الشاشات — لا تحذف استيراده.
   • إن لم يكن AddPatientModal مصدّراً من Patients.tsx، أضف كلمة
     `export` قبل `function AddPatientModal` هناك (مرة واحدة فقط).
   ============================================================ */
