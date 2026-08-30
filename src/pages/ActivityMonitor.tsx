import React, { useEffect, useMemo, useState } from "react";
import { ROLE_META, clinicOf, useStore } from "../store";
import { fetchDevices, fetchEvents, ping, type DeviceRow, type LogRow } from "../api";
import { IconBox, IconCheck, IconPulse, IconSearch, IconShield, IconTrash, IconUsers } from "../icons";
import { AnimatedNumber, Avatar, Badge, EmptyState } from "../components/ui";

const AR = "ar-EG-u-nu-latn";
const fmtTime = (ms: number) =>
  new Intl.DateTimeFormat(AR, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(ms));
const fmtDay = (ms: number) => new Intl.DateTimeFormat(AR, { day: "numeric", month: "short" }).format(new Date(ms));

const CATS = ["الكل", "المرضى", "المواعيد", "المالية", "الخدمات", "المخزون", "الجلسات", "المتابعات", "الإدارة", "الإعدادات", "النظام"];
const CAT_COLORS: Record<string, string> = {
  "المرضى": "#1273c4",
  "المواعيد": "#2f9fe0",
  "المالية": "#2c9c69",
  "الخدمات": "#0b518f",
  "المخزون": "#e2952b",
  "الجلسات": "#d9503a",
  "المتابعات": "#3a86c4",
  "الإدارة": "#7c5cd6",
  "الإعدادات": "#5b7370",
  "النظام": "#b23a48",
};
const catColor = (c: string) => CAT_COLORS[c] ?? "#5b7370";

export default function ActivityMonitor() {
  const { db, conn } = useStore();
  const clinic = clinicOf(db);
  const [events, setEvents] = useState<LogRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [serverUp, setServerUp] = useState<boolean | null>(null);
  const [userFilter, setUserFilter] = useState("الكل");
  const [catFilter, setCatFilter] = useState("الكل");
  const [q, setQ] = useState("");
  const [lastSync, setLastSync] = useState(Date.now());

  const refresh = async () => {
    const [ev, dv, up] = await Promise.all([fetchEvents(300), fetchDevices(), ping()]);
    setEvents(ev);
    setDevices(dv);
    setServerUp(up);
    setLastSync(Date.now());
  };

  /* تحديث حي كل 5 ثوانٍ */
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  const users = useMemo(() => ["الكل", ...new Set(events.map((e) => e.user_name).filter(Boolean))], [events]);

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (userFilter === "الكل" || e.user_name === userFilter) &&
          (catFilter === "الكل" || e.cat === catFilter) &&
          (!q.trim() || e.description.includes(q.trim()) || e.user_name.includes(q.trim()))
      ),
    [events, userFilter, catFilter, q]
  );

  /* مؤشرات اليوم */
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEvents = events.filter((e) => e.at >= todayStart.getTime());
  const activeUsers = new Set(todayEvents.map((e) => e.user_name).filter(Boolean)).size;
  const deletions = events.filter((e) => e.action === "حذف").length;

  /* توزيع آخر 12 ساعة */
  const hours = useMemo(() => {
    const now = Date.now();
    const arr: { label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = now - (i + 1) * 3600_000;
      const end = now - i * 3600_000;
      const count = events.filter((e) => e.at >= start && e.at < end).length;
      arr.push({ label: new Intl.DateTimeFormat(AR, { hour: "numeric" }).format(new Date(end)), count });
    }
    return arr;
  }, [events]);
  const maxHour = Math.max(1, ...hours.map((h) => h.count));

  const Kpi = ({ label, value, tint, icon, sub }: { label: string; value: number; tint: string; icon: React.ReactNode; sub?: string }) => (
    <div className="card card-hover p-5 anim-rise">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold text-soft">{label}</p>
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${tint}`}>{icon}</span>
      </div>
      <AnimatedNumber value={value} className="stat-num text-[30px] text-ink block mt-1" />
      {sub && <p className="text-[11px] text-soft mt-1 font-medium">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* الترويسة */}
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-pine text-ice"><IconPulse className="w-6 h-6" /></span>
            مراقبة النشاط
          </h1>
          <p className="text-sm text-soft mt-1.5">
            متابعة حيّة لعمليات الموظفين على كل الأجهزة في <b className="text-jade-deep">{clinic.clinicName}</b> — تتحدث كل 5 ثوانٍ.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`chip !py-2 ${serverUp === null ? "bg-mist text-soft" : serverUp ? "bg-mint-soft text-[#1d6b47]" : "bg-coral-soft text-coral"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${serverUp ? "bg-mint pulse-dot" : serverUp === false ? "bg-coral" : "bg-soft"}`} />
            {serverUp === null ? "جارٍ الفحص…" : serverUp ? "الخادم متصل — بث حي" : "الخادم غير متاح"}
          </span>
          <span className="chip bg-white border border-line !py-2 text-soft stat-num !text-[10px]">آخر تحديث {fmtTime(lastSync)}</span>
        </div>
      </div>

      {conn === "offline" && (
        <div className="card !border-amber/40 bg-amber-soft/40 p-4 flex items-center gap-3 anim-fade">
          <IconShield className="w-5 h-5 text-[#a06410] shrink-0" />
          <p className="text-xs text-[#7a4c08] font-semibold leading-relaxed">
            النظام يعمل حالياً بالتخزين المحلي — لن تظهر عمليات الأجهزة الأخرى حتى يتصل بالخادم المركزي. شغّل الخادم (npm start) لعرض البث الحي.
          </p>
        </div>
      )}

      {/* المؤشرات */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="عمليات اليوم" value={todayEvents.length} tint="bg-jade-soft text-jade-deep" icon={<IconPulse className="w-5 h-5" />} sub="منذ منتصف الليل" />
        <Kpi label="موظفون نشطون" value={activeUsers} tint="bg-sky-soft text-sky" icon={<IconUsers className="w-5 h-5" />} sub="عملوا اليوم" />
        <Kpi label="أجهزة مسجلة" value={devices.length} tint="bg-mint-soft text-[#1d6b47]" icon={<IconBox className="w-5 h-5" />} sub="في شبكة العيادة" />
        <Kpi label="عمليات حذف" value={deletions} tint="bg-coral-soft text-coral" icon={<IconTrash className="w-5 h-5" />} sub="ضمن آخر 300 حدث" />
      </div>

      <div className="grid grid-cols-12 gap-5 items-start">
        {/* سجل الأحداث الحي */}
        <div className="col-span-12 xl:col-span-8 card anim-rise" style={{ animationDelay: "120ms" }}>
          <div className="flex flex-wrap items-center gap-2.5 px-5 pt-4 pb-3 border-b border-line">
            <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2 me-auto">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-coral opacity-60 animate-ping" />
                <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-coral" />
              </span>
              البث المباشر
            </h2>
            <div className="relative">
              <IconSearch className="w-3.5 h-3.5 text-soft absolute start-2.5 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث…" className="input !h-8 !ps-8 !text-xs !w-36" />
            </div>
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="input !h-8 !text-xs !w-auto cursor-pointer">
              {users.map((u) => (
                <option key={u} value={u}>{u === "الكل" ? "كل الموظفين" : u}</option>
              ))}
            </select>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="input !h-8 !text-xs !w-auto cursor-pointer">
              {CATS.map((c) => (
                <option key={c} value={c}>{c === "الكل" ? "كل الفئات" : c}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<IconPulse className="w-6 h-6" />} title="لا أحداث مطابقة" desc="ابدأ العمل على أي جهاز وستظهر العمليات هنا لحظياً." />
          ) : (
            <div className="max-h-[560px] overflow-y-auto divide-y divide-line/60">
              {filtered.map((e, i) => (
                <div key={e.id} className="flex items-start gap-3 px-5 py-3 hover:bg-jade-soft/25 transition-colors anim-fade" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                  <span className="w-1 self-stretch rounded-full shrink-0" style={{ background: catColor(e.cat) }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-ink">{e.user_name || "النظام"}</span>
                      <Badge cls="bg-mist text-soft !text-[9px] !px-1.5 !py-0.5">{e.user_role || "—"}</Badge>
                      <span className="chip !text-[9px] !px-1.5 !py-0.5" style={{ background: `${catColor(e.cat)}1f`, color: catColor(e.cat) }}>{e.cat}</span>
                      <span className={`chip !text-[9px] !px-1.5 !py-0.5 ${e.action === "حذف" ? "bg-coral-soft text-coral" : e.action === "إضافة" ? "bg-mint-soft text-[#1d6b47]" : "bg-sky-soft text-sky"}`}>{e.action}</span>
                    </div>
                    <p className="text-xs text-soft mt-1 leading-relaxed">{e.description}</p>
                    <p className="text-[10px] text-soft/60 mt-0.5 stat-num">{e.device_label || e.device_id} · {fmtDay(e.at)} · {fmtTime(e.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-12 xl:col-span-4 space-y-5">
          {/* توزيع النشاط */}
          <div className="card anim-rise" style={{ animationDelay: "180ms" }}>
            <div className="px-5 pt-4 pb-3 border-b border-line">
              <h2 className="font-display font-bold text-base text-ink">النشاط — آخر 12 ساعة</h2>
            </div>
            <div className="p-5 flex items-end gap-1.5 h-32" dir="ltr">
              {hours.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group" title={`${h.count} عملية`}>
                  <span className="text-[9px] font-bold text-soft opacity-0 group-hover:opacity-100 stat-num transition-opacity">{h.count}</span>
                  <div className="w-full rounded-t bg-jade anim-bar transition-all group-hover:bg-jade-deep" style={{ height: `${Math.max(4, (h.count / maxHour) * 100)}%`, animationDelay: `${i * 40}ms` }} />
                  <span className="text-[8px] text-soft stat-num">{h.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* الأجهزة */}
          <div className="card anim-rise" style={{ animationDelay: "240ms" }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
              <h2 className="font-display font-bold text-base text-ink">أجهزة الشبكة</h2>
              <span className="chip bg-mist text-soft stat-num !text-[10px]">{devices.length}</span>
            </div>
            {devices.length === 0 ? (
              <p className="text-xs text-soft text-center py-6">لا أجهزة مسجلة بعد — سمِّ جهازك من الإعدادات العامة.</p>
            ) : (
              <div className="divide-y divide-line/60 max-h-64 overflow-y-auto">
                {devices.map((d) => {
                  const recent = Date.now() - d.last_seen < 60_000;
                  return (
                    <div key={d.device_id} className="flex items-center gap-3 px-5 py-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${recent ? "bg-mint pulse-dot" : "bg-soft/40"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-ink truncate">{d.label || "جهاز غير مسمّى"}</p>
                        <p className="text-[10px] text-soft mt-0.5 truncate">آخر مستخدم: {d.last_user || "—"} · {fmtTime(d.last_seen)}</p>
                      </div>
                      <span className={`chip !text-[9px] !px-1.5 !py-0.5 ${recent ? "bg-mint-soft text-[#1d6b47]" : "bg-mist text-soft"}`}>{recent ? "نشط الآن" : "خامل"}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card p-4 anim-rise flex items-start gap-3" style={{ animationDelay: "300ms" }}>
            <IconCheck className="w-4.5 h-4.5 text-mint shrink-0 mt-0.5" />
            <p className="text-[11px] text-soft leading-relaxed">
              تُدمج بيانات كل الأجهزة في قاعدة مركزية واحدة — ما تُدخله السكرتارية يظهر للدكتور خلال ثوانٍ، والحذف ينتشر للجميع تلقائياً.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
