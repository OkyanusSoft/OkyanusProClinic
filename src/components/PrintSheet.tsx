import React from "react";
import { clinicOf, fmtDate, fmtMoney, invoiceTotal, useMoney, useStore, type Invoice, type Prescription } from "../store";
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
        <div className="w-64 text-sm space-y-1.5">
          <div className="flex justify-between"><span className="text-soft">الإجمالي:</span><b className="stat-num">{money(total)}</b></div>
          <div className="flex justify-between text-mint"><span>المدفوع:</span><b className="stat-num">{money(inv.paid)}</b></div>
          <div className="flex justify-between border-t-2 border-pine pt-1.5 text-base"><span className="font-bold">المتبقي:</span><b className="stat-num text-coral">{money(rem)}</b></div>
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
