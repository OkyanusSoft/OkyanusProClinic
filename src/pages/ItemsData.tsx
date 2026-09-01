import React, { useMemo, useState } from "react";
import { today, uid, useMoney, useStore, type SupplyItem } from "../store";
import { IconAlert, IconBox, IconClock, IconPlus, IconSearch, IconTrendUp } from "../icons";
import { DateInput, EmptyState, Field, Modal, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";

const MOVE_REASONS = ["توريد من المورد", "استهلاك علاج", "جلسة تنظيف", "تشغيل تعقيم", "تالف / منتهي", "جرد وتصحيح", "إرجاع للمورد"];

export default function ItemsDataPage() {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [cat, setCat] = useState("الكل");
  const [q, setQ] = useState("");
  const [moveFor, setMoveFor] = useState<SupplyItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const list = useMemo(() => {
    let arr = [...db.supplies].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    if (cat !== "الكل") arr = arr.filter((s) => s.category === cat);
    if (q.trim()) arr = arr.filter((s) => s.name.includes(q.trim()));
    return arr;
  }, [db.supplies, cat, q]);

  const daysToExpiry = (s: SupplyItem) =>
    s.expiry ? Math.round((new Date(s.expiry + "T12:00:00").getTime() - new Date(today(0) + "T12:00:00").getTime()) / 86400000) : null;
  const ratio = (s: SupplyItem) => Math.min(1.5, s.qty / Math.max(1, s.minQty));

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-pine text-ice"><IconBox className="w-6 h-6" /></span>
            بيانات الأصناف
          </h1>
          <p className="text-sm text-soft mt-1.5">السجل الرئيسي لأصناف المخزون — إضافة وتعديل وحركات الصرف والتوريد.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <IconPlus className="w-4.5 h-4.5" />
          صنف جديد
        </button>
      </div>

      <div className="card overflow-hidden anim-rise" style={{ animationDelay: "90ms" }}>
        <div className="flex flex-wrap items-center gap-3 px-5 pt-4 pb-3 border-b border-line">
          <div className="relative flex-1 min-w-52">
            <span className="absolute inset-y-0 start-3 flex items-center text-soft pointer-events-none"><IconSearch className="w-4 h-4" /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن صنف…" className="input !ps-9" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["الكل", ...db.itemCats].map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`h-9 px-3.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all border ${
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

      {moveFor && <MoveModal item={moveFor} onClose={() => setMoveFor(null)} />}
      {showAdd && <AddSupplyModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

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
    <Modal open onClose={onClose} title={`حركة مخزون — ${item.name}`} subtitle={`الرصيد الحالي: ${item.qty} ${item.unit} · الحد الأدنى: ${item.minQty}`}
      footer={<><button className="btn-ghost" onClick={onClose}>إلغاء</button><button className="btn-primary" onClick={save}>تسجيل الحركة</button></>}>
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
        <Field label={`الكمية (${item.unit}) *`}><TInput type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="5" /></Field>
        <Field label="السبب">
          <TSelect value={note} onChange={(e) => setNote(e.target.value)}>
            {MOVE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </TSelect>
        </Field>
      </div>
    </Modal>
  );
}

function AddSupplyModal({ onClose }: { onClose: () => void }) {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(db.itemCats[0] ?? "استهلاكي عام");
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
    <Modal open onClose={onClose} title="صنف مخزون جديد" subtitle="سيظهر تنبيه تلقائي حين يهبط رصيده دون الحد الأدنى"
      footer={<><button className="btn-ghost" onClick={onClose}>إلغاء</button><button className="btn-primary" onClick={save}>حفظ الصنف</button></>}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><Field label="اسم الصنف *"><TInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أمبولات تخدير" /></Field></div>
        <Field label="الفئة">
          <TSelect value={category} onChange={(e) => setCategory(e.target.value)}>
            {db.itemCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </TSelect>
        </Field>
        <Field label="الوحدة"><TInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="علبة 100" /></Field>
        <Field label="الرصيد الحالي *"><TInput type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        <Field label="الحد الأدنى"><TInput type="number" value={minQty} onChange={(e) => setMinQty(e.target.value)} /></Field>
        <Field label="تكلفة الوحدة (ر.ي)"><TInput type="number" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
        <Field label="تاريخ الانتهاء"><DateInput value={expiry} onChange={setExpiry} /></Field>
      </div>
    </Modal>
  );
}
