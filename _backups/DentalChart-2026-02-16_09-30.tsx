import React, { useMemo, useState } from "react";
import { TOOTH_META, type ToothStatus } from "../store";

const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const ORDER = [...UPPER, ...LOWER];

const dim = (n: number) => {
  const p = n % 10;
  if (p <= 2) return { w: 15, h: 26 };
  if (p === 3) return { w: 16, h: 28 };
  if (p <= 5) return { w: 19, h: 26 };
  return { w: 23, h: 28 };
};

export function toothName(n: number) {
  const q = Math.floor(n / 10);
  const p = n % 10;
  const jaw = q <= 2 ? "العلوي" : "السفلي";
  const side = q === 1 || q === 4 ? "الأيمن" : "الأيسر";
  const type = p <= 2 ? "قاطع" : p === 3 ? "ناب" : p <= 5 ? "ضاحك" : "طاحن";
  return `${type} ${jaw} ${side}`;
}

const toothPath = (w: number, h: number) => {
  const r = 5;
  return `M ${-w / 2} ${-h / 2 + r} Q ${-w / 2} ${-h / 2} ${-w / 2 + r} ${-h / 2} L ${w / 2 - r} ${-h / 2} Q ${w / 2} ${-h / 2} ${w / 2} ${-h / 2 + r} L ${w / 2} ${h / 2 - r - 2} Q ${w / 2} ${h / 2} ${w / 2 - r} ${h / 2} L ${-w / 2 + r} ${h / 2} Q ${-w / 2} ${h / 2} ${-w / 2} ${h / 2 - r - 2} Z`;
};

interface Props {
  teeth: Partial<Record<number, ToothStatus>>;
  onSet?: (tooth: number, status: ToothStatus) => void;
}

export default function DentalChart({ teeth, onSet }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const positions = useMemo(() => {
    const map = new Map<number, { x: number; y: number; r: number; lx: number; ly: number }>();
    UPPER.forEach((n, i) => {
      const a = Math.PI - (i / 15) * Math.PI;
      const x = 260 + 150 * Math.cos(a);
      const y = 250 - 150 * Math.sin(a);
      map.set(n, { x, y, r: 90 - (a * 180) / Math.PI, lx: 260 + 176 * Math.cos(a), ly: 250 - 176 * Math.sin(a) });
    });
    LOWER.forEach((n, i) => {
      const a = Math.PI - (i / 15) * Math.PI;
      const x = 260 + 150 * Math.cos(a);
      const y = 215 + 150 * Math.sin(a);
      map.set(n, { x, y, r: (a * 180) / Math.PI + 90, lx: 260 + 176 * Math.cos(a), ly: 215 + 176 * Math.sin(a) });
    });
    return map;
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { caries: 0, filled: 0, root: 0, crown: 0, missing: 0 };
    Object.values(teeth).forEach((s) => s && s !== "healthy" && c[s]++);
    return c;
  }, [teeth]);

  const status: ToothStatus = (selected && teeth[selected]) || "healthy";
  const selMeta = TOOTH_META[status];

  return (
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
      {/* الرسم */}
      <div className="rounded-xl border border-line bg-gradient-to-b from-white to-mist/70 p-2 relative overflow-hidden">
        <div className="absolute top-3 start-1/2 translate-x-1/2 text-[11px] font-bold text-soft tracking-wide">الفك العلوي</div>
        <div className="absolute bottom-3 start-1/2 translate-x-1/2 text-[11px] font-bold text-soft tracking-wide">الفك السفلي</div>
        <svg viewBox="0 0 520 430" className="w-full h-auto select-none">
          {/* خط المنتصف */}
          <line x1="260" y1="100" x2="260" y2="362" stroke="#c6d8d3" strokeWidth="1.2" strokeDasharray="2 6" strokeLinecap="round" />
          <ellipse cx="260" cy="232" rx="212" ry="160" fill="none" stroke="#e2ece9" strokeWidth="1.5" strokeDasharray="3 7" />

          {ORDER.map((n) => {
            const pos = positions.get(n)!;
            const { w, h } = dim(n);
            const st: ToothStatus = teeth[n] ?? "healthy";
            const meta = TOOTH_META[st];
            const isSel = selected === n;
            return (
              <g key={n} onClick={() => setSelected(n)} className="tooth-btn" style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}>
                <g transform={`translate(${pos.x} ${pos.y}) rotate(${pos.r})`}>
                  {isSel && <path d={toothPath(w + 10, h + 10)} fill="none" stroke="#0d8f83" strokeOpacity="0.28" strokeWidth="6" />}
                  <path
                    d={toothPath(w, h)}
                    fill={st === "missing" ? "transparent" : meta.fill}
                    stroke={meta.stroke}
                    strokeWidth={isSel ? 2.4 : 1.6}
                    strokeDasharray={meta.dash ? "4 3" : undefined}
                  />
                  {st !== "missing" && (
                    <path
                      d={`M ${-w / 4} ${-h / 2 + 4.5} L 0 ${-h / 2 + 9.5} L ${w / 4} ${-h / 2 + 4.5}`}
                      fill="none"
                      stroke={meta.stroke}
                      strokeOpacity="0.55"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </g>
                <text x={pos.lx} y={pos.ly} textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fontWeight={isSel ? 800 : 600} fill={isSel ? "#0a6158" : "#7d948f"} fontFamily="Changa">
                  {n}
                </text>
              </g>
            );
          })}
        </svg>
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
              <p className="font-display font-bold text-ink">اختر سنّاً من الرسم</p>
              <p className="text-xs text-soft mt-1.5 leading-relaxed">اضغط على أي سن لعرض حالته وتحديثها — يُحفَظ التغيير في ملف المريض فوراً.</p>
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
