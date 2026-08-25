import React, { useMemo, useState } from "react";
import { TOOTH_META, type ToothStatus } from "../store";

/* صفوف الأرباع: يمين المريض (8) ثم أيسره (8) — الأعمدة من اليمين لليسار */
const UPPER_R = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_L = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_R = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_L = [31, 32, 33, 34, 35, 36, 37, 38];
const ALL = [...UPPER_R, ...UPPER_L, ...LOWER_R, ...LOWER_L];

const CELL = 62;
const TOOTH = 54;
const X0 = 28;
const UPPER_Y = 62;
const LOWER_Y = 214;
const MID_X = X0 + 8 * CELL - (CELL - TOOTH) / 2;

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

/* رمز مصغّر لكل حالة سريرية */
function Glyph({ s, size = "w-4 h-4" }: { s: ToothStatus; size?: string }) {
  const m = TOOTH_META[s];
  return (
    <svg viewBox="0 0 20 20" className={`${size} shrink-0`} aria-hidden="true">
      <rect x="2" y="2" width="16" height="16" rx="4.5" fill={s === "missing" ? "#f4f7f6" : m.fill} stroke={m.stroke} strokeWidth="1.6" strokeDasharray={m.dash ? "3 2.4" : undefined} />
      {s === "caries" && <circle cx="10" cy="10" r="3.6" fill={m.stroke} />}
      {s === "root" && (
        <>
          <rect x="7.6" y="4.4" width="4.8" height="4.8" rx="1.2" fill={m.stroke} />
          <path d="M10 9v6.5" stroke={m.stroke} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {s === "crown" && <rect x="6" y="6" width="8" height="8" rx="2" fill="none" stroke={m.stroke} strokeWidth="1.9" />}
      {s === "missing" && <path d="m6.4 6.4 7.2 7.2m0-7.2-7.2 7.2" stroke={m.stroke} strokeWidth="2" strokeLinecap="round" />}
      {s === "filled" && <rect x="6.4" y="6.4" width="7.2" height="7.2" rx="1.6" fill={m.stroke} fillOpacity="0.4" />}
      {s === "healthy" && <path d="M6 10h8M10 6v8" stroke={m.stroke} strokeOpacity="0.55" strokeWidth="1.3" />}
    </svg>
  );
}

/* خلية سن واحدة */
function ToothCell({
  n,
  st,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  n: number;
  st: ToothStatus;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
  onHover: (n: number | null) => void;
}) {
  const x = X0 + colOf(n) * CELL;
  const upper = Math.floor(n / 10) <= 2;
  const y = upper ? UPPER_Y : LOWER_Y;
  const meta = TOOTH_META[st];
  const cx = x + TOOTH / 2;
  const cy = y + TOOTH / 2;
  const numY = upper ? y - 13 : y + TOOTH + 24;
  return (
    <g className="tooth-btn" onClick={onSelect} onMouseEnter={() => onHover(n)} onMouseLeave={() => onHover(null)}>
      {hovered && !selected && (
        <rect x={x - 4} y={y - 4} width={TOOTH + 8} height={TOOTH + 8} rx={12} fill="none" stroke="#0d8f83" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="4 3" />
      )}
      {selected && (
        <>
          <rect x={x - 8} y={y - 8} width={TOOTH + 16} height={TOOTH + 16} rx={15} fill="none" stroke="#0d8f83" strokeOpacity="0.18" strokeWidth="6" />
          <rect x={x - 4} y={y - 4} width={TOOTH + 8} height={TOOTH + 8} rx={12} fill="none" stroke="#0d8f83" strokeWidth="2.4" />
        </>
      )}
      <rect
        x={x}
        y={y}
        width={TOOTH}
        height={TOOTH}
        rx={9}
        fill={st === "missing" ? "#f4f7f6" : meta.fill}
        stroke={meta.stroke}
        strokeWidth={selected ? 2.6 : 1.8}
        strokeDasharray={meta.dash ? "5 4" : undefined}
      />
      {st !== "missing" && (
        <path d={`M ${x + 13} ${cy} H ${x + TOOTH - 13} M ${cx} ${y + 13} V ${y + TOOTH - 13}`} stroke={meta.stroke} strokeOpacity="0.42" strokeWidth="1.3" />
      )}
      {st === "caries" && <circle cx={cx} cy={cy} r={8.5} fill={meta.stroke} />}
      {st === "root" && (
        <>
          <rect x={cx - 4.5} y={y + 10} width={9} height={9} rx={2} fill={meta.stroke} />
          <path d={`M ${cx} ${y + 19} V ${y + TOOTH - 11}`} stroke={meta.stroke} strokeWidth="3.2" strokeLinecap="round" />
        </>
      )}
      {st === "crown" && <rect x={x + 10} y={y + 10} width={TOOTH - 20} height={TOOTH - 20} rx={7} fill="none" stroke={meta.stroke} strokeWidth="2.6" />}
      {st === "missing" && (
        <path
          d={`M ${x + 15} ${y + 15} L ${x + TOOTH - 15} ${y + TOOTH - 15} M ${x + TOOTH - 15} ${y + 15} L ${x + 15} ${y + TOOTH - 15}`}
          stroke={meta.stroke}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      )}
      <text x={cx} y={numY} textAnchor="middle" fontSize="15" fontWeight={selected ? 800 : 700} fill={selected ? "#0a6158" : "#627a75"} fontFamily="Changa, sans-serif">
        {n}
      </text>
    </g>
  );
}

interface Props {
  teeth: Partial<Record<number, ToothStatus>>;
  onSet?: (tooth: number, status: ToothStatus) => void;
  editorNote?: string;
}

export default function DentalChart({ teeth, onSet, editorNote = "يُحفَظ التغيير في ملف المريض فوراً." }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const counts = useMemo(() => {
    const c: Record<string, number> = { caries: 0, filled: 0, root: 0, crown: 0, missing: 0 };
    Object.values(teeth).forEach((s) => s && s !== "healthy" && c[s]++);
    return c;
  }, [teeth]);
  const issues = Object.values(counts).reduce((a, b) => a + b, 0);
  const health = Math.round(((32 - issues) / 32) * 100);
  const healthColor = health >= 80 ? "#2c9c69" : health >= 60 ? "#e2952b" : "#d9503a";

  const focus = hovered ?? selected;
  const focusStatus: ToothStatus = focus ? teeth[focus] ?? "healthy" : "healthy";
  const selStatus: ToothStatus = selected ? teeth[selected] ?? "healthy" : "healthy";

  return (
    <div className="grid xl:grid-cols-[1fr_290px] gap-5 items-start">
      {/* ====== المخطط ====== */}
      <div className="rounded-xl border border-line bg-gradient-to-b from-white to-mist/60 overflow-hidden min-w-0 shadow-[0_1px_2px_rgba(18,37,31,0.05)]">
        {/* ترويسة المخطط وأدوات التكبير */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line bg-white/70">
          <div>
            <p className="font-display font-bold text-base text-ink leading-tight">مخطط الأسنان السريري</p>
            <p className="text-[9px] font-bold text-soft mt-0.5 tracking-[0.2em]" dir="ltr">ODONTOGRAM · FDI 1–32</p>
          </div>
          <div className="flex items-center gap-1 bg-mist rounded-lg p-1" dir="ltr">
            <button
              onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
              className="w-8 h-8 rounded-md bg-white border border-line text-ink text-base font-bold cursor-pointer hover:border-jade hover:text-jade-deep transition-colors"
              aria-label="تصغير المخطط"
            >
              −
            </button>
            <span className="stat-num text-xs w-12 text-center text-ink">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.25).toFixed(2)))}
              className="w-8 h-8 rounded-md bg-white border border-line text-ink text-base font-bold cursor-pointer hover:border-jade hover:text-jade-deep transition-colors"
              aria-label="تكبير المخطط"
            >
              +
            </button>
          </div>
        </div>

        {/* منطقة الرسم — تمرير أفقي على الشاشات الضيقة مع حد أدنى يضمن الوضوح */}
        <div className="overflow-x-auto">
          <div style={{ width: `${zoom * 100}%`, minWidth: 640 }} className="transition-[width] duration-300 ease-out">
            <svg viewBox="0 0 1040 308" className="w-full h-auto block select-none" role="img" aria-label="مخطط الأسنان الرباعي">
              {/* شريط الاتجاهين */}
              <text x={X0 + 3.5 * CELL + TOOTH / 2} y={26} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#8fa6a0" fontFamily="Changa, sans-serif">
                يمين المريض
              </text>
              <text x={X0 + 11.5 * CELL + TOOTH / 2} y={26} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#8fa6a0" fontFamily="Changa, sans-serif">
                أيسر المريض
              </text>

              {/* خط المنتصف */}
              <line x1={MID_X} y1={38} x2={MID_X} y2={284} stroke="#c9dbd6" strokeWidth="1.4" strokeDasharray="3 7" strokeLinecap="round" />

              {/* فاصل الفكين */}
              <line x1={60} y1={147} x2={452} y2={147} stroke="#d8e6e1" strokeWidth="1.4" strokeDasharray="5 5" />
              <line x1={588} y1={147} x2={980} y2={147} stroke="#d8e6e1" strokeWidth="1.4" strokeDasharray="5 5" />
              <rect x={462} y={133} width={116} height={25} rx={12.5} fill="#eaf3f0" stroke="#d0e2dc" />
              <text x={520} y={150} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#4d6a63" fontFamily="Changa, sans-serif">
                الفك العلوي
              </text>

              <line x1={60} y1={189} x2={452} y2={189} stroke="#d8e6e1" strokeWidth="1.4" strokeDasharray="5 5" />
              <line x1={588} y1={189} x2={980} y2={189} stroke="#d8e6e1" strokeWidth="1.4" strokeDasharray="5 5" />
              <rect x={462} y={175} width={116} height={25} rx={12.5} fill="#eaf3f0" stroke="#d0e2dc" />
              <text x={520} y={192} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#4d6a63" fontFamily="Changa, sans-serif">
                الفك السفلي
              </text>

              {ALL.map((n) => (
                <ToothCell
                  key={n}
                  n={n}
                  st={teeth[n] ?? "healthy"}
                  selected={selected === n}
                  hovered={hovered === n}
                  onSelect={() => setSelected(n)}
                  onHover={setHovered}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* شريط المعاينة الحي */}
        <div className="px-4 py-2 border-t border-line/70 bg-white/60 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors" style={{ background: focus ? TOOTH_META[focusStatus].stroke : "#c9d8d3" }} />
          <p className="text-[11px] font-bold text-soft truncate">
            {focus ? (
              <>
                السن <span className="stat-num text-jade-deep">{focus}</span> — {toothName(focus)} — الحالة: {TOOTH_META[focusStatus].label}
                {!hovered && selected === focus && <span className="text-jade-deep"> · محدد الآن</span>}
              </>
            ) : (
              "مرّر المؤشر فوق أي سن للمعاينة — اضغط لتحديده وتغيير حالته"
            )}
          </p>
        </div>

        {/* مفتاح الرموز */}
        <div className="px-4 py-3 border-t border-line bg-white/70 flex flex-wrap items-center gap-x-4 gap-y-2">
          {(Object.keys(TOOTH_META) as ToothStatus[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-soft">
              <Glyph s={s} />
              {TOOTH_META[s].label}
            </span>
          ))}
        </div>
      </div>

      {/* ====== اللوحة الجانبية ====== */}
      <div className="space-y-4 min-w-0">
        {/* محرر الحالة */}
        <div className="rounded-xl border border-line bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-mist/50">
            <p className="font-display font-bold text-sm text-ink">حالة السن</p>
            {selected && (
              <span
                className="chip"
                style={{
                  background: TOOTH_META[selStatus].fill === "#ffffff" ? "#eef4f2" : TOOTH_META[selStatus].fill,
                  color: TOOTH_META[selStatus].stroke,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: TOOTH_META[selStatus].stroke }} />
                {TOOTH_META[selStatus].label}
              </span>
            )}
          </div>
          <div className="p-4">
            {selected ? (
              <>
                <p className="font-display font-bold text-2xl text-ink leading-none">
                  السن <span className="text-jade-deep stat-num">{selected}</span>
                </p>
                <p className="text-xs font-semibold text-soft mt-1.5">{toothName(selected)}</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {(Object.keys(TOOTH_META) as ToothStatus[]).map((s) => {
                    const active = s === selStatus;
                    return (
                      <button
                        key={s}
                        onClick={() => onSet?.(selected, s)}
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2.5 text-xs font-bold cursor-pointer transition-all ${
                          active ? "border-jade bg-jade-soft text-jade-deep shadow-sm" : "border-line bg-white text-soft hover:border-jade/50 hover:bg-mist"
                        }`}
                      >
                        <Glyph s={s} />
                        {TOOTH_META[s].label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] font-semibold text-soft mt-3.5 bg-mist rounded-lg px-3 py-2.5 leading-relaxed">{editorNote}</p>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="font-display font-bold text-sm text-ink">لم يُحدد سن بعد</p>
                <p className="text-[11px] text-soft mt-1.5 leading-relaxed">اضغط على أي سن في المخطط لعرض حالته وتحديثها.</p>
              </div>
            )}
          </div>
        </div>

        {/* مؤشر صحة الفم */}
        <div className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold text-sm text-ink">مؤشر صحة الفم</p>
            <span className="stat-num text-xl" style={{ color: healthColor }}>
              {health}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-mist overflow-hidden mt-2.5">
            <div className="h-full rounded-full anim-grow-w" style={{ width: `${health}%`, background: healthColor }} />
          </div>
          <p className="text-[10px] font-semibold text-soft mt-2">
            <span className="stat-num">{32 - issues}</span> سناً سليماً من أصل <span className="stat-num">32</span>
          </p>
          <div className="mt-4 pt-3.5 border-t border-line space-y-2.5">
            {(["caries", "filled", "root", "crown", "missing"] as ToothStatus[]).map((s) => (
              <div key={s} className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-2 text-soft">
                  <Glyph s={s} />
                  {TOOTH_META[s].label}
                </span>
                <span className={`stat-num text-sm ${counts[s] > 0 ? "text-ink" : "text-soft/50"}`}>{counts[s]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
