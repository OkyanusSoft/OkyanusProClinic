import React, { useMemo, useState } from "react";
import {
  TOOTH_META,
  TOOTH_STATUS_ORDER,
  WORK_META,
  dentitionOf,
  type DentitionMode,
  type ToothStatus,
  type WorkKind,
} from "../store";

/* ============================== هندسة الفئتين ============================== */

const ADULT = {
  upperR: [18, 17, 16, 15, 14, 13, 12, 11],
  upperL: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerR: [48, 47, 46, 45, 44, 43, 42, 41],
  lowerL: [31, 32, 33, 34, 35, 36, 37, 38],
  cols: 16,
  sub: "ODONTOGRAM · FDI 1–32",
  label: (n: number) => String(n % 10),
  name: (n: number) => {
    const q = Math.floor(n / 10);
    const p = n % 10;
    const jaw = q <= 2 ? "العلوي" : "السفلي";
    const side = q === 1 || q === 4 ? "الأيمن" : "الأيسر";
    const type = p <= 2 ? "قاطع" : p === 3 ? "ناب" : p <= 5 ? "ضاحك" : "طاحن";
    return `${type} ${jaw} ${side}`;
  },
  shape: (n: number) => {
    const p = n % 10;
    if (p <= 2) return { w: 30, cusps: 1, roots: 1 };
    if (p === 3) return { w: 32, cusps: 1, roots: 1 };
    if (p <= 5) return { w: 38, cusps: 2, roots: 1 };
    return { w: 46, cusps: 3, roots: 2 };
  },
};

const CHILD = {
  upperR: [55, 54, 53, 52, 51],
  upperL: [61, 62, 63, 64, 65],
  lowerR: [85, 84, 83, 82, 81],
  lowerL: [71, 72, 73, 74, 75],
  cols: 10,
  sub: "PRIMARY DENTITION · A–E",
  label: (n: number) => "ABCDE"[(n % 10) - 1] ?? "",
  name: (n: number) => {
    const q = Math.floor(n / 10);
    const p = n % 10;
    const jaw = q === 5 || q === 8 ? "العلوي" : "السفلي";
    const side = q === 5 || q === 8 ? "الأيمن" : "الأيسر";
    const type = p <= 2 ? "قاطع" : p === 3 ? "ناب" : p === 4 ? "طاحن أول" : "طاحن ثانٍ";
    return `${type} ${jaw} ${side}`;
  },
  shape: (n: number) => {
    const p = n % 10;
    if (p <= 2) return { w: 32, cusps: 1, roots: 1 };
    if (p === 3) return { w: 34, cusps: 1, roots: 1 };
    if (p === 4) return { w: 42, cusps: 2, roots: 1 };
    return { w: 46, cusps: 3, roots: 2 };
  },
};

const MODES = { adult: ADULT, child: CHILD } as const;

/* ============================== الألوان ============================== */

const STYLE: Record<ToothStatus, { fill: string; stroke: string; rootFill: string; num: string }> = {
  healthy: { fill: "#ffffff", stroke: "#93a9bd", rootFill: "#f7fafc", num: "#5c7186" },
  caries: { fill: "#f4ac9d", stroke: "#d9503a", rootFill: "#fdf1ed", num: "#c0392b" },
  filled: { fill: "#97c9ec", stroke: "#1273c4", rootFill: "#eef6fd", num: "#0b518f" },
  root: { fill: "#f6c988", stroke: "#e2952b", rootFill: "#fdf4e2", num: "#a06410" },
  prosthetic: { fill: "#a8c3e8", stroke: "#0b518f", rootFill: "#eef4fc", num: "#0b518f" },
  ortho: { fill: "#d3c2ee", stroke: "#8e5ac8", rootFill: "#f6f1fc", num: "#7a44bd" },
  crown: { fill: "#a8cdef", stroke: "#2f9fe0", rootFill: "#f2f8fd", num: "#2b6cb0" },
  missing: { fill: "none", stroke: "#a7bac7", rootFill: "none", num: "#93a5b3" },
};

/* ============================== مولدات الأشكال ============================== */

const CH = 34;
const RH = 26;
const TH = CH + RH;

function crownD(w: number, cusps: number): string {
  const ch = CH;
  const amp = ch * 0.13;
  const topY = ch * 0.2;
  const shoulderY = ch * 0.32;
  const neckY = ch * 0.97;
  const lx = w * 0.05, rx = w * 0.95;
  const nlx = w * 0.21, nrx = w * 0.79;
  const sl = w * 0.15, sr = w * 0.85;
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
  const ch = CH, rh = RH;
  const topY = ch;
  const tipY = ch + rh * 0.97;
  if (count === 1) {
    return [
      `M ${w * 0.25} ${topY} C ${w * 0.27} ${ch + rh * 0.42}, ${w * 0.42} ${ch + rh * 0.72}, ${w * 0.47} ${tipY} Q ${w * 0.5} ${tipY + rh * 0.05} ${w * 0.53} ${tipY} C ${w * 0.58} ${ch + rh * 0.72}, ${w * 0.73} ${ch + rh * 0.42}, ${w * 0.75} ${topY} Q ${w * 0.5} ${ch + rh * 0.13} ${w * 0.25} ${topY} Z`,
    ];
  }
  return [
    `M ${w * 0.18} ${topY} C ${w * 0.18} ${ch + rh * 0.4}, ${w * 0.27} ${ch + rh * 0.68}, ${w * 0.32} ${tipY} Q ${w * 0.345} ${tipY + rh * 0.05} ${w * 0.37} ${tipY} C ${w * 0.42} ${ch + rh * 0.6}, ${w * 0.44} ${ch + rh * 0.3}, ${w * 0.46} ${topY} Q ${w * 0.32} ${ch + rh * 0.09} ${w * 0.18} ${topY} Z`,
    `M ${w * 0.54} ${topY} C ${w * 0.56} ${ch + rh * 0.3}, ${w * 0.58} ${ch + rh * 0.6}, ${w * 0.63} ${tipY} Q ${w * 0.655} ${tipY + rh * 0.05} ${w * 0.68} ${tipY} C ${w * 0.73} ${ch + rh * 0.68}, ${w * 0.82} ${ch + rh * 0.4}, ${w * 0.82} ${topY} Q ${w * 0.68} ${ch + rh * 0.09} ${w * 0.54} ${topY} Z`,
  ];
}

/* ============================== سن واحدة ============================== */

function Tooth({
  n,
  mode,
  st,
  cx,
  topY,
  selected,
  hovered,
  workKind,
  onClick,
  onHover,
}: {
  n: number;
  mode: DentitionMode;
  st: ToothStatus;
  cx: number;
  topY: number;
  selected: boolean;
  hovered: boolean;
  workKind?: string | null;
  onClick: () => void;
  onHover: (n: number | null) => void;
}) {
  const M = MODES[mode];
  const upper = Math.floor(n / 10) <= 2 || Math.floor(n / 10) === 5 || Math.floor(n / 10) === 6;
  const { w, cusps, roots } = M.shape(n);
  const s = STYLE[st];
  const missing = st === "missing";
  const crown = useMemo(() => crownD(w, cusps), [w, cusps]);
  const rootPaths = useMemo(() => rootD(w, roots), [w, roots]);
  const sw = selected ? 2.4 : hovered ? 2 : 1.4;
  const numY = upper ? topY - 10 : topY + TH + 20;
  /* لون شارة العمل من اسم الفئة (حسب الكلمة المفتاحية) */
  const catColor = (c: string): string =>
    c.includes("قلع") ? "#d9503a" :
    c.includes("حشو") ? "#1273c4" :
    c.includes("عصب") ? "#e2952b" :
    c.includes("تركيب") ? "#2f9fe0" :
    c.includes("تقويم") ? "#2c9c69" : "#5c7186";
  const wk = workKind ? { color: catColor(workKind) } : null;

  return (
    <g
      className="tooth-btn"
      onClick={onClick}
      onMouseEnter={() => onHover(n)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: "pointer" }}
    >
      {(selected || hovered) && (
        <circle
          cx={cx}
          cy={topY + TH / 2}
          r={w / 2 + 9}
          fill={selected ? "rgba(18,115,196,0.10)" : "rgba(47,159,224,0.05)"}
          stroke={selected ? "#1273c4" : "#2f9fe0"}
          strokeOpacity={selected ? 0.85 : 0.35}
          strokeWidth={selected ? 2 : 1.4}
          strokeDasharray={selected ? undefined : "4 3"}
        />
      )}
      <g transform={`translate(${cx - w / 2} ${topY})${upper ? ` rotate(180 ${w / 2} ${TH / 2})` : ""}`} opacity={missing ? 0.55 : 1}>
        {rootPaths.map((d, i) => (
          <path key={i} d={d} fill={missing ? "none" : s.rootFill} stroke={s.stroke} strokeWidth={sw * 0.85} strokeDasharray={missing ? "4 3" : undefined} strokeLinejoin="round" />
        ))}
        {st === "root" && <path d={`M ${w / 2} ${CH * 0.5} L ${w / 2} ${CH + RH * 0.8}`} stroke="#b9791f" strokeWidth={3} strokeLinecap="round" fill="none" />}
        <path d={crown} fill={missing ? "none" : s.fill} stroke={s.stroke} strokeWidth={sw} strokeDasharray={missing ? "4 3" : undefined} strokeLinejoin="round" />
        {!missing && st === "caries" && <circle cx={w / 2} cy={CH * 0.5} r={w * 0.14} fill="#c0392b" opacity={0.85} />}
        {!missing && st === "filled" && (
          <rect x={w * 0.36} y={CH * 0.36} width={w * 0.28} height={w * 0.28} rx={2.5} fill="#1273c4" opacity={0.85} transform={`rotate(45 ${w / 2} ${CH * 0.5})`} />
        )}
        {!missing && st === "crown" && (
          <path d={crown} fill="none" stroke="#2b6cb0" strokeWidth={1.4} strokeOpacity={0.55} transform={`translate(${w / 2} ${CH / 2}) scale(0.84) translate(${-w / 2} ${-CH / 2})`} />
        )}
        {/* تركيب: جسر/دعامة — شريط أفقي */}
        {!missing && st === "prosthetic" && (
          <>
            <rect x={w * 0.22} y={CH * 0.42} width={w * 0.56} height={CH * 0.18} rx={CH * 0.09} fill="#0b518f" opacity={0.8} />
            <rect x={w * 0.22} y={CH * 0.42} width={w * 0.56} height={CH * 0.18} rx={CH * 0.09} fill="none" stroke="#ffffff" strokeWidth={1} strokeOpacity={0.7} />
          </>
        )}
        {/* تقويم: حاصرة (براكت) مع سلك */}
        {!missing && st === "ortho" && (
          <>
            <path d={`M ${w * 0.12} ${CH * 0.5} L ${w * 0.88} ${CH * 0.5}`} stroke="#8e5ac8" strokeWidth={1.6} strokeLinecap="round" />
            <rect x={w / 2 - w * 0.11} y={CH * 0.5 - w * 0.11} width={w * 0.22} height={w * 0.22} rx={2} fill="#8e5ac8" stroke="#ffffff" strokeWidth={1} />
          </>
        )}
        {missing && (
          <path d={`M ${w * 0.28} ${CH * 0.28} L ${w * 0.72} ${CH * 0.75} M ${w * 0.72} ${CH * 0.28} L ${w * 0.28} ${CH * 0.75}`} stroke="#8fa3b3" strokeWidth={2.4} strokeLinecap="round" />
        )}
        {/* شارة العمل المخطط له */}
        {wk && !missing && <circle cx={w * 0.82} cy={CH * 0.3} r={w * 0.13} fill={wk.color} stroke="#fff" strokeWidth={1.2} />}
      </g>
      <text
        x={cx}
        y={numY}
        textAnchor="middle"
        fontSize={mode === "child" ? 17 : 15}
        fontWeight={selected ? 800 : 700}
        fontFamily="Cairo, sans-serif"
        fill={selected ? "#0b518f" : s.num}
        stroke="#ffffff"
        strokeWidth={4}
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        {M.label(n)}
      </text>
    </g>
  );
}

/* ============================== رمز المفتاح ============================== */

function Glyph({ s, size = "w-5 h-5" }: { s: ToothStatus; size?: string }) {
  const st = STYLE[s];
  const missing = s === "missing";
  return (
    <svg viewBox="0 0 24 24" className={`${size} shrink-0`} aria-hidden="true">
      <path
        d="M9 12.5 C8 16.5 8.6 19.5 9.6 20.6 Q10 21 10.3 20.5 C10.8 19.6 11 17.5 11 15.8 Q12 15 13 15.8 C13 17.5 13.2 19.6 13.7 20.5 Q14 21 14.4 20.6 C15.4 19.5 16 16.5 15 12.5 Z"
        fill={missing ? "none" : st.rootFill} stroke={st.stroke} strokeWidth={1.3} strokeDasharray={missing ? "2.5 2" : undefined} opacity={missing ? 0.55 : 1}
      />
      <path
        d="M8 12.5 Q7.5 8 9 5.5 Q10 3.8 12 4.6 Q14 3.8 15 5.5 Q16.5 8 16 12.5 Q12 14.5 8 12.5 Z"
        fill={missing ? "none" : st.fill} stroke={st.stroke} strokeWidth={1.5} strokeDasharray={missing ? "2.5 2" : undefined} opacity={missing ? 0.55 : 1}
      />
      {!missing && s === "caries" && <circle cx={12} cy={9} r={2} fill="#c0392b" opacity={0.85} />}
      {!missing && s === "filled" && <rect x={10.6} y={7.6} width={2.8} height={2.8} rx={0.7} fill="#1273c4" opacity={0.85} transform="rotate(45 12 9)" />}
      {!missing && s === "root" && <path d="M12 7 L12 18" stroke="#b9791f" strokeWidth={1.8} strokeLinecap="round" />}
      {!missing && s === "crown" && <path d="M9.2 11.8 Q8.9 8.4 10 6.4 Q10.8 5 12 5.6 Q13.2 5 14 6.4 Q15.1 8.4 14.8 11.8 Q12 13.4 9.2 11.8 Z" fill="none" stroke="#2b6cb0" strokeWidth={1.2} strokeOpacity={0.6} />}
      {!missing && s === "prosthetic" && <rect x={9} y={8.2} width={6} height={2} rx={1} fill="#0b518f" opacity={0.85} />}
      {!missing && s === "ortho" && (
        <>
          <path d="M8.5 9.2 L15.5 9.2" stroke="#8e5ac8" strokeWidth={1.3} strokeLinecap="round" />
          <rect x={10.9} y={8.1} width={2.2} height={2.2} rx={0.5} fill="#8e5ac8" stroke="#fff" strokeWidth={0.7} />
        </>
      )}
      {missing && <path d="M9.5 7 L14.5 11.5 M14.5 7 L9.5 11.5" stroke="#8fa3b3" strokeWidth={1.8} strokeLinecap="round" />}
    </svg>
  );
}

/* ============================== المكوّن الرئيسي ============================== */

interface Props {
  teeth: Partial<Record<number, ToothStatus>>;
  age?: number;
  mode?: DentitionMode;
  onSet?: (tooth: number, status: ToothStatus) => void;
  editorNote?: string;
  multiSelect?: boolean;
  selection?: number[];
  onToggle?: (n: number) => void;
  workBadges?: Partial<Record<number, string>>;
}

export default function DentalChart({
  teeth,
  age,
  mode: modeProp,
  onSet,
  editorNote = "يُحفَظ التغيير في ملف المريض فوراً.",
  multiSelect = false,
  selection = [],
  onToggle,
  workBadges = {},
}: Props) {
  const mode: DentitionMode = modeProp ?? dentitionOf(age ?? 30);
  const M = MODES[mode];
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const X0 = 30;
  const CELL_W = (1020 - X0 * 2) / M.cols;
  const UPPER_TOP = 30;
  const LOWER_TOP = 118;
  const BITE_Y = (UPPER_TOP + TH + LOWER_TOP) / 2;
  const MID_X = X0 + (M.cols / 2) * CELL_W;

  const layout = useMemo(() => {
    const upperRow = [...M.upperR, ...M.upperL];
    const lowerRow = [...M.lowerR, ...M.lowerL];
    return [
      ...upperRow.map((n, col) => ({ n, col, upper: true })),
      ...lowerRow.map((n, col) => ({ n, col, upper: false })),
    ];
  }, [M]);

  const totalTeeth = mode === "child" ? 20 : 32;
  const counts = useMemo(() => {
    const c: Record<string, number> = { caries: 0, filled: 0, root: 0, prosthetic: 0, ortho: 0, crown: 0, missing: 0 };
    Object.values(teeth).forEach((s) => s && s !== "healthy" && (c[s] = (c[s] ?? 0) + 1));
    return c;
  }, [teeth]);
  const issues = Object.values(counts).reduce((a, b) => a + b, 0);
  const health = Math.round(((totalTeeth - issues) / totalTeeth) * 100);
  const healthColor = health >= 80 ? "#2c9c69" : health >= 60 ? "#e2952b" : "#d9503a";

  const [active, setActive] = useState<number | null>(null);
  const focus = hovered ?? selected ?? active;
  const focusStatus: ToothStatus = focus ? teeth[focus] ?? "healthy" : "healthy";
  const statusTarget = multiSelect ? active : selected;
  const selStatus: ToothStatus = statusTarget ? teeth[statusTarget] ?? "healthy" : "healthy";

  const handleClick = (n: number) => {
    setActive(n);
    if (multiSelect && onToggle) onToggle(n);
    else setSelected(n);
  };

  return (
    <div className="space-y-5 min-w-0">
      <div className="grid xl:grid-cols-[1fr_300px] gap-5 items-start min-w-0">
      <div className="rounded-xl border border-line bg-gradient-to-b from-white to-mist/60 overflow-hidden min-w-0 shadow-[0_1px_2px_rgba(19,42,64,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-line bg-white/70">
          <div>
            <p className="font-display font-bold text-base text-ink leading-tight">
              مخطط الأسنان السريري
              <span className={`ms-2.5 chip ${mode === "child" ? "bg-amber-soft text-[#a06410]" : "bg-sky-soft text-sky"} !text-[9px]`}>
                {mode === "child" ? "أسنان لبنية · أطفال" : "أسنان دائمة · بالغون"}
              </span>
            </p>
            <p className="text-[9px] font-bold text-soft mt-0.5 tracking-[0.2em]" dir="ltr">{M.sub}</p>
          </div>
          <div className="flex items-center gap-1 bg-mist rounded-lg p-1" dir="ltr">
            <button onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))} className="w-8 h-8 rounded-md bg-white border border-line text-ink text-base font-bold cursor-pointer hover:border-jade hover:text-jade-deep transition-colors" aria-label="تصغير">−</button>
            <span className="stat-num text-xs w-12 text-center text-ink">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.25).toFixed(2)))} className="w-8 h-8 rounded-md bg-white border border-line text-ink text-base font-bold cursor-pointer hover:border-jade hover:text-jade-deep transition-colors" aria-label="تكبير">+</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div style={{ width: `${zoom * 100}%`, minWidth: mode === "child" ? 560 : 760 }} className="transition-[width] duration-300 ease-out mx-auto">
            <svg viewBox={`0 0 1020 212`} className="w-full h-auto block select-none" role="img" aria-label="مخطط الأسنان">
              <text x={X0 + (M.cols / 4) * CELL_W} y={16} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#8fa3b3" fontFamily="Cairo, sans-serif">يمين المريض</text>
              <text x={X0 + (M.cols * 3 / 4) * CELL_W} y={16} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#8fa3b3" fontFamily="Cairo, sans-serif">أيسر المريض</text>
              <line x1={MID_X} y1={26} x2={MID_X} y2={200} stroke="#c9dbea" strokeWidth="1.4" strokeDasharray="3 7" strokeLinecap="round" />
              <line x1={X0} y1={BITE_Y} x2={X0 + M.cols * CELL_W} y2={BITE_Y} stroke="#dbe7f1" strokeWidth="1.2" strokeDasharray="6 6" />
              <rect x={MID_X - 52} y={BITE_Y - 11} width={104} height="22" rx={11} fill="#eaf2f9" stroke="#d0e2f0" />
              <text x={MID_X} y={BITE_Y + 4} textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#3d5a75" fontFamily="Cairo, sans-serif">خط الإطباق</text>

              {layout.map(({ n, col, upper }) => (
                <Tooth
                  key={n}
                  n={n}
                  mode={mode}
                  st={teeth[n] ?? "healthy"}
                  cx={X0 + col * CELL_W + CELL_W / 2}
                  topY={upper ? UPPER_TOP : LOWER_TOP}
                  selected={multiSelect ? selection.includes(n) : selected === n}
                  hovered={hovered === n}
                  workKind={workBadges[n] ?? null}
                  onClick={() => handleClick(n)}
                  onHover={setHovered}
                />
              ))}

              <text x={12} y={UPPER_TOP + TH / 2 + 4} fontSize="11" fontWeight="800" fill="#a7bac7" fontFamily="Cairo, sans-serif">علوي</text>
              <text x={12} y={LOWER_TOP + TH / 2 + 4} fontSize="11" fontWeight="800" fill="#a7bac7" fontFamily="Cairo, sans-serif">سفلي</text>
            </svg>
          </div>
        </div>

        <div className="px-4 py-2 border-t border-line/70 bg-white/60 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors" style={{ background: focus ? STYLE[focusStatus].stroke : "#c9d8e6" }} />
          <p className="text-[11px] font-bold text-soft truncate">
            {focus ? (
              <>
                السن <span className="stat-num text-jade-deep">{mode === "child" ? M.label(focus) : focus}</span> — {M.name(focus)} — {TOOTH_META[focusStatus].label}
                {workBadges[focus] && <span className="text-[#a06410]"> · عمل مخطط: {workBadges[focus]}</span>}
              </>
            ) : multiSelect ? (
              "اضغط على الأسنان لتحديدها (يمكن اختيار أكثر من سن)"
            ) : (
              "مرّر المؤشر فوق أي سن للمعاينة — اضغط لتحديده وتغيير حالته"
            )}
          </p>
        </div>

        <div className="px-4 py-3 border-t border-line bg-white/70 flex flex-wrap items-center gap-x-4 gap-y-2">
          {TOOTH_STATUS_ORDER.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-soft">
              <Glyph s={s} />
              {TOOTH_META[s].label}
            </span>
          ))}
        </div>
      </div>

      {/* اللوحة الجانبية: حالة السن ← الأسنان المحددة ← مؤشر الصحة */}
      <div className="space-y-4 min-w-0">
        {/* 1) حالة السن */}
        <div className="rounded-xl border border-line bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-mist/50">
            <p className="font-display font-bold text-sm text-ink">حالة السن</p>
            {statusTarget && (
              <span className="chip" style={{ background: STYLE[selStatus].fill === "none" ? "#eef2f5" : STYLE[selStatus].fill, color: STYLE[selStatus].stroke }}>
                <span className="w-2 h-2 rounded-full" style={{ background: STYLE[selStatus].stroke }} />
                {TOOTH_META[selStatus].label}
              </span>
            )}
          </div>
          <div className="p-4">
            {statusTarget ? (
              <>
                <p className="font-display font-bold text-2xl text-ink leading-none">
                  السن <span className="text-jade-deep stat-num">{mode === "child" ? M.label(statusTarget) : statusTarget}</span>
                </p>
                <p className="text-xs font-semibold text-soft mt-1.5">{M.name(statusTarget)}</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {TOOTH_STATUS_ORDER.map((s) => {
                    const isActive = s === selStatus;
                    return (
                      <button
                        key={s}
                        onClick={() => onSet?.(statusTarget, s)}
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2.5 text-xs font-bold cursor-pointer transition-all ${
                          isActive ? "border-jade bg-jade-soft text-jade-deep shadow-sm ring-1 ring-jade/40" : "border-line bg-white text-soft hover:border-jade/50 hover:bg-mist hover:-translate-y-px"
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

        {/* 2) الأسنان المحددة — في وضع الاختيار المتعدد */}
        {multiSelect && (
          <div className="rounded-xl border border-line bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-mist/50">
              <p className="font-display font-bold text-sm text-ink">الأسنان المحددة</p>
              <span className="chip bg-sky-soft text-sky stat-num">{selection.length}</span>
            </div>
            <div className="p-4">
              {selection.length === 0 ? (
                <p className="text-[11px] text-soft leading-relaxed">لم تُحدد أسناناً بعد — اضغط على الأسنان في المخطط لتحديد العمل عليها.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selection.map((n) => (
                    <button key={n} onClick={() => onToggle?.(n)} className="chip bg-sky-soft text-sky hover:bg-coral-soft hover:text-coral transition-colors stat-num !text-xs" title="إزالة">
                      {mode === "child" ? M.label(n) : n} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        </div>
      </div>

      {/* 3) مؤشر صحة الأسنان — شريط أفقي أسفل المخطط */}
      <div className="rounded-xl border border-line bg-white overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 px-5 py-4">
          {/* النسبة */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r="27" fill="none" stroke="#e9f1f9" strokeWidth="7" />
                <circle
                  cx="32" cy="32" r="27" fill="none"
                  stroke={healthColor} strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${(health / 100) * 169.6} 169.6`}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center stat-num font-bold text-base" style={{ color: healthColor }}>
                {health}%
              </span>
            </div>
            <div>
              <p className="font-display font-bold text-sm text-ink leading-tight">مؤشر صحة الأسنان</p>
              <p className="text-[11px] font-semibold text-soft mt-0.5">
                <span className="stat-num text-ink">{totalTeeth - issues}</span> سليماً من <span className="stat-num text-ink">{totalTeeth}</span>
                <span className="mx-1.5">·</span>
                <span className="stat-num" style={{ color: healthColor }}>{issues}</span> تحتاج تدخلاً
              </p>
            </div>
          </div>

          {/* الشريط التقدمي */}
          <div className="flex-1 min-w-40">
            <div className="h-2.5 rounded-full bg-mist overflow-hidden">
              <div className="h-full rounded-full anim-grow-w transition-all duration-700" style={{ width: `${health}%`, background: `linear-gradient(90deg, ${healthColor}, ${healthColor}cc)` }} />
            </div>
            <div className="flex justify-between mt-1.5 text-[9px] font-bold text-soft/70 stat-num" dir="ltr">
              <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>

          {/* عدّادات الحالات — أفقية */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {TOOTH_STATUS_ORDER.filter((s) => s !== "healthy").map((s) => {
              const n = counts[s] ?? 0;
              return (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                    n > 0 ? "border-transparent" : "border-line text-soft/50 bg-white"
                  }`}
                  style={n > 0 ? { background: `${STYLE[s].stroke}14`, color: STYLE[s].stroke } : undefined}
                >
                  <Glyph s={s} size="w-4 h-4" />
                  {TOOTH_META[s].label}
                  <span className="stat-num">{n}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
