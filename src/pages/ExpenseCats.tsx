import React, { useMemo, useState } from "react";
import { expCatColor, monthName, today, useMoney, useStore } from "../store";
import { IconCheck, IconPencil, IconPlus, IconTrendUp, IconWallet } from "../icons";
import { AnimatedNumber, EmptyState, Field, TInput, TwoStepDelete, useToast } from "../components/ui";

export default function ExpenseCatsPage() {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [newCat, setNewCat] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const monthPrefix = today(0).slice(0, 7);

  const stats = useMemo(
    () =>
      db.expenseCats.map((name) => {
        const all = db.expenses.filter((e) => e.category === name);
        const month = all.filter((e) => e.date.startsWith(monthPrefix));
        return {
          name,
          color: expCatColor(name),
          count: all.length,
          monthCount: month.length,
          monthTotal: month.reduce((s, e) => s + e.amount, 0),
          allTotal: all.reduce((s, e) => s + e.amount, 0),
        };
      }),
    [db.expenseCats, db.expenses, monthPrefix]
  );

  const monthGrand = stats.reduce((s, c) => s + c.monthTotal, 0);
  const top = [...stats].sort((a, b) => b.monthTotal - a.monthTotal)[0];

  const addCat = () => {
    const name = newCat.trim();
    if (name.length < 2) return push("error", "أدخل اسم فئة صحيحاً");
    if (db.expenseCats.includes(name)) return push("warn", "هذه الفئة موجودة بالفعل", name);
    dispatch({ type: "ADD_EXPENSE_CAT", name });
    setNewCat("");
    push("success", "أُضيفت فئة المصروفات", name);
  };

  const commitRename = (from: string) => {
    const to = renameVal.trim();
    if (to.length < 2) return push("error", "أدخل اسماً صحيحاً");
    dispatch({ type: "RENAME_EXPENSE_CAT", from, to });
    setRenaming(null);
    push("success", "أُعيدت تسمية الفئة", `${from} ← ${to}`);
  };

  return (
    <div className="space-y-6">
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-pine text-ice"><IconWallet className="w-6 h-6" /></span>
            فئات المصروفات
          </h1>
          <p className="text-sm text-soft mt-1.5">تصنيف مصاريف العيادة — تُستخدم في شاشة المصروفات وتقرير الإيرادات مقابل المصروفات.</p>
        </div>
        <span className="chip bg-white border border-line !py-2.5 text-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-mint pulse-dot" />
          {db.expenseCats.length} فئة · {monthName()}
        </span>
      </div>

      {/* شريط الإحصاء */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="card card-hover p-5 anim-rise" style={{ animationDelay: "70ms" }}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold text-soft">مصروفات {monthName()}</p>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-coral-soft text-coral"><IconWallet className="w-5 h-5" /></span>
          </div>
          <p className="mt-1"><AnimatedNumber value={monthGrand} className="stat-num text-[30px] text-ink" /></p>
          <p className="text-[11px] mt-1.5 font-medium text-soft">عبر {stats.reduce((s, c) => s + c.monthCount, 0)} عملية صرف هذا الشهر</p>
        </div>
        <div className="card card-hover p-5 anim-rise" style={{ animationDelay: "130ms" }}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold text-soft">الفئات النشطة</p>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-jade-soft text-jade-deep"><IconTrendUp className="w-5 h-5" /></span>
          </div>
          <p className="mt-1"><AnimatedNumber value={stats.filter((c) => c.monthCount > 0).length} className="stat-num text-[30px] text-ink" /></p>
          <p className="text-[11px] mt-1.5 font-medium text-soft">من أصل {db.expenseCats.length} فئة مسجلة</p>
        </div>
        <div className="card card-hover p-5 anim-rise col-span-2 xl:col-span-1" style={{ animationDelay: "190ms" }}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold text-soft">الأعلى صرفاً هذا الشهر</p>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: `${top?.color ?? "#5b7370"}1a`, color: top?.color ?? "#5b7370" }}><IconTrendUp className="w-5 h-5" /></span>
          </div>
          <p className="font-display font-bold text-xl text-ink mt-1 truncate">{top && top.monthTotal > 0 ? top.name : "—"}</p>
          <p className="text-[11px] mt-1.5 font-medium text-soft">{top && top.monthTotal > 0 ? money(top.monthTotal) : "لا مصروفات هذا الشهر"}</p>
        </div>
      </div>

      {/* إضافة فئة */}
      <div className="card p-4 flex flex-wrap items-end gap-3 anim-rise" style={{ animationDelay: "230ms" }}>
        <span
          className="w-10 h-10 rounded-xl shrink-0 border-2 border-line transition-all anim-pop"
          style={{ background: `${expCatColor(newCat.trim() || "جديدة")}22`, borderColor: expCatColor(newCat.trim() || "جديدة") }}
          title="معاينة لون الفئة"
        />
        <div className="flex-1 min-w-52">
          <Field label="فئة جديدة">
            <TInput value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="مثال: وقود وتنقلات" onKeyDown={(e) => e.key === "Enter" && addCat()} />
          </Field>
        </div>
        <button className="btn-primary" onClick={addCat}>
          <IconPlus className="w-4.5 h-4.5" />
          إضافة الفئة
        </button>
      </div>

      {/* شبكة الفئات */}
      {stats.length === 0 ? (
        <div className="card"><EmptyState icon={<IconWallet className="w-6 h-6" />} title="لا فئات بعد" desc="أضف أول فئة للمصروفات من النموذج أعلاه." /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {stats.map((c, i) => (
            <div key={c.name} className="card card-hover p-5 anim-rise relative overflow-hidden" style={{ animationDelay: `${270 + i * 55}ms` }}>
              <span className="absolute top-0 inset-x-0 h-1.5" style={{ background: c.color }} />
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: `${c.color}1a`, color: c.color }}>
                  <IconWallet className="w-6 h-6" />
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    className="icon-btn !w-8 !h-8"
                    aria-label="إعادة تسمية"
                    title="إعادة تسمية"
                    onClick={() => { setRenaming(c.name); setRenameVal(c.name); }}
                  >
                    <IconPencil className="w-4 h-4" />
                  </button>
                  <TwoStepDelete
                    onConfirm={() => {
                      dispatch({ type: "DELETE_EXPENSE_CAT", name: c.name });
                      push("warn", "حُذفت الفئة", `نُقلت مصروفات «${c.name}» إلى فئة أخرى.`);
                    }}
                  />
                </div>
              </div>

              {renaming === c.name ? (
                <div className="mt-3 flex items-center gap-2">
                  <TInput value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commitRename(c.name)} autoFocus />
                  <button className="btn-primary !h-10 !px-3" onClick={() => commitRename(c.name)} aria-label="حفظ"><IconCheck className="w-4.5 h-4.5" /></button>
                </div>
              ) : (
                <h3 className="font-display font-bold text-lg text-ink mt-3 leading-snug">{c.name}</h3>
              )}

              <div className="flex items-baseline gap-2 mt-2">
                <span className="stat-num text-[26px] leading-none" style={{ color: c.color }}>{money(c.monthTotal)}</span>
                <span className="text-[11px] font-bold text-soft">هذا الشهر</span>
              </div>

              <div className="h-2 rounded-full bg-mist overflow-hidden mt-3">
                <div
                  className="h-full rounded-full anim-grow-w"
                  style={{ width: `${monthGrand ? Math.max(3, (c.monthTotal / monthGrand) * 100) : 0}%`, background: c.color, animationDelay: `${i * 70}ms` }}
                />
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-line/70 text-[11px] font-bold">
                <span className="text-soft">{c.monthCount} عملية هذا الشهر</span>
                <span className="text-soft">الإجمالي: <span className="stat-num text-ink">{money(c.allTotal)}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
