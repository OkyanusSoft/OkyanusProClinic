import React, { useMemo, useState } from "react";
import { relTime, today, uid, useMoney, useStore, type SupplyItem } from "../store";
import { IconAlert, IconBox, IconClock, IconPlus, IconTrendUp, IconWallet } from "../icons";
import { AnimatedNumber, EmptyState, Field, Modal, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";

const CATS = ["الكل", "تخدير", "حشوات", "علاج عصب", "جراحة", "وقاية", "تعقيم", "مختبر", "استهلاكي عام"];
const MOVE_REASONS = ["توريد من المورد", "استهلاك علاج", "جلسة تنظيف", "تشغيل تعقيم", "تالف / منتهي", "جرد وتصحيح", "إرجاع للمورد"];

export default function InventoryPage() {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [cat, setCat] = useState("الكل");
  const [q, setQ] = useState("");
  const [moveFor, setMoveFor] = useState<SupplyItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const low = db.supplies.filter((s) => s.qty <= s.minQty);
  const totalValue = db.supplies.reduce((sum, s) => sum + s.qty * s.cost, 0);
  const todayMoves = db.supplyMoves.filter((m) => new Date(m.date).toDateString() === new Date().toDateString()).length;

  const list = useMemo(() => {
    let arr = [...db.supplies].sort((a, b) => a.qty / a.minQty - b.qty / b.minQty);
    if (cat !== "الكل") arr = arr.filter((s) => s.category === cat);
    if (q.trim()) arr = arr.filter((s) => s.name.includes(q.trim()));
    return arr;
  }, [db.supplies, cat, q]);

  const ratio = (s: SupplyItem) => Math.min(1.5, s.qty / Math.max(1, s.minQty));
  const levelCls = (s: SupplyItem) => (s.qty <= s.minQty ? "bg-coral" : ratio(s) < 1.2 ? "bg-amber" : "bg-mint");

  const daysToExpiry = (s: SupplyItem) =>
    s.expiry ? Math.round((new Date(s.expiry + "T12:00:00").getTime() - new Date(today(0) + "T12:00:00").getTime()) / 86400000) : null;

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink flex items-center gap-3">
            المخزون والمستهلكات
            {low.length > 0 && (
              <span className="chip bg-coral-soft text-coral !py-2 pulse-soft">
                <IconAlert className="w-4 h-4" />
                {low.length} صنف دون الحد الأدنى
              </span>
            )}
          </h1>
          <p className="text-sm text-soft mt-1.5">متابعة حية للمواد الطبية — صرف وتوريد وتنبيهات نفاد قبل توقف العمل.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <IconPlus className="w-4.5 h-4.5" />
          صنف جديد
        </button>
      </div>

      {/* بطاقات سريعة */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "أصناف منخفضة", value: low.length, icon: <IconAlert className="w-5 h-5" />, tint: "bg-coral-soft text-coral", sub: low.length ? "تحتاج طلب توريد عاجل" : "المخزون مطمئن" },
          { label: "إجمالي الأصناف", value: db.supplies.length, icon: <IconBox className="w-5 h-5" />, tint: "bg-jade-soft text-jade-deep", sub: `${new Set(db.supplies.map((s) => s.category)).size} فئات` },
          { label: "قيمة المخزون", value: totalValue, money: true, icon: <IconWallet className="w-5 h-5" />, tint: "bg-mint-soft text-[#1d6b47]", sub: "بسعر التكلفة الحالي" },
          { label: "حركات اليوم", value: todayMoves, icon: <IconTrendUp className="w-5 h-5" />, tint: "bg-sky-soft text-sky", sub: `${db.supplyMoves.length} حركة مسجلة إجمالاً` },
        ].map((k, i) => (
          <div key={k.label} className="card card-hover p-5 anim-rise" style={{ animationDelay: `${80 + i * 60}ms` }}>
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold text-soft">{k.label}</p>
              <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${k.tint}`}>{k.icon}</span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <AnimatedNumber value={k.value} className="stat-num text-[30px] text-ink" />
              {k.money && <span className="text-xs font-bold text-soft">ر.ي</span>}
            </div>
            <p className="text-[11px] mt-1.5 font-medium text-soft">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5 items-start">
        {/* الجدول */}
        <div className="col-span-12 xl:col-span-8 card overflow-hidden anim-rise" style={{ animationDelay: "260ms" }}>
          <div className="flex flex-wrap items-center gap-3 px-5 pt-4 pb-3 border-b border-line">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن صنف…" className="input !w-52 !h-9" />
            <div className="flex gap-1.5 flex-wrap">
              {CATS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`h-8 px-3 rounded-lg text-[11px] font-bold cursor-pointer transition-all border ${
                    cat === c ? "bg-pine text-white border-pine" : "bg-white text-soft border-line hover:border-jade/50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-mist/70 border-b border-line">
                <tr>
                  <th className="th">الصنف</th>
                  <th className="th">الرصيد / الحد</th>
                  <th className="th">المستوى</th>
                  <th className="th">التكلفة</th>
                  <th className="th">الصلاحية</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s, i) => {
                  const isLow = s.qty <= s.minQty;
                  const exp = daysToExpiry(s);
                  return (
                    <tr key={s.id} className={`border-b border-line/60 last:border-0 transition-colors anim-fade ${isLow ? "bg-coral-soft/25 hover:bg-coral-soft/40" : "hover:bg-jade-soft/30"}`} style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${isLow ? "bg-coral-soft text-coral" : "bg-jade-soft text-jade-deep"}`}>
                            <IconBox className="w-4.5 h-4.5" />
                          </span>
                          <div>
                            <p className="font-bold text-sm text-ink flex items-center gap-2">
                              {s.name}
                              {isLow && <span className="chip bg-coral text-white !text-[9px] !px-2 !py-1 pulse-soft">نفاد وشيك</span>}
                            </p>
                            <p className="text-[11px] text-soft mt-0.5">{s.category} · الوحدة: {s.unit}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <span className={`stat-num text-base font-bold ${isLow ? "text-coral" : "text-ink"}`}>{s.qty}</span>
                        <span className="text-[11px] text-soft"> / {s.minQty}</span>
                      </td>
                      <td className="td w-32">
                        <div className="h-2 rounded-full bg-mist overflow-hidden">
                          <div className="h-full rounded-full anim-grow-w transition-all" style={{ width: `${Math.min(100, ratio(s) * 66)}%`, background: isLow ? "#d9503a" : ratio(s) < 1.2 ? "#e2952b" : "#2c9c69", animationDelay: `${i * 50}ms` }} />
                        </div>
                      </td>
                      <td className="td stat-num text-soft text-xs">{money(s.cost)}<span className="block text-[10px] text-soft/70">قيمة: {money(s.qty * s.cost)}</span></td>
                      <td className="td">
                        {exp === null ? (
                          <span className="text-soft text-xs">—</span>
                        ) : exp < 0 ? (
                          <span className="chip bg-coral text-white">منتهي!</span>
                        ) : exp <= 60 ? (
                          <span className="chip bg-amber-soft text-[#a06410]"><IconClock className="w-3 h-3" /> {exp} يوم</span>
                        ) : (
                          <span className="text-[11px] text-soft">{exp} يوم</span>
                        )}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setMoveFor(s)} className="text-[11px] font-bold text-jade-deep bg-jade-soft hover:bg-jade hover:text-white rounded-md px-2.5 py-1.5 cursor-pointer transition-colors">
                            حركة ±
                          </button>
                          <TwoStepDelete onConfirm={() => { dispatch({ type: "DELETE_SUPPLY", id: s.id }); push("warn", "حُذف الصنف من المخزون", s.name); }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {list.length === 0 && <EmptyState icon={<IconBox className="w-6 h-6" />} title="لا أصناف مطابقة" desc="جرّب فئة أخرى أو أضف صنفاً جديداً." />}
          </div>
        </div>

        {/* سجل الحركات */}
        <div className="col-span-12 xl:col-span-4 card overflow-hidden anim-rise" style={{ animationDelay: "320ms" }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
            <h2 className="font-display font-bold text-lg text-ink">آخر الحركات</h2>
            <span className="chip bg-mist text-soft stat-num">{db.supplyMoves.length}</span>
          </div>
          {db.supplyMoves.length === 0 ? (
            <EmptyState icon={<IconTrendUp className="w-6 h-6" />} title="لا حركات بعد" desc="كل صرف أو توريد يُسجَّل هنا." />
          ) : (
            <ul className="divide-y divide-line/60 max-h-[520px] overflow-y-auto">
              {db.supplyMoves.slice(0, 14).map((m, i) => {
                const item = db.supplies.find((s) => s.id === m.itemId);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3 anim-fade" style={{ animationDelay: `${i * 35}ms` }}>
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0 stat-num text-sm font-bold ${m.delta > 0 ? "bg-mint-soft text-[#1d6b47]" : "bg-coral-soft text-coral"}`}>
                      {m.delta > 0 ? "+" : ""}{m.delta}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink truncate">{item?.name ?? "صنف محذوف"}</p>
                      <p className="text-[10px] text-soft mt-0.5 truncate">{m.note} · {relTime(m.date)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {moveFor && <MoveModal item={moveFor} onClose={() => setMoveFor(null)} />}
      {showAdd && <AddSupplyModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

/* ============================ نافذة حركة ============================ */

function MoveModal({ item, onClose }: { item: SupplyItem; onClose: () => void }) {
  const { dispatch } = useStore();
  const { push } = useToast();
  const [dir, setDir] = useState<"in" | "out">(item.qty <= item.minQty ? "in" : "out");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState(MOVE_REASONS[0]);

  const save = () => {
    const n = Number(qty);
    if (!n || n <= 0) return push("error", "أدخل كمية صحيحة");
    const delta = dir === "in" ? n : -n;
    if (dir === "out" && n > item.qty) return push("warn", "الكمية تتجاوز الرصيد المتاح", `المتوفر الآن: ${item.qty} ${item.unit}`);
    dispatch({ type: "MOVE_SUPPLY", itemId: item.id, delta, note: `${note}${dir === "out" ? " (صرف)" : " (توريد)"}` });
    push("success", dir === "in" ? "سُجِّل التوريد" : "سُجِّل الصرف", `${item.name}: الرصيد الجديد ${Math.max(0, item.qty + delta)}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`حركة مخزون — ${item.name}`}
      subtitle={`الرصيد الحالي: ${item.qty} ${item.unit} · الحد الأدنى: ${item.minQty}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>تسجيل الحركة</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setDir("in")} className={`rounded-xl border-2 p-3.5 cursor-pointer transition-all text-start ${dir === "in" ? "border-mint bg-mint-soft" : "border-line hover:border-mint/40"}`}>
            <p className="font-bold text-sm text-ink">توريد / إضافة</p>
            <p className="text-[10px] text-soft mt-1">رفع الرصيد بكمية واردة</p>
          </button>
          <button onClick={() => setDir("out")} className={`rounded-xl border-2 p-3.5 cursor-pointer transition-all text-start ${dir === "out" ? "border-coral bg-coral-soft" : "border-line hover:border-coral/40"}`}>
            <p className="font-bold text-sm text-ink">صرف / استهلاك</p>
            <p className="text-[10px] text-soft mt-1">إنقاص الرصيد بمادة مستخدمة</p>
          </button>
        </div>
        <Field label={`الكمية (${item.unit}) *`}>
          <TInput type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="5" />
        </Field>
        <Field label="السبب">
          <TSelect value={note} onChange={(e) => setNote(e.target.value)}>
            {MOVE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </TSelect>
        </Field>
      </div>
    </Modal>
  );
}

/* ============================ نافذة صنف جديد ============================ */

function AddSupplyModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useStore();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("استهلاكي عام");
  const [unit, setUnit] = useState("علبة");
  const [qty, setQty] = useState("");
  const [minQty, setMinQty] = useState("");
  const [cost, setCost] = useState("");
  const [expiry, setExpiry] = useState("");

  const save = () => {
    if (name.trim().length < 2) return push("error", "أدخل اسم الصنف");
    if (!Number(qty) || Number(qty) < 0) return push("error", "أدخل رصيداً صحيحاً");
    dispatch({
      type: "ADD_SUPPLY",
      item: { id: uid(), name: name.trim(), category, unit: unit.trim() || "وحدة", qty: Number(qty), minQty: Number(minQty) || 5, cost: Number(cost) || 0, expiry: expiry || undefined },
    });
    push("success", "أُضيف الصنف للمخزون", name.trim());
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="صنف مخزون جديد"
      subtitle="سيظهر تنبيه تلقائي حين يهبط رصيده دون الحد الأدنى"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>حفظ الصنف</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><Field label="اسم الصنف *"><TInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أمبولات تخدير" /></Field></div>
        <Field label="الفئة">
          <TSelect value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATS.filter((c) => c !== "الكل").map((c) => <option key={c} value={c}>{c}</option>)}
          </TSelect>
        </Field>
        <Field label="الوحدة"><TInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="علبة 100" /></Field>
        <Field label="الرصيد الحالي *"><TInput type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        <Field label="الحد الأدنى"><TInput type="number" value={minQty} onChange={(e) => setMinQty(e.target.value)} /></Field>
        <Field label="تكلفة الوحدة (ر.ي)"><TInput type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
        <Field label="تاريخ الانتهاء"><TInput type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
