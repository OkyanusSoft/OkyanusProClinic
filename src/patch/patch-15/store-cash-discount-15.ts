/* =====================================================================
   الحزمة الخامسة عشرة — إضافات src/store.tsx  (الخصم النقدي)
   ---------------------------------------------------------------------
   نفّذ المقاطع (أ) ثم (ب) ثم (ج) بالترتيب.
   ===================================================================== */

/* ============================================================
   (أ) أضف حقل cashDiscount إلى واجهة Invoice
       ابحث عن:  export interface Invoice {
       وأضف السطر الموضّح داخلها
   ============================================================ */

/*
export interface Invoice {
  id: string;
  number: string;
  patientId: string;
  date: string;
  items: InvoiceItem[];
  paid: number;
  discount?: number;
  method?: string;
  cashDiscount?: number;   // ★ أضف هذا السطر — خصم نقدي ثابت (بالعملة الأساسية)
}
*/

/* ============================================================
   (ب) عدّل دالة invoiceTotal لتخصم الخصم النقدي
       ابحث عن:  export const invoiceTotal =
       واستبدل جسمها بالكامل بهذا
   ============================================================ */

/*
export const invoiceTotal = (inv: Invoice) => {
  const gross = inv.items.reduce((s, i) => s + i.qty * i.price, 0);
  // 1) الخصم النسبي (إن وُجد)
  const afterPct = gross * (1 - (inv.discount || 0) / 100);
  // 2) الخصم النقدي الثابت (إن وُجد) ← الجديد
  const afterCash = afterPct - (inv.cashDiscount || 0);
  return Math.max(0, Math.round(afterCash));
};
*/

/* ============================================================
   (ج) عدّل حالة END_SESSION في الـ reducer لتقبل cashDiscount
       1) أولاً — أضف cashDiscount إلى اتحاد أفعال END_SESSION:
          ابحث عن:  | { type: "END_SESSION"; id: string; paid: number; fuId?: string }
          واستبدلها بـ:
   ============================================================ */

/*
  | { type: "END_SESSION"; id: string; paid: number; fuId?: string; cashDiscount?: number }
*/

/* ============================================================
       2) ثانياً — داخل حالة case "END_SESSION": في الـ reducer،
          ابحث عن المكان الذي يُنشأ فيه كائن الفاتورة (يحتوي: number, patientId, date, items, paid)
          وأضف cashDiscount إليه، وقيّد الخصم بحيث لا يتجاوز الإجمالي.
          مثال — ابحث عن مقطع يشبه:
   ============================================================ */

/*
        const inv: Invoice = {
          id: uid(),
          number: `INV-${nextInv}`,
          patientId: s.patientId,
          date: today(0),
          items,
          paid: Math.min(Math.max(0, action.paid), total),
        };
*/

/*          واستبدله بهذا (أضف سطري cash): */

/*
        // الخصم النقدي: لا يتجاوز إجمالي البنود، ولا يكون سالبًا
        const cash = Math.min(Math.max(0, action.cashDiscount || 0), total);
        const finalTotal = Math.max(0, total - cash);
        const inv: Invoice = {
          id: uid(),
          number: `INV-${nextInv}`,
          patientId: s.patientId,
          date: today(0),
          items,
          paid: Math.min(Math.max(0, action.paid), finalTotal),
          cashDiscount: cash > 0 ? cash : undefined,   // ★ الجديد
        };
*/

/* ============================================================
   ملاحظة مهمة:
   - إذا كان الـ reducer لديك يستخدم متغير `total` باسم آخر (مثل invoiceGross)،
     عدّل الأسماء لتطابق ما لديك — الفكرة: قسّم cash على إجمالي البنود قبل الخصم،
     واحسب finalTotal = الإجمالي − cash، وقيّد paid بـ finalTotal.
   - أي مكان آخر في END_SESSION يستخدم `total` لتحديد «المتبقي» أو «المدفوع»
     يجب أن يستخدم `finalTotal` بدلًا منه.
   ============================================================ */
