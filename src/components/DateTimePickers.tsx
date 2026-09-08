/**
 * منتقيا التاريخ والوقت الاحترافيان
 * الوجهة: src/components/DateTimePickers.tsx
 * ------------------------------------------------
 * DatePicker  — شاشة تقويم ميلادي بأسماء عربية، تنقّل شهر/سنة، اختصارات سريعة
 * TimePicker  — شبكة أوقات حقيقية من ساعات دوام العيادة مع ساعة حيّة وتعطيل المحجوز
 */
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IconCalendar, IconClock, IconX } from "../icons";

/* ---------- أدوات تاريخ محلية ---------- */
const p2 = (n: number) => String(n).padStart(2, "0");
const time12 = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  const suffix = hours < 12 ? "ص" : "م";
  const hour = hours % 12 || 12;
  return `${hour}:${p2(minutes)} ${suffix}`;
};
const isoOf = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const toDisplay = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? "")) return iso ?? "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const monthLong = (y: number, m: number) =>
  new Intl.DateTimeFormat("ar", { month: "long" }).format(new Date(y, m, 1));

/* أيام الأسبوع بدءاً من السبت (1 يونيو 2024 كان سبتاً) */
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7].map((d) =>
  new Intl.DateTimeFormat("ar", { weekday: "short" }).format(new Date(2024, 5, d))
);

/* ============================================================
   DatePicker — شاشة التقويم الاحترافية
   ============================================================ */
export function DatePicker({
  value,
  onChange,
  placeholder,
  min,
  max,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
}) {
  const [open, setOpen] = useState(false);
  const base = /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? new Date(value + "T12:00:00") : new Date();
  const [viewY, setViewY] = useState(base.getFullYear());
  const [viewM, setViewM] = useState(base.getMonth());

  const todayIso = isoOf(new Date());

  /* إعادة توجيه العرض عند الفتح */
  useEffect(() => {
    if (!open) return;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? new Date(value + "T12:00:00") : new Date();
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
  }, [open, value]);

  /* إغلاق بمفتاح Esc */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const cells = useMemo(() => {
    const first = new Date(viewY, viewM, 1);
    const lead = (first.getDay() + 1) % 7; // بداية الأسبوع: السبت
    const dim = new Date(viewY, viewM + 1, 0).getDate();
    const prevDim = new Date(viewY, viewM, 0).getDate();
    const arr: { day: number; inMonth: boolean; iso: string }[] = [];
    for (let i = lead - 1; i >= 0; i--) arr.push({ day: prevDim - i, inMonth: false, iso: "" });
    for (let d = 1; d <= dim; d++) arr.push({ day: d, inMonth: true, iso: `${viewY}-${p2(viewM + 1)}-${p2(d)}` });
    let t = 1;
    while (arr.length % 7 !== 0) arr.push({ day: t++, inMonth: false, iso: "" });
    return arr;
  }, [viewY, viewM]);

  const move = (delta: number) => {
    const d = new Date(viewY, viewM + delta, 1);
    setViewY(d.getFullYear());
    setViewM(d.getMonth());
  };

  const disabled = (iso: string) => (!!min && iso < min) || (!!max && iso > max);

  const preset = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    onChange(isoOf(d));
    setOpen(false);
  };

  const years = useMemo(() => {
    const cy = new Date().getFullYear();
    const arr: number[] = [];
    for (let y = cy - 12; y <= cy + 6; y++) arr.push(y);
    return arr;
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="input !h-10 flex items-center justify-between gap-2 !cursor-pointer hover:!border-jade/60 transition-colors w-full"
      >
        <span className={`stat-num text-sm ${value ? "text-ink font-bold" : "text-soft/60"}`} dir="ltr">
          {value ? toDisplay(value) : placeholder ?? "dd/mm/yyyy"}
        </span>
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-jade-soft text-jade-deep shrink-0">
          <IconCalendar className="w-3.5 h-3.5" />
        </span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-pine/60 backdrop-blur-[2px] anim-overlay" onClick={() => setOpen(false)} />

            <div className="anim-pop relative w-full max-w-sm card !rounded-2xl !border-0 shadow-2xl overflow-hidden" dir="rtl">
              {/* الترويسة */}
              <div className="sidebar-texture bg-pine text-white px-5 pt-4 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => move(-1)}
                      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
                      aria-label="الشهر السابق"
                    >
                      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(1)}
                      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
                      aria-label="الشهر التالي"
                    >
                      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
                    </button>
                  </div>

                  <div className="text-center flex-1 min-w-0">
                    <p className="font-display font-bold text-xl leading-tight">{monthLong(viewY, viewM)}</p>
                    <select
                      value={viewY}
                      onChange={(e) => setViewY(Number(e.target.value))}
                      className="mt-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer transition-colors appearance-none text-center"
                      aria-label="السنة"
                    >
                      {years.map((y) => (
                        <option key={y} value={y} className="text-ink">{y}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-coral/70 flex items-center justify-center cursor-pointer transition-all"
                    aria-label="إغلاق"
                  >
                    <IconX className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* الشبكة */}
              <div className="p-4 bg-white">
                <div className="grid grid-cols-7 gap-1 mb-1.5">
                  {WEEKDAYS.map((w, i) => (
                    <span key={w} className={`text-center text-[10.5px] font-bold py-1 ${(i === 0 || i === 6) ? "text-jade-deep" : "text-soft"}`}>{w}</span>
                  ))}
                </div>
                <div key={`${viewY}-${viewM}`} className="grid grid-cols-7 gap-1 anim-fade">
                  {cells.map((c, i) => {
                    const col = i % 7;
                    const weekend = col === 0 || col === 6;
                    const isToday = c.iso === todayIso;
                    const isSel = c.iso === value;
                    const off = !c.inMonth || disabled(c.iso);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!c.inMonth || off}
                        onClick={() => { onChange(c.iso); setOpen(false); }}
                        className={`relative h-10 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer
                          ${isSel ? "bg-jade text-white shadow-lg shadow-jade/30 scale-105" : ""}
                          ${!isSel && c.inMonth && !off ? (weekend ? "text-soft hover:bg-jade-soft/70 hover:-translate-y-px" : "text-ink hover:bg-jade-soft/70 hover:-translate-y-px") : ""}
                          ${!c.inMonth ? "text-soft/30 cursor-default" : ""}
                          ${c.inMonth && off && !isSel ? "text-soft/30 cursor-not-allowed" : ""}
                        `}
                      >
                        <span className="stat-num">{c.day}</span>
                        {isToday && !isSel && <span className="absolute bottom-1 start-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-jade pulse-soft" />}
                        {isToday && <span className="absolute top-0.5 end-1 text-[7px] font-black text-jade-deep/70">اليوم</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* الاختصارات */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-line bg-mist/60">
                <div className="flex items-center gap-1.5">
                  {[{ l: "اليوم", o: 0 }, { l: "غداً", o: 1 }, { l: "بعد أسبوع", o: 7 }].map((pr) => (
                    <button
                      key={pr.l}
                      type="button"
                      onClick={() => preset(pr.o)}
                      className="chip bg-jade-soft text-jade-deep hover:bg-jade hover:text-white transition-all cursor-pointer !py-1.5"
                    >
                      {pr.l}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setOpen(false)} className="text-[11px] font-bold text-soft hover:text-ink cursor-pointer transition-colors">
                  إلغاء
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/* ============================================================
   TimePicker — منتقي الوقت الحقيقي من ساعات الدوام
   ============================================================ */
export function TimePicker({
  value,
  onChange,
  start = "09:00",
  end = "20:00",
  busyTimes = [],
  placeholder,
}: {
  value: string;
  onChange: (t: string) => void;
  start?: string;
  end?: string;
  busyTimes?: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const slots = useMemo(() => {
    const s = parseInt(start.slice(0, 2), 10);
    const e = parseInt(end.slice(0, 2), 10);
    const arr: string[] = [];
    for (let h = s; h < e; h++) {
      arr.push(`${p2(h)}:00`);
      arr.push(`${p2(h)}:30`);
    }
    return arr;
  }, [start, end]);

  const groups = useMemo(
    () =>
      [
        { label: "الفترة الصباحية", items: slots.filter((t) => parseInt(t, 10) < 12) },
        { label: "فترة الظهيرة", items: slots.filter((t) => parseInt(t, 10) >= 12 && parseInt(t, 10) < 16) },
        { label: "الفترة المسائية", items: slots.filter((t) => parseInt(t, 10) >= 16) },
      ].filter((g) => g.items.length > 0),
    [slots]
  );

  const busySet = useMemo(() => new Set(busyTimes), [busyTimes]);
  const nowStr = `${p2(now.getHours())}:${p2(now.getMinutes())}:${p2(now.getSeconds())}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="input !h-10 flex items-center justify-between gap-2 !cursor-pointer hover:!border-jade/60 transition-colors w-full"
      >
        <span className={`stat-num text-sm ${value ? "text-ink font-bold" : "text-soft/60"}`} dir="ltr">
          {value ? time12(value) : placeholder || "— : —"}
        </span>
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-sky-soft text-sky shrink-0">
          <IconClock className="w-3.5 h-3.5" />
        </span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-pine/60 backdrop-blur-[2px] anim-overlay" onClick={() => setOpen(false)} />

            <div className="anim-pop relative w-full max-w-sm card !rounded-2xl !border-0 shadow-2xl overflow-hidden" dir="rtl">
              {/* الترويسة */}
              <div className="sidebar-texture bg-pine text-white px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10">
                      <IconClock className="w-5.5 h-5.5" />
                    </span>
                    <div>
                      <p className="font-display font-bold text-lg leading-tight">اختر وقت الموعد</p>
                      <p className="text-[10px] text-white/60 font-semibold mt-0.5">
                        الدوام: <span className="stat-num" dir="ltr">{time12(start)} – {time12(end)}</span>
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-coral/70 flex items-center justify-center cursor-pointer transition-all" aria-label="إغلاق">
                    <IconX className="w-4.5 h-4.5" />
                  </button>
                </div>
                {/* الساعة الحية + الاختيار الحالي */}
                <div className="mt-3 flex items-center justify-between rounded-xl bg-white/8 border border-white/10 px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-[11px] font-bold text-white/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-mint pulse-dot" />
                    الآن
                    <span className="stat-num text-[#7fe0d4]" dir="ltr">{time12(nowStr.slice(0, 5))}</span>
                  </span>
                  <span className="stat-num font-display font-bold text-2xl text-white" dir="ltr">{value ? time12(value) : "--:--"}</span>
                </div>
              </div>

              {/* الشبكة */}
              <div className="max-h-[52vh] overflow-y-auto p-4 bg-white space-y-4">
                {groups.map((g) => (
                  <div key={g.label}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-[10.5px] font-black text-soft tracking-wide">{g.label}</p>
                      <span className="flex-1 h-px bg-line" />
                      <span className="chip bg-mist text-soft !text-[9px] stat-num">{g.items.length}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {g.items.map((t) => {
                        const isBusy = busySet.has(t);
                        const isSel = t === value;
                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={isBusy}
                            title={isBusy ? "هذا الوقت محجوز" : undefined}
                            onClick={() => { onChange(t); setOpen(false); }}
                            className={`h-10 rounded-xl stat-num text-[13px] font-bold transition-all duration-150
                              ${isSel ? "bg-jade text-white shadow-lg shadow-jade/30 scale-105" : ""}
                              ${!isSel && !isBusy ? "border border-line text-ink hover:border-jade hover:bg-jade-soft/60 hover:-translate-y-px cursor-pointer" : ""}
                              ${isBusy ? "bg-mist text-soft/40 line-through cursor-not-allowed" : ""}
                            `}
                            dir="ltr"
                          >
                            {time12(t)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {slots.length === 0 && (
                  <p className="text-center text-xs text-soft py-6">لا أوقات متاحة — تحقق من ساعات الدوام في الإعدادات العامة.</p>
                )}
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-line bg-mist/60">
                <span className="text-[10px] font-semibold text-soft">الأوقات المشطوبة محجوزة لدى الطبيب نفسه</span>
                <button type="button" onClick={() => setOpen(false)} className="text-[11px] font-bold text-soft hover:text-ink cursor-pointer transition-colors">
                  إلغاء
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
