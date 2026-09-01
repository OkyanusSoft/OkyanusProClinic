import React, { useMemo, useState } from "react";
import { expCatColor, EXPENSE_CATS, fmtDate, today, uid, useMoney, useStore, type Expense } from "../store";
import { IconPlus, IconReceipt, IconWallet } from "../icons";
import { AnimatedNumber, DateInput, EmptyState, Field, Modal, TArea, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";

export default function ExpensesPage() {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const cur = db.currencies.find((c) => c.code === db.defaultCurrency) ?? db.currencies[0];
  const sym = cur?.symbol ?? "ر.ي";
  const [cat, setCat] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  const monthPrefix = today(0).slice(0, 7);
  const monthExp = db.expenses.filter((e) => e.date.startsWith(monthPrefix));
  const monthTotal = monthExp.reduce((s, e) => s + e.amount, 0);

  const byCat = useMemo(() => {
    const agg = new Map<string, number>();
    monthExp.forEach((e) => agg.set(e.category, (agg.get(e.category) ?? 0) + e.amount));
    return [...agg.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthExp]);
  const maxCat = Math.max(1, ...byCat.map(([, v]) => v));

  const list = useMemo(
    () => [...db.expenses].filter((e) => cat === "all" || e.category === cat).sort((a, b) => b.date.localeCompare(a.date)),
    [db.expenses, cat]
  );

  const avgDaily = monthExp.length ? Math.round(monthTotal / Math.max(1, new Set(monthExp.map((e) => e.date)).size)) : 0;

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">المصروفات والمشتريات</h1>
          <p className="text-sm text-soft mt-1">تتبّع كامل لمصاريف تشغيل العيادة — تُحتسب في التقارير المالية تلقائياً.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <IconPlus className="w-4.5 h-4.5" />
          تسجيل مصروف
        </button>
      </div>

      {/* KPIs + توزيع الفئات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card card-hover p-5 anim-rise" style={{ animationDelay: "70ms" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-soft">مصروفات هذا الشهر</p>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-coral-soft text-coral"><IconWallet className="w-5 h-5" /></span>
          </div>
          <p className="mt-1"><AnimatedNumber value={monthTotal} className="stat-num text-3xl text-ink" /> <span className="text-xs font-bold text-soft">{sym}</span></p>
          <p className="text-[11px] text-soft mt-1.5 font-medium">{monthExp.length} عملية صرف · {byCat.length} فئات</p>
        </div>
        <div className="card card-hover p-5 anim-rise" style={{ animationDelay: "140ms" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-soft">متوسط الصرف اليومي</p>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-soft text-[#a06410]"><IconReceipt className="w-5 h-5" /></span>
          </div>
          <p className="mt-1"><AnimatedNumber value={avgDaily} className="stat-num text-3xl text-ink" /> <span className="text-xs font-bold text-soft">{sym}</span></p>
          <p className="text-[11px] text-soft mt-1.5 font-medium">على أيام الصرف الفعلية</p>
        </div>
        <div className="card p-5 anim-rise" style={{ animationDelay: "210ms" }}>
          <p className="text-xs font-bold text-soft mb-3">توزيع فئات الشهر</p>
          <div className="space-y-2.5">
            {byCat.slice(0, 3).map(([c, v]) => (
              <div key={c}>
                <div className="flex justify-between text-[11px] font-bold mb-1">
                  <span className="text-ink flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: expCatColor(c) }} />{c}</span>
                  <span className="stat-num text-soft">{money(v)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-mist overflow-hidden">
                  <div className="h-full rounded-full anim-grow-w" style={{ width: `${(v / maxCat) * 100}%`, background: expCatColor(c) }} />
                </div>
              </div>
            ))}
            {byCat.length === 0 && <p className="text-[11px] text-soft text-center py-2">لا مصروفات بعد.</p>}
          </div>
        </div>
      </div>

      {/* فلترة */}
      <div className="flex flex-wrap gap-2 anim-rise" style={{ animationDelay: "260ms" }}>
        {[{ name: "all" }, ...EXPENSE_CATS].map((c) => (
          <button
            key={c.name}
            onClick={() => setCat(c.name)}
            className={`h-9 px-3.5 rounded-lg text-xs font-bold cursor-pointer transition-all border inline-flex items-center gap-1.5 ${
              cat === c.name ? "bg-pine text-white border-pine" : "bg-white text-soft border-line hover:border-jade/50"
            }`}
          >
            {c.name !== "all" && <span className="w-2 h-2 rounded-full" style={{ background: (c as { name: string; color?: string }).color }} />}
            {c.name === "all" ? "الكل" : c.name}
          </button>
        ))}
      </div>

      {/* الجدول */}
      <div className="card overflow-hidden anim-rise" style={{ animationDelay: "320ms" }}>
        {list.length === 0 ? (
          <EmptyState icon={<IconReceipt className="w-6 h-6" />} title="لا مصروفات في هذه الفئة" desc="اضغط «تسجيل مصروف» لإضافة أول عملية صرف." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-mist/70 border-b border-line">
                <tr>
                  <th className="th">التاريخ</th>
                  <th className="th">البيان</th>
                  <th className="th">الفئة</th>
                  <th className="th">المبلغ</th>
                  <th className="th">ملاحظات</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((e, i) => (
                  <tr key={e.id} className="border-b border-line/60 last:border-0 hover:bg-jade-soft/25 transition-colors anim-fade" style={{ animationDelay: `${i * 25}ms` }}>
                    <td className="td text-soft">{fmtDate(e.date)}</td>
                    <td className="td font-bold text-ink">{e.title}</td>
                    <td className="td">
                      <span className="chip" style={{ background: `${expCatColor(e.category)}18`, color: expCatColor(e.category) }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: expCatColor(e.category) }} />
                        {e.category}
                      </span>
                    </td>
                    <td className="td"><span className="stat-num font-bold text-coral">{money(e.amount)}</span></td>
                    <td className="td text-soft text-xs max-w-52"><span className="block truncate">{e.notes || "—"}</span></td>
                    <td className="td">
                      <TwoStepDelete
                        onConfirm={() => {
                          dispatch({ type: "DELETE_EXPENSE", id: e.id });
                          push("warn", "حُذف المصروف", `${e.title} — ${money(e.amount)}`);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddExpenseModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function AddExpenseModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATS[0].name);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today(0));
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");

  const save = () => {
    if (title.trim().length < 2) return setErr("أدخل بيان المصروف.");
    if (!Number(amount) || Number(amount) <= 0) return setErr("أدخل مبلغاً صحيحاً.");
    const e: Expense = { id: uid(), title: title.trim(), category, amount: Number(amount), date, notes: notes.trim() || undefined };
    dispatch({ type: "ADD_EXPENSE", e });
    push("success", "سُجّل المصروف", `${e.title} — ${money(e.amount)}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="تسجيل مصروف جديد"
      subtitle="سيظهر في التقارير المالية فور الحفظ"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>حفظ المصروف</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="بيان المصروف *">
            <TInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: مستلزمات تعقيم" />
          </Field>
        </div>
        <Field label="الفئة">
          <TSelect value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATS.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </TSelect>
        </Field>
        <Field label="المبلغ (ر.ي) *">
          <TInput type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
        </Field>
        <div className="col-span-2">
          <Field label="التاريخ">
            <DateInput value={date} onChange={setDate} />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="ملاحظات">
            <TArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="جهة الصرف، رقم الفاتورة…" />
          </Field>
        </div>
      </div>
      {amount && Number(amount) > 0 && (
        <p className="mt-3 text-xs font-bold text-jade-deep bg-jade-soft rounded-lg px-3.5 py-2.5 anim-pop">
          سيتم تسجيل: {money(Number(amount))} — {category}
        </p>
      )}
      {err && <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}
