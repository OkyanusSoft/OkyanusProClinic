import React, { useMemo, useState } from "react";
import { ACCENTS, applyPrefs, arLocale, DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs } from "../prefs";
import { fmtDate, today, useStore } from "../store";
import { IconCheck, IconMoon, IconSliders, IconSun, IconTooth, IconUsers } from "../icons";
import { Avatar, useToast } from "../components/ui";

type PrefTab = "appearance" | "locale" | "behavior";

const TABS: { key: PrefTab; label: string; desc: string }[] = [
  { key: "appearance", label: "المظهر", desc: "النمط واللون المميز وحجم الخط والحركة" },
  { key: "locale", label: "اللغة والأرقام", desc: "نظام الترقيم في التواريخ والمبالغ" },
  { key: "behavior", label: "الإشعارات والسلوك", desc: "مدة التنبيهات والشاشة الافتراضية" },
];

const TAB_OPTIONS: { key: string; label: string }[] = [
  { key: "dashboard", label: "لوحة التحكم" },
  { key: "appointments", label: "المواعيد" },
  { key: "session", label: "محطة عمل الدكتور" },
  { key: "patients", label: "المرضى" },
  { key: "invoices", label: "الفواتير" },
  { key: "inventory", label: "المخزون والمستهلكات" },
  { key: "reports", label: "التقارير" },
];

export default function PreferencesPage() {
  const { db } = useStore();
  const { push } = useToast();
  const [tab, setTab] = useState<PrefTab>("appearance");
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
  const [, force] = useState(0); // لإعادة رسم معاينات التواريخ عند تغيير الترقيم

  const update = (patch: Partial<Prefs>, silent = false) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next);
    applyPrefs(next);
    if (patch.digits) force((x) => x + 1);
    if (!silent) push("success", "طُبِّق التغيير وحُفظ", undefined);
  };

  const resetAll = () => {
    setPrefs({ ...DEFAULT_PREFS });
    savePrefs({ ...DEFAULT_PREFS });
    applyPrefs({ ...DEFAULT_PREFS });
    force((x) => x + 1);
    push("info", "استُعيدت التفضيلات الافتراضية");
  };

  const dateSample = useMemo(() => fmtDate(today(0)), [prefs.digits, tab]);
  const dateSampleOther = useMemo(() => {
    // عيّنة بالنظام المقابل للمقارنة
    const other = prefs.digits === "latn" ? "ar-EG" : "ar-EG-u-nu-latn";
    return new Intl.DateTimeFormat(other, { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  }, [prefs.digits]);

  const accent = ACCENTS.find((a) => a.id === prefs.accent) ?? ACCENTS[0];

  return (
    <div className="space-y-6">
      {/* الترويسة */}
      <div className="anim-rise relative overflow-hidden rounded-2xl bg-pine sidebar-texture text-white p-6 sm:p-8">
        <span className="absolute -start-6 -bottom-12 opacity-[0.07]"><IconSliders className="w-52 h-52" /></span>
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-bold text-[--color-frost] tracking-[0.25em] mb-2">تخصيص التجربة</p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl leading-tight">التفضيلات</h1>
            <p className="text-sm text-white/65 mt-2 max-w-xl leading-relaxed">
              اجعل النظام على ذوقك — كل تغيير يُطبَّق على الواجهة فوراً ويُحفَظ على هذا الجهاز تلقائياً.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="chip bg-white/12 border border-white/15 !py-2 text-white/85">
              <span className="w-1.5 h-1.5 rounded-full bg-[--color-frost] pulse-dot" />
              حفظ تلقائي مباشر
            </span>
            <button onClick={resetAll} className="btn !bg-white/10 !text-white border border-white/20 hover:!bg-white/20 !h-10">
              استعادة الافتراضيات
            </button>
          </div>
        </div>
      </div>

      {/* معاينة سريعة حيّة */}
      <div className="anim-rise card card-hover p-4 flex flex-wrap items-center gap-4" style={{ animationDelay: "60ms" }}>
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0" style={{ background: accent.soft, color: accent.deep }}>
          <IconTooth className="w-6 h-6" />
        </span>
        <div className="flex-1 min-w-48">
          <p className="font-display font-bold text-base text-ink">معاينة حيّة — هكذا تبدو الواجهة الآن</p>
          <p className="text-xs text-soft mt-0.5">
            التاريخ: <b className="stat-num">{dateSample}</b> · اللون: <b style={{ color: accent.deep }}>{accent.label}</b> · الخط: {prefs.fontSize === "sm" ? "صغير" : prefs.fontSize === "lg" ? "كبير" : "متوسط"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary !h-9 !px-4 !text-xs">زر أساسي</button>
          <span className="chip" style={{ background: accent.soft, color: accent.deep }}>شارة مميزة</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[250px_1fr] gap-6 items-start">
        {/* سكة الأقسام */}
        <nav className="lg:sticky lg:top-20 card p-2.5 flex lg:flex-col gap-1.5 overflow-x-auto anim-rise" style={{ animationDelay: "100ms" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-start cursor-pointer transition-all shrink-0 lg:shrink min-w-44 lg:min-w-0 ${
                tab === t.key ? "bg-jade-soft text-jade-deep" : "text-soft hover:bg-mist hover:text-ink"
              }`}
            >
              {tab === t.key && <span className="absolute inset-y-2.5 start-0 w-1 rounded-full bg-jade" />}
              <span className="min-w-0">
                <span className="block text-[13px] font-bold">{t.label}</span>
                <span className="hidden lg:block text-[10px] mt-0.5 leading-snug opacity-75">{t.desc}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* المحتوى */}
        <div className="space-y-5 min-w-0">
          {/* ====== المظهر ====== */}
          {tab === "appearance" && (
            <>
              {/* نمط العرض */}
              <section className="card p-6 anim-pop">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-xl text-ink">نمط العرض</h2>
                  <span className="chip bg-mist text-soft">{prefs.mode === "light" ? "فاتح" : prefs.mode === "dark" ? "داكن" : "تلقائي"}</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {(
                    [
                      { key: "light", label: "فاتح", desc: "أبيض نقي مريح نهاراً", icon: <IconSun className="w-6 h-6" /> },
                      { key: "dark", label: "داكن", desc: "كحلي عميق مريح ليلاً", icon: <IconMoon className="w-6 h-6" /> },
                      { key: "auto", label: "تلقائي", desc: "يتبع إعداد جهازك", icon: <IconSliders className="w-6 h-6" /> },
                    ] as { key: Prefs["mode"]; label: string; desc: string; icon: React.ReactNode }[]
                  ).map((m) => {
                    const active = prefs.mode === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => update({ mode: m.key }, true)}
                        className={`relative rounded-xl border-2 p-4 text-start cursor-pointer transition-all ${
                          active ? "border-jade bg-jade-soft shadow-md" : "border-line bg-card hover:border-jade/50 hover:-translate-y-0.5"
                        }`}
                      >
                        {active && (
                          <span className="absolute top-3 end-3 inline-flex items-center justify-center w-5 h-5 rounded-full bg-jade text-white">
                            <IconCheck className="w-3 h-3" />
                          </span>
                        )}
                        <span className={`inline-flex items-center justify-center w-11 h-11 rounded-lg mb-3 ${active ? "bg-jade text-white" : "bg-mist text-soft"}`}>{m.icon}</span>
                        <span className="block font-display font-bold text-base text-ink">{m.label}</span>
                        <span className="block text-[11px] text-soft mt-0.5">{m.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* اللون المميز */}
              <section className="card p-6 anim-pop" style={{ animationDelay: "60ms" }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-xl text-ink">اللون المميز</h2>
                  <span className="chip" style={{ background: accent.soft, color: accent.deep }}>{accent.label}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ACCENTS.map((a) => {
                    const active = prefs.accent === a.id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => update({ accent: a.id }, true)}
                        className={`relative flex items-center gap-3 rounded-xl border-2 p-3.5 cursor-pointer transition-all ${
                          active ? "shadow-md -translate-y-0.5" : "hover:-translate-y-0.5"
                        }`}
                        style={{ borderColor: active ? a.jade : "var(--color-line)", background: active ? a.soft : "var(--color-card)" }}
                      >
                        <span className="relative inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0 shadow-inner" style={{ background: `linear-gradient(135deg, ${a.jade}, ${a.deep})` }}>
                          {active && <IconCheck className="w-4 h-4 text-white" />}
                        </span>
                        <span className="min-w-0 text-start">
                          <span className="block text-[13px] font-bold" style={{ color: active ? a.deep : "var(--color-ink)" }}>{a.label}</span>
                          <span className="block text-[10px] opacity-70 stat-num" dir="ltr">{a.jade}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-soft mt-3.5 bg-mist rounded-lg px-3.5 py-2.5">
                  يعيد اللون المميز تلوين الأزرار والقوائم والشارات وخطوط التركيز في النظام كله فوراً.
                </p>
              </section>

              {/* حجم الخط والحركة */}
              <div className="grid md:grid-cols-2 gap-5">
                <section className="card p-6 anim-pop" style={{ animationDelay: "100ms" }}>
                  <h2 className="font-display font-bold text-xl text-ink mb-4">حجم الخط</h2>
                  <div className="flex rounded-xl border border-line overflow-hidden">
                    {(
                      [
                        { key: "sm", label: "صغير", size: "text-xs" },
                        { key: "md", label: "متوسط", size: "text-sm" },
                        { key: "lg", label: "كبير", size: "text-base" },
                      ] as { key: Prefs["fontSize"]; label: string; size: string }[]
                    ).map((f) => (
                      <button
                        key={f.key}
                        onClick={() => update({ fontSize: f.key }, true)}
                        className={`flex-1 py-3.5 cursor-pointer transition-all ${f.size} font-bold ${
                          prefs.fontSize === f.key ? "bg-jade text-white" : "bg-card text-soft hover:bg-mist"
                        }`}
                      >
                        أ {f.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-soft mt-3">يغيّر مقياس الواجهة كاملة — مفيد للشاشات الكبيرة أو ضعف النظر.</p>
                </section>

                <section className="card p-6 anim-pop" style={{ animationDelay: "140ms" }}>
                  <h2 className="font-display font-bold text-xl text-ink mb-4">الحركة والانتقالات</h2>
                  <button
                    onClick={() => update({ motion: !prefs.motion }, true)}
                    className="w-full flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all"
                    style={{ borderColor: prefs.motion ? accent.jade : "var(--color-line)", background: prefs.motion ? accent.soft : "var(--color-card)" }}
                  >
                    <span className="text-start">
                      <span className="block text-[13px] font-bold text-ink">{prefs.motion ? "الحركات مفعّلة" : "الحركات موقوفة"}</span>
                      <span className="block text-[11px] text-soft mt-0.5">{prefs.motion ? "انتقالات ونبض وحياة" : "ثبات كامل — مريح للحساسية الحركية"}</span>
                    </span>
                    <span className={`relative w-11 h-6 rounded-full transition-colors ${prefs.motion ? "bg-jade" : "bg-line"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${prefs.motion ? "start-[22px]" : "start-0.5"}`} />
                    </span>
                  </button>
                </section>
              </div>
            </>
          )}

          {/* ====== اللغة والأرقام ====== */}
          {tab === "locale" && (
            <section className="card p-6 anim-pop">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-xl text-ink">نظام الترقيم</h2>
                <span className="chip bg-mist text-soft">يؤثر على التواريخ</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {(
                  [
                    { key: "latn", label: "أرقام لاتينية", sample: "15 فبراير 2026", big: "123" },
                    { key: "ar", label: "أرقام عربية مشرقية", sample: "١٥ فبراير ٢٠٢٦", big: "١٢٣" },
                  ] as { key: Prefs["digits"]; label: string; sample: string; big: string }[]
                ).map((d) => {
                  const active = prefs.digits === d.key;
                  return (
                    <button
                      key={d.key}
                      onClick={() => update({ digits: d.key }, true)}
                      className={`relative rounded-xl border-2 p-5 text-start cursor-pointer transition-all ${
                        active ? "border-jade bg-jade-soft shadow-md" : "border-line bg-card hover:border-jade/50 hover:-translate-y-0.5"
                      }`}
                    >
                      {active && (
                        <span className="absolute top-3.5 end-3.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-jade text-white">
                          <IconCheck className="w-3 h-3" />
                        </span>
                      )}
                      <span className="block font-display font-bold text-3xl" style={{ color: active ? accent.deep : "var(--color-ink)" }} dir="ltr">{d.big}</span>
                      <span className="block text-[13px] font-bold text-ink mt-2">{d.label}</span>
                      <span className="block text-[11px] text-soft mt-1 stat-num">{d.sample}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 rounded-xl bg-mist p-4">
                <p className="text-[11px] font-bold text-soft mb-2">معاينة مباشرة بالتاريخ الحالي</p>
                <p className="font-display font-bold text-lg text-ink stat-num">{dateSample}</p>
                <p className="text-[11px] text-soft mt-1 stat-num">بالنظام الآخر: {dateSampleOther}</p>
              </div>
              <p className="text-[11px] text-soft mt-3.5 flex items-center gap-2">
                <IconUsers className="w-4 h-4 shrink-0" />
                لغة الواجهة العربية ثابتة في النظام — يُغيَّر هنا شكل الأرقام فقط.
              </p>
            </section>
          )}

          {/* ====== الإشعارات والسلوك ====== */}
          {tab === "behavior" && (
            <>
              <section className="card p-6 anim-pop">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-xl text-ink">مدة بقاء الإشعار</h2>
                  <span className="chip bg-jade-soft text-jade-deep stat-num">{(prefs.toastDur / 1000).toFixed(1)} ث</span>
                </div>
                <input
                  type="range"
                  min={2000}
                  max={8000}
                  step={500}
                  value={prefs.toastDur}
                  onChange={(e) => update({ toastDur: Number(e.target.value) }, true)}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-mist"
                  style={{ accentColor: accent.jade }}
                />
                <div className="flex justify-between text-[10px] font-bold text-soft mt-2 stat-num">
                  <span>2 ث</span><span>5 ث</span><span>8 ث</span>
                </div>
                <button className="btn-soft mt-4 !h-9 !text-xs" onClick={() => push("info", "إشعار تجريبي", `سيبقى ظاهرًا لمدة ${(prefs.toastDur / 1000).toFixed(1)} ثانية`)}>
                  إرسال إشعار تجريبي
                </button>
              </section>

              <section className="card p-6 anim-pop" style={{ animationDelay: "60ms" }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-xl text-ink">الشاشة الافتراضية عند الدخول</h2>
                  <span className="chip bg-mist text-soft">لكل مستخدم</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {TAB_OPTIONS.map((t) => {
                    const active = prefs.defaultTab === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => update({ defaultTab: t.key }, true)}
                        className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
                          active ? "border-jade bg-jade-soft" : "border-line bg-card hover:border-jade/50"
                        }`}
                      >
                        <span className={`text-[13px] font-bold ${active ? "text-jade-deep" : "text-ink"}`}>{t.label}</span>
                        {active && <IconCheck className="w-4 h-4 text-jade" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-soft mt-3.5 bg-mist rounded-lg px-3.5 py-2.5">
                  عند تسجيل الدخول ستفتح هذه الشاشة تلقائياً — تُحفَظ على هذا الجهاز.
                </p>
              </section>
            </>
          )}
        </div>
      </div>

      {/* تذييل الحالة */}
      <div className="anim-rise flex flex-wrap items-center justify-between gap-3 px-2 pb-2" style={{ animationDelay: "160ms" }}>
        <p className="text-[11px] font-semibold text-soft flex items-center gap-2">
          <IconCheck className="w-4 h-4 text-mint" />
          كل التفضيلات تُحفَظ محلياً وتُطبَّق على النظام كله — {db.patients.length > 0 ? "متزامنة مع قاعدة البيانات" : ""}
        </p>
        <span className="chip bg-white border border-line text-soft">التفضيلات · الإصدار 2.7</span>
      </div>
    </div>
  );
}
