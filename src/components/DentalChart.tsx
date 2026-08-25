import React, { useMemo, useState } from "react";
import { TOOTH_META, type ToothStatus } from "../store";

/* الأودونتوغرام الرباعي الكلاسيكي:
   8 يمين + 8 يسار في الفك العلوي، ومثلهما في السفلي — بمواجهة المريض */
const UPPER: [number, number][] = [
  ...[18, 17, 16, 15, 14, 13, 12, 11],
  ...[21, 22, 23, 24, 25, 26, 27, 28],
].map((n, i) => [n, i] as [number, number]);
const LOWER: [number, number][] = [
  ...[48, 47, 46, 45, 44, 43, 42, 41],
  ...[31, 32, 33, 34, 35, 36, 37, 38],
].map((n, i) => [n, i] as [number, number]);

export function toothName(n: number) {
  const q = Math.floor(n / 10);
  const p = n % 10;
  const jaw = q <= 2 ? "العلوي" : "السفلي";
  const side = q === 1 || q === 4 ? "الأيمن" : "الأيسر";
  const type = p <= 2 ? "قاطع" : p === 3 ? "ناب" : p <= 5 ? "ضاحك" : "طاحن";
  return `${type} ${jaw} ${side}`;
}

const PITCH = 40;
const SIZE = 34;
const START_X = 23;
const MID_X = 340;
const UPPER_Y = 129;
const LOWER_Y = 341;
const cx = (i: number) => START_X + i * PITCH + SIZE / 2;

interface Props {
  teeth: Partial<Record<number, ToothStatus>>;
  onSet?: (tooth: number, status: ToothStatus) => void;
}

export default function DentalChart({ teeth, onSet }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { caries: 0, filled: 0, root: 0, crown: 0, missing: 0 };
    Object.values(teeth).forEach((s) => s && s !== "healthy" && c[s]++);
    return c;
  }, [teeth]);

  const status: ToothStatus = (selected && teeth[selected]) || "healthy";
  const selMeta = TOOTH_META[status];

  const ToothBox = ({ n, x, y, upper }: { n: number; x: number; y: number; upper: boolean }) => {
    const st: ToothStatus = teeth[n] ?? "healthy";
    const meta = TOOTH_META[st];
    const isSel = selected === n;
    const h = SIZE / 2;
    const k = 6.5; // نصف المربع الداخلي
    const lineColor = st === "healthy" ? "#c9dcd6" : meta.stroke;
    return (
      <g onClick={() => setSelected(n)} className="tooth-btn" style={{ transformOrigin: `${x}px ${y}px` }}>
        <title>{`سن ${n} — ${toothName(n)} (${meta.label})`}</title>
        {isSel && (
          <rect x={x - h - 4.5} y={y - h - 4.5} width={SIZE + 9} height={SIZE + 9} rx={11} fill="none" stroke="#0d8f83" strokeOpacity="0.3" strokeWidth="5" />
        )}
        {/* جسم السن */}
        <rect
          x={x - h}
          y={y - h}
          width={SIZE}
          height={SIZE}
          rx={7}
          fill={st === "missing" ? "#f4f7f6" : meta.fill}
          stroke={meta.stroke}
          strokeWidth={isSel ? 2.4 : 1.7}
          strokeDasharray={meta.dash ? "4 3" : undefined}
        />
        {st !== "missing" ? (
          <>
            {/* خطوط الأسطح الكلاسيكية (الإنسية/الوحشية/الدهليزية/اللسانية) */}
            <line x1={x - k} y1={y - k} x2={x - h + 2} y2={y - h + 2} stroke={lineColor} strokeWidth="1" strokeOpacity="0.55" />
            <line x1={x + k} y1={y - k} x2={x + h - 2} y2={y - h + 2} stroke={lineColor} strokeWidth="1" strokeOpacity="0.55" />
            <line x1={x - k} y1={y + k} x2={x - h + 2} y2={y + h - 2} stroke={lineColor} strokeWidth="1" strokeOpacity="0.55" />
            <line x1={x + k} y1={y + k} x2={x + h - 2} y2={y + h - 2} stroke={lineColor} strokeWidth="1" strokeOpacity="0.55" />
            <rect x={x - k} y={y - k} width={k * 2} height={k * 2} rx={2.5} fill={st === "crown" ? "#d5e6f5" : st === "filled" ? "#cfeae5" : "#ffffff"} stroke={st === "crown" || st === "filled" ? meta.stroke : lineColor} strokeWidth="1.2" />
            {/* علامات الحالة */}
            {st === "caries" && <circle cx={x} cy={y} r={3.6} fill="#d9503a" opacity="0.9" />}
            {st === "root" && <line x1={x} y1={y - k + 1.5} x2={x} y2={y + k - 1.5} stroke="#e2952b" strokeWidth="2.4" strokeLinecap="round" />}
            {st === "crown" && <circle cx={x} cy={y} r={2.4} fill="#3a86c4" opacity="0.9" />}
          </>
        ) : (
          <>
            <line x1={x - h + 7} y1={y - h + 7} x2={x + h - 7} y2={y + h - 7} stroke="#d9836f" strokeWidth="1.8" strokeLinecap="round" />
            <line x1={x + h - 7} y1={y - h + 7} x2={x - h + 7} y2={y + h - 7} stroke="#d9836f" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
        {/* الرقم */}
        <text
          x={x}
          y={upper ? y - h - 9 : y + h + 17}
          textAnchor="middle"
          fontSize="11.5"
          fontWeight={isSel ? 800 : 600}
          fill={isSel ? "#0a6158" : "#7d948f"}
          fontFamily="Changa"
        >
          {n}
        </text>
      </g>
    );
  };

  return (
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
      {/* الأودونتوغرام */}
      <div className="rounded-xl border border-line bg-gradient-to-b from-white to-mist/70 p-3 relative overflow-hidden">
        <div className="absolute top-2.5 start-1/2 translate-x-1/2 text-[11px] font-bold text-soft tracking-wide">الفك العلوي</div>
        <div className="absolute bottom-2.5 start-1/2 translate-x-1/2 text-[11px] font-bold text-soft tracking-wide">الفك السفلي</div>
        <svg viewBox="0 0 680 470" className="w-full h-auto select-none">
          {/* خطا المنتصف */}
          <line x1={MID_X} y1="92" x2={MID_X} y2="384" stroke="#c6d8d3" strokeWidth="1.4" strokeDasharray="2 6" strokeLinecap="round" />
          <line x1="26" y1="238" x2="654" y2="238" stroke="#c6d8d3" strokeWidth="1.4" strokeDasharray="2 6" strokeLinecap="round" />
          {/* اتجاه الجانبين */}
          <text x="34" y="230" fontSize="10.5" fontWeight="700" fill="#93a9a3" fontFamily="Changa">الأيمن</text>
          <text x="646" y="230" fontSize="10.5" fontWeight="700" fill="#93a9a3" fontFamily="Changa" textAnchor="end">الأيسر</text>

          {UPPER.map(([n, i]) => (
            <ToothBox key={n} n={n} x={cx(i)} y={UPPER_Y} upper />
          ))}
          {LOWER.map(([n, i]) => (
            <ToothBox key={n} n={n} x={cx(i)} y={LOWER_Y} upper={false} />
          ))}

          <text x={MID_X} y="452" textAnchor="middle" fontSize="10" fontWeight="600" fill="#a3b7b1">
            الرسم بمواجهة المريض — يمين المريض يظهر في يسار الشاشة
          </text>
        </svg>
        {/* مفتاح الرموز */}
        <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 pt-2.5 border-t border-line/70">
          {(Object.keys(TOOTH_META) as ToothStatus[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-soft">
              <span className={`w-2.5 h-2.5 rounded-[3px] border ${TOOTH_META[s].dash ? "border-dashed bg-white" : ""}`} style={{ borderColor: TOOTH_META[s].stroke, background: TOOTH_META[s].dash ? "#fff" : TOOTH_META[s].fill }} />
              {TOOTH_META[s].label}
            </span>
          ))}
        </div>
      </div>

      {/* لوحة الحالة */}
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-white p-4">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <p className="font-display font-bold text-lg text-ink leading-none">
                    السن <span className="text-jade-deep">{selected}</span>
                  </p>
                  <p className="text-xs text-soft mt-1.5">{toothName(selected)}</p>
                </div>
                <span className="chip" style={{ background: selMeta.fill === "#ffffff" ? "#eef4f2" : selMeta.fill, color: selMeta.stroke }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: selMeta.stroke }} />
                  {selMeta.label}
                </span>
              </div>
              <p className="label !mb-2">تغيير الحالة</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TOOTH_META) as ToothStatus[]).map((s) => {
                  const m = TOOTH_META[s];
                  const active = s === status;
                  return (
                    <button
                      key={s}
                      onClick={() => onSet?.(selected, s)}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-bold cursor-pointer transition-all ${
                        active ? "border-jade bg-jade-soft text-jade-deep shadow-sm" : "border-line bg-white text-soft hover:border-jade/50 hover:bg-mist"
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-[4px] border shrink-0 ${m.dash ? "border-dashed" : ""}`} style={{ background: s === "missing" ? "#fff" : m.fill, borderColor: m.stroke }} />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="font-display font-bold text-ink">اختر سنّاً من المخطط</p>
              <p className="text-xs text-soft mt-1.5 leading-relaxed">اضغط على أي مربع سن لعرض حالته وتحديثها — يُحفَظ التغيير في ملف المريض فوراً.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line bg-white p-4">
          <p className="label !mb-2.5">ملخص الحالة الفموية</p>
          <div className="space-y-2">
            {(["caries", "filled", "root", "crown", "missing"] as ToothStatus[]).map((s) => (
              <div key={s} className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-2 text-soft">
                  <span className="w-2.5 h-2.5 rounded-[4px]" style={{ background: TOOTH_META[s].stroke }} />
                  {TOOTH_META[s].label}
                </span>
                <span className={`font-display text-sm ${counts[s] > 0 ? "text-ink" : "text-soft/60"}`}>{counts[s]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
