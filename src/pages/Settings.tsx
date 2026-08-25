import React, { useMemo, useRef, useState } from "react";
import {
  clinicOf,
  DEFAULT_CLINIC_SETTINGS,
  fmtDate,
  today,
  useStore,
  type ClinicSettings,
} from "../store";
import { IconAlert, IconCalendar, IconCoins, IconReceipt, IconShield, IconSpark, IconTrash, IconWallet, Logo } from "../icons";
import { Field, Modal, TArea, TInput, TSelect, useToast } from "../components/ui";
import { IconSettings } from "../icons";

type SetTab = "identity" | "work" | "invoice" | "data";

const TABS: { key: SetTab; label: string; desc: string; icon: (c: string) => React.ReactNode }[] = [
  { key: "identity", label: "هوية العيادة", desc: "الاسم والعنوان وبيانات التواصل المطبوعة على الوثائق", icon: (c) => <Logo className={c} /> },
  { key: "work", label: "العمل والمواعيد", desc: "ساعات الدوام وتنبيهات العودات", icon: (c) => <IconCalendar className={c} /> },
  { key: "invoice", label: "الفواتير والمالية", desc: "عنوان الفاتورة وبادئة الترقيم والعملة", icon: (c) => <IconReceipt className={c} /> },
  { key: "data", label: "البيانات والنسخ", desc: "تصدير واستيراد وإعادة التعيين", icon: (c) => <IconShield className={c} /> },
];

export default function SettingsPage() {
  const { db, dispatch } = useStore();
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
  const fileRef = useRef<HTMLInputElement>(null);

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
              <div className="card p-6 anim-pop">
                <h2 className="font-display font-bold text-xl text-ink mb-1.5">النسخ الاحتياطي</h2>
                <p className="text-xs text-soft mb-5">قاعدة البيانات كاملة (المرضى، المواعيد، الفواتير، الجلسات، الإعدادات…) في ملف JSON واحد.</p>
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ""; }} />
                <div className="flex flex-wrap gap-3">
                  <button className="btn-primary" onClick={exportBackup}><IconSpark className="w-4.5 h-4.5" /> تصدير نسخة احتياطية</button>
                  <button className="btn-soft" onClick={() => fileRef.current?.click()}><IconShield className="w-4.5 h-4.5" /> استيراد نسخة</button>
                </div>
              </div>

              <div className="card p-6 anim-pop !border-coral/30" style={{ animationDelay: "80ms" }}>
                <h2 className="font-display font-bold text-xl text-coral mb-1.5 flex items-center gap-2"><IconTrash className="w-5 h-5" /> منطقة الخطر</h2>
                <p className="text-xs text-soft mb-4 leading-relaxed">إعادة التعيين تمسح كل التغييرات وتُرجع البيانات التجريبية الأصلية — المرضى، المواعيد، الفواتير، الإعدادات والمستخدمين. صدِّر نسخة احتياطية أولاً إن كنت تريد الحفاظ على عملك.</p>
                <button className="btn-danger" onClick={() => setConfirmReset(true)}>إعادة تعيين البيانات التجريبية…</button>
              </div>

              <div className="card p-6 anim-pop" style={{ animationDelay: "140ms" }}>
                <h2 className="font-display font-bold text-xl text-ink mb-3">حول النظام</h2>
                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-mist/70 border border-line p-3.5">
                    <p className="font-bold text-soft">الإصدار</p>
                    <p className="stat-num text-lg text-ink mt-1">2.6</p>
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
        title="إعادة تعيين كل البيانات؟"
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
                push("warn", "أُعيدت البيانات التجريبية", "عادت العيادة إلى حالتها الأولى.");
              }}
            >
              <IconAlert className="w-4.5 h-4.5" />
              نعم، امسح وأعد التعيين
            </button>
          </>
        }
      >
        <p className="text-sm text-soft leading-relaxed">
          سيُمسح كل ما أضفته أو عدّلته: <b className="text-ink">{db.patients.length} مريضاً</b>، <b className="text-ink">{db.appointments.length} موعداً</b>، <b className="text-ink">{db.invoices.length} فاتورة</b>، و<b className="text-ink">{db.sessions.length} جلسة علاج</b> — وتعود الإعدادات وهوية العيادة للافتراضي. هل صدّرت نسخة احتياطية؟
        </p>
      </Modal>
    </div>
  );
}
