/* =====================================================================
   الحزمة السادسة عشرة — تحرير العودات (نسخة كاملة ومستقلة)
   ---------------------------------------------------------------------
   هذه النسخة تحتوي على كل ما تحتاجه لتطبيق التعديل.

   الخطوات:
   1. افتح src/pages/Session.tsx
   2. أضف الاستيرادات (إذا لم تكن موجودة)
   3. أضف الدوال قبل function Workstation
   4. استبدل قسم ReturnMode بالكامل
   5. استدعِ الدوال داخل Workstation
   ===================================================================== */

/* ============================================================
   الخطوة 1: الاستيرادات
   تأكد من وجود هذه الاستيرادات في أعلى الملف:
   ============================================================ */

// import { IconCopy, IconCheck, IconCalendar } from "../icons";
// import { uid } from "../store"; // إذا لم تكن موجودة

/* ============================================================
   الخطوة 2: الدوال المساعدة
   ألصق هذه الدوال قبل function Workstation(
   ============================================================ */

/** نسخ إجراء واحد من الجلسة السابقة */
function copyProcedureFromPrev(
  proc: any,
  session: any,
  patch: (pp: any) => void
) {
  const newProc = {
    ...proc,
    id: uid(),
    stageId: session.stages[session.stages.length - 1]?.id,
  };
  patch({ procedures: [...session.procedures, newProc] });
}

/** نسخ كل الإجراءات من الجلسة السابقة */
function copyAllProceduresFromPrev(
  prevSession: any,
  session: any,
  patch: (pp: any) => void
) {
  const newProcs = prevSession.procedures.map((proc: any) => ({
    ...proc,
    id: uid(),
    stageId: session.stages[session.stages.length - 1]?.id,
  }));
  patch({ procedures: [...session.procedures, ...newProcs] });
}

/** نسخ التشخيص */
function copyDiagnosisFromPrev(
  prevSession: any,
  patch: (pp: any) => void
) {
  patch({ diagnosis: prevSession.diagnosis });
}

/** نسخ الفحص */
function copyExaminationFromPrev(
  prevSession: any,
  patch: (pp: any) => void
) {
  patch({ examination: prevSession.examination });
}

/** نسخ دواء */
function copyMedicationFromPrev(
  med: any,
  session: any,
  patch: (pp: any) => void
) {
  const newMeds = [...(session.meds || []), med];
  patch({ meds: newMeds });
}

/* ============================================================
   الخطوة 3: قسم ReturnMode المحسّن
   ابحث عن قسم "وضع العودة" (ReturnMode) واستبدله بالكامل بهذا:

   البحث عن: {session.fromFuId && prevSession && (
   الاستبدال: الكود أدناه
   ============================================================ */

/*
{session.fromFuId && prevSession && (
  <div className="card !rounded-2xl !border-amber/50 bg-amber-soft/30 p-5 mb-5 anim-pop">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber text-white">
          <IconCalendar className="w-5 h-5" />
        </span>
        <div>
          <p className="font-display font-bold text-lg text-ink">وضع التحرير — جلسة سابقة</p>
          <p className="text-xs text-soft mt-0.5">
            {prevSession.date} · {prevSession.procedures.length} إجراء · {prevSession.meds?.length || 0} دواء
          </p>
        </div>
      </div>
      <button
        onClick={() => copyAllProceduresFromPrev(prevSession, session, patch)}
        className="btn-primary !h-9 !px-4 !text-xs"
        title="نسخ كل الإجراءات"
      >
        <IconCopy className="w-4 h-4" />
        نسخ الكل
      </button>
    </div>

    {/* الإجراءات السابقة */}
    {prevSession.procedures.length > 0 && (
      <div className="mb-4">
        <p className="text-xs font-bold text-amber mb-2">الإجراءات السابقة</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {prevSession.procedures.map((proc: any) => (
            <div key={proc.id} className="card !rounded-lg p-3 bg-white border border-amber/20">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{proc.name}</p>
                  <p className="text-[10px] text-soft mt-0.5">
                    {proc.teeth?.length > 0 ? `${proc.teeth.length} سن` : "—"} · {proc.price} ر.ي
                  </p>
                  {proc.detail && <p className="text-[10px] text-soft mt-0.5 truncate">{proc.detail}</p>}
                </div>
                <button
                  onClick={() => copyProcedureFromPrev(proc, session, patch)}
                  className="icon-btn !w-7 !h-7 hover:!bg-amber-soft hover:!text-amber"
                  title="نسخ إلى الجلسة"
                >
                  <IconCopy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* التشخيص والفحص */}
    <div className="grid sm:grid-cols-2 gap-3 mb-4">
      {prevSession.diagnosis && (
        <div className="card !rounded-lg p-3 bg-white border border-amber/20">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-amber mb-1">التشخيص السابق</p>
              <p className="text-xs text-ink leading-relaxed line-clamp-2">{prevSession.diagnosis}</p>
            </div>
            <button
              onClick={() => copyDiagnosisFromPrev(prevSession, patch)}
              className="icon-btn !w-7 !h-7 hover:!bg-amber-soft hover:!text-amber shrink-0"
              title="استخدام التشخيص"
            >
              <IconCheck className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      {prevSession.examination && (
        <div className="card !rounded-lg p-3 bg-white border border-amber/20">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-amber mb-1">الفحص السابق</p>
              <p className="text-xs text-ink leading-relaxed line-clamp-2">{prevSession.examination}</p>
            </div>
            <button
              onClick={() => copyExaminationFromPrev(prevSession, patch)}
              className="icon-btn !w-7 !h-7 hover:!bg-amber-soft hover:!text-amber shrink-0"
              title="استخدام الفحص"
            >
              <IconCheck className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>

    {/* الأدوية السابقة */}
    {prevSession.meds && prevSession.meds.length > 0 && (
      <div className="mb-4">
        <p className="text-xs font-bold text-amber mb-2">الأدوية السابقة</p>
        <div className="space-y-1.5">
          {prevSession.meds.map((med: any, i: number) => (
            <div key={i} className="card !rounded-lg p-2.5 bg-white border border-amber/20 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink truncate">{med.name}</p>
                <p className="text-[10px] text-soft mt-0.5">
                  {med.dose} · {med.frequency} · {med.duration}
                </p>
              </div>
              <button
                onClick={() => copyMedicationFromPrev(med, session, patch)}
                className="icon-btn !w-7 !h-7 hover:!bg-amber-soft hover:!text-amber shrink-0"
                title="نسخ الدواء"
              >
                <IconCopy className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* الفواتير السابقة (للعرض فقط) */}
    {prevSession.invoiceId && (
      <div className="card !rounded-lg p-3 bg-white/50 border border-amber/20">
        <p className="text-[10px] font-bold text-amber mb-1">الفاتورة السابقة</p>
        <p className="text-xs text-soft">
          {(() => {
            const inv = db.invoices.find((i: any) => i.id === prevSession.invoiceId);
            return inv ? `${inv.number} — ${inv.total} ر.ي — ${inv.paid ? "مدفوعة" : "غير مدفوعة"}` : "—";
          })()}
        </p>
      </div>
    )}

    <p className="text-[10px] text-soft mt-3 bg-amber-soft/50 rounded-lg px-3 py-2 leading-relaxed">
      💡 اضغط على أيقونة النسخ (📋) لنقل البيانات إلى الجلسة الحالية، ثم عدّلها حسب الحاجة.
    </p>
  </div>
)}
*/

/* ============================================================
   ملاحظات مهمة:

   1. إذا كان prevSession معرّفًا باسم مختلف، عدّل الاسم في الكود.

   2. تأكد من أن IconCopy و IconCheck و IconCalendar مستوردات.

   3. إذا كانت الدوال push أو patch بأسماء مختلفة، عدّلها.

   4. الكود يستخدم any للأنواع لتجنب أخطاء TypeScript.
      إذا أردت أنواع دقيقة، استبدل any بالأنواع الصحيحة.

   5. بعد التطبيق، نفّذ npm run build للتأكد من عدم وجود أخطاء.
   ============================================================ */
