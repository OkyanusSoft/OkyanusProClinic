import React from "react";
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
  type Invoice,
  type Prescription,
  type ToothStatus,
} from "../store";
import { IconPrinter, IconX, Logo } from "../icons";
import { Modal } from "./ui";

/** إطار الطباعة — يعرض معاينة A4 ويطبع عبر نافذة المتصفح */
export function PrintModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { db } = useStore();
  const clinic = clinicOf(db);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="معاينة قبل الطباعة — ستُطبع الورقة فقط دون واجهة النظام"
      width="max-w-2xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إغلاق</button>
          <button className="btn-primary" onClick={() => window.print()}>
            <IconPrinter className="w-4.5 h-4.5" />
            طباعة الآن
          </button>
        </>
      }
    >
      <div className="print-sheet bg-white rounded-xl border border-line shadow-sm p-8" dir="rtl">
        {/* ترويسة العيادة — من الإعدادات العامة */}
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
          </div>
        </div>
        {children}
        {/* التذييل */}
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
      </div>
    </Modal>
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
              <div className="flex justify-between"><span className="text-soft">الإجمالي قبل الخصم:</span><b className="stat-num">{money(total / (1 - inv.discount / 100))}</b></div>
              <div className="flex justify-between text-[#a06410]"><span>الخصم ({inv.discount}%):</span><b className="stat-num">− {money(total / (1 - inv.discount / 100) - total)}</b></div>
            </>
          ) : null}
          <div className="flex justify-between"><span className="text-soft">الإجمالي المستحق:</span><b className="stat-num">{money(total)}</b></div>
          <div className="flex justify-between text-mint"><span>المدفوع:</span><b className="stat-num">{money(inv.paid)}</b></div>
          <div className="flex justify-between border-t-2 border-pine pt-1.5 text-base"><span className="font-bold">المتبقي:</span><b className="stat-num text-coral">{money(rem)}</b></div>
          <div className="flex justify-between text-[11px] pt-1"><span className="text-soft">طريقة الدفع:</span><b>{PAY_METHODS[inv.method ?? "cash"]}</b></div>
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
