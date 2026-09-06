/* =====================================================================
   الحزمة الثانية عشرة — حارس «الحالات النهائية» على الخادم
   ---------------------------------------------------------------------
   القاعدة المركزية: الجلسة التي أُغلقت (done / cancelled)
   لا يمكن لأي دمج قادم أن يعيدها إلى حالة مفتوحة — أبدًا.

   هذا هو الحل الجذري، لأنه يُفرض على قاعدة البيانات المركزية نفسها،
   فيشمل كل الأجهزة، ولا يعتمد على ذاكرة أي عميل.
   ===================================================================== */

/* ============================================================
   1) ألصق هذه الكتلة أعلى server/index.js
      (بعد الـ require وقبل أي مسار)
   ============================================================ */

/**
 * الحالات التي تُعد «نهائية» ولا يجوز التراجع عنها عبر الدمج.
 * مفتاح: اسم المصفوفة → مجموعة الحالات النهائية فيها.
 */
const TERMINAL_STATES = {
  sessions: new Set(["done", "cancelled"]),
  // يمكن توسيعها مستقبلًا، مثال:
  // invoices: new Set(["void"]),
};

/**
 * تحمي السجلات ذات الحالة النهائية من التراجع.
 * لكل سجل في النسخة القادمة (incoming): إذا كان له نظير في النسخة
 * المخزنة (stored) بحالة نهائية، نحتفظ بحالة النسخة المخزنة وننسب
 * باقي الحقول إليها — فلا يُفتح مغلقٌ أبدًا.
 */
function guardTerminalStates(stored, incoming) {
  if (!incoming || typeof incoming !== "object") return incoming;

  for (const [entity, finals] of Object.entries(TERMINAL_STATES)) {
    const incomingList = incoming[entity];
    const storedList = stored?.[entity];
    if (!Array.isArray(incomingList) || !Array.isArray(storedList)) continue;

    // فهرس النسخة المخزنة حسب المعرف
    const storedById = new Map(storedList.map((r) => [r && r.id, r]));

    incoming[entity] = incomingList.map((inc) => {
      if (!inc || typeof inc !== "object") return inc;
      const prev = storedById.get(inc.id);
      if (!prev) return inc;

      // إذا كانت النسخة المخزنة في حالة نهائية…
      if (finals.has(prev.status) && !finals.has(inc.status)) {
        // …فالناتج يبقى على الحالة النهائية (لا تراجع)
        return { ...inc, status: prev.status, endedAt: prev.endedAt ?? inc.endedAt };
      }
      return inc;
    });
  }
  return incoming;
}

/* ============================================================
   2) اربط الحارس بنقطة الدمج / الحفظ
   ---------------------------------------------------------------------
   في المكان الذي تدمج فيه الحالة القادمة مع المخزنة (دالة merge)
   أو في نقطة PUT /api/state قبل حفظ الوثيقة، استدعِ:
   ============================================================ */

/*
   // بعد بناء الوثيقة المدمجة `mergedDoc` وقبل حفظها في clinic_state:
   guardTerminalStates(storedDoc, mergedDoc);
   await saveDocToDb(mergedDoc);
*/

/* ============================================================
   3) (اختياري — تعزيز) طبّق الحارس عند القراءة أيضًا،
      فيستلم العميل نسخة نظيفة لا تحوي جلسة «مفتوحة» زائفة:
   ============================================================ */

/*
   // في GET /api/state قبل الإرسال:
   const doc = loadDocFromDb();
   guardTerminalStates(doc, doc); // يفرض الحالات النهائية
   res.json({ db: doc });
*/
