import React, { useMemo, useState } from "react";
import { fmtMoney, uid, useStore, type Service } from "../store";
import { IconClock, IconPencil, IconPlus, IconSpark } from "../icons";
import { Field, Modal, Switch, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";

const COLORS = ["#0d8f83", "#0a6158", "#3a86c4", "#2c9c69", "#e2952b", "#d9503a", "#b23a48"];
const CATS = ["تشخيص", "وقاية", "علاج", "تجميل", "جراحة", "تعويضات", "تقويم"];

export default function ServicesPage() {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [cat, setCat] = useState("all");
  const [edit, setEdit] = useState<Service | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [priceEdit, setPriceEdit] = useState<string | null>(null);
  const [priceVal, setPriceVal] = useState("");

  const cats = useMemo(() => ["all", ...new Set(db.services.map((s) => s.category))], [db.services]);
  const list = useMemo(
    () => db.services.filter((s) => cat === "all" || s.category === cat).sort((a, b) => a.category.localeCompare(b.category, "ar")),
    [db.services, cat]
  );

  const savePrice = (s: Service) => {
    const v = Number(priceVal);
    if (!v || v <= 0) {
      setPriceEdit(null);
      return;
    }
    dispatch({ type: "UPDATE_SERVICE", s: { ...s, price: v } });
    push("success", "تم تحديث السعر", `${s.name} أصبح ${fmtMoney(v)}`);
    setPriceEdit(null);
  };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">قائمة الأسعار والعلاجات</h1>
          <p className="text-sm text-soft mt-1">{db.services.length} خدمة · {db.services.filter((s) => s.active).length} متاحة للحجز</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <IconPlus className="w-4.5 h-4.5" />
          خدمة جديدة
        </button>
      </div>

      <div className="flex flex-wrap gap-2 anim-rise" style={{ animationDelay: "80ms" }}>
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`h-10 px-4 rounded-lg text-xs font-bold cursor-pointer transition-all border ${
              cat === c ? "bg-pine text-white border-pine shadow-sm" : "bg-white text-soft border-line hover:border-jade/50"
            }`}
          >
            {c === "all" ? "كل الفئات" : c}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden anim-rise" style={{ animationDelay: "140ms" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
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
                      <span className="w-3 h-3 rounded-full shrink-0 ring-4 ring-mist" style={{ background: s.color }} />
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
                          className="input !w-24 !h-8 text-center"
                          type="number"
                        />
                        <button onClick={() => savePrice(s)} className="text-[11px] font-bold text-white bg-jade rounded-md px-2.5 py-1.5 cursor-pointer">حفظ</button>
                      </span>
                    ) : (
                      <span className="stat-num font-bold text-ink">{fmtMoney(s.price)}</span>
                    )}
                  </td>
                  <td className="td">
                    <Switch
                      on={s.active}
                      onChange={(v) => {
                        dispatch({ type: "UPDATE_SERVICE", s: { ...s, active: v } });
                        push("info", v ? "أُتيحت الخدمة للحجز" : "أُوقفت الخدمة مؤقتاً", s.name);
                      }}
                    />
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setPriceEdit(s.id);
                          setPriceVal(String(s.price));
                        }}
                        className="icon-btn !w-8 !h-8"
                        aria-label="تعديل السعر"
                      >
                        <IconPencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEdit(s)} className="icon-btn !w-8 !h-8" aria-label="تعديل">
                        <IconSpark className="w-4 h-4" />
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
  const { dispatch } = useStore();
  const { push } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "علاج");
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
            {CATS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </TSelect>
        </Field>
        <Field label="المدة (دقيقة)">
          <TInput type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min={10} />
        </Field>
        <div className="col-span-2">
          <Field label="السعر (ر.س) *">
            <TInput type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="250" />
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
