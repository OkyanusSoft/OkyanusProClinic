import React, { useMemo, useRef, useState } from "react";
import {
  clinicOf,
  DEFAULT_CLINIC_SETTINGS,
  fmtDate,
  getDeviceLabel,
  setDeviceLabel,
  today,
  useStore,
  type ClinicSettings,
} from "../store";
import { IconAlert, IconBook, IconBox, IconCalendar, IconCheck, IconCoins, IconPulse, IconReceipt, IconShield, IconSpark, IconTrash, IconWallet, Logo } from "../icons";
import { Field, Modal, TArea, TInput, TSelect, useToast } from "../components/ui";
import { IconSettings } from "../icons";
import { checkDb, ping, saveState, type DbCheckStage } from "../api";

type SetTab = "identity" | "work" | "invoice" | "data";

const TABS: { key: SetTab; label: string; desc: string; icon: (c: string) => React.ReactNode }[] = [
  { key: "identity", label: "هوية العيادة", desc: "الاسم والعنوان وبيانات التواصل المطبوعة على الوثائق", icon: (c) => <Logo className={c} /> },
  { key: "work", label: "العمل والمواعيد", desc: "ساعات الدوام وتنبيهات العودات", icon: (c) => <IconCalendar className={c} /> },
  { key: "invoice", label: "الفواتير والمالية", desc: "عنوان الفاتورة وبادئة الترقيم والعملة", icon: (c) => <IconReceipt className={c} /> },
  { key: "data", label: "البيانات والنسخ", desc: "تصدير واستيراد وإعادة التعيين", icon: (c) => <IconShield className={c} /> },
];

/* سجل التغييرات — تاريخ تطور النظام */
const CHANGELOG: { v: string; date: string; current?: boolean; items: { tag: "جديد" | "تحسين" | "إصلاح"; text: string }[] }[] = [
  {
    v: "4.0",
    date: "فبراير 2026",
    current: true,
    items: [
      { tag: "جديد", text: "مزامنة الدمج المركزي متعددة الأجهزة: إدخال السكرتارية يظهر للدكتور لحظياً، ولا يحذف جهازٌ بياناتَ آخر" },
      { tag: "جديد", text: "شاشة مراقبة النشاط للمدير: بث حي لكل عمليات الموظفين مع الفلاتر ورسم التوزيع وقائمة أجهزة الشبكة" },
      { tag: "جديد", text: "وضع عدم الاتصال الكامل: خط القاهرة مضمّن محلياً وكل الأصول داخل الحزمة — يعمل النظام بلا إنترنت" },
      { tag: "جديد", text: "توسيع محطة العمل: حالات السن الثماني (سليم/قلع/حشوة/عصب/تركيب/تقويم/تاج/مفقود) مع رسم قنوات العصب وجدول مراحل الجلسات" },
      { tag: "جديد", text: "خريطة أسنان تلقائية حسب العمر: أطفال بترميز A–E اللبنية وبالغون بترقيم FDI الدائمة" },
      { tag: "جديد", text: "حقول إضافة فورية بقائمة اقتراحات: المدن، التخصصات الطبية، المسميات الوظيفية (SmartCombo)" },
      { tag: "جديد", text: "شاشات الفئات المستقلة: فئات الخدمات، فئات الأصناف، فئات المصروفات مع إعادة التسمية وإعادة التوزيع التلقائي" },
      { tag: "جديد", text: "فصل بيانات الأصناف وقائمة الأسعار عن الخدمات — مع تقرير المخزون الجديد في مركز التقارير" },
      { tag: "جديد", text: "طباعة الجلسات المكتملة وتقرير المخزون على مقاس A4 بترويسة العيادة" },
      { tag: "جديد", text: "اختبار اتصال قاعدة البيانات بتشخيص متعدد المراحل يعرض رسالة خطأ MySQL الحقيقية" },
      { tag: "تحسين", text: "القائمة الجانبية المجمعة بأقسام ملوّنة وخط توهج فاصل بين الشريط الجانبي وسطح العمل" },
      { tag: "تحسين", text: "شاشة إضافة الموظف أوسع ببطاقة معاينة حية وحقل الحالة والملاحظات" },
      { tag: "إصلاح", text: "رفض MySQL لتواريخ ISO: محوّل ذكي يطابق نوع عمود updated_at (DATETIME أو BIGINT) تلقائياً" },
      { tag: "إصلاح", text: "زر حفظ المريض والحقول الذكية تظهر أيقونتها دائماً وتُحفظ الإضافة في قاعدة البيانات فوراً" },
      { tag: "تحسين", text: "ترقية رقم الإصدار إلى 4.0" },
    ],
  },
  {
    v: "3.0",
    date: "فبراير 2026",
    items: [
      { tag: "جديد", text: "أنماط خلفيات القوائم: ٦ نقوش (خطوط متوازية، نظيف، نقاط، شبكة، موجات، أقطار) للقائمة الجانبية وشاشة الدخول" },
      { tag: "جديد", text: "سجل التغييرات (Change Log) بخط زمني تفاعلي في الإعدادات العامة" },
      { tag: "جديد", text: "تذييل حقوق شركة أوكيانوس سوفت مع رابط الموقع ورقم التواصل" },
      { tag: "جديد", text: "زر «مزامنة الآن» لدفع البيانات فوراً إلى MySQL والتحقق من نجاح الحفظ" },
      { tag: "إصلاح", text: "المزامنة من MySQL أصبحت موثوقة: مقارنة زمنية تختار أحدث البيانات بين القاعدة والتخزين المحلي، فلا تضيع الإدخالات عند التحديث" },
      { tag: "تحسين", text: "ترقية رقم الإصدار إلى 3.0" },
    ],
  },
  {
    v: "2.6",
    date: "فبراير 2026",
    items: [
      { tag: "جديد", text: "شاشة تفضيلات المستخدم: مظهر داكن/فاتح/تلقائي، ٦ ألوان مميزة، حجم الخط، الترقيم العربي، مدة الإشعارات" },
      { tag: "جديد", text: "إعدادات قاعدة البيانات MySQL: الاتصال المركزي، اختبار الاتصال، حالة التشغيل، خطوات التفعيل" },
      { tag: "جديد", text: "شاشة فئات المصروفات مع الألوان وإعادة التوزيع التلقائي" },
      { tag: "جديد", text: "عرض الجلسات المكتملة السابقة للقراءة فقط من محطة العمل" },
      { tag: "تحسين", text: "تعديل حالة المتابعات المرتبطة بمراحل الجلسات من داخل الجدول" },
    ],
  },
  {
    v: "2.5",
    date: "فبراير 2026",
    items: [
      { tag: "جديد", text: "محطة عمل الدكتور الكاملة: ٨ تبويبات، مخطط العمل السريري، جدول مراحل الجلسات متعدد الزيارات" },
      { tag: "جديد", text: "خريطة أسنان ذكية: بالغون بترقيم FDI (٣٢ سنًا) وأطفال بترميز A–E (٢٠ سنًا) مع اختيار متعدد" },
      { tag: "جديد", text: "نظام العودات والمتابعة المرتبط تلقائيًا بمراحل الجلسات" },
      { tag: "جديد", text: "مؤشر صحة الفم، رسم قنوات العصب، رصد الأعراض الجانبية للأدوية" },
    ],
  },
  {
    v: "2.4",
    date: "فبراير 2026",
    items: [
      { tag: "جديد", text: "منظومة البطاقات المطبوعة على A4: كرت المريض، كرت الموعد، كرت الرجوع" },
      { tag: "جديد", text: "تقرير المرضى الشامل في مركز التقارير مع التصدير والطباعة" },
      { tag: "جديد", text: "قائمة جانبية مجمعة: الإجراءات الطبية، المالية، المخازن، التقارير، إعدادات النظام" },
      { tag: "جديد", text: "شاشات فئات الخدمات، فئات الأصناف، بيانات الأصناف، قائمة الأسعار" },
    ],
  },
  {
    v: "2.0",
    date: "فبراير 2026",
    items: [
      { tag: "جديد", text: "قاعدة بيانات MySQL مركزية مع مزامنة حية وتخزين محلي احتياطي تلقائي" },
      { tag: "جديد", text: "دليل المستخدم التفاعلي مع البحث الفوري والأسئلة الشائعة" },
      { tag: "جديد", text: "تقرير العمل السريري المولّد تلقائيًا من بيانات الجلسة" },
      { tag: "جديد", text: "منظومة الطباعة الموحدة على مقاس A4" },
    ],
  },
  {
    v: "1.0",
    date: "فبراير 2026",
    items: [
      { tag: "جديد", text: "الإطلاق الأول: المرضى، المواعيد، الفواتير، الخدمات، الفريق الطبي، العملات" },
      { tag: "جديد", text: "خريطة الأسنان التفاعلية، الروشتات الإلكترونية، المصروفات، التقارير" },
      { tag: "جديد", text: "نظام صلاحيات متعدد الأدوار: مدير، طبيب، سكرتارية، مساعد" },
    ],
  },
];

const TAG_CLS: Record<string, string> = {
  "جديد": "bg-jade-soft text-jade-deep",
  "تحسين": "bg-sky-soft text-sky",
  "إصلاح": "bg-amber-soft text-[#a06410]",
};

function DeviceLabelField() {
  const { push } = useToast();
  const [label, setLabel] = useState(getDeviceLabel());
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="مثال: جهاز الاستقبال"
        className="input !w-64"
      />
      <button
        className="btn-primary"
        onClick={() => {
          setDeviceLabel(label);
          push("success", "حُفظ اسم الجهاز", `سيظهر هذا الجهاز باسم «${label.trim() || "جهاز غير مسمّى"}» في مراقبة النشاط.`);
        }}
      >
        <IconCheck className="w-4.5 h-4.5" />
        حفظ الاسم
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { db, dispatch, conn, syncing } = useStore();
  const { push } = useToast();
  const clinic = clinicOf(db);
  const [tab, setTab] = useState<SetTab>("identity");

  /* نموذج الهوية */
  const [idForm, setIdForm] = useState<ClinicSettings>(clinic);
  const idDirty = JSON.stringify({ ...idForm, invoiceTitle: "", invoicePrefix: "", invoiceFooter: "", workStart: "", workEnd: "", followUpAlertDays: 0 }) !==
    JSON.stringify({ ...clinic, invoiceTitle: "", invoicePrefix: "", invoiceFooter: "", workStart: "", workEnd: "", followUpAlertDays: 0 });

  /* نموذج العمل */
  const [workForm, setWorkForm] = useState({ workStart: clinic.workStart, workEnd: clinic.workEnd, followUpAlertDays: clinic.followUpAlertDays });
  const workDirty = workForm.workStart !== clinic.workStart || workForm.workEnd !== clinic.workEnd || workForm.followUpAlertDays !== clinic.followUpAlertDays;

  /* نموذج الفواتير */
  const [invForm, setInvForm] = useState({ invoiceTitle: clinic.invoiceTitle, invoicePrefix: clinic.invoicePrefix, invoiceFooter: clinic.invoiceFooter });
  const invDirty = invForm.invoiceTitle !== clinic.invoiceTitle || invForm.invoicePrefix !== clinic.invoicePrefix || invForm.invoiceFooter !== clinic.invoiceFooter;

  const [confirmReset, setConfirmReset] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ====== قاعدة البيانات (MySQL) ====== */
  const [mysql, setMysql] = useState(() => {
    try {
      const raw = localStorage.getItem("dental-mysql-config");
      if (raw) return JSON.parse(raw);
    } catch { /* تجاهل */ }
    return {
      apiUrl: "http://localhost:4000",
      host: "localhost",
      port: "3306",
      user: "root",
      password: "",
      database: "sharafi_dental",
    };
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "ok" | "fail">("idle");
  const [serverOnline, setServerOnline] = useState<"checking" | "online" | "offline">("checking");
  const [dbStage, setDbStage] = useState<DbCheckStage | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbRecords, setDbRecords] = useState<number | null>(null);

  // فحص حالة الخادم وقاعدة البيانات عند فتح التبويب
  React.useEffect(() => {
    if (tab !== "data") return;
    setServerOnline("checking");
    setDbStage(null);
    (async () => {
      const alive = await ping();
      if (!alive) {
        setServerOnline("offline");
        setDbStage(null);
        setDbError(null);
        return;
      }
      setServerOnline("online");
      const chk = await checkDb();
      setDbStage(chk.stage);
      setDbError(chk.stage === "ok" ? null : chk.error ?? null);
      setDbRecords(chk.stage === "ok" ? chk.records ?? 0 : null);
    })();
  }, [tab]);

  const testConnection = async () => {
    setTesting(true);
    setTestResult("idle");
    setDbError(null);
    setDbStage(null);
    try {
      localStorage.setItem("dental-api-url", mysql.apiUrl.replace(/\/$/, ""));
    } catch { /* تجاهل */ }
    const alive = await ping();
    if (!alive) {
      setTestResult("fail");
      setServerOnline("offline");
      setDbStage("no-server");
      setDbError("تعذّر الوصول إلى الخادم — تأكد من تشغيله (npm start) ومن العنوان والمنفذ.");
      setTesting(false);
      push("error", "تعذّر الاتصال بالخادم", "تأكد أن خادم Node يعمل (npm start) على المنفذ المحدد.");
      return;
    }
    // الخادم يعمل — الآن نفحص قاعدة البيانات الفعلية بتشخيص متعدد المراحل
    setServerOnline("online");
    const chk = await checkDb();
    setDbStage(chk.stage);
    setTesting(false);
    if (chk.stage === "ok") {
      setTestResult("ok");
      setDbError(null);
      setDbRecords(chk.records ?? 0);
      push("success", "تم الاتصال بنجاح", `الخادم يستجيب وقاعدة «${mysql.database}» جاهزة (${chk.records ?? 0} حفظاً مخزناً).`);
    } else {
      setTestResult("fail");
      setDbError(chk.error ?? "خطأ غير معروف.");
      if (chk.stage === "old-server")
        push("error", "نسخة الخادم قديمة", "أوقف الخادم (Ctrl+C) وشغّله مجدداً من مجلد server ليحتوي نقاط الفحص الجديدة.");
      else if (chk.stage === "db-error")
        push("error", "الخادم يعمل لكن قاعدة البيانات ترفض الاتصال", chk.error ?? "راجع بيانات الاتصال في .env");
      else push("error", "تعذّر فحص القاعدة", chk.error ?? "");
    }
  };

  /* مزامنة فورية: دفع الحالة الحالية إلى MySQL والتحقق من نجاح الحفظ */
  const [pushing, setPushing] = useState(false);
  const syncNow = async () => {
    setPushing(true);
    const stamped = { ...db, savedAt: Date.now() };
    const res = await saveState(stamped);
    setPushing(false);
    if (res.ok) {
      setServerOnline("online");
      setDbError(null);
      setDbRecords(1);
      push("success", "تمت المزامنة مع MySQL", `${db.patients.length} مريضاً و ${db.appointments.length} موعداً و ${db.invoices.length} فاتورة حُفظت في القاعدة المركزية.`);
    } else {
      setDbError(res.error ?? "فشل غير معروف.");
      push("error", "فشلت المزامنة", res.error ?? "تحقق من تشغيل الخادم والاتصال.");
    }
  };

  const saveMysql = () => {
    try {
      localStorage.setItem("dental-mysql-config", JSON.stringify(mysql));
      localStorage.setItem("dental-api-url", mysql.apiUrl.replace(/\/$/, ""));
    } catch { /* تجاهل */ }
    push("success", "حُفظت إعدادات الاتصال", "ستُستخدم عند إعادة تحميل النظام.");
  };

  const envSnippet = `DB_HOST=${mysql.host}\nDB_PORT=${mysql.port}\nDB_USER=${mysql.user}\nDB_PASS=${mysql.password}\nDB_NAME=${mysql.database}`;

  const saveId = () => {
    if (idForm.clinicName.trim().length < 3) return push("error", "اسم العيادة قصير جداً");
    dispatch({ type: "UPDATE_SETTINGS", patch: { clinicName: idForm.clinicName.trim(), clinicLatin: idForm.clinicLatin.trim(), address: idForm.address.trim(), phone: idForm.phone.trim(), email: idForm.email.trim() } });
    push("success", "حُفظت هوية العيادة", "انعكس الاسم والعنوان على الطباعة والقوائم فوراً.");
  };
  const saveWork = () => {
    if (workForm.workStart >= workForm.workEnd) return push("error", "بداية الدوام يجب أن تسبق نهايته");
    dispatch({ type: "UPDATE_SETTINGS", patch: { workStart: workForm.workStart, workEnd: workForm.workEnd, followUpAlertDays: Math.min(14, Math.max(1, workForm.followUpAlertDays)) } });
    push("success", "حُفظت ساعات العمل", `الدوام الآن من ${workForm.workStart} حتى ${workForm.workEnd} — تغيّر جدول الحجز تلقائياً.`);
  };
  const saveInv = () => {
    if (invForm.invoiceTitle.trim().length < 3) return push("error", "عنوان الفاتورة قصير جداً");
    if (!/^[A-Za-z]{2,6}$/.test(invForm.invoicePrefix.trim())) return push("error", "البادئة يجب أن تكون 2–6 أحرف لاتينية", "مثل: INV أو YD أو SHF");
    dispatch({ type: "UPDATE_SETTINGS", patch: { invoiceTitle: invForm.invoiceTitle.trim(), invoicePrefix: invForm.invoicePrefix.trim().toUpperCase(), invoiceFooter: invForm.invoiceFooter.trim() } });
    push("success", "حُفظت إعدادات الفواتير", `الفواتير الجديدة ستُرقَّم ${invForm.invoicePrefix.trim().toUpperCase()}-${db.nextInv}.`);
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `نسخة-احتياطية-${idForm.clinicName.trim().replace(/\s+/g, "-")}-${today(0)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    push("success", "صُدِّرت النسخة الاحتياطية", "ملف JSON كامل بقاعدة البيانات.");
  };
  const importBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.patients) || !data.patients.length || !Array.isArray(data.currencies)) throw new Error("invalid");
        dispatch({ type: "IMPORT", db: data });
        push("success", "استُوردت النسخة الاحتياطية", `${data.patients.length} مريض · ${data.invoices?.length ?? 0} فاتورة · ${data.appointments?.length ?? 0} موعد.`);
      } catch {
        push("error", "تعذّر الاستيراد", "الملف ليس نسخة احتياطية صالحة من النظام.");
      }
    };
    reader.readAsText(file);
  };

  /* أثر ساعات العمل */
  const slots = useMemo(() => {
    const s = parseInt(workForm.workStart.slice(0, 2), 10);
    const e = parseInt(workForm.workEnd.slice(0, 2), 10);
    return Math.max(0, e - s) * 2;
  }, [workForm.workStart, workForm.workEnd]);
  const fuWillAlert = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + workForm.followUpAlertDays);
    const lim = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, "0")}-${String(limit.getDate()).padStart(2, "0")}`;
    return db.followUps.filter((f) => f.status === "pending" && f.dueDate <= lim).length;
  }, [db.followUps, workForm.followUpAlertDays]);

  const storageKB = useMemo(() => {
    try {
      return Math.round((JSON.stringify(db).length / 1024) * 10) / 10;
    } catch {
      return 0;
    }
  }, [db]);

  const set = (k: keyof ClinicSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setIdForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-pine text-[#7fe0d4]"><IconSettings className="w-6 h-6" /></span>
            الإعدادات العامة
          </h1>
          <p className="text-sm text-soft mt-1.5">تحكم مركزي في هوية العيادة وساعات العمل والفوترة والبيانات — يسري على الطباعة والحجز فور الحفظ.</p>
        </div>
        <span className="chip bg-white border border-line !py-2.5 text-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-mint pulse-dot" />
          {storageKB} كيلوبايت مستخدمة محلياً
        </span>
      </div>

      <div className="grid lg:grid-cols-[270px_1fr] gap-5 items-start">
        {/* سكة التبويبات */}
        <div className="card p-2 flex lg:flex-col gap-1.5 overflow-x-auto anim-rise" style={{ animationDelay: "60ms" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-start cursor-pointer transition-all shrink-0 lg:shrink min-w-44 lg:min-w-0 ${
                tab === t.key ? "bg-pine text-white shadow-md" : "hover:bg-mist text-ink"
              }`}
            >
              <span className={`inline-flex shrink-0 ${tab === t.key ? "text-[#7fe0d4]" : "text-jade-deep"}`}>{t.icon("w-6 h-6")}</span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold leading-tight">{t.label}</span>
                <span className={`hidden lg:block text-[10px] mt-0.5 leading-snug ${tab === t.key ? "text-white/60" : "text-soft"}`}>{t.desc}</span>
              </span>
            </button>
          ))}
          <p className="hidden lg:block text-[10px] font-semibold text-soft/70 px-3 pt-2 leading-relaxed">
            صلاحية هذه الشاشة للمدير فقط — بقية الأدوار لا تراها إطلاقاً.
          </p>
        </div>

        {/* المحتوى */}
        <div className="space-y-5 min-w-0">
          {/* ====== هوية العيادة ====== */}
          {tab === "identity" && (
            <div className="card p-6 anim-pop">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-xl text-ink">هوية العيادة</h2>
                {idDirty && <span className="chip bg-amber-soft text-[#a06410]"><span className="w-1.5 h-1.5 rounded-full bg-amber pulse-dot" /> تغييرات غير محفوظة</span>}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="اسم العيادة *"><TInput value={idForm.clinicName} onChange={set("clinicName")} /></Field>
                <Field label="الاسم اللاتيني"><TInput value={idForm.clinicLatin} onChange={set("clinicLatin")} dir="ltr" /></Field>
                <div className="md:col-span-2"><Field label="العنوان"><TInput value={idForm.address} onChange={set("address")} /></Field></div>
                <Field label="الهاتف"><TInput value={idForm.phone} onChange={set("phone")} dir="ltr" /></Field>
                <Field label="البريد الإلكتروني"><TInput value={idForm.email} onChange={set("email")} dir="ltr" /></Field>
              </div>

              {/* معاينة الترويسة المطبوعة */}
              <p className="label mt-6 !mb-2">معاينة ترويسة الوثائق المطبوعة</p>
              <div className="rounded-xl border-2 border-dashed border-line bg-white p-5 transition-all hover:border-jade/50">
                <div className="flex items-center justify-between pb-3 border-b-2 border-pine">
                  <div className="flex items-center gap-3">
                    <Logo className="w-11 h-11" />
                    <div>
                      <p className="font-display font-bold text-base leading-tight">{idForm.clinicName || "اسم العيادة"}</p>
                      <p className="text-[9px] text-soft tracking-wider" dir="ltr">{idForm.clinicLatin || "CLINIC NAME"}</p>
                    </div>
                  </div>
                  <div className="text-end text-[10px] text-soft leading-relaxed max-w-56">
                    <p>{idForm.address || "العنوان"}</p>
                    <p dir="ltr">{idForm.phone || "الهاتف"}</p>
                  </div>
                </div>
                <p className="text-[10px] text-soft mt-2.5 text-center">هذه الترويسة تظهر أعلى كل فاتورة وروشتة مطبوعة.</p>
              </div>

              <div className="flex justify-end gap-2.5 mt-5">
                <button className="btn-ghost" onClick={() => setIdForm(clinic)}>تراجع</button>
                <button className="btn-primary" onClick={saveId}>حفظ الهوية</button>
              </div>
            </div>
          )}

          {/* ====== العمل والمواعيد ====== */}
          {tab === "work" && (
            <div className="card p-6 anim-pop">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-xl text-ink">العمل والمواعيد</h2>
                {workDirty && <span className="chip bg-amber-soft text-[#a06410]"><span className="w-1.5 h-1.5 rounded-full bg-amber pulse-dot" /> تغييرات غير محفوظة</span>}
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="بداية الدوام"><TInput type="time" value={workForm.workStart} onChange={(e) => setWorkForm((f) => ({ ...f, workStart: e.target.value }))} /></Field>
                <Field label="نهاية الدوام"><TInput type="time" value={workForm.workEnd} onChange={(e) => setWorkForm((f) => ({ ...f, workEnd: e.target.value }))} /></Field>
                <Field label="تنبيه العودات قبل (أيام)"><TInput type="number" min={1} max={14} value={workForm.followUpAlertDays} onChange={(e) => setWorkForm((f) => ({ ...f, followUpAlertDays: Number(e.target.value) }))} /></Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <div className="rounded-xl bg-jade-soft/60 border border-jade/25 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold text-jade-deep"><IconCalendar className="w-4 h-4" /> أثر ساعات الدوام</p>
                  <p className="stat-num text-2xl text-ink mt-1.5">{slots} <span className="text-xs font-bold text-soft">خانة حجز نصف ساعية يومياً</span></p>
                  <p className="text-[11px] text-soft mt-1">شبكة «جدول اليوم» وقائمة أوقات الحجز تُعادان حسب هذا النطاق.</p>
                </div>
                <div className="rounded-xl bg-amber-soft/60 border border-amber/25 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold text-[#a06410]"><IconAlert className="w-4 h-4" /> أثر تنبيه العودات</p>
                  <p className="stat-num text-2xl text-ink mt-1.5">{fuWillAlert} <span className="text-xs font-bold text-soft">عودة ستُنبَّه خلال {workForm.followUpAlertDays} أيام</span></p>
                  <p className="text-[11px] text-soft mt-1">العودات المستحقة داخل هذه النافذة تظهر للسكرتارية كأولوية اتصال.</p>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-5">
                <button className="btn-ghost" onClick={() => setWorkForm({ workStart: clinic.workStart, workEnd: clinic.workEnd, followUpAlertDays: clinic.followUpAlertDays })}>تراجع</button>
                <button className="btn-primary" onClick={saveWork}>حفظ ساعات العمل</button>
              </div>
            </div>
          )}

          {/* ====== الفواتير ====== */}
          {tab === "invoice" && (
            <div className="card p-6 anim-pop">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-xl text-ink">الفواتير والمالية</h2>
                {invDirty && <span className="chip bg-amber-soft text-[#a06410]"><span className="w-1.5 h-1.5 rounded-full bg-amber pulse-dot" /> تغييرات غير محفوظة</span>}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="عنوان الفاتورة المطبوعة *" hint="يظهر أعلى كل فاتورة — مثلاً: فاتورة العيادة"><TInput value={invForm.invoiceTitle} onChange={(e) => setInvForm((f) => ({ ...f, invoiceTitle: e.target.value }))} /></Field>
                <Field label="بادئة رقم الفاتورة *" hint="أحرف لاتينية تسبق الرقم التسلسلي"><TInput value={invForm.invoicePrefix} onChange={(e) => setInvForm((f) => ({ ...f, invoicePrefix: e.target.value.toUpperCase() }))} dir="ltr" maxLength={6} /></Field>
                <div className="sm:col-span-2">
                  <Field label="نص تذييل الفاتورة"><TArea value={invForm.invoiceFooter} onChange={(e) => setInvForm((f) => ({ ...f, invoiceFooter: e.target.value }))} /></Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="العملة الافتراضية للعرض" hint="تحويل فوري لكل المبالغ — الإدارة الكاملة من شاشة العملات">
                    <TSelect
                      value={db.defaultCurrency}
                      onChange={(e) => {
                        dispatch({ type: "SET_DEFAULT_CURRENCY", code: e.target.value });
                        push("success", "تغيّرت العملة الافتراضية", db.currencies.find((c) => c.code === e.target.value)?.name);
                      }}
                    >
                      {db.currencies.map((c) => (
                        <option key={c.code} value={c.code}>{c.name} ({c.code}) — {c.symbol}</option>
                      ))}
                    </TSelect>
                  </Field>
                </div>
              </div>

              <p className="label mt-6 !mb-2">معاينة رأس الفاتورة</p>
              <div className="rounded-xl border-2 border-dashed border-line bg-white p-5 transition-all hover:border-jade/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-xl">{invForm.invoiceTitle || "فاتورة العيادة"}</p>
                    <p className="text-xs text-soft mt-1">رقم: <b className="stat-num" dir="ltr">{invForm.invoicePrefix || "INV"}-{db.nextInv}</b> · التاريخ: {fmtDate(today(0))}</p>
                  </div>
                  <span className="chip bg-mint-soft text-[#1d6b47]"><IconWallet className="w-3.5 h-3.5" /> الترقيم تلقائي</span>
                </div>
                <p className="text-[10px] text-soft mt-3 border-t border-line pt-2.5 leading-relaxed">{invForm.invoiceFooter || "نص التذييل…"}</p>
              </div>

              <div className="flex justify-end gap-2.5 mt-5">
                <button className="btn-ghost" onClick={() => setInvForm({ invoiceTitle: clinic.invoiceTitle, invoicePrefix: clinic.invoicePrefix, invoiceFooter: clinic.invoiceFooter })}>تراجع</button>
                <button className="btn-primary" onClick={saveInv}>حفظ إعدادات الفواتير</button>
              </div>
            </div>
          )}

          {/* ====== البيانات ====== */}
          {tab === "data" && (
            <div className="space-y-5">
              {/* هوية الجهاز في شبكة العيادة */}
              <div className="card p-6 anim-pop">
                <h2 className="font-display font-bold text-xl text-ink mb-1.5 flex items-center gap-2">
                  <IconBox className="w-5 h-5 text-jade-deep" />
                  هوية هذا الجهاز
                </h2>
                <p className="text-xs text-soft mb-4 leading-relaxed">اسم يميّز هذا الجهاز في شاشة «مراقبة النشاط» لدى المدير — مثل: جهاز الاستقبال، غرفة الكشف 1، مكتب المدير.</p>
                <DeviceLabelField />
              </div>

              <div className="card p-6 anim-pop">
                <h2 className="font-display font-bold text-xl text-ink mb-1.5">النسخ الاحتياطي</h2>
                <p className="text-xs text-soft mb-5">قاعدة البيانات كاملة (المرضى، المواعيد، الفواتير، الجلسات، الإعدادات…) في ملف JSON واحد.</p>
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ""; }} />
                <div className="flex flex-wrap gap-3">
                  <button className="btn-primary" onClick={exportBackup}><IconSpark className="w-4.5 h-4.5" /> تصدير نسخة احتياطية</button>
                  <button className="btn-soft" onClick={() => fileRef.current?.click()}><IconShield className="w-4.5 h-4.5" /> استيراد نسخة</button>
                </div>
              </div>

              {/* ====== قاعدة البيانات ====== */}
              <div className="card p-6 anim-pop" style={{ animationDelay: "40ms" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <h2 className="font-display font-bold text-xl text-ink flex items-center gap-2"><IconBox className="w-5 h-5 text-jade-deep" /> قاعدة البيانات</h2>
                  <span className={`chip ${serverOnline === "online" ? "bg-mint-soft text-[#1d6b47]" : serverOnline === "offline" ? "bg-coral-soft text-coral" : "bg-mist text-soft"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${serverOnline === "online" ? "bg-mint pulse-dot" : serverOnline === "offline" ? "bg-coral" : "bg-soft pulse-soft"}`} />
                    {serverOnline === "online" ? "الخادم متصل" : serverOnline === "offline" ? "الخادم غير متاح" : "جارٍ الفحص…"}
                  </span>
                </div>
                <p className="text-xs text-soft mb-5">الاتصال المركزي بقاعدة MySQL عبر خادم Node — عند توفره تتحول المزامنة من التخزين المحلي إلى قاعدة مشتركة بين كل الأجهزة.</p>

                {/* (MYSQL) الاتصال المركزي */}
                <div className="rounded-xl border border-line overflow-hidden mb-5">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-pine sidebar-texture text-white">
                    <IconPulse className="w-4 h-4 text-[#7fe0d4]" />
                    <p className="text-sm font-bold">الاتصال المركزي (MYSQL)</p>
                    <span className="ms-auto text-[10px] font-semibold text-white/60" dir="ltr">mysql2 · express</span>
                  </div>
                  <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <Field label="عنوان الخادم (API)"><TInput value={mysql.apiUrl} onChange={(e) => setMysql({ ...mysql, apiUrl: e.target.value })} dir="ltr" placeholder="http://localhost:4000" /></Field>
                    <Field label="المضيف (Host)"><TInput value={mysql.host} onChange={(e) => setMysql({ ...mysql, host: e.target.value })} dir="ltr" placeholder="localhost" /></Field>
                    <Field label="المنفذ (Port)"><TInput value={mysql.port} onChange={(e) => setMysql({ ...mysql, port: e.target.value })} dir="ltr" placeholder="3306" /></Field>
                    <Field label="اسم المستخدم"><TInput value={mysql.user} onChange={(e) => setMysql({ ...mysql, user: e.target.value })} dir="ltr" placeholder="root" /></Field>
                    <Field label="كلمة المرور"><TInput type="password" value={mysql.password} onChange={(e) => setMysql({ ...mysql, password: e.target.value })} dir="ltr" placeholder="••••••••" /></Field>
                    <Field label="اسم قاعدة البيانات"><TInput value={mysql.database} onChange={(e) => setMysql({ ...mysql, database: e.target.value })} dir="ltr" placeholder="sharafi_dental" /></Field>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
                    <button className="btn-soft" onClick={testConnection} disabled={testing}>
                      {testing ? <span className="w-4 h-4 border-2 border-jade-deep border-t-transparent rounded-full animate-spin" /> : <IconPulse className="w-4 h-4" />}
                      {testing ? "جارٍ الاختبار…" : "اختبار الاتصال"}
                    </button>
                    <button className="btn-primary" onClick={saveMysql}><IconCheck className="w-4 h-4" /> حفظ الإعدادات</button>
                    <button className="btn-soft" onClick={syncNow} disabled={pushing} title="دفع كل البيانات الحالية إلى MySQL الآن">
                      {pushing ? <span className="w-4 h-4 border-2 border-jade-deep border-t-transparent rounded-full animate-spin" /> : <IconBox className="w-4 h-4" />}
                      {pushing ? "جارٍ الرفع…" : "مزامنة الآن"}
                    </button>
                    {testResult === "ok" && <span className="chip bg-mint-soft text-[#1d6b47] anim-pop"><IconCheck className="w-3 h-3" /> الاتصال ناجح</span>}
                    {testResult === "fail" && <span className="chip bg-coral-soft text-coral anim-pop"><IconAlert className="w-3 h-3" /> فشل الاتصال</span>}
                  </div>

                  {/* لوحة التشخيص متعدد المراحل */}
                  <div className="border-t border-line bg-white/60 px-4 py-3.5 space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-[10px] font-bold text-soft tracking-widest">التشخيص المباشر</span>
                      {/* مرحلة 1: الخادم */}
                      <span className={`chip ${serverOnline === "online" ? "bg-mint-soft text-[#1d6b47]" : serverOnline === "offline" ? "bg-coral-soft text-coral" : "bg-mist text-soft"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${serverOnline === "online" ? "bg-mint pulse-dot" : serverOnline === "offline" ? "bg-coral" : "bg-soft/50 pulse-soft"}`} />
                        الخادم: {serverOnline === "online" ? "يعمل" : serverOnline === "offline" ? "متوقف" : "جارٍ الفحص"}
                      </span>
                      {/* مرحلة 2: قاعدة البيانات */}
                      <span className={`chip ${dbStage === "ok" ? "bg-mint-soft text-[#1d6b47]" : dbStage === "db-error" ? "bg-coral-soft text-coral" : dbStage === "old-server" ? "bg-amber-soft text-[#a06410]" : "bg-mist text-soft"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dbStage === "ok" ? "bg-mint pulse-dot" : dbStage === "db-error" ? "bg-coral" : dbStage === "old-server" ? "bg-amber" : "bg-soft/50"}`} />
                        قاعدة البيانات: {dbStage === "ok" ? `متصلة (${dbRecords ?? 0} حفظاً)` : dbStage === "db-error" ? "ترفض الاتصال" : dbStage === "old-server" ? "الخادم قديم" : testing ? "جارٍ الفحص…" : "لم تُفحص"}
                      </span>
                    </div>
                    {dbError && (
                      <div className="anim-pop rounded-xl border border-coral/30 bg-coral-soft/50 p-3.5">
                        <p className="text-[11px] font-bold text-coral mb-1.5 flex items-center gap-1.5">
                          <IconAlert className="w-3.5 h-3.5" />
                          {dbStage === "old-server" ? "الإجراء المطلوب" : "الخطأ الحقيقي من MySQL"}
                        </p>
                        <p className="text-[11px] text-ink/80 leading-relaxed">{dbError}</p>
                        {dbStage === "db-error" && (
                          <p className="text-[10px] text-soft mt-2 leading-relaxed border-t border-coral/20 pt-2">
                            الأسباب الشائعة: كلمة المرور في <span dir="ltr" className="stat-num">.env</span> · قاعدة <b>{mysql.database}</b> غير موجودة · المستخدم بلا صلاحيات — راجع خطوات التفعيل أعلاه.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-line bg-mist/50 px-4 py-3">
                    <p className="text-[10px] font-bold text-soft mb-1.5">محتوى ملف <span dir="ltr" className="stat-num">.env</span> المقابل لهذه الإعدادات:</p>
                    <pre className="text-[11px] stat-num text-jade-deep bg-white border border-line rounded-lg px-3 py-2 overflow-x-auto whitespace-pre" dir="ltr">{envSnippet}</pre>
                  </div>
                </div>

                {/* حالة التشغيل */}
                <div className="rounded-xl border border-line p-4 mb-5">
                  <p className="text-sm font-bold text-ink mb-3 flex items-center gap-2"><IconPulse className="w-4 h-4 text-jade-deep" /> حالة التشغيل</p>
                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg bg-mist/70 border border-line p-3">
                      <p className="font-bold text-soft">وضع المزامنة الحالي</p>
                      <p className={`font-bold mt-1 flex items-center gap-1.5 ${conn === "online" ? "text-[#1d6b47]" : "text-coral"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${conn === "online" ? "bg-mint pulse-dot" : "bg-coral"}`} />
                        {conn === "online" ? "قاعدة MySQL مركزية" : "تخزين محلي (المتصفح)"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-mist/70 border border-line p-3">
                      <p className="font-bold text-soft">المزامنة الفورية</p>
                      <p className="font-bold text-ink mt-1 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${syncing ? "bg-amber pulse-soft" : "bg-soft/40"}`} />
                        {syncing ? "جارٍ الحفظ…" : "خاملة — بانتظار تغيير"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-mist/70 border border-line p-3">
                      <p className="font-bold text-soft">عنوان الخادم النشط</p>
                      <p className="font-bold text-ink mt-1 stat-num text-[11px]" dir="ltr">{mysql.apiUrl}</p>
                    </div>
                  </div>
                </div>

                {/* خطوات التفعيل */}
                <div className="rounded-xl border border-line p-4 mb-5">
                  <p className="text-sm font-bold text-ink mb-3 flex items-center gap-2"><IconCheck className="w-4 h-4 text-jade-deep" /> خطوات التفعيل</p>
                  <ol className="space-y-2.5">
                    {[
                      { t: "أنشئ قاعدة البيانات", d: <span>نفّذ <code dir="ltr" className="stat-num bg-mist rounded px-1.5 py-0.5 text-[10px]">mysql -u root -p &lt; server/schema.sql</code> لإنشاء الجداول.</span> },
                      { t: "ثبّت اعتماديات الخادم", d: <span>من مجلد <code dir="ltr" className="stat-num bg-mist rounded px-1.5 py-0.5 text-[10px]">server</code> نفّذ <code dir="ltr" className="stat-num bg-mist rounded px-1.5 py-0.5 text-[10px]">npm install</code>.</span> },
                      { t: "اضبط ملف .env", d: "انسخ الإعدادات أعلاه إلى server/.env لتطابق اتصالك.", },
                      { t: "شغّل الخادم", d: <span>نفّذ <code dir="ltr" className="stat-num bg-mist rounded px-1.5 py-0.5 text-[10px]">npm start</code> — سيعمل على المنفذ 4000.</span> },
                      { t: "اختبر الاتصال واحفظ", d: "اضغط «اختبار الاتصال» ثم «حفظ الإعدادات»، وأعد تحميل النظام لتفعيل المزامنة المركزية.", },
                    ].map((s, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-jade-soft text-jade-deep text-[11px] font-bold shrink-0 stat-num">{i + 1}</span>
                        <div>
                          <p className="text-xs font-bold text-ink">{s.t}</p>
                          <p className="text-[11px] text-soft mt-0.5 leading-relaxed">{s.d}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* ملفات الحزمة */}
                <div className="rounded-xl border border-line p-4">
                  <p className="text-sm font-bold text-ink mb-3 flex items-center gap-2"><IconBox className="w-4 h-4 text-jade-deep" /> ملفات الحزمة التالية</p>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {[
                      { f: "server/index.js", d: "خادم Express + واجهات REST للمزامنة" },
                      { f: "server/schema.sql", d: "مخطط إنشاء جداول قاعدة MySQL" },
                      { f: "server/package.json", d: "اعتماديات الخادم (mysql2, express, cors)" },
                      { f: "server/.env.example", d: "قالب متغيرات الاتصال — انسخه إلى .env" },
                      { f: "server/README.md", d: "دليل تشغيل الخادم وربط الواجهة" },
                      { f: "src/api.ts", d: "عميل الاتصال داخل الواجهة (fetch + مهلة)" },
                    ].map((x) => (
                      <div key={x.f} className="flex items-center gap-2.5 rounded-lg bg-mist/70 border border-line px-3 py-2.5 hover:border-jade/40 transition-colors">
                        <IconSpark className="w-4 h-4 text-jade-deep shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-ink stat-num truncate" dir="ltr">{x.f}</p>
                          <p className="text-[10px] text-soft mt-0.5 truncate">{x.d}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card p-6 anim-pop !border-coral/30" style={{ animationDelay: "80ms" }}>
                <h2 className="font-display font-bold text-xl text-coral mb-1.5 flex items-center gap-2"><IconTrash className="w-5 h-5" /> منطقة الخطر</h2>
                <p className="text-xs text-soft mb-4 leading-relaxed">حذف كل البيانات يمسح جميع السجلات نهائياً — المرضى، المواعيد، الفواتير، الجلسات، المصروفات، المستخدمين (عدا حساب المدير) — ويعيد القاعدة فارغة تماماً لتبدأ الإدخال من جديد. صدِّر نسخة احتياطية أولاً إن كنت تريد الحفاظ على عملك.</p>
                <button className="btn-danger" onClick={() => setConfirmReset(true)}>حذف كل البيانات والبدء من الصفر…</button>
              </div>

              <div className="card p-6 anim-pop" style={{ animationDelay: "140ms" }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-bold text-xl text-ink">حول النظام</h2>
                  <button onClick={() => setShowChangelog(true)} className="btn-soft !h-9 !px-3.5 !text-xs">
                    <IconBook className="w-4 h-4" />
                    سجل التغييرات (Change Log)
                  </button>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-mist/70 border border-line p-3.5">
                    <p className="font-bold text-soft">الإصدار</p>
                    <p className="stat-num text-lg text-ink mt-1">4.0</p>
                  </div>
                  <div className="rounded-lg bg-mist/70 border border-line p-3.5">
                    <p className="font-bold text-soft">التخزين</p>
                    <p className="stat-num text-lg text-ink mt-1">{storageKB} KB</p>
                  </div>
                  <div className="rounded-lg bg-mist/70 border border-line p-3.5">
                    <p className="font-bold text-soft">السجلات</p>
                    <p className="stat-num text-lg text-ink mt-1">{db.patients.length + db.appointments.length + db.invoices.length + db.sessions.length}</p>
                  </div>
                </div>
                <button
                  className="mt-4 text-[11px] font-bold text-soft hover:text-jade-deep cursor-pointer underline underline-offset-4"
                  onClick={() => {
                    dispatch({ type: "UPDATE_SETTINGS", patch: DEFAULT_CLINIC_SETTINGS });
                    setIdForm(DEFAULT_CLINIC_SETTINGS);
                    setWorkForm({ workStart: DEFAULT_CLINIC_SETTINGS.workStart, workEnd: DEFAULT_CLINIC_SETTINGS.workEnd, followUpAlertDays: DEFAULT_CLINIC_SETTINGS.followUpAlertDays });
                    setInvForm({ invoiceTitle: DEFAULT_CLINIC_SETTINGS.invoiceTitle, invoicePrefix: DEFAULT_CLINIC_SETTINGS.invoicePrefix, invoiceFooter: DEFAULT_CLINIC_SETTINGS.invoiceFooter });
                    push("info", "أُعيدت الإعدادات الافتراضية");
                  }}
                >
                  استعادة الإعدادات الافتراضية فقط (بدون مسح البيانات)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* تأكيد إعادة التعيين */}
      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="حذف كل البيانات والبدء من الصفر؟"
        subtitle="لا يمكن التراجع عن هذه الخطوة"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setConfirmReset(false)}>تراجع</button>
            <button
              className="btn !bg-coral !text-white hover:!bg-[#b23a28]"
              onClick={() => {
                dispatch({ type: "RESET" });
                setConfirmReset(false);
                const c = DEFAULT_CLINIC_SETTINGS;
                setIdForm(c);
                setWorkForm({ workStart: c.workStart, workEnd: c.workEnd, followUpAlertDays: c.followUpAlertDays });
                setInvForm({ invoiceTitle: c.invoiceTitle, invoicePrefix: c.invoicePrefix, invoiceFooter: c.invoiceFooter });
                push("warn", "حُذفت كل البيانات", "القاعدة الآن فارغة — ابدأ الإدخال من جديد.");
              }}
            >
              <IconAlert className="w-4.5 h-4.5" />
              نعم، احذف كل البيانات
            </button>
          </>
        }
      >
        <p className="text-sm text-soft leading-relaxed">
          سيُمسح كل ما أضفته أو عدّلته نهائياً: <b className="text-ink">{db.patients.length} مريضاً</b>، <b className="text-ink">{db.appointments.length} موعداً</b>، <b className="text-ink">{db.invoices.length} فاتورة</b>، <b className="text-ink">{db.sessions.length} جلسة علاج</b>، وكل الأطباء والموظفين والمستخدمين (عدا حساب المدير) — وتُحفظ القاعدة فارغة في MySQL لتبدأ الإدخال من جديد. هل صدّرت نسخة احتياطية؟
        </p>
      </Modal>

      {/* ====== سجل التغييرات ====== */}
      <Modal open={showChangelog} onClose={() => setShowChangelog(false)} title="سجل التغييرات" subtitle="تاريخ تطور نظام عيادة د. عبدالله الشرفي" width="max-w-2xl">
        <div className="relative ms-3">
          <span className="absolute top-1 bottom-1 start-[9px] w-0.5 bg-gradient-to-b from-jade via-line to-transparent rounded-full" />
          <div className="space-y-7">
            {CHANGELOG.map((rel, ri) => (
              <div key={rel.v} className="relative ps-8 anim-rise" style={{ animationDelay: `${ri * 80}ms` }}>
                <span className={`absolute top-0.5 start-0 inline-flex items-center justify-center w-5 h-5 rounded-full border-2 ${rel.current ? "bg-jade border-jade text-white pulse-dot" : "bg-card border-line text-soft"}`}>
                  {rel.current ? <IconSpark className="w-2.5 h-2.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-soft/50" />}
                </span>
                <div className={`rounded-xl border p-4 ${rel.current ? "border-jade/40 bg-jade-soft/40" : "border-line bg-card"}`}>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-display font-bold text-lg text-ink" dir="ltr">v{rel.v}</span>
                    <span className="text-[11px] font-semibold text-soft">{rel.date}</span>
                    {rel.current && <span className="chip bg-jade text-white !text-[9px] !py-1">الإصدار الحالي</span>}
                  </div>
                  <ul className="mt-3 space-y-2">
                    {rel.items.map((it, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className={`chip shrink-0 mt-0.5 !text-[9px] !py-0.5 !px-2 ${TAG_CLS[it.tag]}`}>{it.tag}</span>
                        <p className="text-[12.5px] text-ink/85 leading-relaxed">{it.text}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
