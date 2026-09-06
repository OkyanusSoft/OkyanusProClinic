/**
 * حقل اختيار المريض الاحترافي — بحث فوري + زر إضافة مريض ملاصق
 * الوجهة: src/components/PatientPicker.tsx
 * ------------------------------------------------
 * يُستخدم في شاشة "حجز موعد جديد" بدلًا من القائمة المنسدلة العادية.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { AddPatientModal } from "../pages/Patients";
import { Avatar } from "./ui";
import { IconCheck, IconChevronDown, IconSearch, IconUserPlus } from "../icons";

export function PatientPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (patientId: string) => void;
}) {
  const { db, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = db.patients.find((p) => p.id === value);

  const list = useMemo(() => {
    const s = q.trim();
    const arr = [...db.patients].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    return s ? arr.filter((p) => p.name.includes(s) || p.phone.includes(s) || (p.city ?? "").includes(s)) : arr;
  }, [db.patients, q]);

  /* إغلاق عند النقر خارجاً */
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  /* تركيز البحث عند الفتح */
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 60);
  }, [open]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-1.5">
        {/* الحقل الرئيسي */}
        <button
          type="button"
          onClick={() => { setOpen((o) => !o); setQ(""); }}
          className={`input !h-auto !py-2 flex items-center gap-2.5 !cursor-pointer text-start w-full transition-colors ${
            open ? "!border-jade shadow-[0_0_0_3px_rgba(18,115,196,0.14)]" : "hover:!border-jade/60"
          }`}
        >
          {selected ? (
            <>
              <Avatar name={selected.name} size="w-8 h-8 text-[10px]" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-ink truncate leading-tight">{selected.name}</span>
                <span className="block text-[10px] font-semibold text-soft mt-0.5" dir="ltr">{selected.phone}</span>
              </span>
              {selected.allergies && selected.allergies !== "لا يوجد" && (
                <span className="chip bg-coral-soft text-coral !text-[8.5px] shrink-0">حساسية</span>
              )}
            </>
          ) : (
            <>
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-jade-soft text-jade-deep shrink-0">
                <IconSearch className="w-4 h-4" />
              </span>
              <span className="flex-1 text-sm text-soft/70">ابحث عن مريض أو اختر من السجل…</span>
            </>
          )}
          <IconChevronDown className={`w-4 h-4 text-soft shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {/* زر إضافة مريض — ملاصق ومميز */}
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="btn-primary !h-auto !py-2 !px-3 !text-xs shrink-0 !rounded-lg"
          title="إضافة مريض جديد إلى السجل"
        >
          <IconUserPlus className="w-4 h-4" />
          <span className="hidden md:inline whitespace-nowrap">إضافة مريض</span>
        </button>
      </div>

      {/* اللوحة المنسدلة */}
      {open && (
        <div className="anim-pop absolute z-50 mt-1.5 inset-x-0 card !rounded-xl overflow-hidden shadow-[0_20px_50px_-15px_rgba(11,47,43,0.35)]">
          {/* البحث */}
          <div className="p-2 border-b border-line bg-mist/60">
            <div className="relative">
              <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-soft pointer-events-none">
                <IconSearch className="w-4 h-4" />
              </span>
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && list.length === 1) pick(list[0].id);
                }}
                placeholder="ابحث بالاسم أو الجوال أو المدينة…"
                className="input !h-9 !ps-8.5 !text-xs"
              />
            </div>
          </div>

          {/* القائمة */}
          <div className="max-h-64 overflow-y-auto p-1.5">
            <p className="px-2.5 py-1.5 text-[10px] font-bold text-soft">
              {q.trim() ? `نتائج البحث (${list.length})` : `السجل الكامل (${list.length} مريضاً)`}
            </p>
            {list.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p.id)}
                className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-start cursor-pointer transition-all duration-150 ${
                  p.id === value ? "bg-jade-soft" : "hover:bg-mist hover:translate-x-[-2px]"
                }`}
              >
                <Avatar name={p.name} size="w-8 h-8 text-[10px]" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-bold text-ink truncate leading-tight">{p.name}</span>
                  <span className="block text-[10px] font-semibold text-soft mt-0.5" dir="ltr">{p.phone}</span>
                </span>
                {p.city && <span className="chip bg-mist text-soft !text-[9px] shrink-0">{p.city}</span>}
                {p.allergies && p.allergies !== "لا يوجد" && (
                  <span className="chip bg-coral-soft text-coral !text-[8.5px] shrink-0">حساسية</span>
                )}
                {p.id === value && <IconCheck className="w-4 h-4 text-jade-deep shrink-0" />}
              </button>
            ))}

            {list.length === 0 && (
              <div className="text-center py-5 px-3">
                <p className="text-xs font-bold text-ink">لا نتائج {q.trim() ? `لـ «${q.trim()}»` : "في السجل"}</p>
                <p className="text-[10.5px] text-soft mt-1 leading-relaxed">يمكنك إضافة المريض مباشرة من هنا وسيُحدد تلقائياً.</p>
                <button
                  type="button"
                  onClick={() => { setShowAdd(true); setOpen(false); }}
                  className="btn-soft !h-8 !px-3 !text-[11px] mt-3"
                >
                  <IconUserPlus className="w-3.5 h-3.5" />
                  إضافة مريض جديد
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة إضافة مريض — يُحدد تلقائياً بعد الحفظ */}
      {showAdd && (
        <AddPatientModal
          open
          dispatch={dispatch}
          onClose={() => setShowAdd(false)}
          onSaved={(p) => {
            setShowAdd(false);
            onChange(p.id);
          }}
          onBook={() => undefined}
        />
      )}
    </div>
  );
}
