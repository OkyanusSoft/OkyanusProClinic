/**
 * ReturnQueue.tsx — قائمة العودات الجاهزة للدخول + سجل الأعمال السابقة
 * ─────────────────────────────────────────────────────────────────────
 * الوجهة: src/components/ReturnQueue.tsx  (ملف جديد)
 *
 * يقدّم مكوّنين:
 *  1) ReturnQueueSection — قسم «قائمة العودات — جاهزون للدخول» في محطة العمل
 *  2) PrevWorkReview     — لوحة «وضع العودة» داخل الجلسة: تعرض كل ما قُدّم
 *                          للمريض في جلساته السابقة، ليُضيف الطبيب العمل
 *                          الجديد فوقه ويحفظه مكمِّلاً له.
 */

import React, { useMemo, useState } from "react";
import {
  invoiceTotal,
  fmtDate,
  today,
  TOOTH_META,
  useAuth,
  useMoney,
  useStore,
  type ToothStatus,
} from "../store";
import {
  IconChevronDown,
  IconClock,
  IconPulse,
  IconReceipt,
  IconSpark,
  IconStetho,
  IconTooth,
} from "../icons";
import { Avatar, EmptyState } from "./ui";

/** فرق الأيام عن اليوم (سالب = متأخرة) */
const dayDiff = (ds: string) =>
  Math.round((new Date(ds + "T12:00:00").getTime() - new Date(today(0) + "T12:00:00").getTime()) / 86400000);

const fmtDur = (ms: number) => {
  const m = Math.max(1, Math.round(ms / 60000));
  return m < 60 ? `${m} دقيقة` : `${Math.floor(m / 60)} س ${m % 60 ? (m % 60) + " د" : ""}`.trim();
};

/* ════════════════════════════════════════════════════════════════
   1) قائمة العودات — جاهزون للدخول
   ════════════════════════════════════════════════════════════════ */

export function ReturnQueueSection({ onEnter }: { onEnter: (patientId: string, fuId: string) => void }) {
  const { db, patientById, doctorById } = useStore();
  const { doctorScopeId } = useAuth();

  /* المتابعات المستحقة: اليوم أو متأخرة، وضمن نطاق الطبيب */
  const due = useMemo(
    () =>
      db.followUps
        .filter((f) => f.status === "pending" && f.dueDate <= today(0))
        .filter((f) => !doctorScopeId || f.doctorId === doctorScopeId)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [db.followUps, doctorScopeId]
  );

  const overdueCount = due.filter((f) => f.dueDate < today(0)).length;

  return (
    <section className="anim-rise" style={{ animationDelay: "160ms" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${due.length ? "bg-amber pulse-dot" : "bg-line"}`} />
          قائمة العودات — جاهزون للدخول
          <span className="chip bg-amber-soft text-[#a06410] stat-num">{due.length}</span>
        </h2>
        <p className="text-[11px] font-semibold text-soft">
          {overdueCount > 0 ? (
            <span className="text-coral font-bold">{overdueCount} متأخرة</span>
          ) : (
            "المتابعات المستحقة اليوم"
          )}{" "}
          — تدخل مع سجل أعمالها السابقة
        </p>
      </div>

      {due.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<IconPulse className="w-6 h-6" />}
            title="لا عودات مستحقة الآن"
            desc="كل المتابعات القادمة في مواعيدها — ستظهر هنا تلقائياً عند استحقاقها."
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {due.map((f, i) => {
            const p = patientById(f.patientId);
            const d = doctorById(f.doctorId);
            const diff = dayDiff(f.dueDate);
            const overdue = diff < 0;
            /* عدد الجلسات السابقة — ليعرف الطبيب حجم التاريخ قبل الدخول */
            const prevCount = db.sessions.filter((s) => s.patientId === f.patientId && s.status === "done").length;
            return (
              <div
                key={f.id}
                className="card card-hover p-4 anim-rise"
                style={{
                  animationDelay: `${180 + i * 60}ms`,
                  borderInlineStartWidth: 4,
                  borderInlineStartColor: overdue ? "#d9503a" : "#e2952b",
                }}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={p?.name ?? "؟"} size="w-11 h-11 text-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-ink truncate">{p?.name}</p>
                    <p className="text-[11px] text-soft mt-0.5 truncate" title={f.reason}>
                      {f.reason}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                      overdue ? "bg-coral-soft text-coral" : "bg-amber-soft text-[#a06410]"
                    }`}
                  >
                    <IconPulse className="w-5 h-5" />
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <span className={`chip ${overdue ? "bg-coral-soft text-coral" : "bg-amber-soft text-[#a06410]"}`}>
                    <IconClock className="w-3 h-3" />
                    {overdue ? `متأخرة ${Math.abs(diff)} يوم` : "مستحقة اليوم"}
                  </span>
                  <span className="chip bg-mist text-soft stat-num">{fmtDate(f.dueDate)}</span>
                  <span className="chip bg-mist text-soft">
                    <IconStetho className="w-3 h-3" />
                    {d?.name ?? "—"}
                  </span>
                  <span className="chip bg-mist text-soft stat-num">
                    <IconReceipt className="w-3 h-3" />
                    {prevCount} جلسة سابقة
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-line/70">
                  <button
                    onClick={() => onEnter(f.patientId, f.id)}
                    className="btn-primary !h-9 !px-3.5 !text-xs flex-1 !bg-amber hover:!bg-[#c77f1d]"
                    style={{ boxShadow: "0 8px 18px -6px rgba(226,149,43,.55)" }}
                  >
                    <IconPulse className="w-4 h-4" />
                    دخول ومتابعة العمل السابق
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   2) وضع العودة — سجل الأعمال السابقة داخل الجلسة
   ════════════════════════════════════════════════════════════════ */

export function PrevWorkReview({ patientId, fuId }: { patientId: string; fuId: string }) {
  const { db, doctorById, patientById } = useStore();
  const money = useMoney();
  const [collapsed, setCollapsed] = useState(false);

  const fu = db.followUps.find((f) => f.id === fuId);
  const p = patientById(patientId);

  const prev = useMemo(
    () =>
      db.sessions
        .filter((s) => s.patientId === patientId && s.status === "done")
        .sort((a, b) => (b.endedAt ?? b.startedAt).localeCompare(a.endedAt ?? a.startedAt)),
    [db.sessions, patientId]
  );

  const totals = useMemo(() => {
    let work = 0;
    let billed = 0;
    let paid = 0;
    prev.forEach((s) => {
      s.procedures.forEach((pr) => (work += pr.price * Math.max(1, pr.teeth.length)));
      const inv = s.invoiceId ? db.invoices.find((i) => i.id === s.invoiceId) : undefined;
      if (inv) {
        const t = invoiceTotal(inv);
        billed += t;
        paid += Math.min(inv.paid, t);
      }
    });
    return { work, billed, paid, remaining: Math.max(0, billed - paid) };
  }, [prev, db.invoices]);

  return (
    <div className="mx-4 sm:mx-5 mt-4 rounded-2xl border-2 border-amber/40 bg-gradient-to-l from-amber-soft via-amber-soft/40 to-transparent overflow-hidden anim-pop">
      {/* شريط الوضع */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber text-white shrink-0">
          <IconPulse className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm text-ink leading-tight">
            وضع العودة — زيارة متابعة للمريض {p?.name}
          </p>
          <p className="text-[11px] text-[#a06410] font-semibold mt-0.5 truncate">
            سبب المتابعة: {fu?.reason ?? "عودة"} · أضف العمل الجديد مكمِّلاً لما سبق ثم احفظ الجلسة
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="chip bg-white/80 border border-amber/30 text-ink stat-num">
            <b>{prev.length}</b>&nbsp;جلسة سابقة
          </span>
          <span className="chip bg-white/80 border border-amber/30 text-ink">
            قُدّم: <b className="stat-num">{money(totals.work)}</b>
          </span>
          {totals.remaining > 0 ? (
            <span className="chip bg-coral-soft text-coral">
              متبقٍ: <b className="stat-num">{money(totals.remaining)}</b>
            </span>
          ) : (
            <span className="chip bg-mint-soft text-[#1d6b47]">لا مستحقات</span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="btn-ghost !h-8 !px-2.5 !text-[11px] !bg-white/80"
            aria-label={collapsed ? "عرض السجل السابق" : "طي السجل السابق"}
          >
            <IconChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
            {collapsed ? "عرض السجل" : "طي"}
          </button>
        </div>
      </div>

      {/* الخط الزمني للأعمال السابقة */}
      {!collapsed && (
        <div className="px-4 pb-4 pt-1 anim-fade">
          {prev.length === 0 ? (
            <p className="text-xs text-soft bg-white/70 rounded-xl border border-line px-4 py-3">
              لا توجد جلسات سابقة مسجلة لهذا المريض — هذه أول زيارة علاجية.
            </p>
          ) : (
            <ol className="relative ms-1.5 border-s-2 border-amber/40 space-y-3">
              {prev.map((s, idx) => {
                const inv = s.invoiceId ? db.invoices.find((i) => i.id === s.invoiceId) : undefined;
                const dur =
                  s.endedAt && s.startedAt ? fmtDur(new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) : null;
                return (
                  <li key={s.id} className="relative ps-4 anim-fade" style={{ animationDelay: `${idx * 60}ms` }}>
                    <span
                      className={`absolute top-3 -start-[7px] w-3 h-3 rounded-full border-2 border-white shadow ${
                        idx === 0 ? "bg-amber pulse-soft" : "bg-line"
                      }`}
                    />
                    <div className="rounded-xl border border-line bg-white p-3.5 hover:border-amber/50 hover:shadow-md transition-all">
                      {/* رأس الجلسة */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-bold text-sm text-ink stat-num">{fmtDate(s.date)}</span>
                        <span className="text-[11px] text-soft">· {doctorById(s.doctorId)?.name}</span>
                        {dur && (
                          <span className="chip bg-mist text-soft !text-[9px] stat-num">
                            <IconClock className="w-3 h-3" />
                            {dur}
                          </span>
                        )}
                        {inv && (
                          <span className="chip bg-mint-soft text-[#1d6b47] !text-[9px] ms-auto stat-num">
                            <IconReceipt className="w-3 h-3" />
                            {inv.number} · {money(invoiceTotal(inv))}
                          </span>
                        )}
                      </div>

                      {/* الإجراءات السابقة */}
                      {s.procedures.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {s.procedures.map((pr, j) => (
                            <span key={j} className="chip bg-mist text-ink">
                              {pr.name}
                              {pr.teeth.length > 0 && (
                                <b className="stat-num text-[#a06410]">
                                  · {pr.teeth.length === 1 ? `سن ${pr.teeth[0]}` : `${pr.teeth.length} أسنان`}
                                </b>
                              )}
                              {pr.canals?.length ? (
                                <span className="text-soft font-medium">· {pr.canals.map((c) => `${c.channels}ق`).join("/")}</span>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* الأسنان المعدّلة سابقاً */}
                      {s.teethTreated.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {s.teethTreated.map((t, j) => (
                            <span
                              key={j}
                              className="chip !text-[9px]"
                              style={{
                                background: TOOTH_META[t.status as ToothStatus].fill === "#ffffff" ? "#eef2f5" : TOOTH_META[t.status as ToothStatus].fill,
                                color: TOOTH_META[t.status as ToothStatus].stroke,
                              }}
                            >
                              <IconTooth className="w-3 h-3" />
                              سن {t.tooth} — {TOOTH_META[t.status as ToothStatus].label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* التشخيص */}
                      {s.diagnosis.trim() && (
                        <p className="text-[11px] text-soft mt-2 leading-relaxed">
                          <b className="text-ink">التشخيص:</b> {s.diagnosis}
                        </p>
                      )}

                      {/* تقرير العمل السابق */}
                      {s.summary.trim() && (
                        <details className="group mt-2">
                          <summary className="text-[11px] font-bold text-jade-deep cursor-pointer list-none inline-flex items-center gap-1.5 hover:underline">
                            <IconSpark className="w-3 h-3" />
                            تقرير العمل السابق
                            <span className="text-soft group-open:rotate-180 transition-transform inline-flex">
                              <IconChevronDown className="w-3 h-3" />
                            </span>
                          </summary>
                          <p className="text-[11px] leading-relaxed text-soft mt-1.5 whitespace-pre-line bg-mist/70 rounded-lg px-3 py-2 border border-line/70">
                            {s.summary}
                          </p>
                        </details>
                      )}

                      {/* الأدوية السابقة */}
                      {s.meds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {s.meds.map((m, j) => (
                            <span key={j} className="chip bg-sky-soft text-sky !text-[9px]">
                              {m.name} — {m.dose}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <p className="text-[10px] font-semibold text-[#a06410] mt-3 flex items-center gap-1.5">
            <IconSpark className="w-3.5 h-3.5" />
            كل ما تسجله الآن في هذه الجلسة يُحفَظ مكمِّلاً للسجل أعلاه، وتُعلَّم العودة «مكتملة» تلقائياً عند إنهاء الجلسة.
          </p>
        </div>
      )}
    </div>
  );
}
