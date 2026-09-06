import React, { useEffect, useMemo, useState } from "react";
import {
  fmtDate,
  invoiceStatus,
  invoiceTotal,
  INV_META,
  PAY_METHODS,
  today,
  uid,
  useMoney,
  useStore,
  type Invoice,
} from "../store";
import { IconPlus, IconPrinter, IconReceipt, IconTrash, IconWallet } from "../icons";
import { AnimatedNumber, Avatar, Badge, EmptyState, Field, Modal, TInput, TSelect, useToast ,TwoStepDelete} from "../components/ui";
import { InvoicePrint, PrintModal } from "../components/PrintSheet";

export default function InvoicesPage() {
  const { db, dispatch, patientById, serviceById } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [payInv, setPayInv] = useState<Invoice | null>(null);
  const [printInv, setPrintInv] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState<"all" | "paid" | "partial" | "unpaid">("all");

  const cur = db.currencies.find((c) => c.code === db.defaultCurrency) ?? db.currencies[0];
  const rate = cur?.rate || 1;
  const collected = db.invoices.reduce((s, i) => s + Math.min(i.paid, invoiceTotal(i)), 0);
  const outstanding = db.invoices.reduce((s, i) => s + Math.max(0, invoiceTotal(i) - i.paid), 0);

  const list = useMemo(
    () =>
      [...db.invoices]
        .sort((a, b) => b.date.localeCompare(a.date))
        .filter((i) => filter === "all" || invoiceStatus(i) === filter),
    [db.invoices, filter]
  );

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">الفواتير والتحصيل</h1>
          <p className="text-sm text-soft mt-1">{db.invoices.length} فاتورة · آخر إصدار {db.nextInv - 1} · العملة: {cur?.name}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(true)}>
          <IconPlus className="w-4.5 h-4.5" />
          فاتورة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <p className="text-xs font-bold text-soft mb-3">تصفية حسب الحالة</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "الكل"],
                ["paid", "مدفوعة"],
                ["partial", "جزئية"],
                ["unpaid", "غير مدفوعة"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 h-9 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
                  filter === k ? "bg-pine text-white border-pine" : "bg-white text-soft border-line hover:border-jade/50"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden anim-rise" style={{ animationDelay: "260ms" }}>
        {list.length === 0 ? (
          <EmptyState icon={<IconReceipt className="w-6 h-6" />} title="لا فواتير هنا" desc="أنشئ فاتورة جديدة لتظهر في القائمة." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-mist/70 border-b border-line">
                <tr>
                  <th className="th">الفاتورة</th>
                  <th className="th">المريض</th>
                  <th className="th">التاريخ</th>
                  <th className="th">البنود</th>
                  <th className="th">الإجمالي</th>
                  <th className="th">المتبقي</th>
                  <th className="th">الحالة</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((inv, i) => {
                  const p = patientById(inv.patientId);
                  const total = invoiceTotal(inv);
                  const rem = Math.max(0, total - inv.paid);
                  const st = invoiceStatus(inv);
                  return (
                    <tr key={inv.id} className="border-b border-line/60 last:border-0 hover:bg-jade-soft/30 transition-colors anim-fade" style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="td"><span className="stat-num font-bold text-jade-deep" dir="ltr">{inv.number}</span></td>
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={p?.name ?? "؟"} size="w-8 h-8 text-[10px]" />
                          <span className="font-bold text-ink">{p?.name ?? "محذوف"}</span>
                        </div>
                      </td>
                      <td className="td text-soft">{fmtDate(inv.date)}</td>
                      <td className="td text-soft text-xs max-w-56">
                        <span className="block truncate">
                          {inv.items.map((it) => `${serviceById(it.serviceId)?.name ?? "خدمة"} ×${it.qty}`).join("، ")}
                        </span>
                      </td>
                      <td className="td">
                        <span className="stat-num font-bold text-ink block">{money(total)}</span>
                        {inv.discount ? <span className="chip bg-amber-soft text-[#a06410] !py-0.5 mt-1">خصم {inv.discount}%</span> : null}
                       {/* ✅ أضف هذا السطر */}
  {inv.cashDiscount ? (
    <span className="chip bg-amber-soft text-[#a06410] !py-0.5 mt-1">
      خصم نقدي −{money(inv.cashDiscount)}
    </span>
  ) : null}
                      
                      </td>
                      <td className="td">
                        {rem > 0 ? <span className="stat-num font-bold text-coral">{money(rem)}</span> : <span className="text-mint font-bold text-xs">—</span>}
                      </td>
                      <td className="td">
                        <Badge cls={INV_META[st].cls}>{INV_META[st].label}</Badge>
                        <span className="chip bg-mist text-soft mt-1.5 !py-0.5">{PAY_METHODS[inv.method ?? "cash"]}</span>
                      </td>
                    <td className="td">
  <div className="flex items-center gap-1.5">
    {rem > 0 && (
      <button onClick={() => setPayInv(inv)} className="text-[11px] font-bold text-white bg-jade hover:bg-jade-deep rounded-lg px-3 py-2 cursor-pointer transition-colors">
        تحصيل
      </button>
    )}
    <button
      onClick={() => setPrintInv(inv)}
      className="icon-btn !w-8 !h-8 hover:!bg-jade-soft hover:!text-jade-deep"
      aria-label="طباعة"
      title="طباعة الفاتورة"
    >
      <IconPrinter className="w-4 h-4" />
    </button>
    {/* ✅ زر حذف الفاتورة */}
    <TwoStepDelete
      onConfirm={() => {
        dispatch({ type: "DELETE_INVOICE", id: inv.id });
        push("warn", "حُذفت الفاتورة نهائياً", `الفاتورة ${inv.number} أُزيلت من النظام.`);
      }}
    />
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
  const [rows, setRows] = useState<{ serviceId: string; qty: number }[]>([{ serviceId: "", qty: 1 }]);
  const [paid, setPaid] = useState("");
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState("cash");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setPatientId("");
      setRows([{ serviceId: "", qty: 1 }]);
      setPaid("");
      setDiscount("");
      setMethod("cash");
      setErr("");
    }
  }, [open]);

  const gross = rows.reduce((s, r) => s + (serviceById(r.serviceId)?.price ?? 0) * r.qty, 0);
  const discPct = Math.min(100, Math.max(0, Number(discount) || 0));
  const total = Math.round(gross * (1 - discPct / 100));

  const save = () => {
    if (!patientId) return setErr("اختر المريض.");
    const valid = rows.filter((r) => r.serviceId && r.qty > 0);
    if (valid.length === 0) return setErr("أضف بنداً واحداً على الأقل.");
    const paidNum = Math.min(Math.max(0, Number(paid) || 0), total);
    const inv: Invoice = {
      id: uid(),
      number: `${db.settings.invoicePrefix}-${db.nextInv}`,
      patientId,
      date: today(0),
      items: valid.map((r) => ({ serviceId: r.serviceId, qty: r.qty, price: serviceById(r.serviceId)!.price })),
      paid: paidNum,
      discount: discPct || undefined,
      method,
    };
    dispatch({ type: "ADD_INVOICE", inv });
    push("success", `أُنشئت الفاتورة ${inv.number}`, `الإجمالي ${money(total)}${discPct ? ` (بعد خصم ${discPct}%)` : ""}${paidNum > 0 ? ` — دُفع منها ${money(paidNum)}` : ""}`);
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

        <div className="grid grid-cols-2 gap-4">
          <Field label="خصم (%)" hint="يطبَّق على إجمالي البنود">
            <TInput type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
          </Field>
          <Field label="طريقة الدفع">
            <TSelect value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(PAY_METHODS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </TSelect>
          </Field>
        </div>
        <Field label="الدفعة المقدمة (اختياري)" hint="اتركه فارغاً لتسجيل الفاتورة كغير مدفوعة">
          <TInput type="number" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0" />
        </Field>
        {discPct > 0 && (
          <p className="text-xs font-bold text-jade-deep bg-jade-soft rounded-lg px-3.5 py-2.5 anim-pop">
            الإجمالي قبل الخصم {money(gross)} — بعد خصم {discPct}% يصبح {money(total)}
          </p>
        )}
        {err && <p className="text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
      </div>
    </Modal>
  );
}

/* ============================ تحصيل دفعة ============================ */

function PayModal({ inv, onClose }: { inv: Invoice; onClose: () => void }) {
  const { dispatch, patientById } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const remaining = Math.max(0, invoiceTotal(inv) - inv.paid);
  const [amount, setAmount] = useState(String(remaining));

  const save = () => {
    const amt = Math.min(remaining, Math.max(0, Number(amount) || 0));
    if (amt <= 0) return;
    dispatch({ type: "PAY_INVOICE", id: inv.id, amount: amt });
    push("success", `تم تحصيل ${money(amt)}`, `${inv.number} — ${patientById(inv.patientId)?.name}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`تحصيل ${inv.number}`}
      subtitle={`${patientById(inv.patientId)?.name} — المتبقي ${money(remaining)}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>تأكيد التحصيل</button>
        </>
      }
    >
      <Field label="المبلغ المحصَّل">
        <TInput type="number" min={0} max={remaining} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <div className="flex gap-2 mt-3">
        <button onClick={() => setAmount(String(remaining))} className="chip bg-jade-soft text-jade-deep cursor-pointer hover:bg-jade hover:text-white transition-colors !py-2">
          كامل المتبقي
        </button>
        <button onClick={() => setAmount(String(Math.round(remaining / 2)))} className="chip bg-mist text-soft cursor-pointer hover:bg-line transition-colors !py-2">
          نصف المبلغ
        </button>
      </div>
    </Modal>
  );
}
