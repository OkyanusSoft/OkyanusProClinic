/**
 * ============================================================
 *  الحزمة الثامنة — إضافات src/store.tsx
 *  صلاحيات التقارير (粒度) — انقل المقاطع أدناه إلى ملفك
 * ============================================================
 */

/* ============================================================
 * (1أ) ألصق هذه المفاتيح داخل مصفوفة PERMISSIONS
 *      ابحث عن:  export const PERMISSIONS ...  وأضف قبل إغلاق ]
 * ============================================================ */
const REPORT_PERMISSIONS = [
  { key: "report:overview",  label: "تقرير — نظرة عامة",   desc: "الاطلاع على تقرير النظرة العامة" },
  { key: "report:patients",  label: "تقرير — المرضى",      desc: "الاطلاع على تقرير المرضى" },
  { key: "report:financial", label: "تقرير — المالي",      desc: "الاطلاع على تقرير الإيرادات والمصروفات والتحصيل" },
  { key: "report:doctors",   label: "تقرير — الأطباء",     desc: "الاطلاع على تقرير أداء الأطباء" },
  { key: "report:followups", label: "تقرير — العودات",     desc: "الاطلاع على تقرير العودات والمتابعة" },
  { key: "report:services",  label: "تقرير — الخدمات",     desc: "الاطلاع على تقرير الخدمات الأعلى إيراداً" },
  { key: "report:expenses",  label: "تقرير — المصروفات",   desc: "الاطلاع على تقرير المصروفات بالفئات" },
  { key: "report:inventory", label: "تقرير — المخزون",     desc: "الاطلاع على تقرير المخزون والمستهلكات" },
  { key: "report:activity",  label: "تقرير — حركة النظام", desc: "الاطلاع على سجل عمليات النظام (إضافة/تعديل/حذف)" },
];

/* ============================================================
 * (1ب) أضف هذه المفاتيح إلى مصفوفة defaults لكل دور في ROLE_META
 * ============================================================ */

// دور doctor — أضف إلى doctor.defaults:
const DOCTOR_REPORT_DEFAULTS = [
  "report:overview",
  "report:doctors",
  "report:followups",
  "report:activity",
];

// دور secretary — أضف إلى secretary.defaults:
const SECRETARY_REPORT_DEFAULTS = [
  "report:overview",
  "report:patients",
  "report:financial",
  "report:followups",
  "report:services",
  "report:expenses",
  "report:inventory",
  "report:activity",
];

// دور assistant — أضف إلى assistant.defaults:
const ASSISTANT_REPORT_DEFAULTS = [
  "report:overview",
  "report:followups",
  "report:inventory",
];

/* ============================================================
 * (1ج) اختياري — التطبيع التلقائي
 *      ألصق هذا داخل دالة normalizeDB في مقطع users.map(...)
 *      ليحصل كل مستخدم (غير المدير) على افتراضيات دوره من report:*
 *      إن لم تكن لديه بعد — مفيد للمستخدمين المحفوظين قبل التحديث.
 *
 *      مثال (عدّل مقطع users في normalizeDB ليصبح شبيهاً بهذا):
 * ============================================================ */
/*
    users: (Array.isArray(db.users) ? db.users : base.users).map((u) => {
      const roleDefaults =
        u.role === "doctor" ? DOCTOR_REPORT_DEFAULTS :
        u.role === "secretary" ? SECRETARY_REPORT_DEFAULTS :
        u.role === "assistant" ? ASSISTANT_REPORT_DEFAULTS : [];
      const merged = u.role === "admin"
        ? u.permissions
        : Array.from(new Set([...(u.permissions ?? []), ...roleDefaults]));
      return { ...u, permissions: merged };
    }),
*/

/* ============================================================
 * ملاحظة:
 * - صلاحية "reports" (الشاشة نفسها) تبقى كما هي في PERMISSIONS،
 *   وهي التي تتحكم بظهور «مركز التقارير» في القائمة الجانبية.
 * - مفاتيح report:* تتحكم بالتبويبات الداخلية (من يرى المالي، من يرى المخزون...).
 * - المدير admin يرى كل التبويبات تلقائياً لأن can() تعيد true له دائماً.
 * ============================================================ */

export {};
