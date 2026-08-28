import React, { useMemo, useState } from "react";
import { useMoney, useStore } from "../store";
import { IconCrown, IconGrid, IconPencil, IconPlus, IconScalpel, IconSearch, IconShield, IconSpark, IconTooth, IconTrash, IconX, IconCheck } from "../icons";
import { EmptyState, Field, TInput, TwoStepDelete, useToast } from "../components/ui";

const CAT_COLORS = ["#1273c4", "#2f9fe0", "#e2952b", "#2c9c69", "#d9503a", "#0b518f", "#3a86c4", "#b23a48"];

const catIcon = (cat: string, cls = "w-5 h-5") => {
  switch (cat) {
    case "تشخيص": return <IconSearch className={cls} />;
    case "وقاية": return <IconShield className={cls} />;
    case "تجميل": return <IconSpark className={cls} />;
    case "جراحة": return <IconScalpel className={cls} />;
    case "تعويضات": return <IconCrown className={cls} />;
    case "تقويم": return <IconGrid className={cls} />;
    default: return <IconTooth className={cls} />;
  }
};

export default function ServiceCatsPage() {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [newCat, setNewCat] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const stats = useMemo(
    () =>
      db.serviceCats.map((name, i) => {
        const svcs = db.services.filter((s) => s.category === name);
        return {
          name,
          color: CAT_COLORS[i % CAT_COLORS.length],
          count: svcs.length,
          active: svcs.filter((s) => s.active).length,
          avg: svcs.length ? svcs.reduce((sum, s) => sum + s.price, 0) / svcs.length : 0,
        };
      }),
    [db.serviceCats, db.services]
  );

  const totalServices = db.services.length;

  const addCat = () => {
    const name = newCat.trim();
    if (name.length < 2) return push("error", "أدخل اسم فئة صحيحاً");
    if (db.serviceCats.includes(name)) return push("warn", "هذه الفئة موجودة بالفعل", name);
    dispatch({ type: "ADD_SERVICE_CAT", name });
    setNewCat("");
    push("success", "أُضيفت الفئة", name);
  };

  const commitRename = (from: string) => {
    const to = renameVal.trim();
    if (to.length < 2) return push("error", "أدخل اسماً صحيحاً");
    dispatch({ type: "RENAME_SERVICE_CAT", from, to });
    setRenaming(null);
    push("success", "أُعيدت تسمية الفئة", `${from} ← ${to}`);
  };

  return (
    <div className="space-y-6">
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-pine text-ice"><IconGrid className="w-6 h-6" /></span>
            فئات الخدمات
          </h1>
          <p className="text-sm text-soft mt-1.5">تصنيف الخدمات الطبية — تُستخدم في شاشة الخدمات وقائمة الأسعار والتقارير.</p>
        </div>
        <span className="chip bg-white border border-line !py-2.5 text-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-mint pulse-dot" />
          {db.serviceCats.length} فئة · {totalServices} خدمة
        </span>
      </div>

      {/* إضافة فئة */}
      <div className="card p-4 flex flex-wrap items-end gap-3 anim-rise" style={{ animationDelay: "70ms" }}>
        <div className="flex-1 min-w-52">
          <Field label="فئة جديدة">
            <TInput value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="مثال: زراعة الأسنان" onKeyDown={(e) => e.key === "Enter" && addCat()} />
          </Field>
        </div>
        <button className="btn-primary" onClick={addCat}>
          <IconPlus className="w-4.5 h-4.5" />
          إضافة الفئة
        </button>
      </div>

      {/* شبكة الفئات */}
      {stats.length === 0 ? (
        <div className="card"><EmptyState icon={<IconGrid className="w-6 h-6" />} title="لا فئات بعد" desc="أضف أول فئة للخدمات من النموذج أعلاه." /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {stats.map((c, i) => (
            <div key={c.name} className="card card-hover p-5 anim-rise relative overflow-hidden" style={{ animationDelay: `${120 + i * 60}ms` }}>
              <span className="absolute top-0 inset-x-0 h-1.5" style={{ background: c.color }} />
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: `${c.color}1a`, color: c.color }}>
                  {catIcon(c.name, "w-6 h-6")}
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
                      dispatch({ type: "DELETE_SERVICE_CAT", name: c.name });
                      push("warn", "حُذفت الفئة", `نُقلت خدمات «${c.name}» إلى فئة أخرى.`);
                    }}
                  />
                </div>
              </div>

              {renaming === c.name ? (
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <TInput value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") commitRename(c.name); if (e.key === "Escape") setRenaming(null); }} autoFocus />
                  </div>
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
                      <p className="text-[11px] font-semibold text-soft mt-1">خدمة · {c.active} متاحة</p>
                    </div>
                    {c.count > 0 && (
                      <div className="text-end">
                        <p className="text-[10px] font-bold text-soft">متوسط السعر</p>
                        <p className="stat-num text-sm text-ink mt-0.5">{money(c.avg)}</p>
                      </div>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-mist overflow-hidden mt-4">
                    <div className="h-full rounded-full anim-grow-w" style={{ width: `${totalServices ? (c.count / totalServices) * 100 : 0}%`, background: c.color, animationDelay: `${i * 70}ms` }} />
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
