import React, { useEffect, useMemo, useRef, useState } from "react";
import { APPT_META, CLINIC_LATIN, CLINIC_NAME, invoiceTotal, StoreProvider, today, useStore } from "./store";
import {
  IconBell,
  IconCalendar,
  IconCoins,
  IconGrid,
  IconMenu,
  IconReceipt,
  IconSearch,
  IconSpark,
  IconStetho,
  IconUsers,
  IconX,
  Logo,
} from "./icons";
import { Avatar, Drop, ToastProvider, useToast } from "./components/ui";
import Dashboard from "./pages/Dashboard";
import PatientsPage, { PatientDrawer } from "./pages/Patients";
import AppointmentsPage, { AddAppointmentModal } from "./pages/Appointments";
import InvoicesPage from "./pages/Invoices";
import ServicesPage from "./pages/Services";
import TeamPage from "./pages/Team";
import CurrenciesPage from "./pages/Currencies";

type Tab = "dashboard" | "appointments" | "patients" | "invoices" | "services" | "team" | "currencies";

const NAV: { key: Tab; label: string; icon: (c: string) => React.ReactNode }[] = [
  { key: "dashboard", label: "لوحة التحكم", icon: (c) => <IconGrid className={c} /> },
  { key: "appointments", label: "المواعيد", icon: (c) => <IconCalendar className={c} /> },
  { key: "patients", label: "المرضى", icon: (c) => <IconUsers className={c} /> },
  { key: "invoices", label: "الفواتير", icon: (c) => <IconReceipt className={c} /> },
  { key: "services", label: "قائمة الأسعار", icon: (c) => <IconSpark className={c} /> },
  { key: "team", label: "الفريق الطبي", icon: (c) => <IconStetho className={c} /> },
  { key: "currencies", label: "العملات", icon: (c) => <IconCoins className={c} /> },
];

const TITLES: Record<Tab, string> = {
  dashboard: "لوحة التحكم",
  appointments: "المواعيد",
  patients: "المرضى",
  invoices: "الفواتير",
  services: "قائمة الأسعار",
  team: "الفريق الطبي",
  currencies: "العملات",
};

function Shell() {
  const { db, dispatch, patientById, serviceById } = useStore();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [addPatientSignal, setAddPatientSignal] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [book, setBook] = useState<{ open: boolean; patientId?: string; time?: string; date?: string }>({ open: false });

  const todayCount = db.appointments.filter((a) => a.date === today(0) && a.status !== "cancelled").length;
  const unpaidCount = db.invoices.filter((i) => i.paid < invoiceTotal(i)).length;
  const badges: Partial<Record<Tab, number>> = { appointments: todayCount, invoices: unpaidCount };

  const openBook = (patientId?: string, time?: string) =>
    setBook({ open: true, patientId, time, date: today(0) });

  const newPatient = () => {
    setTab("patients");
    setAddPatientSignal(Date.now());
  };

  return (
    <div className="min-h-screen flex">
      {/* ====== الشريط الجانبي ====== */}
      <SidebarContent
        tab={tab}
        badges={badges}
        onNav={(t) => {
          setTab(t as Tab);
          setMobileNav(false);
        }}
        onReset={() => {
          dispatch({ type: "RESET" });
          push("info", "أُعيدت البيانات التجريبية", "عادت العيادة إلى حالتها الأولى.");
        }}
        className="hidden lg:flex sticky top-0 h-screen w-64 shrink-0"
      />
      {mobileNav && (
        <div className="fixed inset-0 z-[65] lg:hidden">
          <div className="absolute inset-0 bg-pine/60 anim-overlay" onClick={() => setMobileNav(false)} />
          <SidebarContent
            tab={tab}
            badges={badges}
            onNav={(t) => {
              setTab(t as Tab);
              setMobileNav(false);
            }}
            onReset={() => {
              dispatch({ type: "RESET" });
              push("info", "أُعيدت البيانات التجريبية");
            }}
            onClose={() => setMobileNav(false)}
            className="anim-drawer absolute inset-y-0 start-0 w-72 flex shadow-2xl"
          />
        </div>
      )}

      {/* ====== المحتوى ====== */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          tab={tab}
          onMenu={() => setMobileNav(true)}
          onOpenPatient={setDrawerId}
        />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-[1440px] mx-auto">
          {tab === "dashboard" && (
            <Dashboard
              onOpenPatient={setDrawerId}
              onQuickBook={() => openBook()}
              onNewPatient={newPatient}
              onNav={(t) => setTab(t as Tab)}
            />
          )}
          {tab === "appointments" && <AppointmentsPage onOpenPatient={setDrawerId} onBook={openBook} />}
          {tab === "patients" && <PatientsPage addSignal={addPatientSignal} onOpenPatient={setDrawerId} onBook={(pid) => openBook(pid)} />}
          {tab === "invoices" && <InvoicesPage />}
          {tab === "services" && <ServicesPage />}
          {tab === "team" && <TeamPage />}
          {tab === "currencies" && <CurrenciesPage />}

          <footer className="mt-10 pb-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-soft/80 font-medium">
            <span>نظام {CLINIC_NAME} · إصدار 2.5</span>
            <span>البيانات تُحفَظ محلياً على هذا الجهاز</span>
          </footer>
        </main>
      </div>

      {/* ====== طبقات عامة ====== */}
      <PatientDrawer id={drawerId} onClose={() => setDrawerId(null)} onBook={(pid) => openBook(pid)} />
      <AddAppointmentModal
        open={book.open}
        onClose={() => setBook({ open: false })}
        defaultPatient={book.patientId}
        defaultTime={book.time}
        defaultDate={book.date}
      />
    </div>
  );
}

/* ============================ الشريط الجانبي ============================ */

function SidebarContent({
  tab,
  badges,
  onNav,
  onReset,
  onClose,
  className,
}: {
  tab: Tab;
  badges: Partial<Record<Tab, number>>;
  onNav: (t: string) => void;
  onReset: () => void;
  onClose?: () => void;
  className: string;
}) {
  const { db } = useStore();
  const doc = db.doctors[0];
  return (
    <aside className={`${className} flex-col bg-pine sidebar-texture text-white`}>
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <Logo className="w-11 h-11 shrink-0" />
        <div className="min-w-0">
          <p className="font-display font-bold text-[17px] leading-tight">{CLINIC_NAME}</p>
          <p className="text-[9px] text-white/50 font-semibold tracking-wider mt-0.5" dir="ltr">{CLINIC_LATIN}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="icon-btn !text-white/60 hover:!bg-white/10 hover:!text-white ms-auto" aria-label="إغلاق القائمة">
            <IconX />
          </button>
        )}
      </div>

      <p className="px-6 text-[10px] font-bold text-white/35 tracking-widest mb-2 mt-2">القائمة الرئيسية</p>
      <nav className="px-4 space-y-1">
        {NAV.map((n) => (
          <button key={n.key} className={`navlink ${tab === n.key ? "active" : ""}`} onClick={() => onNav(n.key)}>
            {n.icon("w-5 h-5")}
            <span className="flex-1 text-start">{n.label}</span>
            {badges[n.key] ? (
              <span className="chip !py-1 !px-2 bg-white/12 text-[#7fe0d4] !text-[10px]">{badges[n.key]}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="mt-auto px-4 pb-5 space-y-3">
        {/* الطبيب المناوب */}
        <div className="rounded-xl bg-white/6 border border-white/10 p-3.5">
          <div className="flex items-center gap-3">
            <span className="relative">
              <Avatar name={doc?.name ?? "طبيب"} size="w-10 h-10 text-xs" />
              <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-mint border-2 border-pine pulse-dot" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{doc?.name}</p>
              <p className="text-[10px] text-white/50 font-semibold mt-0.5">مناوب الآن · {doc?.specialty}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 text-[10px] font-bold">
            <span className="text-white/45">طاقم اليوم</span>
            <div className="flex -space-x-1.5">
              {db.doctors.map((d) => (
                <Avatar key={d.id} name={d.name} size="w-6 h-6 text-[9px] ring-2 ring-pine" />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onReset}
          className="w-full text-center text-[11px] font-bold text-white/40 hover:text-white/80 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
        >
          إعادة تعيين البيانات التجريبية
        </button>
      </div>
    </aside>
  );
}

/* ============================ الشريط العلوي ============================ */

function Topbar({ tab, onMenu, onOpenPatient }: { tab: Tab; onMenu: () => void; onOpenPatient: (id: string) => void }) {
  const { db } = useStore();
  const [q, setQ] = useState("");
  const [now, setNow] = useState(new Date());
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setQ("");
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const s = q.trim();
    if (s.length < 2) return [];
    return db.patients.filter((p) => p.name.includes(s) || p.phone.includes(s)).slice(0, 5);
  }, [q, db.patients]);

  const upcoming = useMemo(
    () =>
      db.appointments
        .filter((a) => a.date === today(0) && ["confirmed", "waiting", "inprogress"].includes(a.status))
        .sort((a, b) => a.time.localeCompare(b.time)),
    [db.appointments]
  );

  const clock = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);

  return (
    <header className="sticky top-0 z-40 bg-mist/85 backdrop-blur-md border-b border-line">
      <div className="max-w-[1440px] mx-auto flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-16">
        <button className="icon-btn lg:hidden" onClick={onMenu} aria-label="القائمة">
          <IconMenu />
        </button>
        <h2 className="font-display font-bold text-lg text-ink w-28 shrink-0 hidden sm:block">{TITLES[tab]}</h2>

        {/* البحث العام */}
        <div ref={searchRef} className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 start-3 flex items-center text-soft pointer-events-none">
            <IconSearch className="w-4.5 h-4.5" />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن مريض بالاسم أو الجوال…"
            className="input !ps-10 !bg-white/70"
          />
          {q.trim().length >= 2 && (
            <div className="anim-pop absolute z-50 mt-2 inset-x-0 card !rounded-xl p-1.5 shadow-[0_18px_44px_-12px_rgba(11,47,43,0.3)]">
              {results.length === 0 ? (
                <p className="text-xs text-soft px-3 py-3 text-center">لا نتائج لـ «{q}»</p>
              ) : (
                results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onOpenPatient(p.id);
                      setQ("");
                    }}
                    className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-jade-soft cursor-pointer transition-colors text-start"
                  >
                    <Avatar name={p.name} size="w-8 h-8 text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink truncate">{p.name}</p>
                      <p className="text-[10px] text-soft" dir="ltr">{p.phone}</p>
                    </div>
                    <span className="text-[10px] font-bold text-jade-deep">فتح الملف</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* الساعة */}
        <span className="hidden md:inline-flex items-center gap-2 chip bg-white border border-line !py-2 text-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-mint pulse-dot" />
          <span className="stat-num text-xs" dir="ltr">{clock}</span>
        </span>

        {/* التنبيهات */}
        <Drop
          align="end"
          panelCls="w-80 p-0 overflow-hidden"
          button={
            <span className="icon-btn relative !w-10 !h-10 bg-white border border-line">
              <IconBell className="w-5 h-5" />
              {upcoming.length > 0 && (
                <span className="absolute -top-1 -end-1 min-w-4.5 h-4.5 px-1 rounded-full bg-coral text-white text-[9px] font-bold flex items-center justify-center stat-num">
                  {upcoming.length}
                </span>
              )}
            </span>
          }
        >
          <p className="px-4 py-3 text-xs font-bold text-soft border-b border-line bg-mist/60">مواعيد اليوم القادمة</p>
          {upcoming.length === 0 ? (
            <p className="px-4 py-5 text-xs text-soft text-center">لا مواعيد متبقية اليوم — جدول مكتمل</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {upcoming.map((a) => {
                const p = db.patients.find((x) => x.id === a.patientId);
                const s = db.services.find((x) => x.id === a.serviceId);
                const meta = APPT_META[a.status];
                return (
                  <li key={a.id} className="border-b border-line/60 last:border-0">
                    <button
                      onClick={() => p && onOpenPatient(p.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-jade-soft/50 transition-colors cursor-pointer text-start"
                    >
                      <span className="stat-num text-sm text-jade-deep w-12 shrink-0">{a.time}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-ink truncate">{p?.name}</p>
                        <p className="text-[10px] text-soft truncate">{s?.name}</p>
                      </div>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.dot }} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Drop>

        {/* الحساب */}
        <div className="flex items-center gap-2.5 ps-2 border-s border-line">
          <Avatar name="عبدالله الشرفي" size="w-9 h-9 text-xs" />
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-bold text-ink">د. عبدالله الشرفي</p>
            <p className="text-[10px] text-soft">مدير العيادة</p>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ============================ الجذر ============================ */

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </StoreProvider>
  );
}
