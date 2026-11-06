/**
 * محرك الدورة المستندية المالية — دوال نقية قابلة للاختبار دون React.
 * تُستخدم من المخزن والشاشات لضمان أن الحسابات والقيود تتبع قاعدة واحدة.
 */

export type FinanceAccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface FinanceAccountLike {
  id: string;
  code: string;
  name: string;
  type: FinanceAccountType;
  isPosting?: boolean;
  active?: boolean;
}

export interface FinanceInvoiceLine {
  qty: number;
  price: number;
}

export interface FinanceInvoiceLike {
  id: string;
  number: string;
  date: string;
  items: FinanceInvoiceLine[];
  discount?: number;
  cashDiscount?: number;
  paid?: number;
  documentStatus?: string;
}

export interface FinanceVoucherLine {
  id?: string;
  accountId: string;
  debit: number;
  credit: number;
  costCenterId?: string;
  description?: string;
  refType?: string;
  refId?: string;
}

export interface FinanceVoucherLike {
  id: string;
  number: string;
  type: string;
  date: string;
  description: string;
  status: "draft" | "posted" | "void";
  lines: FinanceVoucherLine[];
}

export interface FinanceFiscalYearLike {
  id: string;
  startDate: string;
  endDate: string;
  status: "open" | "closed";
}

export interface FinanceFiscalPeriodLike {
  id?: string;
  fiscalYearId: string;
  startDate: string;
  endDate: string;
  status: "open" | "closed" | "locked";
}

export interface PaymentAllocationLike {
  invoiceId: string;
  amount: number;
}

export interface FinancePaymentLike {
  id: string;
  number: string;
  direction: "receipt" | "payment";
  date: string;
  amount: number;
  status?: string;
  allocations: PaymentAllocationLike[];
}

export const EPSILON = 0.001;

export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

export const clampNonNegative = (n: number): number => Math.max(0, round2(Number(n) || 0));

export const isBalanced = (debit: number, credit: number): boolean =>
  Math.abs(round2(debit) - round2(credit)) < EPSILON;

export const lineTotals = (lines: FinanceVoucherLine[]) => {
  let debit = 0;
  let credit = 0;
  for (const l of lines) {
    debit += Number(l.debit) || 0;
    credit += Number(l.credit) || 0;
  }
  return { debit: round2(debit), credit: round2(credit), balanced: isBalanced(debit, credit) };
};

export const invoiceGross = (inv: FinanceInvoiceLike): number =>
  round2((inv.items || []).reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0));

export const invoiceDiscounts = (inv: FinanceInvoiceLike) => {
  const gross = invoiceGross(inv);
  const percent = Math.min(100, Math.max(0, Number(inv.discount) || 0));
  const percentAmount = round2(gross * (percent / 100));
  const afterPercent = round2(gross - percentAmount);
  const cashDiscount = Math.min(clampNonNegative(inv.cashDiscount ?? 0), afterPercent);
  return {
    gross,
    percent,
    percentAmount,
    cashDiscount,
    totalDiscount: round2(percentAmount + cashDiscount),
    afterPercent,
    total: round2(Math.max(0, afterPercent - cashDiscount)),
  };
};

export const invoiceTotal = (inv: FinanceInvoiceLike): number => invoiceDiscounts(inv).total;

export const invoiceOutstanding = (inv: FinanceInvoiceLike): number =>
  round2(Math.max(0, invoiceTotal(inv) - clampNonNegative(inv.paid ?? 0)));

export const isActiveInvoice = (inv: FinanceInvoiceLike): boolean =>
  !inv.documentStatus || inv.documentStatus !== "void";

export const paymentStatusOf = (inv: FinanceInvoiceLike): "paid" | "partial" | "unpaid" => {
  const total = invoiceTotal(inv);
  const paid = clampNonNegative(inv.paid ?? 0);
  if (total > 0 && paid >= total - EPSILON) return "paid";
  if (paid > EPSILON) return "partial";
  return "unpaid";
};

export const monthEndDate = (year: number, month: number): string => {
  const y = Number(year);
  const m = Math.min(12, Math.max(1, Number(month)));
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return `${y}-${mm}-${String(last).padStart(2, "0")}`;
};

export const dateYear = (date: string): number => Number((date || "").slice(0, 4)) || new Date().getFullYear();

export const fiscalYearForDate = (years: FinanceFiscalYearLike[], date: string) =>
  (years || []).find((y) => date >= y.startDate && date <= y.endDate);

export const fiscalPeriodForDate = (periods: FinanceFiscalPeriodLike[], date: string) =>
  (periods || []).find((p) => date >= p.startDate && date <= p.endDate);

export const checkPostingDate = (
  years: FinanceFiscalYearLike[],
  periods: FinanceFiscalPeriodLike[],
  date: string
): { ok: boolean; reason?: string } => {
  if (!date) return { ok: false, reason: "تاريخ السند مطلوب." };
  const fy = fiscalYearForDate(years, date);
  if (fy?.status === "closed") return { ok: false, reason: `السنة المالية ${fy.startDate.slice(0, 4)} مغلقة.` };
  const period = fiscalPeriodForDate(periods, date);
  if (period?.status === "closed") return { ok: false, reason: "الفترة المالية مغلقة." };
  if (period?.status === "locked") return { ok: false, reason: "الفترة المالية مقفلة مؤقتاً." };
  return { ok: true };
};

export const isDatePostable = (
  years: FinanceFiscalYearLike[],
  periods: FinanceFiscalPeriodLike[],
  date: string
): boolean => checkPostingDate(years, periods, date).ok;

export const resolveAccounts = (accounts: FinanceAccountLike[]) => {
  const usable = (accounts || []).filter((a) => a.active !== false && a.isPosting);
  const byPrefix = (prefix: string) => usable.find((a) => a.code.startsWith(prefix));
  const byType = (type: FinanceAccountType) => usable.find((a) => a.type === type);

  return {
    cashBox: byPrefix("111101") ?? byPrefix("1112") ?? byPrefix("111"),
    patientAr: byPrefix("112101") ?? byPrefix("1121") ?? byPrefix("112"),
    insuranceAr: byPrefix("112201") ?? byPrefix("1122"),
    supplierAp: byPrefix("211101") ?? byPrefix("2111"),
    labAp: byPrefix("211201") ?? byPrefix("2112"),
    inventory: byPrefix("113101") ?? byPrefix("113"),
    discount: usable.find((a) => a.type === "revenue" && (a.code.startsWith("43") || a.name.includes("خصم"))) ?? undefined,
    revenue: byPrefix("412101") ?? byPrefix("411101") ?? byPrefix("41") ?? byType("revenue"),
    expense: byPrefix("31") ?? byType("expense"),
  };
};

export const voucherPrefix = (type: string): string => {
  switch (type) {
    case "receipt": return "RCV";
    case "payment": return "PAY";
    case "transfer": return "TRF";
    case "opening": return "OPN";
    default: return "JV";
  }
};

export const nextDocumentNumber = (existing: string[], prefix: string, date: string, pad = 4): string => {
  const year = dateYear(date);
  const head = `${prefix}-${year}-`;
  let max = 0;
  for (const n of existing || []) {
    if (!n.startsWith(head)) continue;
    const seq = Number(n.slice(head.length).replace(/\D+/g, "")) || 0;
    if (seq > max) max = seq;
  }
  return `${head}${String(max + 1).padStart(pad, "0")}`;
};

export const hasSourceVoucher = (vouchers: FinanceVoucherLike[], refType: string, refId?: string): boolean =>
  !!refId && (vouchers || []).some((v) =>
    v.status !== "void" && (v.lines || []).some((l) => l.refType === refType && l.refId === refId)
  );

export const postedVouchers = (vouchers: FinanceVoucherLike[]) =>
  (vouchers || []).filter((v) => v.status === "posted");

export const accountBalance = (vouchers: FinanceVoucherLike[], accountId: string, beforeDate?: string): number => {
  let balance = 0;
  for (const v of postedVouchers(vouchers)) {
    if (beforeDate && v.date >= beforeDate) continue;
    for (const l of v.lines || []) {
      if (l.accountId !== accountId) continue;
      balance += (Number(l.debit) || 0) - (Number(l.credit) || 0);
    }
  }
  return round2(balance);
};

export const voucherReversalLines = (lines: FinanceVoucherLine[]): FinanceVoucherLine[] =>
  (lines || []).map((l) => ({
    ...l,
    debit: Number(l.credit) || 0,
    credit: Number(l.debit) || 0,
    description: l.description ? `عكس: ${l.description}` : "عكس القيد",
  }));

export const paymentAllocationsTotal = (allocations: PaymentAllocationLike[]): number =>
  round2((allocations || []).reduce((s, a) => s + clampNonNegative(a.amount), 0));

export const invoicePayments = (payments: FinancePaymentLike[], invoiceId: string): FinancePaymentLike[] =>
  (payments || []).filter(
    (p) =>
      p.status !== "void" &&
      ((p.allocations || []).some((a) => a.invoiceId === invoiceId) || (p as { invoiceId?: string }).invoiceId === invoiceId)
  );

export const invoicePaidFromPayments = (payments: FinancePaymentLike[], invoiceId: string): number =>
  round2(
    invoicePayments(payments, invoiceId).reduce(
      (s, p) =>
        s +
        (p.allocations || [])
          .filter((a) => a.invoiceId === invoiceId)
          .reduce((ss, a) => ss + clampNonNegative(a.amount), 0),
      0
    )
  );

export interface BuildInvoiceVoucherInput {
  id: string;
  number: string;
  date: string;
  description?: string;
  branchId?: string;
  costCenterId?: string;
  invoice: FinanceInvoiceLike;
  accounts: FinanceAccountLike[];
  lineId?: (index: number) => string;
}

export const buildInvoiceVoucherLines = (input: BuildInvoiceVoucherInput): FinanceVoucherLine[] => {
  const acc = resolveAccounts(input.accounts);
  const amounts = invoiceDiscounts(input.invoice);
  const lineId = input.lineId ?? ((i: number) => `${input.id}-L${i + 1}`);
  if (!acc.patientAr || !acc.revenue) return [];
  if (amounts.gross <= 0) return [];

  const lines: FinanceVoucherLine[] = [];
  if (acc.discount && amounts.totalDiscount > 0) {
    lines.push({
      id: lineId(0),
      accountId: acc.patientAr.id,
      debit: amounts.total,
      credit: 0,
      costCenterId: input.costCenterId,
      description: `صافي فاتورة ${input.invoice.number}`,
      refType: "invoice",
      refId: input.invoice.id,
    });
    lines.push({
      id: lineId(1),
      accountId: acc.discount.id,
      debit: amounts.totalDiscount,
      credit: 0,
      costCenterId: input.costCenterId,
      description: `خصم على فاتورة ${input.invoice.number}`,
      refType: "invoice",
      refId: input.invoice.id,
    });
    lines.push({
      id: lineId(2),
      accountId: acc.revenue.id,
      debit: 0,
      credit: amounts.gross,
      costCenterId: input.costCenterId,
      description: `إيراد خدمات — فاتورة ${input.invoice.number}`,
      refType: "invoice",
      refId: input.invoice.id,
    });
  } else {
    lines.push({
      id: lineId(0),
      accountId: acc.patientAr.id,
      debit: amounts.total,
      credit: 0,
      costCenterId: input.costCenterId,
      description: `ذمم مرضى — فاتورة ${input.invoice.number}`,
      refType: "invoice",
      refId: input.invoice.id,
    });
    lines.push({
      id: lineId(1),
      accountId: acc.revenue.id,
      debit: 0,
      credit: amounts.total,
      costCenterId: input.costCenterId,
      description: `إيراد خدمات — فاتورة ${input.invoice.number}`,
      refType: "invoice",
      refId: input.invoice.id,
    });
  }
  return lines;
};

export const buildReceiptVoucherLines = (input: {
  amount: number;
  cashBoxId?: string;
  accounts: FinanceAccountLike[];
  description: string;
  refType?: string;
  refId?: string;
  costCenterId?: string;
  lineId?: (index: number) => string;
}): FinanceVoucherLine[] => {
  const acc = resolveAccounts(input.accounts);
  const amount = clampNonNegative(input.amount);
  const cashBoxId = input.cashBoxId || acc.cashBox?.id;
  const arId = acc.patientAr?.id;
  const lineId = input.lineId ?? ((i: number) => `rcv-L${i + 1}`);
  if (!cashBoxId || !arId || amount <= 0) return [];
  return [
    {
      id: lineId(0),
      accountId: cashBoxId,
      debit: amount,
      credit: 0,
      costCenterId: input.costCenterId,
      description: input.description,
      refType: input.refType ?? "payment",
      refId: input.refId,
    },
    {
      id: lineId(1),
      accountId: arId,
      debit: 0,
      credit: amount,
      costCenterId: input.costCenterId,
      description: input.description,
      refType: input.refType ?? "payment",
      refId: input.refId,
    },
  ];
};

export const buildExpenseVoucherLines = (input: {
  amount: number;
  cashBoxId?: string;
  expenseAccountId?: string;
  accounts: FinanceAccountLike[];
  description: string;
  refType?: string;
  refId?: string;
  costCenterId?: string;
  lineId?: (index: number) => string;
}): FinanceVoucherLine[] => {
  const acc = resolveAccounts(input.accounts);
  const amount = clampNonNegative(input.amount);
  const cashBoxId = input.cashBoxId || acc.cashBox?.id;
  const expenseAccountId = input.expenseAccountId || acc.expense?.id;
  const lineId = input.lineId ?? ((i: number) => `exp-L${i + 1}`);
  if (!cashBoxId || !expenseAccountId || amount <= 0) return [];
  return [
    {
      id: lineId(0),
      accountId: expenseAccountId,
      debit: amount,
      credit: 0,
      costCenterId: input.costCenterId,
      description: input.description,
      refType: input.refType ?? "expense",
      refId: input.refId,
    },
    {
      id: lineId(1),
      accountId: cashBoxId,
      debit: 0,
      credit: amount,
      costCenterId: input.costCenterId,
      description: input.description,
      refType: input.refType ?? "expense",
      refId: input.refId,
    },
  ];
};

