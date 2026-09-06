import React, { useMemo, useState } from "react";
import { useStore, useAuth, today, fmtDate } from "../store";
import {
  IconShield,
  IconSearch,
  IconPrinter,
  IconTrendUp,
  IconUsers,
  IconPencil,
  IconTrash,
  IconPlus,
  IconClock,
} from "../icons";
import { EmptyState, DateInput, TSelect, useToast } from "../components/ui";
import { PrintModal } from "../components/PrintSheet";

/* ============================ الأنواع والثوابت ============================ */

type Op = "add" | "edit" | "delete" | "other";

interface Ev {
  id: string;
  op: Op;
  category: string; // اسم الشاشة / الفئة
  desc: string;
  user?: string;
  role?: string;
  device?: string;
  time: string; // ISO
}

const OP_META: Record<Op, { label: string; cls: string; dot: string }> = {
  add: { label: "إضافة", cls: "bg-mint-soft text-[#1d6b47]", dot: "#2c9c69" },
  edit: { label: "تعديل", cls: "bg-amber-soft text-[#a06410]", dot: "#e2952b" },
  delete: { label: "حذف", cls: "bg-coral-soft text-coral", dot: "#d9503a" },
  other: { label: "أخرى", cls: "bg-sky-soft text-sky", dot: "#3a86c4" },
};

const ROLE_LABEL: Record<string, string> = {
  admin: "مدير",
  doctor: "طبيب",
  secretary: "سكرتارية",
  assistant: "مساعد",
};

const KIND_TO_SCREEN: Record<string, string> = {
  patient: "المرضى",
  appt: "المواعيد",
  invoice: "الفواتير",
  rx: "الروشتات",
  tooth: "خريطة الأسنان",
  team: "الفريق الطبي",
  expenses: "المصروفات",
  services: "الخدمات",
  inventory: "المخزون",
  settings: "الإعدادات",
  users: "المستخدمون",
  session: "محطة العمل",
  followup: "العودات",
};

/* استنتاج نوع العملية من نص الوصف (للبيانات المحلية القديمة) */
const inferOp = (t: string): Op => {
  if (/حذف|أزيل|حُذف|إزالة/.test(t)) return "delete";
  if (/تعديل|عدّل|تحديث|حدّث|غيّر|تغيير/.test(t)) return "edit";
  if (/إضافة|أضاف|أضف|سجّل|تسجيل|حجز|إنشاء|أنشأ|انضم|كتب|بدأ|اكتمل|تحصيل|ربط/.test(t)) return "add";
  return "other";
};

/* توحيد شكل الحدث من المصدرين: db.events (المركزي) أو db.activity (المحلي) */
function normalizeEvent(e: Record<string, unknown>): Ev {
  const text = String(e.desc ?? e.text ?? e.description ?? "");
  const op = (e.op ?? e.action ?? e.verb ?? inferOp(text)) as Op;
  const kind = String(e.category ?? e.screen ?? e.kind ?? "");
  return {
    id: String(e.id ?? Math.random().toString(36).slice(2)),
    op: (["add", "edit", "delete", "other"] as Op[]).includes(op) ? op : "other",
    category: KIND_TO_SCREEN[kind] ?? (kind ? String(kind) : "النظام"),
    desc: text,
    user: e.user ? String(e.user) : e.userName ? String(e.userName) : undefined,
    role: e.role ? String(e.role) : undefined,
    device: e.device ? String(e.device) : undefined,
    time: String(e.time ?? e.at ?? new Date().toISOString()),
  };
}

/* تنسيق الوقت HH:MM */
const timeOf = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/* تصدير CSV محلي (مكتفٍ ذاتياً) */
function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================ المكوّن الرئيسي ============================ */

export default function ActivityReport() {
  const { db } = useStore();
  const { user } = useAuth();
  const { push } = useToast();

  const [opFilter, setOpFilter] = useState<"all" | Op>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [print, setPrint] = useState(false);

  /* جلب الأحداث من أي مصدر متاح */
  const events: Ev[] = useMemo(() => {
    const anyDb = db as unknown as Record<string, unknown>;
    const raw = Array.isArray(anyDb.events)
      ? (anyDb.events as Record<string, unknown>[])
      : Array.isArray(db.activity)
        ? (db.activity as unknown as Record<string, unknown>[])
        : [];
    return raw
      .map(normalizeEvent)
      .sort((a, b) => b.time.localeCompare(a.time));
  }, [db]);

  /* التصفية */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (opFilter !== "all" && e.op !== opFilter) return false;
      if (from && e.time.slice(0, 10) < from) return false;
      if (to && e.time.slice(0, 10) > to) return false;
      if (
        q &&
        !(
          e.desc.toLowerCase().includes(q) ||
          (e.user ?? "").toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.device ?? "").toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
  }, [events, opFilter, search, from, to]);

  /* مؤشرات */
  const todayStr = today(0);
  const todayEvents = events.filter((e) => e.time.slice(0, 10) === todayStr);
  const counts = {
    add: filtered.filter((e) => e.op === "add").length,
    edit: filtered.filter((e) => e.op === "edit").length,
    delete: filtered.filter((e) => e.op === "delete").length,
  };
  const activeUsers = new Set(filtered.map((e) => e.user).filter(Boolean)).size;
  const devices = new Set(filtered.map((e) => e.device).filter(Boolean)).size;

  /* توزيع العمليات حسب الشاشة */
  const byScreen = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filtered]);
  const maxScreen = Math.max(1, ...byScreen.map(([, v]) => v));

  /* توزيع آخر 12 ساعة */
  const byHour = useMemo(() => {
    const now = Date.now();
    const buckets = Array.from({ length: 12 }, (_, i) => ({ label: "", count: 0 }));
    for (let i = 0; i < 12; i++) {
      const d = new Date(now - (11 - i) * 3600_000);
      buckets[i].label = `${String(d.getHours()).padStart(2, "0")}:00`;
    }
    filtered.forEach((e) => {
      const t = new Date(e.time).getTime();
      const idx = 11 - Math.floor((now - t) / 3600_000);
      if (idx >= 0 && idx < 12) buckets[idx].count++;
    });
    return buckets;
  }, [filtered]);
  const maxHour = Math.max(1, ...byHour.map((b) => b.count));

  const exportCsv = () => {
    downloadCsv("تقرير-حركة-النظام", [
      ["التاريخ", "الوقت", "المستخدم", "الدور", "الجهاز", "العملية", "الشاشة", "الوصف"],
      ...filtered.map((e) => [
        e.time.slice(0, 10),
        timeOf(e.time),
        e.user ?? "—",
        e.role ? ROLE_LABEL[e.role] ?? e.role : "—",
        e.device ?? "—",
        OP_META[e.op].label,
        e.category,
        e.desc,
      ]),
    ]);
    push("success", "صُدّر التقرير", `${filtered.length} عملية بصيغة CSV.`);
  };

  return (
    <div className="report-wide space-y-5">
      {/* ====== الترويسة ====== */}
      <div className="card report-hero p-6 anim-rise">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pine text-[#7fe0d4]">
              <IconShield className="w-7 h-7" />
            </span>
            <div>
              <h2 className="font-display font-bold text-2xl text-ink">تقرير حركة النظام</h2>
              <p className="text-sm text-soft mt-1">
                سجل كامل لما أُضيف وعُدِّل وحُذف — بمن قام به ومتى ومن أي جهاز وشاشة.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-soft" onClick={exportCsv}>
              <IconTrendUp className="w-4 h-4" />
              تصدير CSV
            </button>
            <button className="btn-primary" onClick={() => setPrint(true)}>
              <IconPrinter className="w-4 h-4" />
              طباعة A4
            </button>
          </div>
        </div>
      </div>

      {/* ====== المؤشرات ====== */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "عمليات اليوم", v: todayEvents.length, icon: <IconClock className="w-5 h-5" />, tint: "bg-sky-soft text-sky" },
          { label: "إضافات", v: counts.add, icon: <IconPlus className="w-5 h-5" />, tint: "bg-mint-soft text-[#1d6b47]" },
          { label: "تعديلات", v: counts.edit, icon: <IconPencil className="w-5 h-5" />, tint: "bg-amber-soft text-[#a06410]" },
          { label: "حذف", v: counts.delete, icon: <IconTrash className="w-5 h-5" />, tint: "bg-coral-soft text-coral" },
          { label: "مستخدمون نشطون", v: activeUsers, icon: <IconUsers className="w-5 h-5" />, tint: "bg-jade-soft text-jade-deep" },
          { label: "أجهزة", v: devices, icon: <IconShield className="w-5 h-5" />, tint: "bg-mist text-soft" },
        ].map((k, i) => (
          <div key={k.label} className="card card-hover p-4 anim-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-soft">{k.label}</p>
              <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${k.tint}`}>{k.icon}</span>
            </div>
            <p className="stat-num text-3xl text-ink mt-1.5">{k.v}</p>
          </div>
        ))}
      </div>

      {/* ====== الرسوم ====== */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 anim-rise" style={{ animationDelay: "120ms" }}>
          <p className="font-display font-bold text-base text-ink mb-4">توزيع العمليات حسب الشاشة</p>
          {byScreen.length === 0 ? (
            <p className="text-xs text-soft text-center py-6">لا بيانات ضمن التصفية الحالية.</p>
          ) : (
            <div className="space-y-3">
              {byScreen.map(([scr, n]) => (
                <div key={scr}>
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span className="text-ink">{scr}</span>
                    <span className="stat-num text-soft">{n}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-mist overflow-hidden">
                    <div className="h-full rounded-full bg-jade anim-grow-w" style={{ width: `${(n / maxScreen) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5 anim-rise" style={{ animationDelay: "180ms" }}>
          <p className="font-display font-bold text-base text-ink mb-4">النشاط — آخر 12 ساعة</p>
          <div className="flex items-end gap-1.5 h-32">
            {byHour.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-jade to-[#3fd0c0] anim-bar"
                  style={{ height: `${Math.max(4, (b.count / maxHour) * 100)}%`, animationDelay: `${i * 50}ms` }}
                  title={`${b.label}: ${b.count}`}
                />
                <span className="text-[9px] stat-num text-soft">{b.label.slice(0, 2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ====== الفلاتر ====== */}
      <div className="card p-4 anim-rise flex flex-wrap items-end gap-3" style={{ animationDelay: "240ms" }}>
        <div className="relative flex-1 min-w-52">
          <span className="absolute inset-y-0 start-3 flex items-center text-soft pointer-events-none">
            <IconSearch className="w-4.5 h-4.5" />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالوصف أو المستخدم أو الشاشة أو الجهاز…"
            className="input !ps-10"
          />
        </div>
        <div className="w-40">
          <p className="label">نوع العملية</p>
          <TSelect value={opFilter} onChange={(e) => setOpFilter(e.target.value as "all" | Op)}>
            <option value="all">الكل</option>
            <option value="add">إضافة</option>
            <option value="edit">تعديل</option>
            <option value="delete">حذف</option>
            <option value="other">أخرى</option>
          </TSelect>
        </div>
        <div className="w-40">
          <p className="label">من تاريخ</p>
          <DateInput value={from} onChange={setFrom} placeholder="dd/mm/yyyy" />
        </div>
        <div className="w-40">
          <p className="label">إلى تاريخ</p>
          <DateInput value={to} onChange={setTo} placeholder="dd/mm/yyyy" />
        </div>
      </div>

      {/* ====== الجدول ====== */}
      <div className="card overflow-hidden anim-rise" style={{ animationDelay: "300ms" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <p className="font-display font-bold text-lg text-ink">سجل العمليات</p>
          <span className="chip bg-mist text-soft stat-num">{filtered.length} عملية</span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<IconShield className="w-6 h-6" />} title="لا عمليات مطابقة" desc="جرّب تعديل الفلاتر أو مسح البحث." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full report-table min-w-[860px]">
              <thead className="bg-mist/70 border-b border-line">
                <tr>
                  <th className="th">التاريخ</th>
                  <th className="th">الوقت</th>
                  <th className="th">المستخدم</th>
                  <th className="th">الدور</th>
                  <th className="th">الجهاز</th>
                  <th className="th">العملية</th>
                  <th className="th">الشاشة</th>
                  <th className="th">الوصف</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 120).map((e, i) => (
                  <tr key={e.id} className="border-b border-line/60 last:border-0 hover:bg-jade-soft/25 transition-colors anim-fade" style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}>
                    <td className="td text-soft whitespace-nowrap stat-num">{fmtDate(e.time.slice(0, 10))}</td>
                    <td className="td text-soft whitespace-nowrap stat-num" dir="ltr">{timeOf(e.time)}</td>
                    <td className="td font-bold text-ink whitespace-nowrap">{e.user ?? "—"}</td>
                    <td className="td whitespace-nowrap">
                      {e.role ? <span className="chip bg-mist text-soft">{ROLE_LABEL[e.role] ?? e.role}</span> : <span className="text-soft/60">—</span>}
                    </td>
                    <td className="td text-soft whitespace-nowrap">{e.device ?? "—"}</td>
                    <td className="td whitespace-nowrap">
                      <span className={`chip ${OP_META[e.op].cls}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: OP_META[e.op].dot }} />
                        {OP_META[e.op].label}
                      </span>
                    </td>
                    <td className="td whitespace-nowrap">
                      <span className="chip bg-jade-soft text-jade-deep">{e.category}</span>
                    </td>
                    <td className="td text-ink text-xs max-w-72"><span className="block truncate" title={e.desc}>{e.desc}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====== الطباعة ====== */}
      {print && (
        <PrintModal open onClose={() => setPrint(false)} title="طباعة تقرير حركة النظام">
          <div className="text-ink">
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="font-display font-bold text-xl">تقرير حركة النظام</p>
                <p className="text-xs text-soft mt-1">
                  أُعد بواسطة: <b>{user?.name ?? "—"}</b> · بتاريخ {fmtDate(today(0))}
                </p>
              </div>
              <span className="chip bg-mist text-soft stat-num">{filtered.length} عملية</span>
            </div>
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-mist text-[9px]">
                  <th className="border border-line px-2 py-1.5 text-start">التاريخ</th>
                  <th className="border border-line px-2 py-1.5">الوقت</th>
                  <th className="border border-line px-2 py-1.5 text-start">المستخدم</th>
                  <th className="border border-line px-2 py-1.5">العملية</th>
                  <th className="border border-line px-2 py-1.5 text-start">الشاشة</th>
                  <th className="border border-line px-2 py-1.5 text-start">الوصف</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 60).map((e) => (
                  <tr key={e.id}>
                    <td className="border border-line px-2 py-1.5 stat-num whitespace-nowrap">{fmtDate(e.time.slice(0, 10))}</td>
                    <td className="border border-line px-2 py-1.5 text-center stat-num" dir="ltr">{timeOf(e.time)}</td>
                    <td className="border border-line px-2 py-1.5 font-semibold whitespace-nowrap">{e.user ?? "—"}</td>
                    <td className="border border-line px-2 py-1.5 text-center font-bold whitespace-nowrap">{OP_META[e.op].label}</td>
                    <td className="border border-line px-2 py-1.5 whitespace-nowrap">{e.category}</td>
                    <td className="border border-line px-2 py-1.5">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[9px] text-soft mt-4">
              {filtered.length > 60 ? `يُعرض أول 60 من أصل ${filtered.length} عملية — صدّر CSV للحصول على الكل.` : "نهاية التقرير."}
            </p>
          </div>
        </PrintModal>
      )}
    </div>
  );
}
