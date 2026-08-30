import React, { useMemo, useState } from "react";
import { uid, useMoney, useStore, type Service } from "../store";
import {
  IconAlert,
  IconClock,
  IconCrown,
  IconGrid,
  IconMenu,
  IconPencil,
  IconPlus,
  IconScalpel,
  IconSearch,
  IconShield,
  IconSpark,
  IconTooth,
} from "../icons";
import { AnimatedNumber, Field, Modal, Switch, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";

const COLORS = ["#0d8f83", "#0a6158", "#3a86c4", "#2c9c69", "#e2952b", "#d9503a", "#b23a48"];
const CATS = ["تشخيص", "وقاية", "علاج", "تجميل", "جراحة", "تعويضات", "تقويم"];

const catIcon = (cat: string, cls = "w-4 h-4") => {
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

export default function ServicesPage() {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [cat, setCat] = useState("all");
  const [view, setView] = useState<"grid" | "table">(() => (localStorage.getItem("svc-view") as "grid" | "table") || "grid");
  const [edit, setEdit] = useState<Service | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [priceEdit, setPriceEdit] = useState<string | null>(null);
  const [priceVal, setPriceVal] = useState("");

  /* الفئات الحية: المصدر المعتمد (فئات الخدمات) + أي فئات موجودة فعلياً في الخدمات القديمة */
  const cats = useMemo(() => {
    const fromServices = new Set(db.services.map((s) => s.category));
    const merged = [...new Set([...db.serviceCats, ...fromServices])];
    return ["all", ...merged];
  }, [db.services, db.serviceCats]);
  const list = useMemo(
    () => db.services.filter((s) => cat === "all" || s.category === cat).sort((a, b) => a.category.localeCompare(b.category, "ar")),
    [db.services, cat]
  );
  const activeCount = db.services.filter((s) => s.active).length;
  const avg = db.services.length ? db.services.reduce((s, x) => s + x.price, 0) / db.services.length : 0;

  const setViewPersist = (v: "grid" | "table") => {
    setView(v);
    localStorage.setItem("svc-view", v);
  };

  const savePrice = (s: Service) => {
    const v = Number(priceVal);
    if (!v || v <= 0) {
      setPriceEdit(null);
      return;
    }
    dispatch({ type: "UPDATE_SERVICE", s: { ...s, price: v } });
    push("success", "تم تحديث السعر", `${s.name} أصبح ${money(v)}`);
    setPriceEdit(null);
  };

  const toggleActive = (s: Service, v: boolean) => {
    dispatch({ type: "UPDATE_SERVICE", s: { ...s, active: v } });
    push("info", v ? "أُتيحت الخدمة للحجز" : "أُوقفت الخدمة مؤقتاً", s.name);
  };

  return (
    <div className="space-y-5">
      {/* الترويسة */}
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">خدمات العيادة</h1>
          <p className="text-sm text-soft mt-1">قائمة العلاجات والأسعار المعتمدة — تنعكس مباشرة على الحجز والفواتير.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex rounded-lg border border-line bg-white p-1 gap-1">
            <button
              onClick={() => setViewPersist("grid")}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-md cursor-pointer transition-all ${view === "grid" ? "bg-pine text-white" : "text-soft hover:bg-mist"}`}
              aria-label="عرض شبكي"
            >
              <IconGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewPersist("table")}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-md cursor-pointer transition-all ${view === "table" ? "bg-pine text-white" : "text-soft hover:bg-mist"}`}
              aria-label="عرض جدولي"
            >
              <IconMenu className="w-4 h-4" />
            </button>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <IconPlus className="w-4.5 h-4.5" />
            خدمة جديدة
          </button>
        </div>
      </div>

      {/* شريط الإحصاءات */}
      <div className="card anim-rise flex flex-wrap items-stretch divide-x divide-x-reverse divide-line" style={{ animationDelay: "70ms" }}>
        {[
          { label: "إجمالي الخدمات", node: <AnimatedNumber value={db.services.length} className="stat-num text-2xl text-ink" /> },
          { label: "متاحة للحجز", node: <span className="stat-num text-2xl text-mint">{activeCount}</span> },
          { label: "الفئات", node: <span className="stat-num text-2xl text-sky">{cats.length - 1}</span> },
          { label: "متوسط السعر", node: <span className="stat-num text-2xl text-jade-deep">{money(Math.round(avg))}</span> },
        ].map((s, i) => (
          <div key={s.label} className="flex-1 min-w-36 px-5 py-4 anim-fade" style={{ animationDelay: `${120 + i * 70}ms` }}>
            <p className="text-[11px] font-bold text-soft mb-1">{s.label}</p>
            {s.node}
          </div>
        ))}
      </div>

      {/* فلترة الفئات */}
      <div className="flex flex-wrap gap-2 anim-rise" style={{ animationDelay: "120ms" }}>
        {cats.map((c) => {
          const n = c === "all" ? db.services.length : db.services.filter((s) => s.category === c).length;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`h-10 px-4 rounded-lg text-xs font-bold cursor-pointer transition-all border inline-flex items-center gap-2 ${
                cat === c ? "bg-pine text-white border-pine shadow-sm" : "bg-white text-soft border-line hover:border-jade/50"
              }`}
            >
              {c !== "all" && <span className={cat === c ? "text-[#7fe0d4]" : "text-jade-deep"}>{catIcon(c, "w-3.5 h-3.5")}</span>}
              {c === "all" ? "كل الفئات" : c}
              <span className={`chip !py-0.5 !px-1.5 !text-[10px] ${cat === c ? "bg-white/15 text-white" : "bg-mist text-soft"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* العرض الشبكي */}
      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.map((s, i) => (
            <div key={s.id} className={`card card-hover anim-rise overflow-hidden flex flex-col ${s.active ? "" : "opacity-70"}`} style={{ animationDelay: `${i * 45}ms` }}>
              <div className="h-1.5 w-full" style={{ background: s.color }} />
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="chip bg-mist text-soft">
                    <span style={{ color: s.color }}>{catIcon(s.category, "w-3.5 h-3.5")}</span>
                    {s.category}
                  </span>
                  <Switch on={s.active} onChange={(v) => toggleActive(s, v)} />
                </div>
                <h3 className={`font-display font-bold text-lg text-ink mt-3 leading-snug ${s.active ? "" : "line-through decoration-2"}`}>{s.name}</h3>
                <div className="flex items-end gap-1.5 mt-2">
                  <span className="stat-num text-[26px] text-jade-deep leading-none">{money(s.price)}</span>
                  <span className="text-[10px] font-bold text-soft mb-0.5">للجلسة</span>
                </div>
                <div className="mt-auto pt-4 flex items-center justify-between">
                  <span className="chip bg-jade-soft/60 text-jade-deep">
                    <IconClock className="w-3.5 h-3.5" />
                    {s.duration} دقيقة
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setEdit(s)} className="icon-btn !w-8 !h-8" aria-label="تعديل">
                      <IconPencil className="w-4 h-4" />
                    </button>
                    <TwoStepDelete
                      onConfirm={() => {
                        dispatch({ type: "DELETE_SERVICE", id: s.id });
                        push("warn", "حُذفت الخدمة", s.name);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* العرض الجدولي */
        <div className="card overflow-hidden anim-rise" style={{ animationDelay: "140ms" }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-mist/70 border-b border-line">
                <tr>
                  <th className="th">الخدمة</th>
                  <th className="th">الفئة</th>
                  <th className="th">المدة</th>
                  <th className="th">السعر</th>
                  <th className="th">متاحة</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s, i) => (
                  <tr key={s.id} className="border-b border-line/60 last:border-0 hover:bg-jade-soft/30 transition-colors anim-fade" style={{ animationDelay: `${i * 30}ms` }}>
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: `${s.color}18`, color: s.color }}>
                          {catIcon(s.category)}
                        </span>
                        <span className={`font-bold ${s.active ? "text-ink" : "text-soft line-through"}`}>{s.name}</span>
                      </div>
                    </td>
                    <td className="td"><span className="chip bg-mist text-soft">{s.category}</span></td>
                    <td className="td text-soft">
                      <span className="inline-flex items-center gap-1.5"><IconClock className="w-3.5 h-3.5" /> {s.duration} د</span>
                    </td>
                    <td className="td">
                      {priceEdit === s.id ? (
                        <span className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={priceVal}
                            onChange={(e) => setPriceVal(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && savePrice(s)}
                            className="input !w-28 !h-8 text-center"
                            type="number"
                          />
                          <button onClick={() => savePrice(s)} className="text-[11px] font-bold text-white bg-jade rounded-md px-2.5 py-1.5 cursor-pointer">حفظ</button>
                        </span>
                      ) : (
                        <span className="stat-num font-bold text-ink">{money(s.price)}</span>
                      )}
                    </td>
                    <td className="td">
                      <Switch on={s.active} onChange={(v) => toggleActive(s, v)} />
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setPriceEdit(s.id);
                            setPriceVal(String(s.price));
                          }}
                          className="text-[11px] font-bold text-jade-deep bg-jade-soft hover:bg-jade hover:text-white rounded-md px-2.5 py-1.5 cursor-pointer transition-colors"
                        >
                          السعر
                        </button>
                        <button onClick={() => setEdit(s)} className="icon-btn !w-8 !h-8" aria-label="تعديل">
                          <IconPencil className="w-4 h-4" />
                        </button>
                        <TwoStepDelete
                          onConfirm={() => {
                            dispatch({ type: "DELETE_SERVICE", id: s.id });
                            push("warn", "حُذفت الخدمة", s.name);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {list.length === 0 && (
        <div className="card anim-pop p-6 text-center">
          <p className="font-display font-bold text-ink">لا خدمات في هذه الفئة</p>
          <p className="text-xs text-soft mt-1.5">جرّب فئة أخرى أو أضف خدمة جديدة.</p>
        </div>
      )}

      {(showAdd || edit) && (
        <ServiceModal
          initial={edit ?? undefined}
          onClose={() => {
            setShowAdd(false);
            setEdit(null);
          }}
        />
      )}
    </div>
  );
}

function ServiceModal({ initial, onClose }: { initial?: Service; onClose: () => void }) {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? db.serviceCats[0] ?? "علاج");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [duration, setDuration] = useState(String(initial?.duration ?? 30));
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [err, setErr] = useState("");

  const save = () => {
    if (name.trim().length < 2) return setErr("أدخل اسم الخدمة.");
    if (!Number(price) || Number(price) <= 0) return setErr("أدخل سعراً صحيحاً.");
    const s: Service = {
      id: initial?.id ?? uid(),
      name: name.trim(),
      category,
      price: Number(price),
      duration: Number(duration) || 30,
      color,
      active: initial?.active ?? true,
    };
    dispatch({ type: initial ? "UPDATE_SERVICE" : "ADD_SERVICE", s });
    push("success", initial ? "تم تعديل الخدمة" : "أُضيفت خدمة جديدة", s.name);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? `تعديل «${initial.name}»` : "خدمة جديدة"}
      subtitle="تظهر الخدمة في قوائم الحجز والفواتير فور حفظها"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>{initial ? "حفظ التعديلات" : "إضافة الخدمة"}</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="اسم الخدمة *">
            <TInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: حشوة تجميلية" />
          </Field>
        </div>
        <Field label="الفئة">
          <TSelect value={category} onChange={(e) => setCategory(e.target.value)}>
            {(db.serviceCats.length ? db.serviceCats : CATS).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </TSelect>
        </Field>
        <Field label="المدة (دقيقة)">
          <TInput type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min={10} />
        </Field>
        <div className="col-span-2">
          <Field label="السعر بالريال اليمني *">
            <TInput type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="7000" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="اللون المميز">
            <div className="flex gap-2.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-110 ${color === c ? "ring-2 ring-offset-2 ring-ink scale-110" : ""}`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </Field>
        </div>
      </div>
      {err && <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}
