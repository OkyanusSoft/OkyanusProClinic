import React, { useEffect, useMemo, useState } from "react";
import {
  activeInvoices,
  fmtDate,
  invoiceDiscounts,
  invoiceOutstanding,
  invoiceStatus,
  invoiceTotal,
  INV_DOC_META,
  INV_META,
  PAY_METHODS,
  PAYMENT_STATUS_META,
  paymentsForInvoice,
  today,
  uid,
  useMoney,
  useStore,
  validateReceivePayment,
  validateVoidInvoice,
  type Invoice,
  type Payment,
} from "../store";
import { IconCheck, IconPlus, IconPrinter, IconReceipt, IconSearch, IconTrash, IconWallet, IconX } from "../icons";
import { AnimatedNumber, Avatar, Badge, EmptyState, Field, Modal, TInput, TSelect, useToast, TwoStepDelete } from "../components/ui";
import { InvoicePrint, PrintModal } from "../components/PrintSheet";

export default function InvoicesPage() {
  const { db, dispatch, patientById, serviceById } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [payInv, setPayInv] = useState<Invoice | null>(null);
  const [printInv, setPrintInv] = useState<Invoice | null>(null);
  const [detailsInv, setDetailsInv] = useState<Invoice | null>(null);
  const [voidInv, setVoidInv] = useState<Invoice | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "partial" | "unpaid" | "posted" | "void">("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const cur = db.currencies.find((c) => c.code === db.defaultCurrency) ?? db.currencies[0];
  const rate = cur?.rate || 1;
  const invoices = activeInvoices(db.invoices);
  const collected = invoices.reduce((s, i) => s + Math.min(Number(i.paid) || 0, invoiceTotal(i)), 0);
  const outstanding = invoices.reduce((s, i) => s + invoiceOutstanding(i), 0);
  const discountsTotal = invoices.reduce((s, i) => s + invoiceDiscounts(i).totalDiscount, 0);
  const postedPayments = db.payments.filter((p) => p.status !== "void");
  const accountById = (id?: string) => db.accounts.find((a) => a.id === id);
  const voucherById = (id?: string) => db.vouchers.find((v) => v.id === id);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...db.invoices]
      .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number))
      .filter((i) => {
        if (filter === "posted" && i.documentStatus !== "posted") return false;
        if (filter === "void" && i.documentStatus !== "void") return false;
        if ((filter === "paid" || filter === "partial" || filter === "unpaid") && invoiceStatus(i) !== filter) return false;
        if (from && i.date < from) return false;
        if (to && i.date > to) return false;
        if (!term) return true;
        const patient = patientById(i.patientId);
        const paymentNumbers = paymentsForInvoice(db.payments, i.id).map((p) => p.number).join(" ");
        return [i.number, patient?.name, patient?.phone, paymentNumbers, i.items.map((it) => it.name ?? serviceById(it.serviceId)?.name).join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [db.invoices, db.payments, db.accounts, filter, q, from, to]);

  const doVoid = () => {
    if (!voidInv) return;
    const check = validateVoidInvoice(db, voidInv.id);
    if (!check.ok) return push("error", "تعذّر إلغاء الفاتورة", check.reason ?? "");
    if (!voidReason.trim()) return push("error", "سبب الإلغاء مطلوب", "لا يمكن إلغاء فاتورة مرحّلة بدون سبب.");
    dispatch({ type: "VOID_INVOICE", id: voidInv.id, reason: voidReason.trim() });
    push("success", "تم إلغاء الفاتورة وإنشاء قيد عكسي", voidInv.number);
    setVoidInv(null);
    setVoidReason("");
  };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">الفواتير والتحصيل</h1>
          <p className="text-sm text-soft mt-1">{db.invoices.length} فاتورة · {invoices.length} نشطة · {postedPayments.length} دفعة · آخر إصدار {db.nextInv - 1} · العملة: {cur?.name}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <IconPlus className="w-4.5 h-4.5" />
          فاتورة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card p-5 anim-rise" style={{ animationDelay: "70ms" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-soft">إجمالي المحصَّل</p>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-mint-soft text-[#1d6b47]"><IconWallet className="w-5 h-5" /></span>
          </div>
          <p className="mt-1"><AnimatedNumber value={Math.round(collected / rate)} className="stat-num text-3xl text-ink" /> <span className="text-xs font-bold text-soft">{cur?.symbol}</span></p>
        </div>
        <div className="card p-5 anim-rise" style={{ animationDelay: "140ms" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-soft">مبالغ معلّقة</p>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-coral-soft text-coral"><IconReceipt className="w-5 h-5" /></span>
          </div>
          <p className="mt-1"><AnimatedNumber value={Math.round(outstanding / rate)} className="stat-num text-3xl text-coral" /> <span className="text-xs font-bold text-soft">{cur?.symbol}</span></p>
        </div>
        <div className="card p-5 anim-rise" style={{ animationDelay: "210ms" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-soft">إجمالي الخصومات</p>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-soft text-[#a06410]"><IconReceipt className="w-5 h-5" /></span>
          </div>
          <p className="mt-1"><AnimatedNumber value={Math.round(discountsTotal / rate)} className="stat-num text-3xl text-ink" /> <span className="text-xs font-bold text-soft">{cur?.symbol}</span></p>
        </div>
        <div className="card p-5 anim-rise" style={{ animationDelay: "280ms" }}>
          <p className="text-xs font-bold text-soft">سندات القبض المرتبطة</p>
          <p className="stat-num text-3xl text-jade-deep mt-1">{postedPayments.filter((p) => p.direction === "receipt").length}</p>
          <p className="text-[11px] text-soft mt-1">كل تحصيل أصبح مستنداً مستقلاً مرتبطاً بسند قبض.</p>
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "الكل"],
              ["unpaid", "غير مدفوعة"],
              ["partial", "جزئية"],
              ["paid", "مدفوعة"],
              ["posted", "مرحّلة"],
              ["void", "ملغاة"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 h-9 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                filter === key ? "bg-pine text-white border-pine" : "bg-white text-soft border-line hover:border-jade/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-5 gap-3">
          <Field label="من تاريخ"><TInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="إلى تاريخ"><TInput type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <div className="md:col-span-3">
            <Field label="بحث">
              <div className="relative">
                <TInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="رقم فاتورة، مريض، بند، رقم دفعة..." className="!pe-9" />
                <IconSearch className="absolute inset-y-0 end-3 my-auto w-4 h-4 text-soft pointer-events-none" />
              </div>
            </Field>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden anim-rise" style={{ animationDelay: "260ms" }}>
        {list.length === 0 ? (
          <EmptyState icon={<IconReceipt className="w-6 h-6" />} title="لا فواتير مطابقة" desc="أنشئ فاتورة جديدة أو عدّل عوامل التصفية." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px]">
              <thead className="bg-mist/70 border-b border-line">
                <tr>
                  <th className="th">الفاتورة</th>
                  <th className="th">المريض</th>
                  <th className="th">التاريخ</th>
                  <th className="th">البنود</th>
                  <th className="th">الإجمالي</th>
                  <th className="th">الخصم</th>
                  <th className="th">المدفوع/المتبقي</th>
                  <th className="th">الدفعات</th>
                  <th className="th">الحالة</th>
                  <th className="th">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {list.map((inv, i) => {
                  const p = patientById(inv.patientId);
                  const amounts = invoiceDiscounts(inv);
                  const paid = Math.min(Number(inv.paid) || 0, amounts.total);
                  const rem = invoiceOutstanding(inv);
                  const st = invoiceStatus(inv);
                  const docStatus = inv.documentStatus ?? "posted";
                  const docMeta = INV_DOC_META[docStatus];
                  const payments = paymentsForInvoice(db.payments, inv.id);
                  const invVoucher = voucherById(inv.voucherId);
                  const isVoid = docStatus === "void";
                  return (
                    <tr key={inv.id} className={`border-b border-line/60 last:border-0 hover:bg-jade-soft/30 transition-colors anim-fade ${isVoid ? "opacity-70" : ""}`} style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="td"><span className="stat-num font-bold text-jade-deep" dir="ltr">{inv.number}</span></td>
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={p?.name ?? "؟"} size="w-8 h-8 text-[10px]" />
                          <div>
                            <span className="font-bold text-ink block">{p?.name ?? "محذوف"}</span>
                            <span className="text-[11px] text-soft" dir="ltr">{p?.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="td text-soft">{fmtDate(inv.date)}</td>
                      <td className="td text-soft text-xs max-w-56">
                        <span className="block truncate">
                          {inv.items.map((it) => `${it.name ?? serviceById(it.serviceId)?.name ?? "خدمة"} ×${it.qty}`).join("، ")}
                        </span>
                      </td>
                      <td className="td"><span className="stat-num font-bold text-ink block">{money(amounts.total)}</span></td>
                      <td className="td">
                        {amounts.totalDiscount > 0 ? <span className="stat-num text-[#a06410] block">{money(amounts.totalDiscount)}</span> : <span className="text-soft">—</span>}
                        {amounts.cashDiscount > 0 && <span className="chip bg-amber-soft text-[#a06410] !py-0.5 mt-1">نقدي {money(amounts.cashDiscount)}</span>}
                      </td>
                      <td className="td">
                        <span className="stat-num text-mint block">{money(paid)}</span>
                        {rem > 0 ? <span className="stat-num font-bold text-coral">{money(rem)}</span> : <span className="text-mint font-bold text-xs">مسددة</span>}
                      </td>
                      <td className="td text-xs">
                        <p className="stat-num font-bold">{payments.length}</p>
                        <p className="text-[10px] text-soft truncate max-w-28">{payments.map((pay) => pay.number).join("، ") || "—"}</p>
                        {invVoucher && <p className="text-[10px] text-sky truncate max-w-28" dir="ltr">{invVoucher.number}</p>}
                      </td>
                      <td className="td">
                        <Badge cls={INV_META[st].cls}>{INV_META[st].label}</Badge>
                        <div className="mt-1"><Badge cls={docMeta.cls}>{docMeta.label}</Badge></div>
                        <span className="chip bg-mist text-soft mt-1.5 !py-0.5">{PAY_METHODS[inv.method ?? "cash"]}</span>
                        {isVoid && inv.voidReason && <p className="text-[10px] text-coral mt-1 max-w-28 truncate" title={inv.voidReason}>{inv.voidReason}</p>}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1.5">
                          {!isVoid && rem > 0 && (
                            <button onClick={() => setPayInv(inv)} className="text-[11px] font-bold text-white bg-jade hover:bg-jade-deep rounded-lg px-3 py-2 cursor-pointer transition-colors">
                              تحصيل
                            </button>
                          )}
                          <button onClick={() => setDetailsInv(inv)} className="icon-btn !w-8 !h-8 hover:!bg-jade-soft hover:!text-jade-deep" aria-label="الدفعات والسندات" title="الدفعات والسندات">
                            <IconReceipt className="w-4 h-4" />
                          </button>
                          <button onClick={() => setPrintInv(inv)} className="icon-btn !w-8 !h-8 hover:!bg-jade-soft hover:!text-jade-deep" aria-label="طباعة" title="طباعة الفاتورة">
                            <IconPrinter className="w-4 h-4" />
                          </button>
                          {!isVoid && paid <= 0 && payments.length === 0 && (
                            <button onClick={() => { setVoidInv(inv); setVoidReason(""); }} className="icon-btn !w-8 !h-8 hover:!bg-coral-soft hover:!text-coral" aria-label="إلغاء/عكس" title="إلغاء/عكس الفاتورة">
                              <IconX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewInvoiceModal open={showNew} onClose={() => setShowNew(false)} />
      {payInv && <PayModal inv={payInv} onClose={() => setPayInv(null)} />}
      {detailsInv && <InvoiceDetailsModal inv={detailsInv} onClose={() => setDetailsInv(null)} />}
      {voidInv && (
        <Modal
          open
          onClose={() => setVoidInv(null)}
          title={`إلغاء/عكس ${voidInv.number}`}
          subtitle="سيتم إلغاء الفاتورة وإنشاء قيد عكسي إذا كانت مرحّلة. لا يمكن إلغاء فاتورة عليها تحصيل."
          footer={
            <>
              <button className="btn-ghost" onClick={() => setVoidInv(null)}>تراجع</button>
              <button className="btn-primary !bg-coral hover:!bg-coral/90" onClick={doVoid}>إلغاء وإنشاء عكس</button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="text-xs text-soft">المريض: <b className="text-ink">{patientById(voidInv.patientId)?.name}</b> · الإجمالي: <b className="stat-num">{money(invoiceTotal(voidInv))}</b></p>
            <Field label="سبب الإلغاء *">
              <TInput value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="مثال: إدخال خاطئ أو 중복 فاتورة" />
            </Field>
          </div>
        </Modal>
      )}
      {printInv && (
        <PrintModal open onClose={() => setPrintInv(null)} title={`طباعة الفاتورة ${printInv.number}`}>
          <InvoicePrint inv={printInv} />
        </PrintModal>
      )}
    </div>
  );
}

/* ============================ فاتورة جديدة ============================ */

function NewInvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, dispatch, serviceById } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState(today(0));
  const [rows, setRows] = useState<{ serviceId: string; qty: number }[]>([{ serviceId: "", qty: 1 }]);
  const [paid, setPaid] = useState("");
  const [discount, setDiscount] = useState("");
  const [cashDiscount, setCashDiscount] = useState("");
  const [method, setMethod] = useState("cash");
  const [cashBoxId, setCashBoxId] = useState("");
  const [reference, setReference] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setPatientId("");
      setDate(today(0));
      setRows([{ serviceId: "", qty: 1 }]);
      setPaid("");
      setDiscount("");
      setCashDiscount("");
      setMethod("cash");
      setCashBoxId(db.accounts.find((a) => a.isPosting && a.active && a.code.startsWith("111"))?.id ?? "");
      setReference("");
      setErr("");
    }
  }, [open, db.accounts]);

  const cashBoxes = db.accounts.filter((a) => a.isPosting && a.active && a.code.startsWith("111"));
  const gross = rows.reduce((s, r) => s + (serviceById(r.serviceId)?.price ?? 0) * r.qty, 0);
  const discPct = Math.min(100, Math.max(0, Number(discount) || 0));
  const afterPct = Math.round(gross * (1 - discPct / 100));
  const cashAmount = Math.min(Math.max(0, Number(cashDiscount) || 0), afterPct);
  const total = Math.max(0, afterPct - cashAmount);

  const save = () => {
    if (!patientId) return setErr("اختر المريض.");
    const valid = rows.filter((r) => r.serviceId && r.qty > 0);
    if (valid.length === 0) return setErr("أضف بنداً واحداً على الأقل.");
    const paidNum = Math.min(Math.max(0, Number(paid) || 0), total);
    if (paidNum > 0 && cashBoxes.length > 0 && !cashBoxId) return setErr("اختر الصندوق/البنك لإنشاء سند القبض.");
    const inv: Invoice = {
      id: uid(),
      number: `${db.settings.invoicePrefix}-${db.nextInv}`,
      patientId,
      date,
      items: valid.map((r) => ({ serviceId: r.serviceId, name: serviceById(r.serviceId)?.name, qty: r.qty, price: serviceById(r.serviceId)!.price })),
      paid: paidNum,
      discount: discPct || undefined,
      cashDiscount: cashAmount > 0 ? cashAmount : undefined,
      method,
      documentStatus: "posted",
    };
    dispatch({
      type: "ADD_INVOICE",
      inv,
      payment: paidNum > 0 ? { amount: paidNum, date, method, cashBoxId, reference } : undefined,
    });
    push(
      "success",
      `أُنشئت الفاتورة ${inv.number}`,
      `الإجمالي ${money(total)}${discPct || cashAmount ? ` بعد خصم ${money(discPct ? gross - afterPct : 0) + (cashAmount ? ` + ${money(cashAmount)}` : "")}` : ""}${paidNum > 0 ? ` — دُفع منها ${money(paidNum)}` : ""}`
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="فاتورة جديدة"
      subtitle={`رقم تسلسلي تلقائي: ${db.settings.invoicePrefix}-${db.nextInv}`}
      width="max-w-2xl"
      footer={
        <>
          <div className="me-auto text-start">
            <p className="text-[11px] font-bold text-soft">الإجمالي المستحق{discPct ? ` (خصم ${discPct}%)` : ""}</p>
            <p className="stat-num text-xl text-jade-deep">{money(total)}</p>
          </div>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>إصدار الفاتورة</button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="المريض *">
          <TSelect value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">— اختر —</option>
            {db.patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </TSelect>
        </Field>

        <div>
          <p className="label">بنود الفاتورة</p>
          <div className="space-y-2.5">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <TSelect value={r.serviceId} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, serviceId: e.target.value } : x)))}>
                  <option value="">— اختر خدمة —</option>
                  {db.services.filter((s) => s.active).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {money(s.price)}</option>
                  ))}
                </TSelect>
                <TInput
                  type="number"
                  min={1}
                  value={r.qty}
                  onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x)))}
                  className="!w-20 text-center"
                />
                <span className="stat-num text-sm text-ink w-24 text-end shrink-0">{money((serviceById(r.serviceId)?.price ?? 0) * r.qty)}</span>
                <button
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  disabled={rows.length === 1}
                  className="icon-btn !w-8 !h-8 disabled:opacity-30 hover:!bg-coral-soft hover:!text-coral"
                  aria-label="حذف البند"
                >
                  <IconTrash className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setRows([...rows, { serviceId: "", qty: 1 }])} className="mt-3 text-xs font-bold text-jade-deep bg-jade-soft hover:bg-jade hover:text-white rounded-lg px-3.5 py-2.5 cursor-pointer transition-colors inline-flex items-center gap-1.5">
            <IconPlus className="w-3.5 h-3.5" />
            إضافة بند
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Field label="التاريخ"><TInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="خصم (%)" hint="يطبَّق على إجمالي البنود">
            <TInput type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
          </Field>
          <Field label="خصم نقدي" hint="يُخصم بعد الخصم النسبي">
            <TInput type="number" min={0} value={cashDiscount} onChange={(e) => setCashDiscount(e.target.value)} placeholder="0" />
          </Field>
          <Field label="طريقة الدفع">
            <TSelect value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(PAY_METHODS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </TSelect>
          </Field>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="الدفعة المقدمة (اختياري)" hint="اتركه فارغاً لتسجيل الفاتورة كغير مدفوعة">
            <TInput type="number" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" />
          </Field>
          <Field label="الصندوق/البنك" hint="مطلوب عند وجود دفعة">
            <TSelect value={cashBoxId} onChange={(e) => setCashBoxId(e.target.value)}>
              <option value="">— اختر —</option>
              {cashBoxes.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </TSelect>
          </Field>
          <Field label="المرجع" hint="شيك/حوالة/مرجع داخلي">
            <TInput value={reference} onChange={(e) => setReference(e.target.value)} placeholder="اختياري" />
          </Field>
        </div>
        {(discPct > 0 || cashAmount > 0) && (
          <p className="text-xs font-bold text-jade-deep bg-jade-soft rounded-lg px-3.5 py-2.5 anim-pop">
            الإجمالي قبل الخصم {money(gross)} — الخصم النسبي {money(gross - afterPct)} — الخصم النقدي {money(cashAmount)} — الصافي المستحق {money(total)}
          </p>
        )}
        {err && <p className="text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
      </div>
    </Modal>
  );
}

/* ============================ تحصيل دفعة ============================ */

function PayModal({ inv, onClose }: { inv: Invoice; onClose: () => void }) {
  const { db, dispatch, patientById } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const remaining = invoiceOutstanding(inv);
  const patient = patientById(inv.patientId);
  const cashBoxes = db.accounts.filter((a) => a.isPosting && a.active && a.code.startsWith("111"));
  const [amount, setAmount] = useState(String(remaining));
  const [date, setDate] = useState(today(0));
  const [method, setMethod] = useState(inv.method || "cash");
  const [cashBoxId, setCashBoxId] = useState(cashBoxes[0]?.id ?? "");
  const [payerName, setPayerName] = useState(patient?.name ?? "");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  const input = { amount: Number(amount) || 0, date, method, cashBoxId, payerName, reference, notes };
  const check = validateReceivePayment(db, inv.id, input);

  const save = () => {
    if (!check.ok) {
      setErr(check.reason ?? "تعذّر تسجيل الدفعة.");
      return;
    }
    dispatch({ type: "RECEIVE_PAYMENT", invoiceId: inv.id, input });
    push("success", `تم تحصيل ${money(check.amount)}`, `${inv.number} — سند قبض مستقل`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`تحصيل ${inv.number}`}
      subtitle={`${patient?.name ?? "مريض"} — المتبقي ${money(remaining)} · سيُنشأ سند قبض وقيد محاسبي تلقائياً`}
      width="max-w-2xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" disabled={!check.ok} onClick={save}>تأكيد وإنشاء سند قبض</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="المبلغ المحصَّل">
            <TInput type="number" min={0} max={remaining} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="تاريخ السند"><TInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="طريقة الدفع">
            <TSelect value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(PAY_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </TSelect>
          </Field>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="الصندوق/البنك">
            <TSelect value={cashBoxId} onChange={(e) => setCashBoxId(e.target.value)}>
              <option value="">— اختر —</option>
              {cashBoxes.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </TSelect>
          </Field>
          <Field label="اسم الدافع"><TInput value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder={patient?.name ?? "اسم الدافع"} /></Field>
          <Field label="المرجع"><TInput value={reference} onChange={(e) => setReference(e.target.value)} placeholder="شيك/حوالة" /></Field>
        </div>
        <Field label="ملاحظات"><TInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري" /></Field>
        <div className="flex gap-2">
          <button onClick={() => setAmount(String(remaining))} className="chip bg-jade-soft text-jade-deep cursor-pointer hover:bg-jade hover:text-white transition-colors !py-2">كامل المتبقي</button>
          <button onClick={() => setAmount(String(Math.round(remaining / 2)))} className="chip bg-mist text-soft cursor-pointer hover:bg-line transition-colors !py-2">نصف المبلغ</button>
        </div>
        {check.ok && check.amount > 0 && (
          <p className="text-xs font-bold text-jade-deep bg-jade-soft rounded-lg px-3.5 py-2.5">سيتم تحصيل {money(check.amount)} وترحيل: صندوق/بنك مدين · ذمم مرضى دائن.</p>
        )}
        {(err || (!check.ok && check.reason)) && <p className="text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5">{err || check.reason}</p>}
      </div>
    </Modal>
  );
}

function InvoiceDetailsModal({ inv, onClose }: { inv: Invoice; onClose: () => void }) {
  const { db, patientById } = useStore();
  const money = useMoney();
  const payments = paymentsForInvoice(db.payments, inv.id);
  const amounts = invoiceDiscounts(inv);
  const invVoucher = db.vouchers.find((v) => v.id === inv.voucherId);
  const accountById = (id?: string) => db.accounts.find((a) => a.id === id);


  return (
    <Modal open onClose={onClose} title={`دفعات ومستندات ${inv.number}`} subtitle={`${patientById(inv.patientId)?.name ?? "مريض"} — الإجمالي ${money(amounts.total)}`} width="max-w-3xl">
      <div className="space-y-4 text-sm">
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="card p-3"><p className="text-xs text-soft">الإجمالي</p><p className="stat-num font-bold">{money(amounts.total)}</p></div>
          <div className="card p-3"><p className="text-xs text-soft">المدفوع</p><p className="stat-num font-bold text-mint">{money(Math.min(Number(inv.paid) || 0, amounts.total))}</p></div>
          <div className="card p-3"><p className="text-xs text-soft">المتبقي</p><p className="stat-num font-bold text-coral">{money(invoiceOutstanding(inv))}</p></div>
          <div className="card p-3"><p className="text-xs text-soft">قيد الفاتورة</p><p className="text-xs font-bold" dir="ltr">{invVoucher?.number ?? "—"}</p></div>
        </div>
        <div>
          {inv.voidReason && <p className="text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2">سبب الإلغاء: {inv.voidReason}</p>}
          <p className="text-xs font-bold text-soft mb-2">الدفعات المستقلة</p>
          {payments.length === 0 ? <p className="text-xs text-soft">لا توجد دفعات مستقلة مرتبطة بهذه الفاتورة.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-mist/70"><tr><th className="th">رقم الدفعة</th><th className="th">التاريخ</th><th className="th">المبلغ</th><th className="th">الطريقة</th><th className="th">الصندوق</th><th className="th">سند القبض</th><th className="th">الحالة</th></tr></thead>
                <tbody>
                  {payments.map((p) => {
                    const voucher = db.vouchers.find((v) => v.id === p.voucherId);
                    const status = PAYMENT_STATUS_META[p.status];
                    return (
                      <tr key={p.id} className="border-b border-line/60">
                        <td className="td stat-num font-bold" dir="ltr">{p.number}</td>
                        <td className="td">{fmtDate(p.date)}</td>
                        <td className="td stat-num">{money(p.amount)}</td>
                        <td className="td">{PAY_METHODS[p.method ?? "cash"]}</td>
                        <td className="td">{accountById(p.cashBoxId)?.name ?? "افتراضي"}</td>
                        <td className="td stat-num" dir="ltr">{voucher?.number ?? "—"}</td>
                        <td className="td"><Badge cls={status.cls}>{status.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}