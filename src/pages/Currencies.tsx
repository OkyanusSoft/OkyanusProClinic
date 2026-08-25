import React, { useState } from "react";
import { BASE_CURRENCY, uid, useMoney, useStore, type Currency } from "../store";
import { IconCoins, IconPlus, IconSpark, IconWallet } from "../icons";
import { AnimatedNumber, Field, Modal, TInput, TwoStepDelete, useToast } from "../components/ui";

export default function CurrenciesPage() {
  const { db, dispatch } = useStore();
  const money = useMoney();
  const { push } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<Currency | null>(null);
  const [rateEdit, setRateEdit] = useState<string | null>(null);
  const [rateVal, setRateVal] = useState("");

  const base = db.currencies.find((c) => c.code === BASE_CURRENCY);

  const saveRate = (c: Currency) => {
    const v = Number(rateVal);
    if (!v || v <= 0) {
      setRateEdit(null);
      return;
    }
    dispatch({ type: "UPDATE_CURRENCY", c: { ...c, rate: v } });
    push("success", "تم تحديث سعر الصرف", `${c.name}: كل 1 ${c.symbol} = ${v.toLocaleString("en-US")} ر.ي`);
    setRateEdit(null);
  };

  const setDefault = (c: Currency) => {
    dispatch({ type: "SET_DEFAULT_CURRENCY", code: c.code });
    push("success", `العملة الافتراضية الآن: ${c.name}`, "تحوّلت جميع المبالغ في النظام تلقائياً.");
  };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">العملات وأسعار الصرف</h1>
          <p className="text-sm text-soft mt-1">نظام متعدد العملات — تُحفَظ المبالغ بالعملة الأساسية ويُحوَّل العرض حسب الافتراضية.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <IconPlus className="w-4.5 h-4.5" />
          عملة جديدة
        </button>
      </div>

      {/* بطاقة العملة الأساسية */}
      <div className="card anim-rise p-5 bg-gradient-to-l from-pine to-pine-2 !border-pine text-white relative overflow-hidden" style={{ animationDelay: "70ms" }}>
        <span className="absolute -start-8 -bottom-10 opacity-10"><IconCoins className="w-44 h-44" /></span>
        <div className="relative flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/12 text-[#7fe0d4]">
            <IconWallet className="w-6 h-6" />
          </span>
          <div className="flex-1 min-w-56">
            <p className="text-[11px] font-bold text-white/60">العملة الأساسية للعيادة</p>
            <p className="font-display font-bold text-2xl mt-0.5">
              الريال اليمني <span className="text-[#7fe0d4] text-lg">(ر.ي)</span>
            </p>
            <p className="text-xs text-white/65 mt-1 leading-relaxed">
              جميع الفواتير والأسعار تُسجَّل بالريال اليمني. عند تغيير العملة الافتراضية تُعرض المبالغ محوَّلة بسعر الصرف المحدد هنا.
            </p>
          </div>
          <div className="text-start sm:text-end">
            <p className="text-[11px] font-bold text-white/60">العملة الافتراضية للعرض</p>
            <p className="font-display font-bold text-xl mt-0.5 text-[#7fe0d4]">
              {db.currencies.find((c) => c.code === db.defaultCurrency)?.name ?? "—"}
            </p>
            <p className="text-xs text-white/60 mt-1">مثال: 10,000 ر.ي = <b className="text-white">{money(10000)}</b></p>
          </div>
        </div>
      </div>

      {/* جدول العملات */}
      <div className="card overflow-hidden anim-rise" style={{ animationDelay: "140ms" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-mist/70 border-b border-line">
              <tr>
                <th className="th">الرمز</th>
                <th className="th">العملة</th>
                <th className="th">سعر الصرف (مقابل ر.ي)</th>
                <th className="th">معاينة 10,000 ر.ي</th>
                <th className="th">الافتراضية</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {db.currencies.map((c, i) => {
                const isDefault = c.code === db.defaultCurrency;
                const isBase = c.code === BASE_CURRENCY;
                return (
                  <tr key={c.code} className="border-b border-line/60 last:border-0 hover:bg-jade-soft/30 transition-colors anim-fade" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="td">
                      <span className="chip bg-pine text-white !px-3 !py-1.5 stat-num" dir="ltr">{c.code}</span>
                    </td>
                    <td className="td">
                      <div>
                        <p className="font-bold text-ink">{c.name}</p>
                        <p className="text-[11px] text-soft mt-0.5">الرمز: <b>{c.symbol}</b></p>
                      </div>
                    </td>
                    <td className="td">
                      {isBase ? (
                        <span className="chip bg-mint-soft text-[#1d6b47]">عملة الأساس (1)</span>
                      ) : rateEdit === c.code ? (
                        <span className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={rateVal}
                            onChange={(e) => setRateVal(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveRate(c)}
                            className="input !w-28 !h-8 text-center"
                            type="number"
                            step="0.01"
                          />
                          <button onClick={() => saveRate(c)} className="text-[11px] font-bold text-white bg-jade rounded-md px-2.5 py-1.5 cursor-pointer">حفظ</button>
                        </span>
                      ) : (
                        <button
                          onClick={() => { setRateEdit(c.code); setRateVal(String(c.rate)); }}
                          className="stat-num font-bold text-ink hover:text-jade-deep cursor-pointer transition-colors"
                          title="اضغط لتعديل سعر الصرف"
                        >
                          {c.rate.toLocaleString("en-US")} ر.ي
                        </button>
                      )}
                    </td>
                    <td className="td stat-num text-soft text-xs" dir="ltr">
                      {isBase ? "10,000 ر.ي" : `${(10000 / c.rate).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${c.symbol}`}
                    </td>
                    <td className="td">
                      <button
                        onClick={() => !isDefault && setDefault(c)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 h-8 text-xs font-bold cursor-pointer transition-all ${
                          isDefault ? "bg-jade text-white shadow-sm" : "bg-mist text-soft hover:bg-jade-soft hover:text-jade-deep"
                        }`}
                      >
                        <IconSpark className="w-3.5 h-3.5" />
                        {isDefault ? "الافتراضية" : "تعيين"}
                      </button>
                    </td>
                    <td className="td">
                      {isBase ? (
                        <span className="text-[11px] font-bold text-soft/60">أساسية</span>
                      ) : (
                        <TwoStepDelete onConfirm={() => {
                          dispatch({ type: "DELETE_CURRENCY", code: c.code });
                          push("warn", "حُذفت العملة", c.name);
                        }} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] font-semibold text-soft anim-fade" style={{ animationDelay: "220ms" }}>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-soft text-[#a06410] shrink-0"><IconCoins className="w-4 h-4" /></span>
        <p>
          تحديث أسعار الصرف يؤثر على <b>العرض فقط</b> — تبقى السجلات المالية محفوظة بقيمتها الأصلية بالريال اليمني.
          عدد العملات: <AnimatedNumber value={db.currencies.length} className="stat-num text-ink" />
        </p>
      </div>

      {(showAdd || edit) && <CurrencyModal initial={edit ?? undefined} onClose={() => { setShowAdd(false); setEdit(null); }} />}
    </div>
  );
}

function CurrencyModal({ initial, onClose }: { initial?: Currency; onClose: () => void }) {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [symbol, setSymbol] = useState(initial?.symbol ?? "");
  const [rate, setRate] = useState(String(initial?.rate ?? ""));
  const [err, setErr] = useState("");

  const save = () => {
    const c3 = code.trim().toUpperCase();
    if (c3.length !== 3) return setErr("الرمز يجب أن يكون 3 أحرف لاتينية (مثل KWD).");
    if (name.trim().length < 2) return setErr("أدخل اسم العملة.");
    if (!Number(rate) || Number(rate) <= 0) return setErr("أدخل سعر صرف صحيحاً مقابل الريال اليمني.");
    if (!initial && db.currencies.some((c) => c.code === c3)) return setErr("هذه العملة موجودة بالفعل.");
    const c: Currency = { code: c3, name: name.trim(), symbol: symbol.trim() || c3, rate: Number(rate) };
    dispatch({ type: initial ? "UPDATE_CURRENCY" : "ADD_CURRENCY", c });
    push("success", initial ? "تم تعديل العملة" : "أُضيفت عملة جديدة", `${c.name} — كل 1 ${c.symbol} = ${Number(rate).toLocaleString("en-US")} ر.ي`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? `تعديل «${initial.name}»` : "عملة جديدة"}
      subtitle="سعر الصرف يحدد كم يساوي الوحدة الواحدة بالريال اليمني"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>{initial ? "حفظ التعديلات" : "إضافة العملة"}</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="الرمز الدولي (3 أحرف) *">
          <TInput value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="KWD" maxLength={3} dir="ltr" disabled={!!initial} />
        </Field>
        <Field label="اسم العملة *">
          <TInput value={name} onChange={(e) => setName(e.target.value)} placeholder="دينار كويتي" />
        </Field>
        <Field label="رمز العرض">
          <TInput value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="د.ك" />
        </Field>
        <Field label="سعر الصرف (ر.ي لكل وحدة) *">
          <TInput type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="مثال: 1730" />
        </Field>
      </div>
      {rate && Number(rate) > 0 && (
        <p className="mt-4 text-xs font-bold text-jade-deep bg-jade-soft rounded-lg px-3.5 py-3 anim-pop">
          معاينة: فاتورة بقيمة 10,000 ر.ي ستُعرض كـ {(10000 / Number(rate)).toLocaleString("en-US", { maximumFractionDigits: 2 })} {symbol.trim() || code.toUpperCase()}
        </p>
      )}
      {err && <p className="mt-3 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}
