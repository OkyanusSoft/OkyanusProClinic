import React, { useMemo, useState } from "react";
import { useMoney, useStore } from "../store";
import { IconAlert, IconBox, IconCheck, IconPencil, IconPlus, IconSpark, IconX } from "../icons";
import { EmptyState, Field, TInput, TwoStepDelete, useToast } from "../components/ui";

const CAT_COLORS = ["#1273c4", "#2f9fe0", "#e2952b", "#2c9c69", "#d9503a", "#0b518f", "#3a86c4", "#b23a48"];

export default function ItemCatsPage() {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [newCat, setNewCat] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const stats = useMemo(
    () =>
      db.itemCats.map((name, i) => {
        const items = db.supplies.filter((s) => s.category === name);
        const low = items.filter((s) => s.qty <= s.minQty).length;
        return {
          name,
          color: CAT_COLORS[i % CAT_COLORS.length],
          count: items.length,
          low,
          value: items.reduce((sum, s) => sum + s.qty * s.cost, 0),
        };
      }),
    [db.itemCats, db.supplies]
  );

  const totalItems = db.supplies.length;

  const addCat = () => {
    const name = newCat.trim();
    if (name.length < 2) return push("error", "أدخل اسم فئة صحيحاً");
    if (db.itemCats.includes(name)) return push("warn", "هذه الفئة موجودة بالفعل", name);
    dispatch({ type: "ADD_ITEM_CAT", name });
    setNewCat("");
    push("success", "أُضيفت الفئة", name);
  };

  const commitRename = (from: string) => {
    const to = renameVal.trim();
    if (to.length < 2) return push("error", "أدخل اسماً صحيحاً");
    dispatch({ type: "RENAME_ITEM_CAT", from, to });
    setRenaming(null);
    push("success", "أُعيدت تسمية الفئة", `${from} ← ${to}`);
  };

  return (
    <div className="space-y-6">
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-pine text-ice"><IconSpark className="w-6 h-6" /></span>
            فئات الأصناف
          </h1>
          <p className="text-sm text-soft mt-1.5">تصنيف أصناف المخزون والمستهلكات — تُستخدم في شاشة بيانات الأصناف ولوحة المخزون.</p>
        </div>
        <span className="chip bg-white border border-line !py-2.5 text-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-mint pulse-dot" />
          {db.itemCats.length} فئة · {totalItems} صنف
        </span>
      </div>

      {/* إضافة فئة */}
      <div className="card p-4 flex flex-wrap items-end gap-3 anim-rise" style={{ animationDelay: "70ms" }}>
        <div className="flex-1 min-w-52">
          <Field label="فئة جديدة">
            <TInput value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="مثال: مواد تبييض" onKeyDown={(e) => e.key === "Enter" && addCat()} />
          </Field>
        </div>
        <button className="btn-primary" onClick={addCat}>
          <IconPlus className="w-4.5 h-4.5" />
          إضافة الفئة
        </button>
      </div>

      {/* شبكة الفئات */}
      {stats.length === 0 ? (
        <div className="card"><EmptyState icon={<IconSpark className="w-6 h-6" />} title="لا فئات بعد" desc="أضف أول فئة للأصناف من النموذج أعلاه." /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {stats.map((c, i) => (
            <div key={c.name} className="card card-hover p-5 anim-rise relative overflow-hidden" style={{ animationDelay: `${120 + i * 60}ms` }}>
              <span className="absolute top-0 inset-x-0 h-1.5" style={{ background: c.color }} />
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: `${c.color}1a`, color: c.color }}>
                  <IconBox className="w-6 h-6" />
                </span>
                <div className="flex items-center gap-1.5">
                  {c.low > 0 && (
                    <span className="chip bg-coral-soft text-coral !text-[9px] !px-2 !py-1 pulse-soft">
                      <IconAlert className="w-3 h-3" />
                      {c.low} منخفض
                    </span>
                  )}
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
                      dispatch({ type: "DELETE_ITEM_CAT", name: c.name });
                      push("warn", "حُذفت الفئة", `نُقلت أصناف «${c.name}» إلى فئة أخرى.`);
                    }}
                  />
                </div>
              </div>

              {renaming === c.name ? (
                <div className="mt-4">
                  <TInput value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") commitRename(c.name); if (e.key === "Escape") setRenaming(null); }} autoFocus />
                  <div className="flex items-center gap-2 mt-2">
                    <button className="btn-soft !h-8 !text-xs !px-3" onClick={() => commitRename(c.name)}><IconCheck className="w-3.5 h-3.5" /> حفظ</button>
                    <button className="btn-ghost !h-8 !text-xs !px-3" onClick={() => setRenaming(null)}><IconX className="w-3.5 h-3.5" /> إلغاء</button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-display font-bold text-xl text-ink mt-3">{c.name}</h3>
                  <div className="flex items-end justify-between mt-3">
                    <div>
                      <p className="stat-num text-[26px] leading-none" style={{ color: c.color }}>{c.count}</p>
                      <p className="text-[11px] font-semibold text-soft mt-1">صنف مخزون</p>
                    </div>
                    <div className="text-end">
                      <p className="text-[10px] font-bold text-soft">قيمة المخزون</p>
                      <p className="stat-num text-sm text-ink mt-0.5">{money(c.value)}</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-mist overflow-hidden mt-4">
                    <div className="h-full rounded-full anim-grow-w" style={{ width: `${totalItems ? (c.count / totalItems) * 100 : 0}%`, background: c.color, animationDelay: `${i * 70}ms` }} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
