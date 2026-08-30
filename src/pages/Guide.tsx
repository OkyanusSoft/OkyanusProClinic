import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IconAlert,
  IconBook,
  IconBox,
  IconCalendar,
  IconChat,
  IconCheck,
  IconChevronDown,
  IconCoins,
  IconGrid,
  IconKey,
  IconPulse,
  IconReceipt,
  IconSearch,
  IconSettings,
  IconShield,
  IconSpark,
  IconStetho,
  IconTrendUp,
  IconUsers,
  IconWallet,
  IconX,
} from "../icons";

/* ============================ بيانات الدليل ============================ */

interface GSection {
  id: string;
  title: string;
  intro: string;
  icon: React.ReactNode;
  tint: string;
  steps: string[];
  features: string[];
  tips: string[];
}

const SECTIONS: GSection[] = [
  {
    id: "login",
    title: "تسجيل الدخول",
    intro: "بوابة النظام — كل مستخدم يدخل بحسابه ويرى فقط ما تسمح به صلاحياته.",
    icon: <IconKey className="w-5 h-5" />,
    tint: "bg-pine text-[#7fe0d4]",
    steps: [
      "افتح النظام فتظهر شاشة الدخول ببطاقات الحسابات المتاحة.",
      "اضغط على حسابك للإدخال السريع، أو اكتب اسم المستخدم يدوياً.",
      "أدخل رمز الدخول المكوّن من 4 أرقام ثم اضغط «دخول».",
      "تظهر رسالة «تمت مزامنة البيانات بنجاح» وتدخل إلى لوحتك حسب دورك.",
    ],
    features: [
      "يبدأ النظام بحساب المدير فقط (abdullah/0000) — أنشئ حسابات الأطباء والسكرتارية من شاشة المستخدمين",
      "قفل تلقائي للحسابات الموقوفة من الإدارة",
      "بقاء الجلسة على نفس الجهاز حتى تسجيل الخروج",
      "زر خروج بجوار الاسم في الشريط العلوي",
    ],
    tips: [
      "إن نسيت الرمز، يطلب المدير إعادة تعيينه من شاشة «المستخدمون والصلاحيات».",
    ],
  },
  {
    id: "dashboard",
    title: "لوحة التحكم",
    intro: "لقطة اليوم الكاملة: المواعيد، الإيراد، التنبيهات، ونشاط العيادة في مكان واحد.",
    icon: <IconGrid className="w-5 h-5" />,
    tint: "bg-jade-soft text-jade-deep",
    steps: [
      "اقرأ البطاقات العلوية: مواعيد اليوم، الإيراد المحصّل، المستحقات، المرضى الجدد.",
      "تابع «جدول اليوم» الزمني واضغط على أي مريض لفتح ملفه مباشرة.",
      "راقب تنبيهات التسوس النشط للتواصل مع أصحابها.",
      "اطّلع على آخر نشاطات العيادة في عمود «النشاط الحي».",
    ],
    features: [
      "أرقام تتحرك عند فتح الشاشة وتتحدث لحظياً مع كل عملية",
      "توزيع المواعيد على ساعات اليوم برسم أعمدة",
      "أزرار سريعة: موعد جديد، مريض جديد",
      "الطبيب المقيّد يرى جدوله ومرضىه فقط",
    ],
    tips: [
      "كل عنصر في اللوحة قابل للنقر — جرّب النقر على اسم مريض أو فاتورة.",
    ],
  },
  {
    id: "appointments",
    title: "المواعيد والعودات",
    intro: "إدارة الحجز اليومية، ومتابعة عودات المرضى، ومراجعة ما تم في الجلسات المكتملة.",
    icon: <IconCalendar className="w-5 h-5" />,
    tint: "bg-sky-soft text-sky",
    steps: [
      "اختر اليوم من الشريط الأسبوعي — كل يوم يعرض عدد مواعيده.",
      "احجز بزر «موعد جديد» أو بالضغط على أي خانة ساعة فارغة.",
      "غيّر حالة الموعد من شارته الملوّنة: مؤكد، قيد العلاج، مكتمل، ملغي.",
      "افتح تبويب «العودات والمتابعة»: احجز عودة («حجز موعد») أو سجّل حضورها («وصل») أو أجّلها («+7 أيام»).",
      "افتح تبويب «الجلسات المكتملة» واضغط على أي بطاقة لتوسيعها ورؤية تقرير العمل والإجراءات والفاتورة.",
    ],
    features: [
      "كشف تعارض تلقائي عند حجز وقت محجوز لدى الطبيب نفسه",
      "العودات المتأخرة تظهر بالأحمر مع تنبيهات للسكرتارية",
      "رسالة تذكير جاهزة للنسخ لكل موعد (أيقونة المحادثة)",
      "إتمام موعد العودة يُكمل العودة تلقائياً",
    ],
    tips: [
      "نطاق ساعات الحجز يتبع «ساعات الدوام» من الإعدادات العامة.",
    ],
  },
  {
    id: "session",
    title: "محطة عمل الدكتور",
    intro: "الشاشة السريرية: من دخول المريض للكرسي حتى خروجه — مع فوترة تلقائية وتقرير عمل.",
    icon: <IconPulse className="w-5 h-5" />,
    tint: "bg-coral-soft text-coral",
    steps: [
      "اضغط «دخول المريض» من قائمة الانتظار — يبدأ المؤقت وتتحول حالة موعده لقيد العلاج.",
      "سجّل الشكوى والتشخيص، وأضف الإجراءات (تُضاف للفاتورة لحظياً) وحدّث الأسنان من الخريطة.",
      "اكتب الروشتة أو استخدم الاختصارات الجاهزة، وراجع تحذيرات الأعراض الجانبية والحساسية.",
      "ولّد «تقرير العمل» تلقائياً بضغطة واحدة أو اكتبه يدوياً.",
      "أدخل المدفوع وفعّل بطاقة «عودة للمتابعة» ثم «إنهاء الجلسة»: تصدر الفاتورة والروشتة والعودة معاً.",
    ],
    features: [
      "مؤقت جلسة حي ومراحل خمس (دخول ← فحص ← إجراءات ← روشتة ← خروج)",
      "8 تبويبات: علاج، حسابات، روشتات، حجوزات، زراعة، تركيبات، تقويم، أشعة",
      "تغييرات الأسنان «معلّقة» وتُثبَّت عند الخروج فقط",
      "مريض غير مجدول؟ زر خاص لإدخاله فوراً",
    ],
    tips: [
      "غادرت الصفحة بالخطأ؟ الجلسة محفوظة — عد وستجد المريض ما زال على الكرسي.",
    ],
  },
  {
    id: "patients",
    title: "سجل المرضى",
    intro: "الملف المركزي: بيانات، خريطة أسنان تفاعلية، زيارات، فواتير، روشتات، وعودات.",
    icon: <IconUsers className="w-5 h-5" />,
    tint: "bg-jade-soft text-jade-deep",
    steps: [
      "أضف مريضاً بزر «إضافة مريض» — الاسم والجوال كافيان للبدء.",
      "ابحث بالاسم أو الجوال، أو صفِّ: عليه مستحقات / جدد / لديه تسوس.",
      "اضغط على أي صف لفتح «درج الملف» الكامل.",
      "حدّث الأسنان من المخطط: اختر السّن ثم حالته (تسوس، حشوة، عصب…).",
      "من الدرج: احجز موعداً، جدول عودة، أو أنشئ روشتة بضغطة.",
    ],
    features: [
      "مخطط أسنان رباعي بأسنان تشريحية وأرقام FDI واضحة",
      "مؤشر صحة الفم نسبةً مئوية مع عدّاد لكل حالة",
      "تنبيه أحمر دائم لمرضى الحساسية الدوائية",
      "سجل أعمال زمني يدمج الجلسات بتقاريرها مع الزيارات",
    ],
    tips: [
      "الحساسية المسجلة تظهر تلقائياً في الروشتة المطبوعة ومحطة العمل.",
    ],
  },
  {
    id: "invoices",
    title: "الفواتير",
    intro: "إصدار وتحصيل وطباعة — مع خصومات وطرق دفع وتصدير للمحاسب.",
    icon: <IconReceipt className="w-5 h-5" />,
    tint: "bg-mint-soft text-[#1d6b47]",
    steps: [
      "«فاتورة جديدة»: اختر المريض، أضف البنود من قائمة الأسعار، وحدّد خصماً وطريقة دفع ودفعة مقدمة.",
      "راقب الحالة التلقائية: مدفوعة / جزئية / غير مدفوعة.",
      "اضغط «تحصيل» على أي فاتورة لتسجيل دفعة إضافية.",
      "اطبع بضغطة — تخرج بترويسة العيادة من الإعدادات.",
      "صدّر CSV لمحاسبك من زر التصدير أعلى الجدول.",
    ],
    features: [
      "ترقيم تلقائي ببادئة قابلة للتخصيص (INV-1043…)",
      "الخصم نسبة مئوية يُحسم قبل احتساب المتبقي",
      "ديون المريض تتجمع تلقائياً في ملفه",
      "عرض المبالغ يتبع العملة الافتراضية المختارة",
    ],
    tips: [
      "فاتورة جلسة العلاج تُنشأ تلقائياً عند إنهاء الجلسة — لا حاجة لإدخالها يدوياً.",
    ],
  },
  {
    id: "inventory",
    title: "المخزون والمستهلكات",
    intro: "تتبع المواد الطبية وغير الطبية مع تنبيهات نفاد وصلاحيات.",
    icon: <IconBox className="w-5 h-5" />,
    tint: "bg-amber-soft text-[#a06410]",
    steps: [
      "أضف صنفاً باسمه وفئته ووحدته، وحدّد «الحد الأدنى» الذي يطلق التنبيه.",
      "استخدم «توريد +» و«صرف −» لتسجيل الحركات — كل حركة تُسجَّل بتاريخها وسببها.",
      "راقب عداد «مخزون منخفض» — يظهر أيضاً كشارة حمراء في القائمة الجانبية.",
      "راجع سجل الحركات أسفل الشاشة لكل صنف.",
    ],
    features: [
      "مقياس مستوى ملوّن لكل صنف (أخضر/كهرماني/أحمر)",
      "تتبع تواريخ الصلاحية مع تنبيه الاقتراب",
      "تصفية بالفئات وبحث فوري",
    ],
    tips: [
      "اضبط الحد الأدنى واقعياً (مثل 5 علب قفازات) لتصلك التنبيهات قبل النفاد الفعلي.",
    ],
  },
  {
    id: "services",
    title: "قائمة الأسعار",
    intro: "خدمات العيادة وأسعارها — ما يظهر في الحجز والفواتير يبدأ من هنا.",
    icon: <IconSpark className="w-5 h-5" />,
    tint: "bg-jade-soft text-jade-deep",
    steps: [
      "عدّل أي سعر inline بالضغط عليه ثم Enter للحفظ.",
      "أضف خدمة جديدة باسمها وفئتها ومدتها وسعرها ولونها المميز.",
      "أوقف خدمة مؤقتاً بمفتاح «متاحة» فتختفي من قوائم الحجز.",
      "صفِّ بالفئات: تشخيص، وقاية، علاج، تجميل، جراحة، تعويضات، تقويم.",
    ],
    features: [
      "اللون المميز يظهر في بطاقات المواعيد وتقارير الجلسات",
      "المدة المتوقعة تُعرض عند الحجز",
      "حذف بخطوتين حمايةً من الخطأ",
    ],
    tips: ["الخدمات الموقوفة تبقى في الفواتير القديمة — الإيقاف يؤثر على الحجوزات الجديدة فقط."],
  },
  {
    id: "expenses",
    title: "المصروفات",
    intro: "كل ما تدفعه العيادة: رواتب، إيجار، مستلزمات… مصنّف وشهري.",
    icon: <IconWallet className="w-5 h-5" />,
    tint: "bg-coral-soft text-coral",
    steps: [
      "سجّل مصروفاً بعنوانه وفئته ومبلغه وتاريخه.",
      "صفِّ بالفئة لمراجعة بند معين عبر الأشهر.",
      "راجع بطاقات الأعلى: إجمالي الشهر ومتوسط الصرف اليومي.",
      "حذف أي بند يتم بخطوتين للتأكيد.",
    ],
    features: [
      "رسم توزيع الفئات الشهري بأشرطة ملونة",
      "المصروفات تدخل مباشرة في تقرير «الإيرادات مقابل المصروفات»",
      "فئات جاهزة + فئة «أخرى»",
    ],
    tips: ["سجّل الرواتب والإيجار شهرياً بانتظام ليصبح صافي الشهر دقيقاً."],
  },
  {
    id: "reports",
    title: "مركز التقارير",
    intro: "ستة تقارير احترافية جاهزة للطباعة والتصدير.",
    icon: <IconTrendUp className="w-5 h-5" />,
    tint: "bg-sky-soft text-sky",
    steps: [
      "اختر التقرير من البطاقات العلوية: عام، إيرادات/مصروفات، أطباء، خدمات، تحصيل، عودات.",
      "عدّل الفترة الزمنية إن كانت متاحة (شهري/ربع سنوي).",
      "اطبع بضغطة — ترويسة العيادة وتوقيع الطبيب جاهزان على الورقة.",
      "صدّر CSV للبيانات الخام.",
    ],
    features: [
      "تقرير أطباء: مكتمل/قادم/ملغى/لم يحضر مع نسب الإنجاز",
      "تقرير عودات: معلقة/متأخرة/نسبة الالتزام",
      "رسوم أعمدة وخطوط متحركة",
      "كل تقرير يعكس نطاق صلاحياتك",
    ],
    tips: ["راجع تقرير «التحصيل» أسبوعياً — يكشف الفواتير الجزئية المنسية."],
  },
  {
    id: "team",
    title: "الفريق الطبي",
    intro: "الأطباء والموظفون المساندون — وربطهم بحسابات الدخول.",
    icon: <IconStetho className="w-5 h-5" />,
    tint: "bg-jade-soft text-jade-deep",
    steps: [
      "أضف طبيباً باسمه وتخصصه ولونه المميز في الجداول.",
      "أضف موظفاً مسانداً (سكرتارية، تمريض، فني…) بدوره.",
      "فعّل/أوقف أي عضو بمفتاح واحد.",
      "اربط حساب الدخول بالطبيب من شاشة المستخدمين ليُقيَّد بمرضاه.",
    ],
    features: [
      "بطاقات بألوان مميزة تنعكس في المواعيد والتقارير",
      "عدّاد مواعيد لكل طبيب",
      "حذف بخطوتين مع حماية من حذف طبيب له سجل",
    ],
    tips: ["الربط بين الحساب والطبيب هو ما يصنع نطاق «مرضاه فقط»."],
  },
  {
    id: "currencies",
    title: "العملات",
    intro: "نظام متعدد العملات — الأساس ريال يمني، والعرض بأي عملة تختار.",
    icon: <IconCoins className="w-5 h-5" />,
    tint: "bg-mint-soft text-[#1d6b47]",
    steps: [
      "أضف عملة برمزها الدولي (3 أحرف) وسعر صرفها مقابل الريال.",
      "اضغط «تعيين» لجعلها العملة الافتراضية — تتحول كل المبالغ فوراً.",
      "عدّل سعر الصرف دورياً بالضغط عليه في الجدول.",
    ],
    features: [
      "معاينة حية: 10,000 ر.ي = كم بالعملة الجديدة",
      "السجلات تُحفظ دائماً بالريال اليمني — التحويل للعرض فقط",
      "العملة الأساسية محمية من الحذف",
    ],
    tips: ["حدّث أسعار الصرف شهرياً لتبقى التقارير واقعية."],
  },
  {
    id: "users",
    title: "المستخدمون والصلاحيات",
    intro: "من يدخل النظام، وماذا يرى — مصفوفة تحكم كاملة.",
    icon: <IconShield className="w-5 h-5" />,
    tint: "bg-pine text-[#7fe0d4]",
    steps: [
      "أنشئ حساباً: اسم، اسم دخول، رمز 4 أرقام، دور (مدير/طبيب/سكرتارية/مساعد).",
      "اربط الطبيب بملفه ليُقيَّد بمرضاه ومواعيده.",
      "من «مصفوفة الصلاحيات»: فعّل/عطّل أي شاشة لأي مستخدم مباشرة.",
      "الأعمدة الكهرمانية = نطاق الرؤية: «كل المرضى» و«كل المواعيد».",
      "راجع لوحة «نطاق الرؤية الفعّال» أسفل النافذة قبل الحفظ.",
    ],
    features: [
      "السكرتارية والمساعدون يرون السجل كاملاً تلقائياً",
      "إيقاف حساب يمنع الدخول فوراً",
      "آخر دخول مسجّل لكل حساب",
      "صلاحية هذه الشاشة للمدير فقط",
    ],
    tips: ["وسّع نطاق طبيب مؤقتاً (كل المواعيد) عند تغطية زميله في الإجازة."],
  },
  {
    id: "settings",
    title: "الإعدادات العامة",
    intro: "هوية العيادة، الدوام، الفوترة، والبيانات — تسري على النظام كله.",
    icon: <IconSettings className="w-5 h-5" />,
    tint: "bg-mist text-soft",
    steps: [
      "هوية العيادة: عدّل الاسم والعنوان والهاتف — تنعكس على الطباعة والقوائم فوراً.",
      "العمل والمواعيد: اضبط بداية الدوام ونهايته (يغيّر شبكة الحجز) ونافذة تنبيه العودات.",
      "الفواتير: عنوان الفاتورة المطبوعة، البادئة، والتذييل.",
      "البيانات: صدّر نسخة احتياطية، استورد، أو أعد التعيين من «منطقة الخطر».",
    ],
    features: [
      "معاينة حية لترويسة الوثائق ورأس الفاتورة قبل الحفظ",
      "شارة «تغييرات غير محفوظة» عند أي تعديل",
      "زر استعادة الافتراضيات دون مسح البيانات",
    ],
    tips: ["هذه الشاشة للمدير فقط — بقية الأدوار لا تراها في القائمة أصلاً."],
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "نسيت رمز الدخول، ماذا أفعل؟",
    a: "يدخل المدير (abdullah) من شاشة «المستخدمون والصلاحيات»، يفتح حسابك بزر القلم، ويعيّن رمزاً جديداً من 4 أرقام.",
  },
  {
    q: "هل يستطيع الطبيب رؤية مرضى طبيب آخر؟",
    a: "افتراضياً لا — يرى مرضى مواعيده وجلساته فقط. يمكن للمدير منحه صلاحية «كل المرضى» (العمود الكهرماني في المصفوفة) وحينها يرى السجل كاملاً.",
  },
  {
    q: "أين تُحفظ بيانات العيادة؟",
    a: "على قاعدة MySQL مركزية إذا كان خادم التشغيل يعمل (المؤشر أخضر «MySQL متصل» أعلى الشاشة)، وإلا محلياً على الجهاز مع عودة المزامنة تلقائياً عند توفر الخادم.",
  },
  {
    q: "كيف أطبع فاتورة أو روشتة؟",
    a: "الفواتير: زر الطابعة في الصف ثم «طباعة الآن». الروشتة: من ملف المريض أو محطة العمل — تخرج الورقة بترويسة العيادة وخانتي التوقيع والختم.",
  },
  {
    q: "أخطأت وأنهيت جلسة بالخطأ — هل أتراجع؟",
    a: "الجلسة المكتملة تبقى في «الجلسات المكتملة» بسجلها الكامل. عدّل أثرها عملياً: حصّل/أضف فاتورة تصحيحية، أو أنشئ عودة متابعة، وحدّث الأسنان من ملف المريض.",
  },
  {
    q: "كيف أنقل البيانات لجهاز آخر؟",
    a: "من الإعدادات ← البيانات: «تصدير نسخة احتياطية» ينتج ملف JSON كاملاً، افتحه على الجهاز الآخر بـ«استيراد نسخة».",
  },
];

/* ============================ أدوات ============================ */

function Hi({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-amber-soft text-ink rounded px-0.5 py-0">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

const matches = (s: GSection, q: string) => {
  const t = q.toLowerCase();
  return (
    s.title.toLowerCase().includes(t) ||
    s.intro.toLowerCase().includes(t) ||
    s.steps.some((x) => x.toLowerCase().includes(t)) ||
    s.features.some((x) => x.toLowerCase().includes(t))
  );
};

/* ============================ الصفحة ============================ */

export default function GuidePage({ focus }: { focus: string | null }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const q = query.trim();
  const list = useMemo(() => (q ? SECTIONS.filter((s) => matches(s, q)) : SECTIONS), [q]);

  /* تتبّع القراءة + القسم النشط */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            const id = (en.target as HTMLElement).dataset.gid!;
            setRead((r) => (r.has(id) ? r : new Set(r).add(id)));
            if (en.intersectionRatio > 0.25) setActive(id);
          }
        });
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.3] }
    );
    document.querySelectorAll("[data-gid]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [list]);

  /* فتح قسم محدد من زر المساعدة السياقية */
  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById("gs-" + focus);
    if (el) {
      setActive(focus);
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }
  }, [focus]);

  /* اختصار "/" للبحث */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setQuery("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const jump = (id: string) => {
    setActive(id);
    document.getElementById("gs-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const progress = Math.round((read.size / SECTIONS.length) * 100);

  return (
    <div className="space-y-6">
      {/* ====== الترويسة ====== */}
      <div className="anim-rise relative overflow-hidden rounded-2xl bg-pine sidebar-texture text-white p-6 sm:p-8">
        <span className="absolute -start-6 -bottom-10 opacity-[0.07]"><IconBook className="w-52 h-52" /></span>
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-bold text-[#7fe0d4] tracking-[0.25em] mb-2">مركز المساعدة</p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl leading-tight">دليل استخدام النظام</h1>
            <p className="text-sm text-white/65 mt-2 max-w-xl leading-relaxed">
              شرح مبسّط لكل شاشة خطوة بخطوة — {SECTIONS.length} قسماً مع أسرار الاستخدام، وابحث عن أي شيء بلمح البصر.
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-3">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 start-3.5 flex items-center text-white/50 pointer-events-none"><IconSearch className="w-4.5 h-4.5" /></span>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في الدليل… (مثال: روشتة)"
                className="w-full h-11 rounded-xl bg-white/10 border border-white/15 text-sm text-white placeholder:text-white/40 ps-10 pe-16 outline-none focus:bg-white/15 focus:border-[#3fd0c0]/60 transition-all"
              />
              {q ? (
                <button onClick={() => setQuery("")} className="absolute inset-y-0 end-3 flex items-center text-white/60 hover:text-white cursor-pointer" aria-label="مسح البحث">
                  <IconX className="w-4 h-4" />
                </button>
              ) : (
                <kbd className="absolute inset-y-0 end-3 flex items-center text-[10px] font-bold text-white/40 border border-white/20 rounded px-1.5 h-6 my-auto">/</kbd>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-80">
              <div className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full rounded-full bg-[#3fd0c0] transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[11px] font-bold text-white/60 whitespace-nowrap stat-num">{read.size}/{SECTIONS.length} قرأت</span>
            </div>
          </div>
        </div>
      </div>

      {q && (
        <p className="text-xs font-bold text-soft anim-fade -mt-2">
          {list.length > 0 ? `${list.length} قسم يطابق «${q}»` : `لا نتائج لـ «${q}» — جرّب كلمة أخرى`}
        </p>
      )}

      {/* ====== الجسم: فهرس + محتوى ====== */}
      <div className="grid lg:grid-cols-[270px_1fr] gap-6 items-start">
        {/* الفهرس */}
        <nav ref={navRef} className="lg:sticky lg:top-20 card p-2.5 max-h-[calc(100vh-6rem)] overflow-y-auto anim-rise" style={{ animationDelay: "80ms" }}>
          <p className="px-2.5 pt-1.5 pb-2 text-[10px] font-bold text-soft tracking-widest">أقسام الدليل</p>
          <div className="space-y-1">
            {list.map((s) => {
              const isActive = active === s.id;
              const isRead = read.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => jump(s.id)}
                  className={`relative w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-start cursor-pointer transition-all ${
                    isActive ? "bg-jade-soft text-jade-deep" : "text-soft hover:bg-mist hover:text-ink"
                  }`}
                >
                  {isActive && <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-jade" />}
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${s.tint}`}>{s.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-bold truncate">{s.title}</span>
                  </span>
                  {isRead && <IconCheck className="w-3.5 h-3.5 text-mint shrink-0" />}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setActive("faq");
              document.getElementById("gs-faq")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className={`mt-2 w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-start cursor-pointer transition-all border-t border-line pt-3.5 ${
              active === "faq" ? "bg-jade-soft text-jade-deep" : "text-soft hover:bg-mist hover:text-ink"
            }`}
          >
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-soft text-[#a06410] shrink-0"><IconChat className="w-4 h-4" /></span>
            <span className="text-[13px] font-bold">أسئلة شائعة</span>
            <span className="ms-auto chip bg-mist text-soft stat-num !text-[9px]">{FAQS.length}</span>
          </button>
        </nav>

        {/* المحتوى */}
        <div className="space-y-5 min-w-0">
          {list.map((s, idx) => (
            <article
              key={s.id}
              id={"gs-" + s.id}
              data-gid={s.id}
              className="card overflow-hidden scroll-mt-24 anim-rise"
              style={{ animationDelay: `${120 + idx * 50}ms` }}
            >
              {/* رأس القسم */}
              <div className="relative px-6 pt-6 pb-5 bg-gradient-to-l from-white to-mist/60 border-b border-line">
                <span className="absolute top-4 end-5 font-display font-bold text-[64px] leading-none text-ink/[0.05] select-none stat-num">{String(idx + 1).padStart(2, "0")}</span>
                <div className="relative flex items-start gap-4">
                  <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${s.tint} shadow-sm`}>{s.icon}</span>
                  <div className="min-w-0">
                    <h2 className="font-display font-bold text-2xl text-ink leading-tight"><Hi text={s.title} q={q} /></h2>
                    <p className="text-sm text-soft mt-1.5 leading-relaxed max-w-2xl"><Hi text={s.intro} q={q} /></p>
                  </div>
                  {read.has(s.id) && (
                    <span className="chip bg-mint-soft text-[#1d6b47] ms-auto shrink-0"><IconCheck className="w-3 h-3" /> قرأته</span>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-[1.15fr_1fr] gap-6 p-6">
                {/* الخطوات */}
                <div>
                  <p className="label !mb-3 tracking-widest">كيف تعمل الشاشة — خطوة بخطوة</p>
                  <ol className="relative space-y-3.5">
                    <span className="absolute top-2 bottom-2 start-[13px] w-0.5 bg-line rounded-full" />
                    {s.steps.map((st, i) => (
                      <li key={i} className="relative flex gap-3.5 anim-fade" style={{ animationDelay: `${i * 70}ms` }}>
                        <span className="relative z-10 inline-flex items-center justify-center w-7 h-7 rounded-full bg-pine text-white text-[11px] font-bold shrink-0 stat-num shadow-sm">{i + 1}</span>
                        <p className="text-[13.5px] text-ink leading-relaxed pt-0.5"><Hi text={st} q={q} /></p>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* المميزات + الأسرار */}
                <div className="space-y-5">
                  <div className="rounded-xl bg-mist/70 border border-line p-4">
                    <p className="label !mb-2.5">أبرز المميزات</p>
                    <ul className="space-y-2">
                      {s.features.map((f, i) => (
                        <li key={i} className="flex gap-2.5 text-[12.5px] text-ink/90 leading-relaxed">
                          <IconCheck className="w-3.5 h-3.5 text-jade shrink-0 mt-1" />
                          <span><Hi text={f} q={q} /></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {s.tips.map((t, i) => (
                    <div key={i} className="rounded-xl bg-amber-soft/70 border border-amber/25 p-4 flex gap-3">
                      <IconSpark className="w-4.5 h-4.5 text-[#a06410] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold text-[#a06410] mb-1">سرّ الاستخدام</p>
                        <p className="text-[12.5px] text-ink/85 leading-relaxed"><Hi text={t} q={q} /></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}

          {list.length === 0 && (
            <div className="card p-10 text-center anim-pop">
              <IconSearch className="w-8 h-8 text-soft mx-auto" />
              <p className="font-display font-bold text-lg text-ink mt-3">لم نجد ما تبحث عنه</p>
              <p className="text-sm text-soft mt-1.5">جرّب كلمات مثل: حجز، فاتورة، روشتة، صلاحيات، نسخة احتياطية.</p>
              <button className="btn-soft mt-4" onClick={() => setQuery("")}>عرض كل الأقسام</button>
            </div>
          )}

          {/* ====== الأسئلة الشائعة ====== */}
          <section id="gs-faq" data-gid="faq" className="card overflow-hidden scroll-mt-24 anim-rise" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-3.5 px-6 py-5 border-b border-line bg-gradient-to-l from-white to-amber-soft/30">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-amber-soft text-[#a06410]"><IconChat className="w-5.5 h-5.5" /></span>
              <div>
                <h2 className="font-display font-bold text-2xl text-ink">أسئلة شائعة</h2>
                <p className="text-xs text-soft mt-1">إجابات مباشرة لأكثر ما يُسأل عنه فريق العيادة.</p>
              </div>
            </div>
            <div className="divide-y divide-line/60">
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={i}>
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="w-full flex items-center gap-3 px-6 py-4 text-start cursor-pointer hover:bg-jade-soft/25 transition-colors"
                    >
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-all ${open ? "bg-jade text-white rotate-180" : "bg-mist text-soft"}`}>
                        <IconChevronDown className="w-4 h-4" />
                      </span>
                      <span className={`flex-1 text-sm font-bold ${open ? "text-jade-deep" : "text-ink"}`}>{f.q}</span>
                    </button>
                    <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <div className="overflow-hidden">
                        <p className="px-6 pb-4 ps-16 text-[13px] text-soft leading-relaxed">{f.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ذيل الدليل */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-1 pb-4">
            <p className="text-[11px] font-semibold text-soft flex items-center gap-2">
              <IconAlert className="w-4 h-4 text-[#a06410]" />
              تحتاج مساعدة إضافية؟ راسل مسؤول النظام من حساب المدير.
            </p>
            <span className="chip bg-white border border-line text-soft">الدليل · الإصدار 2.6 · محدّث {new Intl.DateTimeFormat("ar-EG-u-nu-latn", { month: "long", year: "numeric" }).format(new Date())}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
