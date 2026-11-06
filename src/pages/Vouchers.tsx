import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkPostingDate,
  fmtDate,
  nextVoucherNumber,
  PAY_METHODS,
  today,
  uid,
  useMoney,
  useStore,
  voucherTotals,
  VOUCHER_STATUS_META,
  VOUCHER_TYPE_LABEL,
  type Voucher,
  type VoucherLine,
  type VoucherStatus,
  type VoucherType,
} from "../store";
import { IconCheck, IconClock, IconPlus, IconPrinter, IconSearch, IconTrash, IconX } from "../icons";
import { Badge, EmptyState, Field, Modal, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";
import { PrintModal, VoucherPrint } from "../components/PrintSheet";

type TabKey = "all" | VoucherType | "draft";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "receipt", label: "سندات قبض" },
  { key: "payment", label: "سندات صرف" },
  { key: "journal", label: "قيود يومية" },
  { key: "transfer", label: "تحويلات" },
  { key: "opening", label: "افتتاحي" },
  { key: "draft", label: "مسودات" },
];

function initialLinesFor(type: VoucherType, cashId: string, arId: string, expenseId: string): VoucherLine[] {
  const line = (accountId: string, description: string): VoucherLine => ({ id: uid(), accountId, debit: 0, credit: 0, description });
  if (type === "receipt" && cashId && arId) return [line(cashId, "صندوق/بنك — قبض"), line(arId, "ذمم مرضى — قبض")];
  if (type === "payment" && expenseId && cashId) return [line(expenseId, "مصروف/جهة الصرف"), line(cashId, "صندوق/بنك — صرف")];
  if (type === "transfer" && cashId) return [line(cashId, "من صندوق/بنك"), line(cashId, "إلى صندوق/بنك")];
  return [line("", "مدين"), line("", "دائن")];
}

export default function VouchersPage() {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("all");
  const [status, setStatus] = useState<"all" | VoucherStatus>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [printV, setPrintV] = useState<Voucher | null>(null);
  const [reverseV, setReverseV] = useState<Voucher | null>(null);
  const [reverseReason, setReverseReason] = useState("");

  const accounts = db.accounts.filter((a) => a.isPosting && a.active);
  const cashBoxes = accounts.filter((a) => a.code.startsWith("111"));
  const cashIds = new Set(cashBoxes.map((a) => a.id));
  const arAcc = accounts.find((a) => a.code.startsWith("112101")) ?? accounts.find((a) => a.code.startsWith("112"));
  const revAcc = accounts.find((a) => a.type === "revenue");
  const expAcc = accounts.find((a) => a.type === "expense");
  const defaultCash = cashBoxes[0]?.id ?? "";
  const branches = db.branches.filter((b) => b.active !== false);
  const costCenters = db.costCenters.filter((c) => c.active !== false);

  const accountById = (id?: string) => db.accounts.find((a) => a.id === id);
  const branchById = (id?: string) => db.branches.find((b) => b.id === id);
  const patientById = (id?: string) => db.patients.find((p) => p.id === id);

  const sourceLabel = (v: Voucher): string => {
    if (v.reversalOf) {
      const original = db.vouchers.find((x) => x.id === v.reversalOf);
      return original ? `عكس ${original.number}` : "عكس قيد";
    }
    if (v.sourceType === "invoice") {
      const inv = db.invoices.find((i) => i.id === v.sourceId);
      return inv ? `فاتورة ${inv.number}` : "فاتورة";
    }
    if (v.sourceType === "payment") {
      const pay = db.payments.find((p) => p.id === v.sourceId);
      return pay ? `دفعة ${pay.number}` : "دفعة";
    }
    if (v.sourceType === "expense") {
      const e = db.expenses.find((x) => x.id === v.sourceId);
      return e ? `مصروف ${e.title}` : "مصروف";
    }
    return v.reference?.trim() || "—";
  };

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...db.vouchers]
      .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number))
      .filter((v) => {
        if (tab === "draft" && v.status !== "draft") return false;
        if (tab !== "all" && tab !== "draft" && v.type !== tab) return false;
        if (status !== "all" && v.status !== status) return false;
        if (from && v.date < from) return false;
        if (to && v.date > to) return false;
        if (!term) return true;
        const accountNames = v.lines.map((l) => accountById(l.accountId)?.name ?? "").join(" ");
        return [v.number, v.description, v.partyName, v.reference, sourceLabel(v), accountNames]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [db.vouchers, db.accounts, db.invoices, db.payments, db.expenses, tab, status, from, to, q]);

  const posted = db.vouchers.filter((v) => v.status === "posted");
  const postedTotals = posted.reduce(
    (acc, v) => {
      const t = voucherTotals(v.lines);
      return { debit: acc.debit + t.debit, credit: acc.credit + t.credit };
    },
    { debit: 0, credit: 0 }
  );
  const cashBalance = posted.reduce(
    (sum, v) => sum + v.lines.reduce((s, l) => (cashIds.has(l.accountId) ? s + (Number(l.debit) || 0) - (Number(l.credit) || 0) : s), 0),
    0
  );
  const draftsCount = db.vouchers.filter((v) => v.status === "draft").length;
  const voidCount = db.vouchers.filter((v) => v.status === "void").length;

  const validateBeforePost = (v: Voucher): string | null => {
    const totals = voucherTotals(v.lines);
    if (v.lines.length < 2) return "السند يحتاج بندين على الأقل.";
    if (!totals.balanced) return `السند غير متوازن: ${money(totals.debit)} مدين مقابل ${money(totals.credit)} دائن.`;
    const badAccount = v.lines.find((l) => {
      const a = accountById(l.accountId);
      return !a || !a.active || !a.isPosting;
    });
    if (badAccount) return "يوجد بند بدون حساب ترحيل نشط.";
    const dateCheck = checkPostingDate(db, v.date);
    return dateCheck.ok ? null : dateCheck.reason ?? "الفترة المالية غير متاحة.";
  };

  const doAutoPost = (historicalPayments: boolean) => {
    dispatch({ type: "AUTO_POST_FINANCIALS", historicalPayments });
    push(
      "success",
      historicalPayments ? "تم الترحيل التلقائي مع التحصيلات السابقة" : "تم الترحيل التلقائي للفواتير والمصروفات",
      "راجع السندات الجديدة في الجدول"
    );
  };

  const doPost = (v: Voucher) => {
    const error = validateBeforePost(v);
    if (error) return push("error", "تعذّر ترحيل السند", error);
    dispatch({ type: "POST_VOUCHER", id: v.id });
    push("success", "تم ترحيل السند", v.number);
  };

  const doReverse = () => {
    if (!reverseV) return;
    if (!reverseReason.trim()) return push("error", "سبب العكس مطلوب", "لا يمكن إلغاء سند مرحّل بدون سبب.");
    dispatch({ type: "VOID_VOUCHER", id: reverseV.id, reason: reverseReason.trim() });
    push("success", "تم إنشاء قيد عكسي", `${reverseV.number} → ملغى`);
    setReverseV(null);
    setReverseReason("");
  };

  const doDelete = (v: Voucher) => {
    dispatch({ type: "DELETE_VOUCHER", id: v.id });
    push("success", "تم حذف المسودة", v.number);
  };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">السندات والقيود المالية</h1>
          <p className="text-sm text-soft mt-1">
            {db.vouchers.length} سند · {posted.length} مرحّل · {draftsCount} مسودة · {voidCount} ملغى
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-soft" onClick={() => doAutoPost(false)}>
            <IconCheck className="w-4 h-4" /> ترحيل تلقائي (فواتير/مصروفات)
          </button>
          <button className="btn-soft" onClick={() => doAutoPost(true)}>
            <IconClock className="w-4 h-4" /> ترحيل التحصيلات السابقة
          </button>
          <button className="btn-primary" onClick={() => navigate("/vouchers/receipt/new")}>
            <IconPlus className="w-4.5 h-4.5" /> سند قبض
          </button>
          <button className="btn-primary" onClick={() => navigate("/vouchers/payment/new")}>
            <IconPlus className="w-4.5 h-4.5" /> سند صرف
          </button>
          <button className="btn-soft" onClick={() => navigate("/vouchers/journal/new")}>
            <IconPlus className="w-4.5 h-4.5" /> قيد يومي
          </button>
          <button className="btn-soft" onClick={() => navigate("/vouchers/transfer/new")}>
            <IconPlus className="w-4.5 h-4.5" /> تحويل
          </button>
          <button className="btn-soft" onClick={() => navigate("/vouchers/opening/new")}>
            <IconPlus className="w-4.5 h-4.5" /> افتتاحي
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card p-5 anim-rise"><p className="text-xs font-bold text-soft">إجمالي المرحّل (مدين)</p><p className="stat-num text-2xl text-ink mt-1">{money(postedTotals.debit)}</p></div>
        <div className="card p-5 anim-rise" style={{ animationDelay: "70ms" }}><p className="text-xs font-bold text-soft">إجمالي المرحّل (دائن)</p><p className="stat-num text-2xl text-ink mt-1">{money(postedTotals.credit)}</p></div>
        <div className="card p-5 anim-rise" style={{ animationDelay: "140ms" }}><p className="text-xs font-bold text-soft">صافي الصناديق/البنوك</p><p className={`stat-num text-2xl mt-1 ${cashBalance >= 0 ? "text-mint" : "text-coral"}`}>{money(cashBalance)}</p></div>
        <div className="card p-5 anim-rise" style={{ animationDelay: "210ms" }}><p className="text-xs font-bold text-soft">توازن المرحّل</p><p className={`text-lg font-bold mt-2 ${Math.abs(postedTotals.debit - postedTotals.credit) < 0.001 ? "text-mint" : "text-coral"}`}>{Math.abs(postedTotals.debit - postedTotals.credit) < 0.001 ? "متوازن ✓" : "غير متوازن"}</p></div>
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`chip cursor-pointer transition-colors ${tab === t.key ? "bg-jade text-white" : "bg-mist text-soft hover:bg-line"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-6 gap-3">
          <Field label="الحالة">
            <TSelect value={status} onChange={(e) => setStatus(e.target.value as "all" | VoucherStatus)}>
              <option value="all">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="posted">مرحّل</option>
              <option value="void">ملغى</option>
            </TSelect>
          </Field>
          <Field label="من تاريخ"><TInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="إلى تاريخ"><TInput type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <div className="md:col-span-3">
            <Field label="بحث">
              <div className="relative">
                <TInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="رقم سند، بيان، طرف، حساب، مرجع..." className="!pe-9" />
                <IconSearch className="absolute inset-y-0 end-3 my-auto w-4 h-4 text-soft pointer-events-none" />
              </div>
            </Field>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon={<IconPlus className="w-6 h-6" />} title="لا توجد سندات مطابقة" desc="أنشئ سنداً جديداً أو نفّذ الترحيل التلقائي للفواتير والمصروفات." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-mist/70 border-b border-line">
                <tr>
                  <th className="th">الرقم</th>
                  <th className="th">النوع</th>
                  <th className="th">التاريخ</th>
                  <th className="th">البيان/الطرف</th>
                  <th className="th">الصندوق/الفرع</th>
                  <th className="th">المصدر</th>
                  <th className="th">مدين</th>
                  <th className="th">دائن</th>
                  <th className="th">الحالة</th>
                  <th className="th">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {list.map((v) => {
                  const totals = voucherTotals(v.lines);
                  const st = VOUCHER_STATUS_META[v.status];
                  const cashBox = accountById(v.cashBoxId ?? v.lines.find((l) => cashIds.has(l.accountId))?.accountId);
                  const branch = branchById(v.branchId);
                  const party = v.partyName || patientById(v.partyId)?.name || "—";
                  return (
                    <tr key={v.id} className={`border-b border-line/60 ${v.status === "void" ? "opacity-70" : ""}`}>
                      <td className="td stat-num font-bold" dir="ltr">{v.number}</td>
                      <td className="td"><Badge cls="bg-mist text-soft">{VOUCHER_TYPE_LABEL[v.type] ?? v.type}</Badge></td>
                      <td className="td text-xs">{fmtDate(v.date)}</td>
                      <td className="td max-w-52">
                        <p className="font-semibold truncate">{v.description || "—"}</p>
                        <p className="text-[11px] text-soft truncate">{party}{v.reference ? ` · مرجع ${v.reference}` : ""}</p>
                      </td>
                      <td className="td text-xs text-soft">
                        <p className="truncate">{cashBox?.name ?? "—"}</p>
                        <p className="truncate">{branch?.name ?? "—"}</p>
                      </td>
                      <td className="td text-xs text-soft">{sourceLabel(v)}</td>
                      <td className="td stat-num">{money(totals.debit)}</td>
                      <td className="td stat-num">{money(totals.credit)}</td>
                      <td className="td">
                        <Badge cls={st.cls}>{st.label}</Badge>
                        {v.reversedBy && <p className="text-[10px] text-coral mt-1">معكوس</p>}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button className="icon-btn" title="طباعة" onClick={() => setPrintV(v)}><IconPrinter className="w-4 h-4" /></button>
                          {v.status === "draft" && (
                            <>
                              <button className="icon-btn hover:!bg-mint-soft hover:!text-[#1d6b47]" title="ترحيل" onClick={() => doPost(v)}><IconCheck className="w-4 h-4" /></button>
                              <TwoStepDelete onConfirm={() => doDelete(v)} />
                            </>
                          )}
                          {v.status === "posted" && !v.reversedBy && (
                            <button className="icon-btn hover:!bg-coral-soft hover:!text-coral" title="عكس/إلغاء" onClick={() => { setReverseV(v); setReverseReason(""); }}><IconX className="w-4 h-4" /></button>
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

      

      {reverseV && (
        <Modal
          open
          onClose={() => setReverseV(null)}
          title={`عكس/إلغاء ${reverseV.number}`}
          subtitle="سيُنشأ قيد عكسي متوازن ويُربط بالسند الأصلي. لا يُحذف السند المرحّل."
          footer={
            <>
              <button className="btn-ghost" onClick={() => setReverseV(null)}>تراجع</button>
              <button className="btn-primary !bg-coral hover:!bg-coral/90" onClick={doReverse}>إنشاء قيد عكسي</button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <p><span className="text-soft">النوع:</span> <b>{VOUCHER_TYPE_LABEL[reverseV.type]}</b></p>
              <p><span className="text-soft">التاريخ:</span> <b>{fmtDate(reverseV.date)}</b></p>
              <p><span className="text-soft">الطرف:</span> <b>{reverseV.partyName || "—"}</b></p>
              <p><span className="text-soft">المبلغ:</span> <b className="stat-num">{money(voucherTotals(reverseV.lines).debit)}</b></p>
            </div>
            <Field label="سبب العكس *">
              <TInput value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} placeholder="مثال: خطأ في المبلغ أو تكرار سند" />
            </Field>
            <p className="text-[11px] text-soft">التاريخ العكسي: {fmtDate(today(0))} — يجب أن تكون الفترة المالية مفتوحة.</p>
          </div>
        </Modal>
      )}

      {printV && (
        <PrintModal open onClose={() => setPrintV(null)} title={`طباعة ${printV.number}`}>
          <VoucherPrint voucher={printV} />
        </PrintModal>
      )}
    </div>
  );
}

function VoucherModal({
  onClose,
  accounts,
  branches,
  costCenters,
  defaultCash,
  defaultAr,
  defaultExpense,
}: {
  onClose: () => void;
  accounts: import("../store").Account[];
  branches: import("../store").Branch[];
  costCenters: import("../store").CostCenter[];
  defaultCash: string;
  defaultAr: string;
  defaultExpense: string;
}) {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [type, setType] = useState<VoucherType>("receipt");
  const [date, setDate] = useState(today(0));
  const [desc, setDesc] = useState("");
  const [reference, setReference] = useState("");
  const [branchId, setBranchId] = useState(db.branches.find((b) => b.isDefault)?.id ?? branches[0]?.id ?? "");
  const [costCenterId, setCostCenterId] = useState(costCenters[0]?.id ?? "");
  const [partyName, setPartyName] = useState("");
  const [method, setMethod] = useState("cash");
  const [cashBoxId, setCashBoxId] = useState(defaultCash);
  const [lines, setLines] = useState<VoucherLine[]>(() => initialLinesFor("receipt", defaultCash, defaultAr, defaultExpense));

  const totals = voucherTotals(lines);
  const number = nextVoucherNumber(db.vouchers, type, date);
  const dateCheck = checkPostingDate(db, date);
  const showCashFields = type === "receipt" || type === "payment" || type === "transfer";

  useEffect(() => {
    setLines(initialLinesFor(type, defaultCash, defaultAr, defaultExpense));
    if ((type === "receipt" || type === "payment" || type === "transfer") && !cashBoxId) setCashBoxId(defaultCash);
  }, [type]);

  const updateLine = (id: string, patch: Partial<VoucherLine>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const addLine = () => setLines((prev) => [...prev, { id: uid(), accountId: "", debit: 0, credit: 0, description: "" }]);
  const removeLine = (id: string) => setLines((prev) => (prev.length > 2 ? prev.filter((l) => l.id !== id) : prev));

  const validate = (): string | null => {
    if (!desc.trim()) return "البيان مطلوب.";
    if (lines.length < 2) return "أدخل بندين على الأقل.";
    if (lines.some((l) => !l.accountId)) return "اختر حساباً لكل بند.";
    if (!totals.balanced) return "المدين والدائن غير متساويين.";
    if (!dateCheck.ok) return dateCheck.reason ?? "الفترة المالية غير متاحة.";
    if (showCashFields && !cashBoxId) return "اختر صندوقاً أو بنكاً.";
    return null;
  };

  const save = (asDraft: boolean) => {
    const error = validate();
    if (error) return push("error", "تعذّر حفظ السند", error);
    const now = new Date().toISOString();
    const v: Voucher = {
      id: uid(),
      number,
      type,
      date,
      description: desc.trim(),
      status: asDraft ? "draft" : "posted",
      lines: lines.map((l) => ({ ...l, debit: Math.max(0, Number(l.debit) || 0), credit: Math.max(0, Number(l.credit) || 0) })),
      branchId: branchId || undefined,
      costCenterId: costCenterId || undefined,
      cashBoxId: showCashFields ? cashBoxId || undefined : undefined,
      partyName: partyName.trim() || undefined,
      method: showCashFields ? method : undefined,
      reference: reference.trim() || undefined,
      createdBy: db.users[0]?.id,
      createdAt: now,
      postedAt: asDraft ? undefined : now,
      updatedAt: Date.now(),
    };
    dispatch({ type: "ADD_VOUCHER", v });
    push("success", asDraft ? "تم حفظ المسودة" : "تم ترحيل السند", `${VOUCHER_TYPE_LABEL[type]} ${number}`);
    onClose();
  };


  return (
    <Modal
      open
      onClose={onClose}
      title="سند مالي جديد"
      subtitle={`الرقم المتوقع ${number} — ${VOUCHER_TYPE_LABEL[type]}`}
      width="max-w-5xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-soft" onClick={() => save(true)}>حفظ كمسودة</button>
          <button className="btn-primary" disabled={!totals.balanced || !dateCheck.ok} onClick={() => save(false)}>ترحيل</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="النوع">
            <TSelect value={type} onChange={(e) => setType(e.target.value as VoucherType)}>
              {(Object.keys(VOUCHER_TYPE_LABEL) as VoucherType[]).map((k) => <option key={k} value={k}>{VOUCHER_TYPE_LABEL[k]}</option>)}
            </TSelect>
          </Field>
          <Field label="التاريخ"><TInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="الفرع">
            <TSelect value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">بدون فرع</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </TSelect>
          </Field>
          <Field label="مركز التكلفة">
            <TSelect value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)}>
              <option value="">بدون مركز</option>
              {costCenters.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </TSelect>
          </Field>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2"><Field label="البيان *"><TInput value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف رسمي يظهر في الطباعة" /></Field></div>
          <Field label="الطرف/الاسم"><TInput value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="مريض/مورد/موظف" /></Field>
          <Field label="المرجع"><TInput value={reference} onChange={(e) => setReference(e.target.value)} placeholder="شيك/حوالة/مرجع داخلي" /></Field>
        </div>

        {showCashFields && (
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="الصندوق/البنك">
              <TSelect value={cashBoxId} onChange={(e) => setCashBoxId(e.target.value)}>
                <option value="">اختر الحساب</option>
                {accounts.filter((a) => a.code.startsWith("111")).map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
              </TSelect>
            </Field>
            <Field label="طريقة الدفع/الاستلام">
              <TSelect value={method} onChange={(e) => setMethod(e.target.value)}>
                {Object.entries(PAY_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </TSelect>
            </Field>
          </div>
        )}

        {!dateCheck.ok && <p className="text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2">{dateCheck.reason}</p>}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-soft">بنود القيد</p>
            <button className="btn-soft !h-8 !text-xs" onClick={addLine}><IconPlus className="w-3.5 h-3.5" /> بند</button>
          </div>
          {lines.map((l) => (
            <div key={l.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <TSelect value={l.accountId} onChange={(e) => updateLine(l.id, { accountId: e.target.value })}>
                  <option value="">الحساب</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                </TSelect>
              </div>
              <div className="col-span-2">
                <TSelect value={l.costCenterId ?? costCenterId} onChange={(e) => updateLine(l.id, { costCenterId: e.target.value })}>
                  <option value="">مركز التكلفة</option>
                  {costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </TSelect>
              </div>
              <div className="col-span-2"><TInput placeholder="وصف البند" value={l.description ?? ""} onChange={(e) => updateLine(l.id, { description: e.target.value })} /></div>
              <div className="col-span-2"><TInput type="number" min={0} placeholder="مدين" value={l.debit || ""} onChange={(e) => updateLine(l.id, { debit: Number(e.target.value) || 0 })} /></div>
              <div className="col-span-2"><TInput type="number" min={0} placeholder="دائن" value={l.credit || ""} onChange={(e) => updateLine(l.id, { credit: Number(e.target.value) || 0 })} /></div>
              <div className="col-span-1"><button onClick={() => removeLine(l.id)} className="icon-btn !w-9 !h-9 hover:!bg-coral-soft hover:!text-coral"><IconTrash className="w-4 h-4" /></button></div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-line text-xs font-bold">
            <span>المجموع</span>
            <span className={totals.balanced ? "text-mint" : "text-coral"}>
              مدين {money(totals.debit)} · دائن {money(totals.credit)} {totals.balanced ? "✓" : "≠"}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

