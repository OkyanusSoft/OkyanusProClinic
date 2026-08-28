import React, { useMemo, useState } from "react";
import { TOOTH_META, type ToothStatus } from "../store";

/* صفوف الأرباع: يمين المريض (8) ثم أيسره (8) — الأعمدة من اليمين لليسار */
const UPPER_R = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_L = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_R = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_L = [31, 32, 33, 34, 35, 36, 37, 38];
const ALL = [...UPPER_R, ...UPPER_L, ...LOWER_R, ...LOWER_L];

/* هندسة المخطط */
const CELL_W = 60;
const X0 = 30;
const CH = 34; // ارتفاع التاج
const RH = 26; // ارتفاع الجذر
const TH = CH + RH;
const UPPER_TOP = 30;
const LOWER_TOP = 118;
const BITE_Y = (UPPER_TOP + TH + LOWER_TOP) / 2; // خط الإطباق
const MID_X = X0 + 8 * CELL_W;

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

/* نوع السن حسب موقعه (يحدد العرض وعدد الشرفات والجذور) */
const toothKind = (n: number) => {
  const p = n % 10;
  if (p <= 2) return "incisor" as const;
  if (p === 3) return "canine" as const;
  if (p <= 5) return "premolar" as const;
  return "molar" as const;
};

const SHAPE: Record<ReturnType<typeof toothKind>, { w: number; cusps: number; roots: number }> = {
  incisor: { w: 30, cusps: 1, roots: 1 },
  canine: { w: 32, cusps: 1, roots: 1 },
  premolar: { w: 38, cusps: 2, roots: 1 },
  molar: { w: 46, cusps: 3, roots: 2 },
};

/* ألوان أوضح من TOOTH_META الافتراضية — تاج ملوّن واضح لكل حالة */
const STYLE: Record<ToothStatus, { fill: string; stroke: string; rootFill: string; num: string }> = {
  healthy: { fill: "#ffffff", stroke: "#93a9bd", rootFill: "#f7fafc", num: "#5c7186" },
  caries: { fill: "#f4ac9d", stroke: "#d9503a", rootFill: "#fdf1ed", num: "#c0392b" },
  filled: { fill: "#97c9ec", stroke: "#1273c4", rootFill: "#eef6fd", num: "#0b518f" },
  root: { fill: "#f6c988", stroke: "#e2952b", rootFill: "#fdf4e2", num: "#a06410" },
  crown: { fill: "#a8cdef", stroke: "#2f9fe0", rootFill: "#f2f8fd", num: "#2b6cb0" },
  missing: { fill: "none", stroke: "#a7bac7", rootFill: "none", num: "#93a5b3" },
};

/* ====== مولدات الأشكال (تُرسم باتجاه "سفلي": التاج للأعلى والجذر للأسفل) ====== */

function crownD(w: number, cusps: number): string {
  const ch = CH;
  const amp = ch * 0.13;
  const topY = ch * 0.2;
  const shoulderY = ch * 0.32;
  const neckY = ch * 0.97;
  const lx = w * 0.05,
    rx = w * 0.95;
  const nlx = w * 0.21,
    nrx = w * 0.79;
  const sl = w * 0.15,
    sr = w * 0.85;

  let d = `M ${nlx} ${neckY}`;
  d += ` C ${lx + w * 0.03} ${ch * 0.85}, ${lx} ${ch * 0.55}, ${lx + w * 0.05} ${shoulderY}`;
  d += ` Q ${lx + w * 0.06} ${topY + amp * 0.5} ${sl} ${topY}`;
  const seg = (sr - sl) / cusps;
  for (let i = 0; i < cusps; i++) {
    const x1 = sl + seg * (i + 1);
    d += ` Q ${sl + seg * i + seg / 2} ${topY - amp} ${x1} ${topY}`;
  }
  d += ` Q ${rx - w * 0.06} ${topY + amp * 0.5} ${rx - w * 0.05} ${shoulderY}`;
  d += ` C ${rx} ${ch * 0.55}, ${rx - w * 0.03} ${ch * 0.85}, ${nrx} ${neckY}`;
  d += ` Q ${w / 2} ${ch * 1.07} ${nlx} ${neckY} Z`;
  return d;
}

function rootD(w: number, count: number): string[] {
  const ch = CH;
  const rh = RH;
  const topY = ch;
  const tipY = ch + rh * 0.97;
  if (count === 1) {
    return [
      `M ${w * 0.25} ${topY}` +
        ` C ${w * 0.27} ${ch + rh * 0.42}, ${w * 0.42} ${ch + rh * 0.72}, ${w * 0.47} ${tipY}` +
        ` Q ${w * 0.5} ${tipY + rh * 0.05} ${w * 0.53} ${tipY}` +
        ` C ${w * 0.58} ${ch + rh * 0.72}, ${w * 0.73} ${ch + rh * 0.42}, ${w * 0.75} ${topY}` +
        ` Q ${w * 0.5} ${ch + rh * 0.13} ${w * 0.25} ${topY} Z`,
    ];
  }
  return [
    `M ${w * 0.18} ${topY}` +
      ` C ${w * 0.18} ${ch + rh * 0.4}, ${w * 0.27} ${ch + rh * 0.68}, ${w * 0.32} ${tipY}` +
      ` Q ${w * 0.345} ${tipY + rh * 0.05} ${w * 0.37} ${tipY}` +
      ` C ${w * 0.42} ${ch + rh * 0.6}, ${w * 0.44} ${ch + rh * 0.3}, ${w * 0.46} ${topY}` +
      ` Q ${w * 0.32} ${ch + rh * 0.09} ${w * 0.18} ${topY} Z`,
    `M ${w * 0.54} ${topY}` +
      ` C ${w * 0.56} ${ch + rh * 0.3}, ${w * 0.58} ${ch + rh * 0.6}, ${w * 0.63} ${tipY}` +
      ` Q ${w * 0.655} ${tipY + rh * 0.05} ${w * 0.68} ${tipY}` +
      ` C ${w * 0.73} ${ch + rh * 0.68}, ${w * 0.82} ${ch + rh * 0.4}, ${w * 0.82} ${topY}` +
      ` Q ${w * 0.68} ${ch + rh * 0.09} ${w * 0.54} ${topY} Z`,
  ];
}

/* ====== سن واحدة ====== */
function Tooth({
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
  const upper = Math.floor(n / 10) <= 2;
  const kind = toothKind(n);
  const { w, cusps, roots } = SHAPE[kind];
  const col = colOf(n);
  const cx = X0 + col * CELL_W + CELL_W / 2;
  const topY = upper ? UPPER_TOP : LOWER_TOP;
  const s = STYLE[st];
  const missing = st === "missing";

  const crown = useMemo(() => crownD(w, cusps), [w, cusps]);
  const rootPaths = useMemo(() => rootD(w, roots), [w, roots]);

  const numY = upper ? UPPER_TOP - 10 : LOWER_TOP + TH + 20;
  const sw = selected ? 2.4 : hovered ? 2 : 1.4;

  return (
    <g
      className="tooth-btn"
      onClick={onSelect}
      onMouseEnter={() => onHover(n)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: "pointer" }}
    >
      {/* هالة التحديد / التحويم */}
      {(selected || hovered) && (
        <circle
          cx={cx}
          cy={topY + TH / 2}
          r={w / 2 + 9}
          fill={selected ? "rgba(13,143,131,0.10)" : "rgba(13,143,131,0.05)"}
          stroke={selected ? "#1273c4" : "#2f9fe0"}
          strokeOpacity={selected ? 0.85 : 0.35}
          strokeWidth={selected ? 2 : 1.4}
          strokeDasharray={selected ? undefined : "4 3"}
        />
      )}

      <g transform={`translate(${cx - w / 2} ${topY})${upper ? ` rotate(180 ${w / 2} ${TH / 2})` : ""}`} opacity={missing ? 0.55 : 1}>
        {/* الجذور */}
        {rootPaths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={missing ? "none" : s.rootFill}
            stroke={s.stroke}
            strokeWidth={sw * 0.85}
            strokeDasharray={missing ? "4 3" : undefined}
            strokeLinejoin="round"
          />
        ))}
        {/* قناة الجذر عند علاج العصب */}
        {st === "root" && (
          <path
            d={`M ${w / 2} ${CH * 0.5} L ${w / 2} ${CH + RH * 0.8}`}
            stroke="#b9791f"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
        )}
        {/* التاج */}
        <path
          d={crown}
          fill={missing ? "none" : s.fill}
          stroke={s.stroke}
          strokeWidth={sw}
          strokeDasharray={missing ? "4 3" : undefined}
          strokeLinejoin="round"
        />

        {/* تفاصيل الحالة على التاج */}
        {!missing && st === "caries" && <circle cx={w / 2} cy={CH * 0.5} r={w * 0.14} fill="#c0392b" opacity={0.85} />}
        {!missing && st === "filled" && (
          <rect x={w * 0.36} y={CH * 0.36} width={w * 0.28} height={w * 0.28} rx={2.5} fill="#1273c4" opacity={0.85} transform={`rotate(45 ${w / 2} ${CH * 0.5})`} />
        )}
        {!missing && st === "crown" && (
          <path
            d={crown}
            fill="none"
            stroke="#2b6cb0"
            strokeWidth={1.4}
            strokeOpacity={0.55}
            transform={`translate(${w / 2} ${CH / 2}) scale(0.84) translate(${-w / 2} ${-CH / 2})`}
          />
        )}
        {/* خط الإطباق (شرفات خفيفة) للأسنان الخلفية */}
        {!missing && (kind === "premolar" || kind === "molar") && st !== "crown" && (
          <path
            d={`M ${w * 0.3} ${CH * 0.34} Q ${w * 0.5} ${CH * 0.5} ${w * 0.7} ${CH * 0.34}`}
            fill="none"
            stroke={s.stroke}
            strokeOpacity={0.4}
            strokeWidth={1.1}
          />
        )}
        {/* علامة المفقود */}
        {missing && (
          <path
            d={`M ${w * 0.28} ${CH * 0.28} L ${w * 0.72} ${CH * 0.75} M ${w * 0.72} ${CH * 0.28} L ${w * 0.28} ${CH * 0.75}`}
            stroke="#8fa3b3"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        )}
      </g>

      {/* رقم FDI — كبير وواضح مع هالة بيضاء */}
      <text
        x={cx}
        y={numY}
        textAnchor="middle"
        fontSize={15}
        fontWeight={selected ? 800 : 700}
        fontFamily="Cairo, sans-serif"
        fill={selected ? "#0b518f" : s.num}
        stroke="#ffffff"
        strokeWidth={4}
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        {n}
      </text>
    </g>
  );
}

/* ====== رمز مصغر للمفتاح (سن صغيرة بنفس الأسلوب) ====== */
function Glyph({ s, size = "w-5 h-5" }: { s: ToothStatus; size?: string }) {
  const st = STYLE[s];
  const missing = s === "missing";
  return (
    <svg viewBox="0 0 24 24" className={`${size} shrink-0`} aria-hidden="true">
      <path
        d="M9 12.5 C8 16.5 8.6 19.5 9.6 20.6 Q10 21 10.3 20.5 C10.8 19.6 11 17.5 11 15.8 Q12 15 13 15.8 C13 17.5 13.2 19.6 13.7 20.5 Q14 21 14.4 20.6 C15.4 19.5 16 16.5 15 12.5 Z"
        fill={missing ? "none" : st.rootFill}
        stroke={st.stroke}
        strokeWidth={1.3}
        strokeDasharray={missing ? "2.5 2" : undefined}
        opacity={missing ? 0.55 : 1}
      />
      <path
        d="M8 12.5 Q7.5 8 9 5.5 Q10 3.8 12 4.6 Q14 3.8 15 5.5 Q16.5 8 16 12.5 Q12 14.5 8 12.5 Z"
        fill={missing ? "none" : st.fill}
        stroke={st.stroke}
        strokeWidth={1.5}
        strokeDasharray={missing ? "2.5 2" : undefined}
        opacity={missing ? 0.55 : 1}
      />
      {!missing && s === "caries" && <circle cx={12} cy={9} r={2} fill="#c0392b" opacity={0.85} />}
      {!missing && s === "filled" && <rect x={10.6} y={7.6} width={2.8} height={2.8} rx={0.7} fill="#1273c4" opacity={0.85} transform="rotate(45 12 9)" />}
      {!missing && s === "root" && <path d="M12 7 L12 18" stroke="#b9791f" strokeWidth={1.8} strokeLinecap="round" />}
      {!missing && s === "crown" && <path d="M9.2 11.8 Q8.9 8.4 10 6.4 Q10.8 5 12 5.6 Q13.2 5 14 6.4 Q15.1 8.4 14.8 11.8 Q12 13.4 9.2 11.8 Z" fill="none" stroke="#2b6cb0" strokeWidth={1.2} strokeOpacity={0.6} />}
      {missing && <path d="M9.5 7 L14.5 11.5 M14.5 7 L9.5 11.5" stroke="#8fa3b3" strokeWidth={1.8} strokeLinecap="round" />}
    </svg>
  );
}

/* ====== المكوّن الرئيسي ====== */
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

        <div className="overflow-x-auto">
          <div style={{ width: `${zoom * 100}%`, minWidth: 760 }} className="transition-[width] duration-300 ease-out mx-auto">
            <svg viewBox="0 0 1020 212" className="w-full h-auto block select-none" role="img" aria-label="مخطط الأسنان الرباعي">
              {/* اتجاهات المريض */}
              <text x={X0 + 4 * CELL_W} y={16} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#8fa3b3" fontFamily="Cairo, sans-serif">
                يمين المريض
              </text>
              <text x={X0 + 12 * CELL_W} y={16} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#8fa3b3" fontFamily="Cairo, sans-serif">
                أيسر المريض
              </text>

              {/* خط المنتصف بين الربعين */}
              <line x1={MID_X} y1={26} x2={MID_X} y2={200} stroke="#c9dbea" strokeWidth="1.4" strokeDasharray="3 7" strokeLinecap="round" />

              {/* خط الإطباق */}
              <line x1={X0} y1={BITE_Y} x2={X0 + 16 * CELL_W} y2={BITE_Y} stroke="#dbe7f1" strokeWidth="1.2" strokeDasharray="6 6" />
              <rect x={MID_X - 52} y={BITE_Y - 11} width={104} height="22" rx={11} fill="#eaf2f9" stroke="#d0e2f0" />
              <text x={MID_X} y={BITE_Y + 4} textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#3d5a75" fontFamily="Cairo, sans-serif">
                خط الإطباق
              </text>

              {ALL.map((n, i) => (
                <Tooth
                  key={n}
                  n={n}
                  st={teeth[n] ?? "healthy"}
                  selected={selected === n}
                  hovered={hovered === n}
                  onSelect={() => setSelected(n)}
                  onHover={setHovered}
                />
              ))}

              {/* علامتا الفكين */}
              <text x={12} y={UPPER_TOP + TH / 2 + 4} fontSize="11" fontWeight="800" fill="#a7bac7" fontFamily="Cairo, sans-serif">
                علوي
              </text>
              <text x={12} y={LOWER_TOP + TH / 2 + 4} fontSize="11" fontWeight="800" fill="#a7bac7" fontFamily="Cairo, sans-serif">
                سفلي
              </text>
            </svg>
          </div>
        </div>

        {/* شريط المعاينة الحي */}
        <div className="px-4 py-2 border-t border-line/70 bg-white/60 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors" style={{ background: focus ? STYLE[focusStatus].stroke : "#c9d8e6" }} />
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
        <div className="rounded-xl border border-line bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-mist/50">
            <p className="font-display font-bold text-sm text-ink">حالة السن</p>
            {selected && (
              <span
                className="chip"
                style={{
                  background: STYLE[selStatus].fill === "none" ? "#eef2f5" : STYLE[selStatus].fill,
                  color: STYLE[selStatus].stroke,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: STYLE[selStatus].stroke }} />
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
