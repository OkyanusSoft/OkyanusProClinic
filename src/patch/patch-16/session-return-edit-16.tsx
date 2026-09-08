/* =====================================================================
   الحزمة السادسة عشرة — تحرير العودات والبيانات السابقة
   ---------------------------------------------------------------------
   نفّذ المقاطع (أ) ثم (ب) بالترتيب في src/pages/Session.tsx
   ===================================================================== */

/* ============================================================
   (أ) دوال النسخ والتحرير
       ألصقها قبل function Workstation(
   ============================================================ */

/** نسخ إجراء من الجلسة السابقة إلى الجلسة الحالية */
function useCopyProcedure(
  session: ClinicalSession,
  patch: (pp: Partial<ClinicalSession>) => void,
  push: (tone: string, title: string, desc?: string) => void
) {
  return (proc: SessionProc) => {
    const newProc: SessionProc = {
      ...proc,
      id: uid(), // معرّف جديد
      stageId: session.stages[session.stages.length - 1]?.id, // المرحلة الحالية
    };
    patch({ procedures: [...session.procedures, newProc] });
    push("success", "نُسخ الإجراء", `${proc.name} — ${proc.teeth.length} سن`);
  };
}

/** نسخ كل الإجراءات من الجلسة السابقة */
function useCopyAllProcedures(
  prevSession: ClinicalSession,
  session: ClinicalSession,
  patch: (pp: Partial<ClinicalSession>) => void,
  push: (tone: string, title: string, desc?: string) => void
) {
  return () => {
    const newProcs = prevSession.procedures.map((proc) => ({
      ...proc,
      id: uid(),
      stageId: session.stages[session.stages.length - 1]?.id,
    }));
    patch({ procedures: [...session.procedures, ...newProcs] });
    push("success", "نُسخ كل الإجراءات", `${newProcs.length} إجراء`);
  };
}

/** نسخ التشخيص من الجلسة السابقة */
function useCopyDiagnosis(
  prevSession: ClinicalSession,
  patch: (pp: Partial<ClinicalSession>) => void,
  push: (tone: string, title: string, desc?: string) => void
) {
  return () => {
    patch({ diagnosis: prevSession.diagnosis });
    push("success", "نُسخ التشخيص", prevSession.diagnosis);
  };
}

/** نسخ الفحص من الجلسة السابقة */
function useCopyExamination(
  prevSession: ClinicalSession,
  patch: (pp: Partial<ClinicalSession>) => void,
  push: (tone: string, title: string, desc?: string) => void
) {
  return () => {
    patch({ examination: prevSession.examination });
    push("success", "نُسخ الفحص", prevSession.examination);
  };
}

/** نسخ دواء من الجلسة السابقة */
function useCopyMedication(
  med: { name: string; dose: string; frequency: string; duration: string },
  session: ClinicalSession,
  patch: (pp: Partial<ClinicalSession>) => void,
  push: (tone: string, title: string, desc?: string) => void
) {
  return () => {
    const newMeds = [...(session.meds || []), med];
    patch({ meds: newMeds });
    push("success", "نُسخ الدواء", med.name);
  };
}

/* ============================================================
   (ب) واجهة وضع العودة المحسّنة
       ابحث عن قسم "وضع العودة" (ReturnMode) واستبدله بالكامل بهذا
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
        onClick={copyAllProcedures}
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
          {prevSession.procedures.map((proc) => (
            <div key={proc.id} className="card !rounded-lg p-3 bg-white border border-amber/20">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{proc.name}</p>
                  <p className="text-[10px] text-soft mt-0.5">
                    {proc.teeth.length > 0 ? `${proc.teeth.length} سن` : "—"} · {money(proc.price)}
                  </p>
                  {proc.detail && <p className="text-[10px] text-soft mt-0.5 truncate">{proc.detail}</p>}
                </div>
                <button
                  onClick={() => copyProcedure(proc)}
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
              onClick={copyDiagnosis}
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
              onClick={copyExamination}
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
          {prevSession.meds.map((med, i) => (
            <div key={i} className="card !rounded-lg p-2.5 bg-white border border-amber/20 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink truncate">{med.name}</p>
                <p className="text-[10px] text-soft mt-0.5">
                  {med.dose} · {med.frequency} · {med.duration}
                </p>
              </div>
              <button
                onClick={() => copyMedication(med)}
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
            const inv = db.invoices.find((i) => i.id === prevSession.invoiceId);
            return inv ? `${inv.number} — ${money(inv.total)} — ${inv.paid ? "مدفوعة" : "غير مدفوعة"}` : "—";
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
   (ج) استدعاء الدوال في Workstation
       داخل function Workstation، بعد تعريف prevSession، أضف:
   ============================================================ */

/*
  const copyProcedure = useCopyProcedure(session, patch, push);
  const copyAllProcedures = useCopyAllProcedures(prevSession, session, patch, push);
  const copyDiagnosis = useCopyDiagnosis(prevSession, patch, push);
  const copyExamination = useCopyExamination(prevSession, patch, push);
  const copyMedication = useCopyMedication; // تُستدعى داخل الخريطة
*/

/* ============================================================
   ملاحظة مهمة:
   - إذا كان prevSession معرّفًا لديك باسم مختلف (مثل previousSession)،
     عدّل الأسماء لتطابق ما لديك.
   - إذا كانت الدوال push أو patch بأسماء مختلفة، عدّلها أيضًا.
   - تأكد من أن IconCopy و IconCheck مستوردتان من "../icons".
   ============================================================ */
