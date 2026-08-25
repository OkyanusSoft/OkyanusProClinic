import React, { useMemo, useState } from "react";
import { TOOTH_META, type ToothStatus } from "../store";

/* صفوف الأرباع: يمين المريض (8) ثم أيسره (8) */
const UPPER_R = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_L = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_R = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_L = [31, 32, 33, 34, 35, 36, 37, 38];

const CELL = 58, TOOTH = 48, X0 = 26;
const UPPER_Y = 58, LOWER_Y = 205;

export function toothName(n: number) {
  const q = Math.floor(n / 10);
  const p = n % 10;
  const jaw = q <= 2 ? "العلوي" : "السفلي";
  const side = q === 1 || q === 4 ? "الأيمن" : "الأيسر";
  const type = p <= 2 ? "قاطع" : p === 3 ? "ناب" : p <= 5 ? "ضاحك" : "طاحن";
  return `${type} ${jaw} ${side}`;
}

const colOf = (n: number) => {
  const p = n % 10;
  const q = Math.floor(n / 10);
  return q === 1 || q === 4 ? 8 - p : p - 1;
};

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
  const rows = [
    { label: "الفك العلوي", nums: [...UPPER_R, ...UPPER_L] },
    { label: "الفك السفلي", nums: [...LOWER_R, ...LOWER_L] },
  ];

  return (
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
      {/* المخطط */}
      <div className="rounded-xl border border-line bg-gradient-to-b from-white to-mist/70 p-3 relative overflow-hidden">
        <div className="flex items-center justify-between text-[10px] font-bold text-soft px-1">
          <span>يمين المريض</span>
          <span className="tracking-widest">ODONTOGRAM — FDI</span>
          <span>أيسر المريض</span>
        </div>
        <svg viewBox="0 0 980 320" className="w-full h-auto select-none mt-1">
          <line x1={X0 + 8 * CELL - (CELL - TOOTH) / 2} y1={44} x2={X0 + 8 * CELL - (CELL - TOOTH) / 2} y2={286} stroke="#c9dbd6" strokeWidth="1.4" strokeDasharray="3 7" strokeLinecap="round" />

          {rows.map((row, ri) => {
            const y = ri === 0 ? UPPER_Y : LOWER_Y;
            const numY = ri === 0 ? y - 12 : y + TOOTH + 22;
            return (
              <g key={row.label}>
                <text x={X0 + 8 * CELL} y={ri === 0 ? y - 30 : y + TOOTH + 44} textAnchor="middle" fontSize="12" fontWeight="800" fill="#8fa6a0" fontFamily="Changa">
                  {row.label}
                </text>
                {row.nums.map((n) => {
                  const x = X0 + colOf(n) * CELL;
                  const st: ToothStatus = teeth[n] ?? "healthy";
                  const meta = TOOTH_META[st];
                  const isSel = selected === n;
                  const cx = x + TOOTH / 2, cy = y + TOOTH / 2;
                  return (
                    <g key={n} onClick={() => setSelected(n)} className="tooth-btn" style={{ transformOrigin: `${cx}px ${cy}px` }}>
                      {isSel && <rect x={x - 5} y={y - 5} width={TOOTH + 10} height={TOOTH + 10} rx={10} fill="none" stroke="#0d8f83" strokeOpacity="0.3" strokeWidth="5" />}
                      <rect x={x} y={y} width={TOOTH} height={TOOTH} rx={8} fill={st === "missing" ? "#f4f7f6" : meta.fill} stroke={meta.stroke} strokeWidth={isSel ? 2.4 : 1.6} strokeDasharray={meta.dash ? "5 4" : undefined} />
                      {st !== "missing" && (
                        <path d={`M ${x + 11} ${cy} H ${x + TOOTH - 11} M ${cx} ${y + 11} V ${y + TOOTH - 11}`} stroke={meta.stroke} strokeOpacity="0.45" strokeWidth="1.2" />
                      )}
                      {st === "caries" && <circle cx={cx} cy={cy} r={7} fill={meta.stroke} />}
                      {st === "root" && <path d={`M ${cx} ${y + 10} V ${y + TOOTH - 10} M ${cx - 5} ${y + TOOTH - 15} H ${cx + 5}`} stroke={meta.stroke} strokeWidth="2.8" strokeLinecap="round" />}
                      {st === "crown" && <rect x={x + 9} y={y + 9} width={TOOTH - 18} height={TOOTH - 18} rx={6} fill="none" stroke={meta.stroke} strokeWidth="2.4" />}
                      {st === "missing" && <path d={`M ${x + 13} ${y + 13} L ${x + TOOTH - 13} ${y + TOOTH - 13} M ${x + TOOTH - 13} ${y + 13} L ${x + 13} ${y + TOOTH - 13}`} stroke={meta.stroke} strokeWidth="3" strokeLinecap="round" />}
                      <text x={cx} y={numY} textAnchor="middle" fontSize="13" fontWeight={isSel ? 800 : 600} fill={isSel ? "#0a6158" : "#7d948f"} fontFamily="Changa">
                        {n}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 px-1 pt-2 border-t border-line/70">
          {(Object.keys(TOOTH_META) as ToothStatus[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-soft">
              <span className={`w-3 h-3 rounded-[4px] border ${TOOTH_META[s].dash ? "border-dashed" : ""}`} style={{ background: s === "missing" ? "#fff" : TOOTH_META[s].fill, borderColor: TOOTH_META[s].stroke }} />
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
