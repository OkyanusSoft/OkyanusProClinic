 
 import React, { useMemo, useState } from "react";
import {
  expCatColor,
  fmtDate,
  fmtDateFull,
  today,
  uid,
  useMoney,
  useStore,
  type SupplyItem,
  type SupplyMove,
} from "../store";
import {
  IconAlert,
  IconBox,
  IconClock,
  IconEye,
  IconPencil,
  IconPlus,
  IconPrinter,
  IconSearch,
  IconTrendUp,
  IconWallet,
} from "../icons";
import {
  AnimatedNumber,
  EmptyState,
  Field,
  Modal,
  TArea,
  TInput,
  TSelect,
  TwoStepDelete,
  useToast,
} from "../components/ui";
import { PrintModal } from "../components/PrintSheet";

/** اتجاه الحركة: موجب = توريد / سالب = صرف */
const isSupply = (m: SupplyMove) => m.delta > 0;

export default function InventoryPage({ onGoItems }: { onGoItems?: () => void }) {
  const { db } = useStore();
  const cur = db.currencies.find((c) => c.code === db.defaultCurrency) ?? db.currencies[0];
  const sym = cur?.symbol ?? "ر.ي";

  const [showAddItem, setShowAddItem] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [viewMove, setViewMove] = useState<SupplyMove | null>(null);
  const [editMove, setEditMove] = useState<SupplyMove | null>(null);
  const [printMove, setPrintMove] = useState<SupplyMove | null>(null);
  const [mvSearch, setMvSearch] = useState("");
  const [mvDir, setMvDir] = useState<"all" | "in" | "out">("all");

  /* ---------- مؤشرات ---------- */
  const totalValue = db.supplies.reduce((s, x) => s + x.qty * x.cost, 0);
  const lowStock = db.supplies.filter((s) => s.qty <= s.minQty);
  const expiring = db.supplies.filter((s) => {
    if (!s.expiry) return false;
    const d = new Date(s.expiry + "T12:00:00").getTime() - new Date(today(0) + "T12:00:00").getTime();
    return d >= 0 && d <= 90 * 86400000;
  });

  /* ---------- الحركات المخزنية (فلترة + بحث) ---------- */
  const moves = useMemo(() => {
    const q = mvSearch.trim().toLowerCase();
    return [...db.supplyMoves]
      .filter((m) => {
        if (mvDir === "in" && !isSupply(m)) return false;
        if (mvDir === "out" && isSupply(m)) return false;
        return true;
      })
      .filter((m) => {
        if (!q) return true;
        const name = db.supplies.find((s) => s.id === m.itemId)?.name ?? "";
        return name.toLowerCase().includes(q) || (m.note ?? "").toLowerCase().includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.supplyMoves, db.supplies, mvDir, mvSearch]);

  const inCount = db.supplyMoves.filter(isSupply).length;
  const outCount = db.supplyMoves.length - inCount;

  const kpis = [
    { label: "إجمالي الأصناف", value: db.supplies.length, suffix: "صنف", icon: <IconBox className="w-5 h-5" />, tint: "bg-jade-soft text-jade-deep" },
    { label: "قيمة المخزون", value: totalValue, money: true, icon: <IconWallet className="w-5 h-5" />, tint: "bg-sky-soft text-sky" },
    { label: "أصناف منخفضة", value: lowStock.length, suffix: "صنف", icon: <IconAlert className="w-5 h-5" />, tint: "bg-amber-soft text-[#a06410]", warn: lowStock.length > 0 },
    { label: "قاربت الانتهاء", value: expiring.length, suffix: "صنف", icon: <IconClock className="w-5 h-5" />, tint: "bg-coral-soft text-coral", warn: expiring.length > 0 },
  ];

  return (
    <div className="space-y-6">
      {/* ====== الترويسة ====== */}
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-pine text-ice">
              <IconBox className="w-6 h-6" />
            </span>
            المخزون والمستهلكات
          </h1>
          <p className="text-sm text-soft mt-1.5">
            متابعة المخزون لحظياً — تنبيهات النفاد والصلاحية وسجل كامل للحركات المخزنية.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onGoItems && (
            <button className="btn-soft" onClick={onGoItems}>
              <IconBox className="w-4 h-4" />
              بيانات الأصناف
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowMove(true)}>
            <IconPlus className="w-4.5 h-4.5" />
            تسجيل حركة
          </button>
        </div>
      </div>

      {/* ====== المؤشرات ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={k.label} className="card card-hover p-5 anim-rise" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-soft">{k.label}</p>
              <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${k.tint} ${k.warn ? "pulse-soft" : ""}`}>{k.icon}</span>
            </div>
            <p className="mt-1.5">
              <AnimatedNumber value={k.value} className="stat-num text-3xl text-ink" />{" "}
              <span className="text-xs font-bold text-soft">{k.money ? sym : k.suffix}</span>
            </p>
          </div>
        ))}
      </div>

      {/* ====== التنبيهات ====== */}
      {(lowStock.length > 0 || expiring.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {lowStock.length > 0 && (
            <div className="card p-4 border-amber/40 anim-rise" style={{ animationDelay: "280ms" }}>
              <p className="text-xs font-bold text-[#a06410] flex items-center gap-2 mb-3">
                <IconAlert className="w-4 h-4" />
                أصناف وصلت الحد الأدنى ({lowStock.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {lowStock.slice(0, 6).map((s) => (
                  <span key={s.id} className="chip bg-amber-soft text-[#a06410]">
                    {s.name} · <b className="stat-num">{s.qty}</b>
                  </span>
                ))}
                {lowStock.length > 6 && <span className="chip bg-mist text-soft">+{lowStock.length - 6}</span>}
              </div>
            </div>
          )}
          {expiring.length > 0 && (
            <div className="card p-4 border-coral/40 anim-rise" style={{ animationDelay: "340ms" }}>
              <p className="text-xs font-bold text-coral flex items-center gap-2 mb-3">
                <IconClock className="w-4 h-4" />
                أصناف تنتهي خلال 90 يوماً ({expiring.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {expiring.slice(0, 6).map((s) => (
                  <span key={s.id} className="chip bg-coral-soft text-coral">
                    {s.name} · <b className="stat-num">{fmtDate(s.expiry!)}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== الحركات المخزنية ====== */}
      <section className="card overflow-hidden anim-rise" style={{ animationDelay: "400ms" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-line bg-gradient-to-l from-jade-soft/40 to-transparent">
          <div>
            <h2 className="font-display font-bold text-xl text-ink flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-jade text-white">
                <IconTrendUp className="w-4.5 h-4.5" />
              </span>
              الحركات المخزنية
            </h2>
            <p className="text-[11px] text-soft mt-1">
              <b className="stat-num text-[#1d6b47]">{inCount}</b> توريد · <b className="stat-num text-coral">{outCount}</b> صرف — سجل كامل بكل حركة دخول وخروج.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <span className="absolute inset-y-0 start-3 flex items-center text-soft pointer-events-none">
                <IconSearch className="w-4 h-4" />
              </span>
              <input
                value={mvSearch}
                onChange={(e) => setMvSearch(e.target.value)}
                placeholder="ابحث بالصنف أو الملاحظة…"
                className="input !ps-9 !h-9 !text-xs w-56"
              />
            </div>
            <div className="inline-flex rounded-lg border border-line overflow-hidden">
              {([["all", "الكل"], ["in", "توريد"], ["out", "صرف"]] as const).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setMvDir(k)}
                  className={`px-3.5 h-9 text-xs font-bold cursor-pointer transition-colors ${
                    mvDir === k
                      ? k === "in" ? "bg-[#1d6b47] text-white" : k === "out" ? "bg-coral text-white" : "bg-pine text-white"
                      : "bg-white text-soft hover:bg-mist"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {moves.length === 0 ? (
          <EmptyState
            icon={<IconTrendUp className="w-6 h-6" />}
            title="لا حركات مخزنية"
            desc="اضغط «تسجيل حركة» لإضافة أول عملية توريد أو صرف."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-mist/70 border-b border-line">
                <tr>
                  <th className="th">التاريخ</th>
                  <th className="th">الصنف</th>
                  <th className="th">الفئة</th>
                  <th className="th">نوع الحركة</th>
                  <th className="th">الكمية</th>
                  <th className="th">ملاحظات</th>
                  <th className="th text-end">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {moves.map((m, i) => {
                  const item = db.supplies.find((s) => s.id === m.itemId);
                  const supply = isSupply(m);
                  const clr = item ? expCatColor(item.category) : "#5b7370";
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-line/60 last:border-0 hover:bg-jade-soft/25 transition-colors anim-fade"
                      style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                    >
                      <td className="td text-soft whitespace-nowrap">{fmtDate(m.date.slice(0, 10))}</td>
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: clr }} />
                          <span className="font-bold text-ink">{item?.name ?? "صنف محذوف"}</span>
                        </div>
                      </td>
                      <td className="td">
                        {item ? (
                          <span className="chip" style={{ background: `${clr}18`, color: clr }}>{item.category}</span>
                        ) : (
                          <span className="text-soft/60 text-xs">—</span>
                        )}
                      </td>
                      <td className="td">
                        <span className={`chip ${supply ? "bg-mint-soft text-[#1d6b47]" : "bg-coral-soft text-coral"}`}>
                          <IconTrendUp className={`w-3.5 h-3.5 ${supply ? "" : "rotate-180"}`} />
                          {supply ? "توريد" : "صرف"}
                        </span>
                      </td>
                      <td className="td">
                        <span className={`stat-num font-bold ${supply ? "text-[#1d6b47]" : "text-coral"}`}>
                          {supply ? "+" : "−"}{Math.abs(m.delta)}
                        </span>
                        {item && <span className="text-[10px] text-soft ms-1">{item.unit}</span>}
                      </td>
                      <td className="td text-soft text-xs max-w-52">
                        <span className="block truncate">{m.note || "—"}</span>
                      </td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewMove(m)} className="icon-btn !w-8 !h-8 hover:!bg-sky-soft hover:!text-sky" aria-label="عرض" title="عرض التفاصيل">
                            <IconEye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditMove(m)} className="icon-btn !w-8 !h-8" aria-label="تعديل" title="تعديل الحركة">
                            <IconPencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setPrintMove(m)} className="icon-btn !w-8 !h-8 hover:!bg-jade-soft hover:!text-jade-deep" aria-label="طباعة" title="طباعة سند الحركة">
                            <IconPrinter className="w-4 h-4" />
                          </button>
                          <DeleteMoveBtn move={m} itemName={item?.name ?? "صنف"} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ====== النوافذ ====== */}
      {showMove && <MoveModal onClose={() => setShowMove(false)} />}
      {showAddItem && <AddItemModal onClose={() => setShowAddItem(false)} />}
      {viewMove && <ViewMoveModal move={viewMove} onClose={() => setViewMove(null)} onPrint={() => { setPrintMove(viewMove); setViewMove(null); }} />}
      {editMove && <EditMoveModal move={editMove} onClose={() => setEditMove(null)} />}
      {printMove && (
        <PrintModal open onClose={() => setPrintMove(null)} title="طباعة سند حركة مخزنية">
          <MovePrint move={printMove} />
        </PrintModal>
      )}
    </div>
  );
}

/* ============================ حذف حركة ============================ */

function DeleteMoveBtn({ move, itemName }: { move: SupplyMove; itemName: string }) {
  const { dispatch } = useStore();
  const { push } = useToast();
  return (
    <TwoStepDelete
      onConfirm={() => {
        dispatch({ type: "DELETE_SUPPLY_MOVE", id: move.id });
        push("warn", "حُذفت الحركة وعُدّل الرصيد", `${itemName} — ${isSupply(move) ? "خصم" : "إرجاع"} ${Math.abs(move.delta)}`);
      }}
    />
  );
}

/* ============================ عرض حركة ============================ */

function ViewMoveModal({ move, onClose, onPrint }: { move: SupplyMove; onClose: () => void; onPrint: () => void }) {
  const { db } = useStore();
  const money = useMoney();
  const item = db.supplies.find((s) => s.id === move.itemId);
  const supply = isSupply(move);
  const clr = item ? expCatColor(item.category) : "#5b7370";

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-line/60 last:border-0">
      <span className="text-[11px] font-bold text-soft shrink-0">{label}</span>
      <span className="text-sm font-semibold text-ink text-end">{value}</span>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={supply ? "حركة توريد مخزنية" : "حركة صرف مخزنية"}
      subtitle={`سجل الحركة رقم ${move.id.slice(0, 6).toUpperCase()}`}
      footer={
        <>
          <button className="btn-soft" onClick={onPrint}>
            <IconPrinter className="w-4 h-4" />
            طباعة السند
          </button>
          <button className="btn-ghost" onClick={onClose}>إغلاق</button>
        </>
      }
    >
      <div className={`rounded-xl border-2 p-4 mb-4 flex items-center justify-between ${supply ? "border-[#1d6b47]/40 bg-mint-soft/40" : "border-coral/40 bg-coral-soft/40"}`}>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${supply ? "bg-[#1d6b47]" : "bg-coral"} text-white`}>
            <IconTrendUp className={`w-5 h-5 ${supply ? "" : "rotate-180"}`} />
          </span>
          <div>
            <p className="font-display font-bold text-ink">{item?.name ?? "صنف محذوف"}</p>
            <p className="text-[11px] text-soft mt-0.5">{supply ? "إضافة إلى المخزون" : "خصم من المخزون"}</p>
          </div>
        </div>
        <span className={`stat-num text-2xl font-bold ${supply ? "text-[#1d6b47]" : "text-coral"}`}>
          {supply ? "+" : "−"}{Math.abs(move.delta)}
        </span>
      </div>

      <Row label="التاريخ" value={fmtDateFull(move.date.slice(0, 10))} />
      <Row label="الفئة" value={item ? <span className="chip" style={{ background: `${clr}18`, color: clr }}>{item.category}</span> : "—"} />
      <Row label="الوحدة" value={item?.unit ?? "—"} />
      <Row label="الكمية" value={<span className={`stat-num ${supply ? "text-[#1d6b47]" : "text-coral"}`}>{supply ? "+" : "−"}{Math.abs(move.delta)}</span>} />
      {item && <Row label="قيمة الوحدة" value={money(item.cost)} />}
      {item && <Row label="الرصيد الحالي" value={<span className="stat-num">{item.qty} {item.unit}</span>} />}
      <Row label="ملاحظات" value={move.note || "—"} />
    </Modal>
  );
}

/* ============================ تعديل حركة ============================ */

function EditMoveModal({ move, onClose }: { move: SupplyMove; onClose: () => void }) {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const item = db.supplies.find((s) => s.id === move.itemId);
  const [note, setNote] = useState(move.note ?? "");
  const [qty, setQty] = useState(String(Math.abs(move.delta)));
  const [err, setErr] = useState("");

  const save = () => {
    const q = Number(qty);
    if (!q || q <= 0) return setErr("أدخل كمية صحيحة أكبر من صفر.");
    dispatch({
      type: "UPDATE_SUPPLY_MOVE",
      id: move.id,
      note: note.trim() || undefined,
      delta: isSupply(move) ? q : -q,
    });
    push("success", "عُدّلت الحركة", `${item?.name ?? ""} — الكمية ${q}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="تعديل حركة مخزنية"
      subtitle={`${item?.name ?? "صنف"} — تعديل الملاحظة والكمية`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>حفظ التعديلات</button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="الكمية *">
          <TInput type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="ملاحظات">
          <TArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="سبب الحركة، رقم الفاتورة، الجهة…" />
        </Field>
        {err && <p className="text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
      </div>
    </Modal>
  );
}

/* ============================ تسجيل حركة جديدة ============================ */

function MoveModal({ onClose }: { onClose: () => void }) {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [itemId, setItemId] = useState("");
  const [dir, setDir] = useState<"in" | "out">("in");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const save = () => {
    if (!itemId) return setErr("اختر الصنف أولاً.");
    const q = Number(qty);
    if (!q || q <= 0) return setErr("أدخل كمية صحيحة.");
    const item = db.supplies.find((s) => s.id === itemId);
    if (dir === "out" && item && q > item.qty) return setErr(`الكمية المطلوبة أكبر من الرصيد المتاح (${item.qty}).`);
    dispatch({ type: "MOVE_SUPPLY", itemId, delta: dir === "in" ? q : -q, note: note.trim() || undefined });
    push("success", dir === "in" ? "سُجّل توريد" : "سُجّل صرف", `${item?.name ?? ""} — ${q} ${item?.unit ?? ""}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="تسجيل حركة مخزنية"
      subtitle="توريد (إضافة) أو صرف (خصم) — تنعكس على الرصيد فوراً"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>تسجيل الحركة</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="inline-flex rounded-lg border border-line overflow-hidden w-full">
          {([["in", "توريد (إضافة)"], ["out", "صرف (خصم)"]] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setDir(k)}
              className={`flex-1 h-11 text-sm font-bold cursor-pointer transition-colors ${
                dir === k ? (k === "in" ? "bg-[#1d6b47] text-white" : "bg-coral text-white") : "bg-white text-soft hover:bg-mist"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <Field label="الصنف *">
          <TSelect value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">— اختر من المخزون —</option>
            {db.supplies.map((s) => (
              <option key={s.id} value={s.id}>{s.name} · الرصيد {s.qty} {s.unit}</option>
            ))}
          </TSelect>
        </Field>
        <Field label="الكمية *">
          <TInput type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="10" />
        </Field>
        <Field label="ملاحظات">
          <TArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="سبب الحركة، رقم فاتورة الشراء، الجهة المستفيدة…" />
        </Field>
        {err && <p className="text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
      </div>
    </Modal>
  );
}

/* ============================ إضافة صنف ============================ */

function AddItemModal({ onClose }: { onClose: () => void }) {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(db.itemCats[0] ?? "استهلاكي عام");
  const [unit, setUnit] = useState("علبة");
  const [qty, setQty] = useState("");
  const [minQty, setMinQty] = useState("5");
  const [cost, setCost] = useState("");
  const [err, setErr] = useState("");

  const save = () => {
    if (name.trim().length < 2) return setErr("أدخل اسم الصنف.");
    const item: SupplyItem = {
      id: uid(),
      name: name.trim(),
      category,
      unit: unit.trim() || "وحدة",
      qty: Number(qty) || 0,
      minQty: Number(minQty) || 0,
      cost: Number(cost) || 0,
    };
    dispatch({ type: "ADD_SUPPLY", item });
    push("success", "أُضيف الصنف", `${item.name} — الرصيد ${item.qty}`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="إضافة صنف للمخزون"
      subtitle="سيظهر في بيانات الأصناف وتنبيهات النفاد"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>حفظ الصنف</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="اسم الصنف *">
            <TInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: قفازات فحص" />
          </Field>
        </div>
        <Field label="الفئة">
          <TSelect value={category} onChange={(e) => setCategory(e.target.value)}>
            {db.itemCats.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </TSelect>
        </Field>
        <Field label="الوحدة">
          <TInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="علبة / قطعة / لتر" />
        </Field>
        <Field label="الرصيد الافتتاحي">
          <TInput type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
        </Field>
        <Field label="الحد الأدنى للتنبيه">
          <TInput type="number" min={0} value={minQty} onChange={(e) => setMinQty(e.target.value)} placeholder="5" />
        </Field>
        <div className="col-span-2">
          <Field label="تكلفة الوحدة">
            <TInput type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="1500" />
          </Field>
        </div>
      </div>
      {err && <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}

/* ============================ سند حركة (طباعة) ============================ */

function MovePrint({ move }: { move: SupplyMove }) {
  const { db } = useStore();
  const money = useMoney();
  const item = db.supplies.find((s) => s.id === move.itemId);
  const supply = isSupply(move);
  const clr = item ? expCatColor(item.category) : "#5b7370";

  return (
    <div className="text-ink">
      <div className="flex items-center justify-between py-4">
        <div>
          <p className="font-display font-bold text-xl">{supply ? "سند توريد مخزني" : "سند صرف مخزني"}</p>
          <p className="text-xs text-soft mt-1">
            رقم السند: <b className="stat-num" dir="ltr">MV-{move.id.slice(0, 6).toUpperCase()}</b> · التاريخ: {fmtDate(move.date.slice(0, 10))}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: `${clr}1a`, color: clr }}>
          <span className="w-2 h-2 rounded-full" style={{ background: clr }} />
          {item?.category ?? "—"}
        </span>
      </div>

      <div className={`rounded-xl border-2 p-5 flex flex-wrap items-center justify-between gap-4 my-2 ${supply ? "border-[#1d6b47]/40 bg-mint-soft/40" : "border-coral/40 bg-coral-soft/40"}`}>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-soft">الصنف</p>
          <p className="font-display font-bold text-lg mt-1 leading-snug">{item?.name ?? "صنف محذوف"}</p>
          <p className="text-[11px] text-soft mt-1">{supply ? "إضافة إلى رصيد المخزون" : "خصم من رصيد المخزون"}</p>
        </div>
        <div className="text-end">
          <p className="text-[11px] font-bold text-soft">الكمية</p>
          <p className={`stat-num font-bold text-3xl mt-1 ${supply ? "text-[#1d6b47]" : "text-coral"}`}>
            {supply ? "+" : "−"}{Math.abs(move.delta)} <span className="text-sm">{item?.unit ?? ""}</span>
          </p>
        </div>
      </div>

      {move.note && (
        <div className="mt-4">
          <p className="text-[11px] font-bold text-soft mb-1.5">ملاحظات</p>
          <p className="text-[12px] text-ink leading-relaxed bg-mist/40 border border-line rounded-lg px-3.5 py-2.5">{move.note}</p>
        </div>
      )}

      {item && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-line px-3.5 py-2.5">
            <p className="text-[10px] font-bold text-soft">قيمة الوحدة</p>
            <p className="stat-num font-bold mt-0.5">{money(item.cost)}</p>
          </div>
          <div className="rounded-lg border border-line px-3.5 py-2.5">
            <p className="text-[10px] font-bold text-soft">الرصيد بعد الحركة</p>
            <p className="stat-num font-bold mt-0.5">{item.qty} {item.unit}</p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-soft mt-5 leading-relaxed">
        تُقيَّد هذه الحركة في سجل المخزون المركزي وتظهر في شاشة «المخزون والمستهلكات» وتقارير الجرد تلقائياً.
      </p>
    </div>
  );
}
