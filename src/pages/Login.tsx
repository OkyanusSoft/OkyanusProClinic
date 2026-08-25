import React, { useEffect, useMemo, useState } from "react";
import { clinicOf, ROLE_META, useAuth, useStore, type Role } from "../store";
import { IconChevronDown, IconShield, IconTooth, Logo } from "../icons";
import { Avatar, useToast } from "../components/ui";

const GROUPS: { role: Role; hint: string }[] = [
  { role: "admin", hint: "إدارة كاملة" },
  { role: "doctor", hint: "مرضاك وجلساتك" },
  { role: "secretary", hint: "استقبال وحجوزات" },
  { role: "assistant", hint: "مساندة العيادة" },
];

export default function Login() {
  const { db } = useStore();
  const clinic = clinicOf(db);
  const { loginById } = useAuth();
  const { push } = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [ok, setOk] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [now, setNow] = useState(new Date());

  const selected = db.users.find((u) => u.id === selectedId) ?? null;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const activeUsers = useMemo(() => db.users.filter((u) => u.active), [db.users]);

  const submit = (p: string) => {
    if (!selected) return;
    const res = loginById(selected.id, p);
    if (res.ok) {
      setOk(true);
      push("success", `أهلاً ${selected.name}`, "تم تسجيل الدخول بنجاح.");
    } else {
      setError(res.error ?? "تعذّر الدخول.");
      setShake((s) => s + 1);
      setPin("");
    }
  };

  const press = (d: string) => {
    if (ok) return;
    setError("");
    if (d === "back") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      // مهلة قصيرة لإظهار النقطة الرابعة ثم محاولة الدخول
      setTimeout(() => submit(next), 180);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected || ok) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("back");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, selected, ok]);

  const time = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" }).format(now);
  const date = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { weekday: "long", day: "numeric", month: "long" }).format(now);

  return (
    <div className="min-h-screen flex">
      {/* ====== اللوحة التعريفية ====== */}
      <aside className="hidden lg:flex w-[420px] shrink-0 bg-pine sidebar-texture text-white flex-col relative overflow-hidden">
        {/* خط النبض */}
        <svg className="absolute inset-x-0 top-1/3 w-[200%] opacity-25" viewBox="0 0 1200 120" fill="none" preserveAspectRatio="none">
          <path
            d="M0 60 H280 L310 20 L340 100 L365 60 H560 L590 34 L615 86 L640 60 H900 L930 14 L960 104 L985 60 H1200"
            stroke="#3fd0c0"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="ecg-line"
          />
        </svg>
        <IconTooth className="absolute -bottom-16 -start-16 w-72 h-72 text-white/[0.05]" />

        <div className="relative flex items-center gap-3.5 px-9 pt-10">
          <Logo className="w-14 h-14" />
          <div>
            <p className="font-display font-bold text-[22px] leading-tight">{clinic.clinicName}</p>
            <p className="text-[10px] text-white/50 font-semibold tracking-[0.18em] mt-1" dir="ltr">{clinic.clinicLatin}</p>
          </div>
        </div>

        <div className="relative px-9 mt-14 space-y-7">
          <div>
            <p className="font-display font-bold text-4xl leading-[1.25]">
              نظام إدارة
              <br />
              <span className="text-[#3fd0c0]">العيادة الكامل</span>
            </p>
            <p className="text-sm text-white/60 mt-4 leading-relaxed">
              مواعيد، ملفات مرضى، جلسات علاج، فواتير وتقارير — كل ذلك من مكان واحد.
            </p>
          </div>

          <div className="space-y-3">
            {[
              ["مواعيد وجلسات علاج لحظية", "#0d8f83"],
              ["روشتة وفاتورة إلكترونية قابلة للطباعة", "#3a86c4"],
              ["صلاحيات دقيقة لكل مستخدم", "#e2952b"],
              ["عملات متعددة ونسخ احتياطي", "#2c9c69"],
            ].map(([t, c]) => (
              <div key={t as string} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full shrink-0 pulse-dot" style={{ background: c as string }} />
                <span className="text-[13px] font-medium text-white/80">{t as string}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-auto px-9 pb-9">
          <div className="rounded-xl bg-white/6 border border-white/10 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="stat-num text-2xl font-bold" dir="ltr">{time}</p>
              <p className="text-[11px] text-white/55 font-semibold mt-0.5">{date}</p>
            </div>
            <span className="inline-flex items-center gap-2 chip bg-mint/15 text-[#5fe0a8] !py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-mint pulse-dot" />
              العيادة مفتوحة
            </span>
          </div>
        </div>
      </aside>

      {/* ====== منطقة الدخول ====== */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[520px]">
          {/* رأس للجوال */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Logo className="w-12 h-12" />
            <div>
              <p className="font-display font-bold text-xl leading-tight text-ink">{clinic.clinicName}</p>
              <p className="text-[10px] text-soft font-semibold tracking-widest" dir="ltr">{clinic.clinicLatin}</p>
            </div>
          </div>

          {!selected ? (
            <div className="anim-rise">
              <h1 className="font-display font-bold text-3xl text-ink">من يستخدم النظام الآن؟</h1>
              <p className="text-sm text-soft mt-2">اختر حسابك ثم أدخل رمز الدخول المكوّن من 4 أرقام.</p>

              <div className="mt-8 space-y-6">
                {GROUPS.map((g) => {
                  const users = activeUsers.filter((u) => u.role === g.role);
                  if (users.length === 0) return null;
                  return (
                    <div key={g.role}>
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className={`chip ${ROLE_META[g.role].cls}`}>{ROLE_META[g.role].label}</span>
                        <span className="text-[11px] font-semibold text-soft">{g.hint}</span>
                        <span className="flex-1 h-px bg-line" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {users.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setSelectedId(u.id);
                              setPin("");
                              setError("");
                            }}
                            className="card card-hover p-4 flex flex-col items-center gap-2.5 cursor-pointer text-center"
                          >
                            <Avatar name={u.name} size="w-12 h-12 text-sm" />
                            <div>
                              <p className="text-[13px] font-bold text-ink leading-tight">{u.name}</p>
                              <p className="text-[10px] text-soft mt-0.5" dir="ltr">@{u.username}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="anim-pop">
              <button
                onClick={() => {
                  setSelectedId(null);
                  setPin("");
                  setError("");
                  setOk(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-soft hover:text-ink transition-colors cursor-pointer mb-6"
              >
                <IconChevronDown className="w-4 h-4 rotate-90" />
                تغيير المستخدم
              </button>

              <div className="card !rounded-2xl p-8 text-center">
                <Avatar name={selected.name} size="w-16 h-16 text-lg" />
                <h2 className="font-display font-bold text-2xl text-ink mt-4">{selected.name}</h2>
                <p className="text-xs text-soft mt-1">
                  {ROLE_META[selected.role].label} · <span dir="ltr">@{selected.username}</span>
                </p>

                {/* نقاط الرمز */}
                <div
                  key={shake}
                  className={`flex items-center justify-center gap-3.5 mt-8 ${error ? "anim-shake" : ""}`}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                        ok
                          ? "bg-mint border-mint scale-110"
                          : i < pin.length
                          ? "bg-jade border-jade scale-110"
                          : "border-line bg-mist"
                      }`}
                    />
                  ))}
                </div>

                {error ? (
                  <p className="mt-4 text-xs font-bold text-coral bg-coral-soft rounded-lg px-4 py-2.5 anim-pop">{error}</p>
                ) : ok ? (
                  <p className="mt-4 text-xs font-bold text-[#1d6b47] bg-mint-soft rounded-lg px-4 py-2.5 anim-pop">
                    جارٍ فتح النظام…
                  </p>
                ) : (
                  <p className="mt-4 text-[11px] font-semibold text-soft">أدخل رمز الدخول (4 أرقام)</p>
                )}

                {/* لوحة الأرقام */}
                <div className="grid grid-cols-3 gap-3 mt-7 max-w-72 mx-auto" dir="ltr">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((k, i) =>
                    k === "" ? (
                      <span key={i} />
                    ) : (
                      <button
                        key={i}
                        onClick={() => press(k)}
                        disabled={ok}
                        className={`h-14 rounded-xl font-display font-bold text-xl transition-all cursor-pointer select-none ${
                          k === "back"
                            ? "text-soft hover:bg-coral-soft hover:text-coral text-sm"
                            : "bg-mist hover:bg-jade-soft text-ink active:scale-95"
                        } disabled:opacity-40`}
                      >
                        {k === "back" ? "⌫" : k}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* تلميح رموز التجربة */}
          <div className="mt-6">
            <button
              onClick={() => setShowHint((s) => !s)}
              className="inline-flex items-center gap-2 text-[11px] font-bold text-soft hover:text-jade-deep transition-colors cursor-pointer"
            >
              <IconShield className="w-4 h-4" />
              رموز الدخول التجريبية {showHint ? "▲" : "▼"}
            </button>
            {showHint && (
              <div className="anim-pop mt-3 card !rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                {db.users.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 text-[11px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ROLE_META[u.role].color }} />
                    <span className="font-semibold text-ink truncate">{u.name}</span>
                    <span className="stat-num ms-auto font-bold text-jade-deep" dir="ltr">{u.pin}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
