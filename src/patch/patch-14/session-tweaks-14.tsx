/* =====================================================================
   الحزمة الرابعة عشرة — تعديلات محطة عمل الدكتور
   الملف: src/pages/Session.tsx  (٤ تعديلات — بحث واستبدال)
   ---------------------------------------------------------------------
   كل مقطع أدناه جاهز للنسخ. راجع README-تعديلات-المحطة.md لموضع كل تعديل.
   ===================================================================== */

/* ============================================================
   التعديل ١ — حقل العودة غير مفعّل افتراضيًا
   ============================================================ */

// ابحث عن:
//   const [fuEnabled, setFuEnabled] = useState(true);
// استبدلها بـ:
const [fuEnabled, setFuEnabled] = useState(false);

/* ============================================================
   التعديل ٢ — إجمالي الجلسة المرن (المنطق)
   ============================================================ */

// ابحث عن:
//   const total = session.procedures.reduce((s, pr) => s + pr.price * Math.max(1, pr.teeth.length), 0);
//   const paidNum = Math.min(Math.max(0, Number(paid) || 0), total);
//   const remaining = total - paidNum;
// استبدلها بـ:
const computedTotal = session.procedures.reduce((s, pr) => s + pr.price * Math.max(1, pr.teeth.length), 0);
const [overrideTotal, setOverrideTotal] = useState("");
const hasOverride = overrideTotal.trim() !== "" && Number(overrideTotal) >= 0;
const total = hasOverride ? Number(overrideTotal) : computedTotal;
const paidNum = Math.min(Math.max(0, Number(paid) || 0), total);
const remaining = total - paidNum;
// ⚠️ انقل سطر useState([overrideTotal]) إلى جوار بقية أسطر useState أعلى المكوّن.

/* ============================================================
   التعديل ٣ — واجهة الإجمالي القابل للتعديل (شريط الخروج)
   ============================================================ */

// ابحث عن موضع عرض الإجمالي في شريط الخروج (كلمة «إجمالي الجلسة» أو money(total))
// واستبدل الكتلة العارضة بهذا الحقل القابل للتعديل:
<div>
  <p className="text-[11px] font-bold text-soft flex items-center gap-2">
    إجمالي الجلسة
    {hasOverride && (
      <button
        onClick={() => setOverrideTotal("")}
        className="text-[10px] font-bold text-jade-deep underline underline-offset-2 cursor-pointer"
        title="استعادة الإجمالي المحسوب من الإجراءات"
      >
        استعادة المحسوب
      </button>
    )}
  </p>
  <div className="flex items-baseline gap-1.5">
    <input
      value={hasOverride ? overrideTotal : String(computedTotal)}
      onChange={(e) => setOverrideTotal(e.target.value.replace(/[^\d]/g, ""))}
      inputMode="numeric"
      dir="ltr"
      className="stat-num text-2xl font-bold text-ink bg-transparent border-b-2 border-dashed border-jade/40 w-32 outline-none focus:border-jade text-end"
    />
    <span className="text-xs font-bold text-soft">ر.ي</span>
  </div>
  {hasOverride && Number(overrideTotal) !== computedTotal && (
    <p className="text-[10px] text-soft mt-1">
      المحسوب من الإجراءات: <b className="stat-num">{money(computedTotal)}</b>
      {Number(overrideTotal) < computedTotal && (
        <span className="text-mint font-bold ms-1.5">خصم {money(computedTotal - Number(overrideTotal))}</span>
      )}
    </p>
  )}
</div>

/* ============================================================
   التعديل ٤ — زر الإضافة لا يحذف العمل + علامة مميزة
   ============================================================ */

// ٤أ) في أعلى مكوّن WorkPlanSection، أضف سطري الحالة:
const [addedFlash, setAddedFlash] = useState(0);
const [addedCount, setAddedCount] = useState(0);

// ٤ب) داخل دالة الإضافة إلى الإجراءات:
//     احذف أي سطر يمسح الاختيار/الحقول (مثل setSelection([]))
//     وأضف بدلًا منه:
setAddedFlash(Date.now());
setAddedCount((c) => c + 1);

// ٤ج) في ترويسة بطاقة مخطط العمل، أضف العلامة المميزة:
{addedCount > 0 && (
  <span key={addedFlash} className="chip bg-mint-soft text-[#1d6b47] anim-pop !py-1">
    <IconCheck className="w-3.5 h-3.5" />
    أُضيفت إلى الإجراءات{addedCount > 1 ? ` (${addedCount}×)` : ""}
  </span>
)}
// 💡 تأكد من استيراد IconCheck من "../icons" إن لم يكن موجودًا.
