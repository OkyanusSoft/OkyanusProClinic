import React, { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * محرك الطباعة الموثوق:
 * 1) يضع صنف `print-doc` على body طوال فتح النافذة (يفعّل قواعد A4).
 * 2) عند الطباعة يُخفي #root ويُظهر الورقة بأنماط مباشرة — لا يعتمد على توقيت المتصفح.
 */
function usePrintTrigger() {
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add("print-doc");
    return () => document.body.classList.remove("print-doc");
  }, []);

  const doPrint = useCallback(() => {
    const root = document.getElementById("root");
    const portal = portalRef.current;
    const setMode = (printing: boolean) => {
      if (root) root.style.display = printing ? "none" : "";
      if (portal) portal.style.display = printing ? "block" : "none";
    };
    setMode(true);
    const restore = () => {
      setMode(false);
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
    setTimeout(restore, 250);
  }, []);

  return { portalRef, doPrint };
}
import {
  APPT_META,
  clinicOf,
  fmtDate,
  fmtDateFull,
  fmtMoney,
  invoiceTotal,
  PAY_METHODS,
  today,
  TOOTH_META,
  useAuth,
  useMoney,
  useStore,
  type Appointment,
  type ClinicalSession,
  type FollowUp,
  type Invoice,
  type Patient,
  type Prescription,
  type ToothStatus,
} from "../store";
import { IconCalendar, IconIdCard, IconPrinter, IconStetho, IconTooth, IconX, Logo } from "../icons";
import { Modal } from "./ui";

/** إطار الطباعة — يعرض معاينة A4 ويطبع عبر نافذة المتصفح */
/**
 * ترويسة المستندات — تتكرر في المعاينة وبوابة الطباعة
 */
function DocHeader() {
  const { db } = useStore();
  const clinic = clinicOf(db);
  return (
    <div className="flex items-center justify-between pb-4 border-b-2 border-pine">
      <div className="flex items-center gap-3">
        <Logo className="w-12 h-12" />
        <div>
          <p className="font-display font-bold text-lg leading-tight">{clinic.clinicName}</p>
          <p className="text-[10px] text-soft tracking-wider" dir="ltr">{clinic.clinicLatin}</p>
        </div>
      </div>
      <div className="text-end text-[10px] text-soft leading-relaxed">
        <p>{clinic.address}</p>
        <p dir="ltr">{clinic.phone}</p>
        {clinic.email && <p dir="ltr">{clinic.email}</p>}
      </div>
    </div>
  );
}

function DocFooter() {
  const { db } = useStore();
  const clinic = clinicOf(db);
  return (
    <>
      <div className="mt-8 pt-4 border-t border-line flex items-end justify-between">
        <div className="text-center">
          <div className="w-36 border-b border-ink/40 mb-1 h-10" />
          <p className="text-[10px] text-soft font-semibold">توقيع الطبيب</p>
        </div>
        <div className="text-center">
          <div className="w-36 border-b border-ink/40 mb-1 h-10" />
          <p className="text-[10px] text-soft font-semibold">ختم العيادة</p>
        </div>
      </div>
      <p className="text-center text-[9px] text-soft mt-4">
        أُصدرت هذه الوثيقة إلكترونياً من نظام {clinic.clinicName} — {fmtDate(new Date().toISOString().slice(0, 10))}
      </p>
    </>
  );
}

export function PrintModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { portalRef, doPrint } = usePrintTrigger();
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        subtitle="معاينة A4 قبل الطباعة — ستُطبع الورقة فقط دون واجهة النظام"
        width="max-w-3xl"
        footer={
          <>
            <span className="me-auto chip bg-mist text-soft !py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-mint pulse-dot" />
              مقاس A4 · 210×297 مم
            </span>
            <button className="btn-ghost" onClick={onClose}>إغلاق</button>
            <button className="btn-primary" onClick={doPrint}>
              <IconPrinter className="w-4.5 h-4.5" />
              طباعة الآن
            </button>
          </>
        }
      >
        <div className="overflow-x-auto pb-1">
          <div className="print-sheet bg-white rounded-xl border border-line shadow-sm p-10" dir="rtl">
            <DocHeader />
            {children}
            <DocFooter />
          </div>
        </div>
      </Modal>
      {/* بوابة الطباعة — الورقة الحقيقية على A4، خارج جذر التطبيق */}
      {open &&
        createPortal(
          <div ref={portalRef} className="print-only">
            <div className="print-a4" dir="rtl">
              <DocHeader />
              {children}
              <DocFooter />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/* ============================ فاتورة ============================ */

export function InvoicePrint({ inv }: { inv: Invoice }) {
  const { db, patientById, serviceById } = useStore();
  const clinic = clinicOf(db);
  const money = useMoney();
  const p = patientById(inv.patientId);
  const total = invoiceTotal(inv);
  const rem = Math.max(0, total - inv.paid);
  // ✅ أضف هذا السطر بعده مباشرة
const gross = inv.items.reduce((s, i) => s + i.qty * i.price, 0);
  return (
    <div className="text-ink">
      <div className="flex items-center justify-between py-4">
        <div>
          <p className="font-display font-bold text-xl">{clinic.invoiceTitle}</p>
          <p className="text-xs text-soft mt-1">
            رقم: <b className="stat-num" dir="ltr">{inv.number}</b> · التاريخ: {fmtDate(inv.date)}
          </p>
        </div>
        <div className="text-end text-xs leading-relaxed">
          <p>
            المريض: <b className="text-sm">{p?.name ?? "—"}</b>
          </p>
          <p className="text-soft">جوال: <span dir="ltr">{p?.phone}</span></p>
        </div>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-mist text-[11px]">
            <th className="border border-line px-3 py-2 text-start">#</th>
            <th className="border border-line px-3 py-2 text-start">الخدمة</th>
            <th className="border border-line px-3 py-2">الطبيب</th>
            <th className="border border-line px-3 py-2">الكمية</th>
            <th className="border border-line px-3 py-2">السعر</th>
            <th className="border border-line px-3 py-2">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((it, i) => {
            const s = serviceById(it.serviceId);
            return (
              <tr key={i}>
                <td className="border border-line px-3 py-2 stat-num text-xs text-soft">{i + 1}</td>
                <td className="border border-line px-3 py-2 font-semibold">{s?.name ?? "خدمة"}</td>
                <td className="border border-line px-3 py-2 text-xs text-soft text-center">{s?.category ?? "—"}</td>
                <td className="border border-line px-3 py-2 text-center stat-num">{it.qty}</td>
                <td className="border border-line px-3 py-2 text-center stat-num">{money(it.price)}</td>
                <td className="border border-line px-3 py-2 text-center stat-num font-bold">{money(it.qty * it.price)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex justify-end mt-4">
     <div className="w-72 text-sm space-y-1.5">
  {inv.discount ? (
    <>
      <div className="flex justify-between">
        <span className="text-soft">الإجمالي قبل الخصم:</span>
        <b className="stat-num">{money(gross)}</b>
      </div>
      <div className="flex justify-between text-[#a06410]">
        <span>الخصم ({inv.discount}%):</span>
        <b className="stat-num">− {money(gross - gross * (1 - inv.discount / 100))}</b>
      </div>
    </>
  ) : null}
  
  {/* ✅ سطر الخصم النقدي - أضفه هنا */}
  {inv.cashDiscount ? (
    <div className="flex justify-between text-[#a06410]">
      <span>خصم نقدي:</span>
      <b className="stat-num">− {money(inv.cashDiscount)}</b>
    </div>
  ) : null}
  
  <div className="flex justify-between border-t border-line pt-1.5">
    <span className="font-bold">الإجمالي المستحق:</span>
    <b className="stat-num">{money(total)}</b>
  </div>
  <div className="flex justify-between text-mint">
    <span>المدفوع:</span>
    <b className="stat-num">{money(inv.paid)}</b>
  </div>
  {rem > 0 && (
    <div className="flex justify-between border-t-2 border-pine pt-1.5 text-base">
      <span className="font-bold">المتبقي:</span>
      <b className="stat-num text-coral">{money(rem)}</b>
    </div>
  )}
  <div className="flex justify-between text-[11px] pt-1">
    <span className="text-soft">طريقة الدفع:</span>
    <b>{PAY_METHODS[inv.method ?? "cash"]}</b>
  </div>
</div>

      </div>
      <p className="text-[10px] text-soft mt-5 leading-relaxed">{clinic.invoiceFooter}</p>
    </div>
  );
}

/* ============================ روشتة ============================ */

export function RxPrint({ rx }: { rx: Prescription }) {
  const { patientById, doctorById } = useStore();
  const p = patientById(rx.patientId);
  const d = doctorById(rx.doctorId);
  return (
    <div className="text-ink">
      <div className="flex items-center justify-between py-4">
        <div>
          <p className="font-display font-bold text-xl">روشتة طبية</p>
          <p className="text-xs text-soft mt-1">
            التاريخ: {fmtDate(rx.date)} · رقم: <b className="stat-num" dir="ltr">RX-{rx.id.slice(0, 5).toUpperCase()}</b>
          </p>
        </div>
        <div className="text-end text-xs leading-relaxed">
          <p>
            المريض: <b className="text-sm">{p?.name ?? "—"}</b> · العمر: {p?.age} سنة
          </p>
          <p className="text-soft">
            الطبيب المعالج: <b>{d?.name}</b> — {d?.specialty}
          </p>
        </div>
      </div>
      {p?.allergies && p.allergies !== "لا يوجد" && (
        <p className="bg-coral-soft text-coral text-xs font-bold rounded-lg px-3 py-2 mb-3">
          تنبيه: حساسية مسجلة — {p.allergies}
        </p>
      )}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-mist text-[11px]">
            <th className="border border-line px-3 py-2 text-start">#</th>
            <th className="border border-line px-3 py-2 text-start">الدواء</th>
            <th className="border border-line px-3 py-2">الجرعة</th>
            <th className="border border-line px-3 py-2">التكرار</th>
            <th className="border border-line px-3 py-2">المدة</th>
          </tr>
        </thead>
        <tbody>
          {rx.items.map((it, i) => (
            <tr key={i}>
              <td className="border border-line px-3 py-2.5 stat-num text-xs text-soft">{i + 1}</td>
              <td className="border border-line px-3 py-2.5 font-semibold">{it.name}</td>
              <td className="border border-line px-3 py-2.5 text-center">{it.dose}</td>
              <td className="border border-line px-3 py-2.5 text-center">{it.freq}</td>
              <td className="border border-line px-3 py-2.5 text-center">{it.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rx.notes && (
        <p className="text-xs mt-4 bg-amber-soft text-[#7a4c08] rounded-lg px-3.5 py-2.5 leading-relaxed">
          <b>تعليمات:</b> {rx.notes}
        </p>
      )}
      <p className="text-[10px] text-soft mt-4">تُصرف هذه الأدوية من الصيدلية بموجب هذه الروشتة، ولا يُعاد صرفها دون مراجعة العيادة.</p>
    </div>
  );
}

export const ClosePrintBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="icon-btn" aria-label="إغلاق">
    <IconX />
  </button>
);

/* ============================ خريطة أسنان مصغّرة للطباعة ============================ */

const crownPath = (w: number, h: number, cusps: number) => {
  const cuspW = w / cusps;
  const base = `M ${-w / 2} 0 L ${-w / 2} ${-h + 4} Q ${-w / 2} ${-h} ${-w / 2 + 3.5} ${-h}`;
  let top = "";
  for (let i = 0; i < cusps; i++) {
    const x0 = -w / 2 + i * cuspW;
    top += ` Q ${x0 + cuspW / 2} ${-h - 5} ${x0 + cuspW} ${-h}`;
  }
  return base + top + ` L ${w / 2} 0 Z`;
};
const rootPath = (topW: number, len: number) =>
  `M ${-topW / 2} 0 Q ${-topW / 2 + 1} ${len * 0.65} 0 ${len} Q ${topW / 2 - 1} ${len * 0.65} ${topW / 2} 0 Z`;

function MiniTooth({ n, st }: { n: number; st: ToothStatus }) {
  const p = n % 10;
  const cusps = p <= 2 ? 1 : p === 3 ? 1 : p <= 5 ? 2 : 3;
  const w = p <= 2 ? 17 : p === 3 ? 17 : p <= 5 ? 20 : 24;
  const meta = TOOTH_META[st];
  const dash = meta.dash ? "2.5 2" : undefined;
  const fill = st === "missing" ? "transparent" : meta.fill;
  return (
    <>
      {cusps > 1 ? (
        [-(w / 2 - 4), w / 2 - 4].map((rx, i) => (
          <path key={i} d={rootPath(7.5, 11)} transform={`translate(${rx} 0)`} fill={fill} stroke={meta.stroke} strokeWidth="1.2" strokeDasharray={dash} />
        ))
      ) : (
        <path d={rootPath(7.5, 12)} fill={fill} stroke={meta.stroke} strokeWidth="1.2" strokeDasharray={dash} />
      )}
      <path d={crownPath(w, 12, cusps)} fill={fill} stroke={meta.stroke} strokeWidth="1.3" strokeDasharray={dash} />
      {st === "caries" && <circle cy={-6.5} r={3} fill={meta.stroke} />}
      {st === "filled" && <rect x={-3.2} y={-9.7} width={6.4} height={6.4} rx={1.2} transform="rotate(45 0 -6.5)" fill={meta.stroke} fillOpacity={0.5} />}
      {st === "root" && <path d="M 0 -9 L 0 9.5" stroke={meta.stroke} strokeWidth={1.5} strokeLinecap="round" />}
      {st === "crown" && <path d={crownPath(w - 5, 9, cusps)} transform="translate(0 -1.5)" fill="none" stroke={meta.stroke} strokeWidth={1.1} />}
      {st === "missing" && <path d="M -4.5 -10.5 L 4.5 -1.5 M 4.5 -10.5 L -4.5 -1.5" stroke={meta.stroke} strokeWidth={1.5} strokeLinecap="round" />}
    </>
  );
}

export function MiniOdontogram({ teeth }: { teeth: Partial<Record<number, ToothStatus>> }) {
  const rows: { arr: number[]; upper: boolean }[] = [
    { arr: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], upper: true },
    { arr: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38], upper: false },
  ];
  return (
    <div className="space-y-2" dir="rtl">
      {rows.map((row, ri) => (
        <div key={ri}>
          <p className="text-center text-[9px] font-bold text-soft tracking-widest mb-1">{row.upper ? "الفك العلوي" : "الفك السفلي"}</p>
          <div className="flex justify-center items-end">
            {row.arr.map((n, i) => {
              const st: ToothStatus = teeth[n] ?? "healthy";
              return (
                <div key={n} className={`flex flex-col items-center ${i === 7 ? "me-5" : ""}`} style={{ width: 30 }}>
                  {row.upper && <span className="stat-num text-[8px] text-soft mb-0.5">{n}</span>}
                  <svg width="30" height="40" viewBox="-15 -26 30 44" className="block">
                    <g transform={row.upper ? "translate(0,-5) scale(1,-1)" : "translate(0,5)"}>
                      <MiniTooth n={n} st={st} />
                    </g>
                  </svg>
                  {!row.upper && <span className="stat-num text-[8px] text-soft mt-0.5">{n}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================ طباعة ملف المريض ============================ */

export function PatientPrint({ patientId }: { patientId: string }) {
  const { db, patientById, serviceById, doctorById, patientBalance, lastVisit } = useStore();
  const money = useMoney();
  const p = patientById(patientId);
  if (!p) return null;

  const visits = db.appointments
    .filter((a) => a.patientId === p.id && a.status !== "cancelled")
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const rxs = db.prescriptions.filter((r) => r.patientId === p.id);
  const fus = db.followUps.filter((f) => f.patientId === p.id && f.status !== "done");
  const bal = patientBalance(p.id);
  const lv = lastVisit(p.id);
  const issues = Object.values(p.teeth).filter((s) => s && s !== "healthy").length;
  const health = Math.round(((32 - issues) / 32) * 100);
  const counts = (["caries", "filled", "root", "crown", "missing"] as ToothStatus[]).map((s) => ({
    s,
    n: Object.values(p.teeth).filter((x) => x === s).length,
  }));

  const Info = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="border border-line rounded-lg px-3 py-2">
      <p className="text-[9px] font-bold text-soft">{label}</p>
      <p className="text-[12px] font-bold text-ink mt-0.5">{value}</p>
    </div>
  );

  return (
    <div className="text-ink">
      {/* الهوية */}
      <div className="flex items-end justify-between py-4">
        <div>
          <p className="text-[10px] font-bold text-soft">الملف الطبي للمريض</p>
          <p className="font-display font-bold text-2xl mt-0.5">{p.name}</p>
        </div>
        <div className="text-end text-[11px] text-soft leading-relaxed">
          <p>
            رقم الملف: <b className="stat-num" dir="ltr">{p.id.slice(0, 6).toUpperCase()}</b>
          </p>
          <p>سجّل في العيادة: {p.joined ? fmtDate(p.joined) : "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        <Info label="العمر" value={`${p.age} سنة`} />
        <Info label="الجنس" value={p.gender === "m" ? "ذكر" : "أنثى"} />
        <Info label="فصيلة الدم" value={<span dir="ltr">{p.blood}</span>} />
        <Info label="المدينة" value={p.city || "—"} />
        <Info label="الجوال" value={<span dir="ltr">{p.phone}</span>} />
        <Info label="آخر زيارة" value={lv ? fmtDate(lv) : "لم يزر"} />
      </div>

      {p.allergies && p.allergies !== "لا يوجد" && (
        <p className="bg-coral-soft text-coral text-xs font-bold rounded-lg px-3.5 py-2.5 mb-3 border border-coral/30">
          ⚠ تنبيه طبي: حساسية مسجلة — {p.allergies}
        </p>
      )}
      {p.notes && (
        <p className="bg-amber-soft text-[#7a4c08] text-[11px] font-semibold rounded-lg px-3.5 py-2.5 mb-4 leading-relaxed">
          <b>ملاحظات طبية:</b> {p.notes}
        </p>
      )}

      {/* المخطط والحالة */}
      <div className="grid sm:grid-cols-[1.4fr_1fr] gap-4 mb-4">
        <div className="border border-line rounded-xl p-3.5">
          <p className="text-[10px] font-bold text-soft mb-2">مخطط الأسنان (FDI)</p>
          <MiniOdontogram teeth={p.teeth} />
        </div>
        <div className="space-y-2.5">
          <div className="border border-line rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-soft">مؤشر صحة الفم</p>
              <p className="stat-num text-xl font-bold" style={{ color: health >= 80 ? "#2c9c69" : health >= 60 ? "#e2952b" : "#d9503a" }}>{health}%</p>
            </div>
            <div className="h-1.5 rounded-full bg-mist overflow-hidden mt-2">
              <div className="h-full rounded-full" style={{ width: `${health}%`, background: health >= 80 ? "#2c9c69" : health >= 60 ? "#e2952b" : "#d9503a" }} />
            </div>
          </div>
          <div className="border border-line rounded-xl p-3.5 space-y-1.5">
            {counts.map(({ s, n }) => (
              <div key={s} className="flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-2 text-soft">
                  <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: TOOTH_META[s].stroke }} />
                  {TOOTH_META[s].label}
                </span>
                <span className="stat-num">{n}</span>
              </div>
            ))}
          </div>
          <div className={`rounded-xl p-3.5 border ${bal > 0 ? "bg-coral-soft/60 border-coral/30" : "bg-mint-soft/60 border-mint/30"}`}>
            <p className="text-[10px] font-bold text-soft">المستحقات المالية</p>
            <p className={`stat-num text-xl font-bold mt-0.5 ${bal > 0 ? "text-coral" : "text-[#1d6b47]"}`}>{bal > 0 ? money(bal) : "لا مستحقات — مسدَّد"}</p>
          </div>
        </div>
      </div>

      {/* الزيارات */}
      <p className="text-[10px] font-bold text-soft mb-1.5">سجل الزيارات ({visits.length})</p>
      {visits.length === 0 ? (
        <p className="text-[11px] text-soft mb-4">لا زيارات مسجلة.</p>
      ) : (
        <table className="w-full text-[11px] border-collapse mb-4">
          <thead>
            <tr className="bg-mist text-[9px]">
              <th className="border border-line px-2.5 py-1.5 text-start">التاريخ</th>
              <th className="border border-line px-2.5 py-1.5 text-start">الخدمة</th>
              <th className="border border-line px-2.5 py-1.5 text-start">الطبيب</th>
              <th className="border border-line px-2.5 py-1.5">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {visits.slice(0, 8).map((v) => (
              <tr key={v.id}>
                <td className="border border-line px-2.5 py-1.5 stat-num">{fmtDate(v.date)} · {v.time}</td>
                <td className="border border-line px-2.5 py-1.5 font-semibold">{serviceById(v.serviceId)?.name}</td>
                <td className="border border-line px-2.5 py-1.5">{doctorById(v.doctorId)?.name}</td>
                <td className="border border-line px-2.5 py-1.5 text-center font-bold">{APPT_META[v.status].label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* الروشتات */}
        <div>
          <p className="text-[10px] font-bold text-soft mb-1.5">الروشتات الأخيرة ({rxs.length})</p>
          {rxs.length === 0 ? (
            <p className="text-[11px] text-soft">لا روشتات.</p>
          ) : (
            <ul className="space-y-1.5">
              {rxs.slice(0, 3).map((r) => (
                <li key={r.id} className="border border-line rounded-lg px-3 py-2 text-[11px]">
                  <div className="flex justify-between font-bold">
                    <span>{fmtDate(r.date)}</span>
                    <span className="text-soft font-semibold">{doctorById(r.doctorId)?.name}</span>
                  </div>
                  <p className="text-soft mt-1 leading-relaxed">{r.items.map((i) => i.name).join(" · ")}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* العودات */}
        <div>
          <p className="text-[10px] font-bold text-soft mb-1.5">متابعات مقررة ({fus.length})</p>
          {fus.length === 0 ? (
            <p className="text-[11px] text-soft">لا متابعات قادمة.</p>
          ) : (
            <ul className="space-y-1.5">
              {fus.map((f) => (
                <li key={f.id} className="border border-line rounded-lg px-3 py-2 text-[11px] flex items-center justify-between">
                  <span className="font-semibold">{f.reason}</span>
                  <span className="stat-num font-bold text-jade-deep">{fmtDate(f.dueDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================ طباعة كشف مواعيد اليوم ============================ */

export function AppointmentsDayPrint({ date }: { date: string }) {
  const { db, patientById, serviceById, doctorById } = useStore();
  const { apptScope, patientScope } = useAuth();
  const clinic = clinicOf(db);
  const money = useMoney();

  const appts = db.appointments
    .filter((a) => a.date === date && a.status !== "cancelled" && (!apptScope || a.doctorId === apptScope))
    .sort((a, b) => a.time.localeCompare(b.time));
  const done = appts.filter((a) => a.status === "done").length;

  const limit = today(clinic.followUpAlertDays);
  const fus = db.followUps
    .filter((f) => f.status === "pending" && f.dueDate <= limit && (!patientScope || patientScope.has(f.patientId)))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const dayValue = appts.reduce((s, a) => s + (serviceById(a.serviceId)?.price ?? 0), 0);

  return (
    <div className="text-ink">
      <div className="flex items-end justify-between py-4">
        <div>
          <p className="text-[10px] font-bold text-soft">كشف مواعيد الاستقبال</p>
          <p className="font-display font-bold text-2xl mt-0.5">{fmtDateFull(date)}</p>
        </div>
        <div className="text-end text-[11px] leading-relaxed">
          <p>
            <b className="stat-num">{appts.length}</b> موعداً · <b className="stat-num">{done}</b> مكتمل
          </p>
          <p className="text-soft">
            الدوام: <span className="stat-num" dir="ltr">{clinic.workStart}–{clinic.workEnd}</span> · القيمة التقديرية: <b className="stat-num">{money(dayValue)}</b>
          </p>
        </div>
      </div>

      {appts.length === 0 ? (
        <p className="text-center text-xs text-soft border border-dashed border-line rounded-xl py-8">لا مواعيد مجدولة في هذا اليوم.</p>
      ) : (
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-mist text-[9px]">
              <th className="border border-line px-2.5 py-2">الوقت</th>
              <th className="border border-line px-2.5 py-2 text-start">المريض</th>
              <th className="border border-line px-2.5 py-2">الجوال</th>
              <th className="border border-line px-2.5 py-2 text-start">الخدمة</th>
              <th className="border border-line px-2.5 py-2 text-start">الطبيب</th>
              <th className="border border-line px-2.5 py-2">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {appts.map((a) => {
              const p = patientById(a.patientId);
              return (
                <tr key={a.id}>
                  <td className="border border-line px-2.5 py-2 text-center stat-num font-bold">{a.time}</td>
                  <td className="border border-line px-2.5 py-2 font-semibold">{p?.name}</td>
                  <td className="border border-line px-2.5 py-2 text-center stat-num" dir="ltr">{p?.phone}</td>
                  <td className="border border-line px-2.5 py-2">{serviceById(a.serviceId)?.name}</td>
                  <td className="border border-line px-2.5 py-2">{doctorById(a.doctorId)?.name}</td>
                  <td className="border border-line px-2.5 py-2 text-center font-bold">{APPT_META[a.status].label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="mt-5">
        <p className="text-[10px] font-bold text-soft mb-1.5">
          متابعات مستحقة خلال {clinic.followUpAlertDays} أيام — للاتصال والتذكير ({fus.length})
        </p>
        {fus.length === 0 ? (
          <p className="text-[11px] text-soft">لا متابعات مستحقة حالياً.</p>
        ) : (
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-mist text-[9px]">
                <th className="border border-line px-2.5 py-1.5 text-start">المريض</th>
                <th className="border border-line px-2.5 py-1.5">الجوال</th>
                <th className="border border-line px-2.5 py-1.5 text-start">سبب المتابعة</th>
                <th className="border border-line px-2.5 py-1.5">الاستحقاق</th>
              </tr>
            </thead>
            <tbody>
              {fus.map((f) => {
                const p = patientById(f.patientId);
                const late = f.dueDate < today(0);
                return (
                  <tr key={f.id} className={late ? "bg-coral-soft/40" : ""}>
                    <td className="border border-line px-2.5 py-1.5 font-semibold">{p?.name}</td>
                    <td className="border border-line px-2.5 py-1.5 text-center stat-num" dir="ltr">{p?.phone}</td>
                    <td className="border border-line px-2.5 py-1.5">{f.reason}</td>
                    <td className={`border border-line px-2.5 py-1.5 text-center stat-num font-bold ${late ? "text-coral" : ""}`}>
                      {fmtDate(f.dueDate)}{late ? " — متأخرة" : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[9px] text-soft mt-5 leading-relaxed">
        كشف داخلي للاستقبال — يُحدَّث من النظام مباشرة. مواعيد الأطباء حسب نطاق الصلاحيات المستخدم عند الطباعة.
      </p>
    </div>
  );
}

/* ============================ منظومة بطاقات العيادة ============================ */

/** باركود زخرفي حتمي مشتق من معرّف البطاقة */
function CardCode({ seed }: { seed: string }) {
  const bars = React.useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 30; i++) arr.push(((seed.charCodeAt(i % seed.length) * (i + 7)) % 4) + 1);
    return arr;
  }, [seed]);
  let x = 0;
  return (
    <svg width="118" height="22" aria-hidden="true">
      {bars.map((w, i) => {
        const r = <rect key={i} x={x} y={0} width={w * 1.05} height={22} fill="rgba(255,255,255,0.88)" />;
        x += w * 1.05 + 1.3;
        return r;
      })}
    </svg>
  );
}

const cardNo = (id: string) => {
  const h = [...id].reduce((s, c) => s + c.charCodeAt(0) * 31, 7) % 9000;
  return `SC-${1000 + h}`;
};

/** نافذة طباعة البطاقات على A4 — مع عدد النسخ في الورقة */
export function CardPrintModal({
  open,
  onClose,
  title,
  render,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  render: (count: number) => React.ReactNode;
}) {
  const count = 1;
  const { portalRef, doPrint } = usePrintTrigger();
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        subtitle="بطاقة واحدة مكبّرة لكل صفحة A4 — قصّ على الخط المتقطع"
        width="max-w-3xl"
        footer={
          <>
            <span className="me-auto chip bg-mist text-soft !py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-mint pulse-dot" />
              بطاقة واحدة لكل صفحة
            </span>
            <button className="btn-ghost" onClick={onClose}>إغلاق</button>
            <button className="btn-primary" onClick={doPrint}>
              <IconPrinter className="w-4.5 h-4.5" />
              طباعة الآن
            </button>
          </>
        }
      >
        <div className="overflow-x-auto pb-1">
          <div className="print-sheet bg-white rounded-xl border border-line shadow-sm py-8" dir="rtl">
            {render(count)}
          </div>
        </div>
      </Modal>
      {open &&
        createPortal(
          <div ref={portalRef} className="print-only">
            <div className="print-a4" dir="rtl" style={{ minHeight: "auto", padding: "4mm 0" }}>
              {render(count)}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/** شبكة بطاقات على الورقة مع خطوط القص */
export function CardSheet({ units, cols = 2, caption, scale = 1 }: { units: React.ReactNode[]; cols?: 1 | 2; caption?: string; scale?: number }) {
  const single = units.length === 1 && cols === 1;
  return (
    <div className={single ? "flex flex-col items-center" : ""}>
      <div className="flex items-center justify-center gap-3 mb-5 w-full">
        <span className="h-px flex-1 max-w-24 bg-line" />
        <p className="text-[10px] font-bold text-soft tracking-widest">{caption}</p>
        <span className="h-px flex-1 max-w-24 bg-line" />
      </div>
      {single ? (
        <div
          className="cut-box"
          style={{ transform: `scale(${scale})`, transformOrigin: "top center", marginBottom: `${Math.round(54 * (scale - 1))}mm` }}
        >
          {units[0]}
        </div>
      ) : (
        <div className={`grid gap-7 justify-items-center ${cols === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {units.map((u, i) => (
            <div key={i} className="cut-box">
              {u}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- كرت المريض (وجه) ---------- */
export function PatientCardFront({ p }: { p: Patient }) {
  const { db } = useStore();
  const clinic = clinicOf(db);
  return (
    <div className="dental-card text-white p-[5mm] flex flex-col" style={{ background: "linear-gradient(135deg,#0b2f2b 0%,#10403a 55%,#0a6158 100%)" }}>
      {/* زخارف */}
      <IconTooth className="absolute -bottom-6 -start-5 w-32 h-32 text-white/[0.06] rotate-12" />
      <span className="absolute top-0 start-0 w-20 h-20 rounded-full bg-[#3fd0c0]/10 -translate-y-8 -translate-x-6" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="w-8 h-8 rounded-lg" />
          <div className="leading-none">
            <p className="font-display font-bold text-[11px]">{clinic.clinicName}</p>
            <p className="text-[6.5px] text-white/50 font-semibold tracking-[0.15em] mt-1" dir="ltr">{clinic.clinicLatin}</p>
          </div>
        </div>
        <span className="text-[8px] font-bold bg-white/12 border border-white/20 rounded-full px-2 py-1">كرت المريض</span>
      </div>

      <div className="flex items-center gap-2.5 mt-[4mm]">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/12 border-2 border-[#3fd0c0]/60 font-display font-bold text-base shrink-0">
          {p.name.replace("د. ", "").split(" ").slice(0, 2).map((w) => w[0]).join("")}
        </span>
        <div className="min-w-0">
          <p className="font-display font-bold text-[13px] leading-tight truncate">{p.name}</p>
          <p className="text-[8px] text-white/65 font-semibold mt-0.5">
            {p.age} سنة · {p.gender === "m" ? "ذكر" : "أنثى"} · دم <span dir="ltr">{p.blood}</span>
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-2">
        <div>
          <p className="text-[6.5px] text-white/50 font-bold tracking-widest">رقم البطاقة</p>
          <p className="stat-num text-[11px] font-bold text-[#7fe0d4] mt-0.5" dir="ltr">{cardNo(p.id)}</p>
          <p className="stat-num text-[7.5px] text-white/55 mt-1" dir="ltr">{p.phone}</p>
        </div>
        <CardCode seed={p.id + p.phone} />
      </div>
    </div>
  );
}

/* ---------- كرت المريض (ظهر) ---------- */
export function PatientCardBack({ p }: { p: Patient }) {
  const { db } = useStore();
  const clinic = clinicOf(db);
  const hasAllergy = p.allergies && p.allergies !== "لا يوجد";
  return (
    <div className="dental-card bg-white p-[5mm] flex flex-col border border-line">
      <div className="flex items-center justify-between pb-[2.5mm] border-b-2 border-pine">
        <p className="font-display font-bold text-[10.5px] text-ink">{clinic.clinicName}</p>
        <span className="stat-num text-[7px] text-soft" dir="ltr">{cardNo(p.id)}</span>
      </div>
      {hasAllergy && (
        <p className="mt-[2mm] bg-coral-soft text-coral text-[7.5px] font-bold rounded-md px-2 py-1 leading-snug border border-coral/30">
          تحذير طبي: حساسية من — {p.allergies}
        </p>
      )}
      <div className="mt-[2.5mm] space-y-[1.6mm] text-[8px] leading-snug">
        <p className="text-ink/85"><b className="text-ink">العنوان:</b> {clinic.address}</p>
        <p className="text-ink/85"><b className="text-ink">هاتف الحجز:</b> <span dir="ltr">{clinic.phone}</span></p>
        <p className="text-ink/85"><b className="text-ink">الدوام:</b> السبت–الخميس · <span className="stat-num" dir="ltr">{clinic.workStart}–{clinic.workEnd}</span></p>
        {clinic.email && <p className="text-ink/85"><b className="text-ink">البريد:</b> <span dir="ltr">{clinic.email}</span></p>}
      </div>
      <p className="mt-auto text-[6.5px] text-soft leading-relaxed border-t border-dashed border-line pt-[1.5mm]">
        يُرجى إبراز هذه البطاقة عند كل زيارة. لإلغاء موعد أو تغييره يُرجى الاتصال قبل 24 ساعة.
      </p>
    </div>
  );
}

/** ورقة بطاقات المريض: أوجه ثم ظهرو */
export function PatientCardSheet({ p, count }: { p: Patient; count: number }) {
  const fronts = Array.from({ length: count }, (_, i) => <PatientCardFront key={`f${i}`} p={p} />);
  const backs = Array.from({ length: count }, (_, i) => <PatientCardBack key={`b${i}`} p={p} />);
  return (
    <div className="space-y-9">
      <CardSheet units={fronts} cols={count === 1 ? 1 : 2} caption={`الوجه — ${p.name}`} scale={count === 1 ? 1.6 : 1} />
      <CardSheet units={backs} cols={count === 1 ? 1 : 2} caption="الظهر — بيانات العيادة" scale={count === 1 ? 1.6 : 1} />
    </div>
  );
}

/* ---------- كرت موعد ---------- */
export function AppointmentCardPrint({ a }: { a: Appointment }) {
  const { db, patientById, serviceById, doctorById } = useStore();
  const clinic = clinicOf(db);
  const p = patientById(a.patientId);
  const s = serviceById(a.serviceId);
  const d = doctorById(a.doctorId);
  const dow = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { weekday: "long" }).format(new Date(a.date + "T12:00:00"));
  return (
    <div className="dental-card bg-white p-[5mm] flex flex-col border border-line">
      <span className="absolute inset-y-0 start-0 w-[2.5mm] bg-jade" />
      <IconTooth className="absolute -top-5 -end-5 w-24 h-24 text-jade-soft rotate-12" />

      <div className="flex items-center justify-between">
        <p className="font-display font-bold text-[11px] text-ink">كرت موعد</p>
        <p className="text-[7px] font-bold text-soft tracking-wider">{clinic.clinicName}</p>
      </div>

      <div className="mt-[2.5mm] flex items-center gap-3">
        <div className="rounded-lg bg-jade-soft px-[3mm] py-[2mm] text-center shrink-0">
          <p className="stat-num text-[19px] font-bold text-jade-deep leading-none" dir="ltr">{a.time}</p>
          <p className="text-[7px] font-bold text-jade-deep/70 mt-1">{dow}</p>
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-[12.5px] text-ink leading-tight">{fmtDate(a.date)}</p>
          <p className="text-[8.5px] font-semibold text-soft mt-1 truncate">
            {p?.name} · {s?.name}
          </p>
          <p className="text-[8px] text-soft mt-0.5 flex items-center gap-1">
            <IconStetho className="w-2.5 h-2.5" /> {d?.name}
          </p>
        </div>
      </div>

      <p className="mt-auto text-[6.8px] text-soft leading-relaxed border-t border-dashed border-line pt-[1.5mm] flex items-center justify-between">
        <span>يُرجى الحضور قبل الموعد بـ 10 دقائق</span>
        <span dir="ltr" className="stat-num font-bold text-ink">{clinic.phone}</span>
      </p>
    </div>
  );
}

/* ---------- كرت رجوع / متابعة ---------- */
export function FollowUpCardPrint({ f }: { f: FollowUp }) {
  const { db, patientById, doctorById } = useStore();
  const clinic = clinicOf(db);
  const p = patientById(f.patientId);
  const d = doctorById(f.doctorId);
  const diff = Math.round((new Date(f.dueDate + "T12:00:00").getTime() - new Date(today(0) + "T12:00:00").getTime()) / 86400000);
  const rel = diff < 0 ? "مستحقة الآن" : diff === 0 ? "اليوم" : `بعد ${diff} ${diff <= 10 ? "أيام" : "يوماً"}`;
  return (
    <div className="dental-card bg-white p-[5mm] flex flex-col border border-line">
      <span className="absolute inset-y-0 start-0 w-[2.5mm] bg-amber" />
      <IconCalendar className="absolute -top-4 -end-4 w-20 h-20 text-amber-soft rotate-6" />

      <div className="flex items-center justify-between">
        <p className="font-display font-bold text-[11px] text-ink">كرت الرجوع</p>
        <span className="text-[7px] font-bold bg-amber-soft text-[#a06410] rounded-full px-2 py-0.5">{rel}</span>
      </div>

      <div className="mt-[2.5mm] flex items-center gap-3">
        <div className="rounded-lg bg-amber-soft px-[3mm] py-[2mm] text-center shrink-0">
          <p className="stat-num text-[14px] font-bold text-[#a06410] leading-none">{fmtDate(f.dueDate)}</p>
          <p className="text-[7px] font-bold text-[#a06410]/70 mt-1">موعد المراجعة</p>
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-[11.5px] text-ink leading-tight truncate">{p?.name}</p>
          <p className="text-[8.5px] font-semibold text-soft mt-1 leading-snug">{f.reason || "متابعة دورية"}</p>
          {d && <p className="text-[8px] text-soft mt-0.5">الطبيب: {d.name}</p>}
        </div>
      </div>

      <p className="mt-auto text-[6.8px] text-soft leading-relaxed border-t border-dashed border-line pt-[1.5mm] flex items-center justify-between">
        <span>أحضر هذا الكرت معك يوم المراجعة</span>
        <span dir="ltr" className="stat-num font-bold text-ink">{clinic.phone}</span>
      </p>
    </div>
  );
}

/* ============================ جلسة علاج مكتملة ============================ */

export function SessionPrint({ session }: { session: ClinicalSession }) {
  const { db, patientById, serviceById, doctorById } = useStore();
  const money = useMoney();
  const p = patientById(session.patientId);
  const d = doctorById(session.doctorId);
  const inv = session.invoiceId ? db.invoices.find((i) => i.id === session.invoiceId) : undefined;
  const invTotal = inv ? invoiceTotal(inv) : 0;
  const procTotal = session.procedures.reduce((s, pr) => s + pr.price * Math.max(1, pr.teeth.length), 0);
  const duration =
    session.endedAt && session.startedAt
      ? Math.max(1, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000))
      : null;

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex gap-2 py-1.5 border-b border-line/60 last:border-0">
      <span className="w-32 shrink-0 text-[11px] font-bold text-soft">{label}</span>
      <span className="text-[12px] text-ink flex-1">{value || "—"}</span>
    </div>
  );

  return (
    <div className="text-ink">
      <div className="flex items-center justify-between py-4">
        <div>
          <p className="font-display font-bold text-xl">تقرير جلسة علاج مكتملة</p>
          <p className="text-xs text-soft mt-1">
            التاريخ: {fmtDate(session.date)} · رقم الجلسة: <b className="stat-num" dir="ltr">{session.id.slice(0, 6).toUpperCase()}</b>
          </p>
        </div>
        <div className="text-end text-xs leading-relaxed">
          <p>
            المريض: <b className="text-sm">{p?.name ?? "—"}</b>
          </p>
          <p className="text-soft">
            الطبيب: <b>{d?.name}</b>
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6">
        <Row label="الشكوى الرئيسية" value={session.complaint} />
        <Row label="التشخيص السريري" value={session.diagnosis} />
        <Row label="مدة الجلسة" value={duration ? `${duration} دقيقة` : "—"} />
        <Row label="الأسنان المعالجة" value={session.teethTreated.length ? session.teethTreated.map((t) => `${t.tooth} (${TOOTH_META[t.status].label})`).join("، ") : "—"} />
      </div>

      <p className="text-[11px] font-bold text-soft mt-4 mb-1.5">الإجراءات المنفذة ({session.procedures.length})</p>
      {session.procedures.length === 0 ? (
        <p className="text-[12px] text-soft">لا إجراءات مسجلة.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-mist text-[11px]">
              <th className="border border-line px-3 py-2 text-start">#</th>
              <th className="border border-line px-3 py-2 text-start">الإجراء</th>
              <th className="border border-line px-3 py-2">الفئة</th>
              <th className="border border-line px-3 py-2">الأسنان</th>
              <th className="border border-line px-3 py-2">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {session.procedures.map((pr, i) => (
              <tr key={i}>
                <td className="border border-line px-3 py-2 stat-num text-xs text-soft">{i + 1}</td>
                <td className="border border-line px-3 py-2 font-semibold">{pr.name}</td>
                <td className="border border-line px-3 py-2 text-center text-xs text-soft">{pr.category}</td>
                <td className="border border-line px-3 py-2 text-center stat-num">{pr.teeth.length ? pr.teeth.join("، ") : "—"}</td>
                <td className="border border-line px-3 py-2 text-center stat-num">{money(pr.price * Math.max(1, pr.teeth.length))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {session.meds.length > 0 && (
        <>
          <p className="text-[11px] font-bold text-soft mt-4 mb-1.5">الأدوية الموصوفة ({session.meds.length})</p>
          <ul className="space-y-1">
            {session.meds.map((m, i) => (
              <li key={i} className="text-[12px] text-ink">
                <b>{m.name}</b> — {m.dose} · {m.freq} · {m.duration}
              </li>
            ))}
          </ul>
        </>
      )}

      {session.summary && (
        <>
          <p className="text-[11px] font-bold text-soft mt-4 mb-1.5">تقرير العمل السريري</p>
          <p className="text-[12px] text-ink leading-relaxed bg-mist/50 border border-line rounded-lg px-3.5 py-2.5">{session.summary}</p>
        </>
      )}

      <div className="flex justify-end mt-4">
        <div className="w-72 text-sm space-y-1.5">
          <div className="flex justify-between"><span className="text-soft">قيمة الإجراءات:</span><b className="stat-num">{money(procTotal)}</b></div>
          {inv && (
            <>
              <div className="flex justify-between"><span className="text-soft">الفاتورة ({inv.number}):</span><b className="stat-num">{money(invTotal)}</b></div>
              <div className="flex justify-between text-mint"><span className="text-soft">المدفوع:</span><b className="stat-num">{money(inv.paid)}</b></div>
              <div className="flex justify-between border-t-2 border-pine pt-1.5 text-base"><span className="font-bold">المتبقي:</span><b className="stat-num text-coral">{money(Math.max(0, invTotal - inv.paid))}</b></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
