import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { IconAlert, IconCheck, IconChevronDown, IconPlus, IconTrash, IconX } from "../icons";
import { loadPrefs } from "../prefs";

/* ============================ Toasts ============================ */

export type ToastTone = "success" | "error" | "info" | "warn";
interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  desc?: string;
  dur?: number;
}
const ToastCtx = createContext<{ push: (tone: ToastTone, title: string, desc?: string) => void } | null>(null);

const toneMeta: Record<ToastTone, { bar: string; icon: React.ReactNode; iconBg: string }> = {
  success: { bar: "#2c9c69", icon: <IconCheck className="w-4 h-4" />, iconBg: "bg-mint-soft text-[#1d6b47]" },
  error: { bar: "#d9503a", icon: <IconX className="w-4 h-4" />, iconBg: "bg-coral-soft text-coral" },
  info: { bar: "#0d8f83", icon: <IconCheck className="w-4 h-4" />, iconBg: "bg-jade-soft text-jade-deep" },
  warn: { bar: "#e2952b", icon: <IconAlert className="w-4 h-4" />, iconBg: "bg-amber-soft text-[#a06410]" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: ToastTone, title: string, desc?: string) => {
    const id = Math.random().toString(36).slice(2);
    const dur = loadPrefs().toastDur;
    setToasts((t) => [...t.slice(-3), { id, tone, title, desc, dur }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), dur);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-5 start-5 z-[90] flex flex-col gap-2.5 w-[min(340px,calc(100vw-40px))]">
        {toasts.map((t) => {
          const m = toneMeta[t.tone];
          return (
            <div key={t.id} className="anim-pop relative overflow-hidden card !rounded-lg !border-0 shadow-[0_14px_36px_-10px_rgba(11,47,43,0.35)] bg-pine text-white">
              <div className="flex items-start gap-3 p-3.5 pe-9">
                <span className={`mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${m.iconBg}`}>{m.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">{t.title}</p>
                  {t.desc && <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{t.desc}</p>}
                </div>
              </div>
              <button
                onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                className="absolute top-2.5 end-2.5 text-white/50 hover:text-white cursor-pointer"
                aria-label="إغلاق"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-0 start-0 h-[3px]" style={{ background: m.bar, animation: `toastbar ${(t.dur ?? 3600)}ms linear forwards` }} />
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast outside provider");
  return ctx;
}

/* ============================ Modal ============================ */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-pine/55 backdrop-blur-[2px] anim-overlay" onClick={onClose} />
      <div className={`anim-pop relative w-full ${width} card !rounded-2xl !border-0 shadow-2xl max-h-[92vh] flex flex-col`}>
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
          <div>
            <h3 className="font-display font-bold text-lg text-ink leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-soft mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="icon-btn -me-2" aria-label="إغلاق">
            <IconX />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line bg-mist/60 rounded-b-2xl flex items-center justify-end gap-2.5">{footer}</div>}
      </div>
    </div>
  );
}

/* ============================ Dropdown ============================ */

export function Drop({
  button,
  children,
  align = "end",
  panelCls = "",
  direction = "down",
  fixed = false,
}: {
  button: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  panelCls?: string;
  /** اتجاه الفتح: لأعلى فوق الزر أو لأسفل تحته */
  direction?: "up" | "down";
  /** عند التفعيل تُعرض اللوحة بموضع fixed محسوب — تهرب من أي قصّ سببه overflow في الأسلاف (مثل الجداول) */
  fixed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const compute = useCallback(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const gap = 8;
    const p: { top?: number; bottom?: number; left?: number; right?: number } = {};
    if (direction === "up") p.bottom = window.innerHeight - r.top + gap;
    else p.top = r.bottom + gap;
    if (align === "end") p.right = window.innerWidth - r.right;
    else p.left = r.left;
    setPos(p);
  }, [direction, align]);

  const toggle = useCallback(() => {
    setOpen((o) => {
      if (!o) compute();
      return !o;
    });
  }, [compute]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    // أي تمرير أو تغيير حجم أثناء الفتح يغلق اللوحة كي لا تظل عائمة في موضع قديم
    const onMove = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  const panelBase = `anim-pop z-[80] card !rounded-xl p-1.5 min-w-48 shadow-[0_18px_44px_-12px_rgba(11,47,43,0.35)] ${panelCls}`;

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={toggle} className="cursor-pointer">{button}</div>
      {open &&
        (fixed
          ? /* تُعرض عبر بوابة إلى body — تهرب من أي قصّ (overflow) أو تحويل (transform) في الأسلاف */
            createPortal(
              <div ref={panelRef} className={`${panelBase} fixed`} style={pos} onClick={() => setOpen(false)}>
                {children}
              </div>,
              document.body
            )
          : (
          <div
            ref={panelRef}
            className={`${panelBase} absolute ${direction === "up" ? "bottom-full mb-2" : "mt-2"} ${align === "end" ? "end-0" : "start-0"}`}
            onClick={() => setOpen(false)}
          >
            {children}
          </div>
        ))}
    </div>
  );
}
export const DropItem = ({ children, danger }: { children: React.ReactNode; danger?: boolean }) => (
  <button
    className={`w-full text-start text-sm font-medium rounded-lg px-3 py-2 cursor-pointer transition-colors ${
      danger ? "text-coral hover:bg-coral-soft" : "text-ink hover:bg-jade-soft hover:text-jade-deep"
    }`}
  >
    {children}
  </button>
);

/* ============================ Atoms ============================ */

export function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`chip ${cls}`}>{children}</span>;
}

const AV_COLORS = ["#1273c4", "#2f9fe0", "#e2952b", "#2c9c69", "#b23a48", "#0b518f"];
export function Avatar({ name, size = "w-10 h-10 text-sm" }: { name: string; size?: string }) {
  const initials = name
    .replace("د. ", "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  const color = AV_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AV_COLORS.length];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-display font-bold text-white shrink-0 ${size}`}
      style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
    >
      {initials}
    </span>
  );
}

export function AnimatedNumber({ value, className = "" }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{display.toLocaleString("en-US")}</span>;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-soft mt-1">{hint}</p>}
    </div>
  );
}
/**
 * حقل ذكي: اقتراحات مُصفّاة من قائمة + زر «إضافة للقائمة» عند كتابة قيمة غير موجودة.
 * الإضافة فورية — تنعكس في الحقل نفسه وكل الحقول الأخرى المشاركة لنفس القائمة.
 */
export function SmartCombo({
  value,
  onChange,
  options,
  onAdd,
  placeholder,
  addLabel,
  entityLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onAdd: (v: string) => void;
  placeholder?: string;
  addLabel?: string;
  entityLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trimmed = value.trim();
  const exactExists = options.some((o) => o === trimmed);

  const filtered = useMemo(
    () => (trimmed ? options.filter((o) => o.includes(trimmed)) : options),
    [options, trimmed]
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const canAdd = !!trimmed && !exactExists;

  const doAdd = () => {
    if (!canAdd) return;
    onAdd(trimmed);
    onChange(trimmed);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && trimmed && !exactExists) {
                e.preventDefault();
                doAdd();
              }
            }}
            placeholder={placeholder}
            className="input !pe-9"
          />
          <span
            className={`absolute inset-y-0 end-3 flex items-center text-soft pointer-events-none transition-transform ${open ? "rotate-180" : ""}`}
          >
            <IconChevronDown className="w-4 h-4" />
          </span>
        </div>
        {/* زر الإضافة — أيقونة زائد مربعة، ظاهر دائماً ويتوهج عند توفر قيمة جديدة */}
        <button
          type="button"
          onClick={doAdd}
          disabled={!canAdd}
          aria-label={canAdd ? `إضافة «${trimmed}» إلى قائمة ${entityLabel}` : addLabel ?? "إضافة"}
          className={`inline-flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-all duration-200 ${
            canAdd
              ? "bg-jade text-white cursor-pointer shadow-[0_8px_18px_-6px_rgba(18,115,196,0.65)] hover:bg-jade-deep hover:scale-105 anim-pop"
              : "bg-mist text-soft/50 border border-line cursor-not-allowed"
          }`}
          title={canAdd ? `إضافة «${trimmed}» إلى قائمة ${entityLabel}` : "اكتب قيمة جديدة غير موجودة في القائمة لتفعيل الإضافة"}
        >
          <IconPlus className={`w-4.5 h-4.5 ${canAdd ? "pulse-soft" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="anim-pop absolute z-50 mt-1.5 inset-x-0 card !rounded-xl p-1.5 max-h-56 overflow-y-auto shadow-[0_18px_44px_-12px_rgba(11,47,43,0.3)]">
          <p className="px-3 py-1.5 text-[10px] font-bold text-soft tracking-wide">
            {entityLabel} المتاحة ({filtered.length})
          </p>
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-start text-sm cursor-pointer transition-colors ${
                o === trimmed ? "bg-jade-soft text-jade-deep font-bold" : "text-ink hover:bg-mist"
              }`}
            >
              <span>{o}</span>
              {o === trimmed && <IconCheck className="w-3.5 h-3.5" />}
            </button>
          ))}
          {trimmed && !exactExists && (
            <button
              type="button"
              onClick={doAdd}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm font-bold text-jade-deep bg-jade-soft/60 hover:bg-jade-soft cursor-pointer transition-colors border border-dashed border-jade/40 mt-1"
            >
              <IconPlus className="w-4 h-4" />
              إضافة «{trimmed}» إلى قائمة {entityLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- تحويلات التاريخ dd/mm/yyyy ---------- */
const nf2 = () => new Intl.NumberFormat(loadPrefs().digits === "ar" ? "ar-EG" : "ar-EG-u-nu-latn", { minimumIntegerDigits: 2, useGrouping: false });

/** yyyy-mm-dd ← dd/mm/yyyy */
export const toDisplayDate = (iso: string): string => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso ?? "";
  const [y, m, d] = iso.split("-");
  const n = nf2();
  return `${n.format(Number(d))}/${n.format(Number(m))}/${y}`;
};

/** dd/mm/yyyy (أو صيغ مرنة) → yyyy-mm/yyyy. يعيد null إن كانت غير صالحة */
export const parseDisplayDate = (raw: string): string | null => {
  const digits = raw.replace(/[^\d]/g, "");
  let d = 0, m = 0, y = 0;
  if (/^\d{8}$/.test(digits)) {
    d = +digits.slice(0, 2); m = +digits.slice(2, 4); y = +digits.slice(4);
  } else if (/^\d{6}$/.test(digits)) {
    d = +digits.slice(0, 2); m = +digits.slice(2, 4); y = 2000 + +digits.slice(4);
  } else {
    return null;
  }
  if (y < 100) y += 2000;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  const p = (v: number) => String(v).padStart(2, "0");
  return `${y}-${p(m)}-${p(d)}`;
};

/**
 * حقل تاريخ موحّد بتنسيق dd/mm/yyyy — لا يعتمد على صيغة المتصفح.
 * يخزن بقيمة ISO (yyyy-mm-dd) ويعرض ويحرر بالعربية dd/mm/yyyy.
 */
export function DateInput({
  value,
  onChange,
  className,
  placeholder,
  ...rest
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(() => toDisplayDate(value));
  const [invalid, setInvalid] = useState(false);

  // مزامنة عند تغيّر القيمة من الخارج
  useEffect(() => {
    setText(toDisplayDate(value));
    setInvalid(false);
  }, [value]);

  const commit = (raw: string) => {
    const iso = parseDisplayDate(raw);
    if (iso) {
      setInvalid(false);
      setText(toDisplayDate(iso));
      if (iso !== value) onChange(iso);
    } else if (raw.trim() === "") {
      setInvalid(false);
      setText("");
      if (value) onChange("");
    } else {
      setInvalid(true);
    }
  };

  return (
    <input
      {...rest}
      value={text}
      inputMode="numeric"
      dir="ltr"
      placeholder={placeholder ?? "dd/mm/yyyy"}
      onChange={(e) => {
        setText(e.target.value);
        setInvalid(false);
        // تحويل فوري عند اكتمال 8 أرقام
        const digits = e.target.value.replace(/[^\d]/g, "");
        if (digits.length === 8) {
          const iso = parseDisplayDate(e.target.value);
          if (iso) {
            setText(toDisplayDate(iso));
            if (iso !== value) onChange(iso);
          }
        }
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
      }}
      className={`input stat-num ${invalid ? "!border-coral !text-coral" : ""} ${className ?? ""}`}
    />
  );
}

export const TInput = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`input ${p.className ?? ""}`} />;
export const TSelect = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={`input appearance-none cursor-pointer ${p.className ?? ""}`} />
);
export const TArea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={`input !h-auto min-h-20 py-2 ${p.className ?? ""}`} />
);

export function EmptyState({ title, desc, icon }: { title: string; desc?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-jade-soft text-jade-deep flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="font-display font-bold text-ink">{title}</p>
      {desc && <p className="text-xs text-soft mt-1 max-w-60 leading-relaxed">{desc}</p>}
    </div>
  );
}

/* زر حذف بخطوتين */
export function TwoStepDelete({ onConfirm, label = "حذف" }: { onConfirm: () => void; label?: string }) {
  const [arm, setArm] = useState(false);
  useEffect(() => {
    if (!arm) return;
    const t = setTimeout(() => setArm(false), 2600);
    return () => clearTimeout(t);
  }, [arm]);
  return (
    <button
      onClick={() => {
        if (arm) {
          onConfirm();
          setArm(false);
        } else setArm(true);
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-xs font-bold cursor-pointer transition-all ${
        arm ? "bg-coral text-white" : "text-soft hover:bg-coral-soft hover:text-coral"
      }`}
    >
      <IconTrash className="w-3.5 h-3.5" />
      {arm ? "متأكد؟ اضغط مجدداً" : label}
    </button>
  );
}


 

/* مفتاح تبديل */
export function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-10 h-[22px] rounded-full transition-colors cursor-pointer shrink-0 ${on ? "bg-jade" : "bg-line"}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all ${on ? "start-[21px]" : "start-[3px]"}`}
      />
    </button>
  );
}
