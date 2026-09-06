/**
 * ============================================================
 *  الحزمة الثامنة — دمج الصلاحيات وتقرير حركة النظام في Reports.tsx
 *  طبّق المقاطع (1)..(5) بالترتيب على src/pages/Reports.tsx
 * ============================================================
 */

/* ============================================================
 * (1) الاستيرادات — أضف هذه الأسطر أعلى Reports.tsx
 * ============================================================ */
// import ActivityReport from "./ActivityReport";
//   وأضف useAuth إلى استيرادك الحالي من "../store":
//   import { ..., useAuth } from "../store";
//   وأضف IconShield إلى استيرادك من "../icons":
//   import { ..., IconShield } from "../icons";

/* ============================================================
 * (2) خريطة الصلاحيات + تصفية التبويبات
 *     ابحث عن تعريف TABS في ReportsPage (مثل: const TABS = [...])
 *     وغيّر اسمها إلى ALL_TABS، ثم أضف بعدها هذا المقطع:
 * ============================================================ */
const REPORT_PERM: Record<string, string> = {
  overview: "report:overview",
  patients: "report:patients",
  financial: "report:financial",
  doctors: "report:doctors",
  followups: "report:followups",
  services: "report:services",
  expenses: "report:expenses",
  inventory: "report:inventory",
  activity: "report:activity",
};

/* داخل ReportsPage، بعد:  const { db } = useStore();  أضف: */
//   const { can } = useAuth();
//
// ثم بعد ALL_TABS أضف:
//   const TABS = ALL_TABS.filter((t) => can(REPORT_PERM[t.key] ?? "reports"));
//
// وتأكد أن التبويب المختار الافتراضي يأخذ أول تبويب مسموح:
//   const [tab, setTab] = useState(TABS[0]?.key ?? "overview");

/* ============================================================
 * (3) أضف تبويب «حركة النظام» إلى قائمة ALL_TABS
 *     (أضف هذا السطر كآخر عنصر في مصفوفة التبويبات)
 * ============================================================ */
//   { key: "activity", label: "حركة النظام", icon: (c) => <IconShield className={c} /> },

/* ============================================================
 * (4) عرض التبويب + رسالة «لا صلاحيات»
 *     ابحث عن كتلة عرض التبويبات (حيث تجد {tab === "financial" && ...} وهكذا)
 *     وأضف هذا السطر مع بقية الأسطر:
 * ============================================================ */
//   {tab === "activity" && <ActivityReport />}

/* وإذا أردت رسالة لمن لا يملك أي تقرير، احيط محتوى الصفحة بهذا الشرط:
   (ضعه بعد حساب TABS وقبل عرض التبويبات) */
//   if (TABS.length === 0) {
//     return (
//       <div className="card p-10 text-center">
//         <p className="font-display font-bold text-xl text-ink">لا تملك صلاحية لأي تقرير</p>
//         <p className="text-sm text-soft mt-2">راجع مدير النظام لمنحك صلاحيات التقارير من «المستخدمون والصلاحيات».</p>
//       </div>
//     );
//   }

/* ============================================================
 * (5) توسيع العرض — أضف الصنف report-wide
 *     ابحث عن الجذر الخارجي لمكوّن التقارير (أول <div className="..."> في ReportsPage)
 *     وأضف إليه الصنف report-wide، مثال:
 * ============================================================ */
//   قبل:  return ( <div className="space-y-5"> ...
//   بعد:   return ( <div className="report-wide space-y-5"> ...
//
// كذلك أضف report-table إلى جداول التقارير إن أردت صفوفًا أوسع
// (استبدل className="w-full min-w-[...]" بـ className="w-full report-table min-w-[...]")

export {};
