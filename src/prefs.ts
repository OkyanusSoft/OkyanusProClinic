/**
 * وحدة تفضيلات المستخدم — تُحفَظ محلياً لكل جهاز وتُطبَّق على النظام كله فوراً.
 */

export interface Prefs {
  mode: "light" | "dark" | "auto";
  accent: string;
  fontSize: "sm" | "md" | "lg";
  motion: boolean;
  digits: "latn" | "ar";
  toastDur: number;
  defaultTab: string;
}

export const DEFAULT_PREFS: Prefs = {
  mode: "light",
  accent: "ocean",
  fontSize: "md",
  motion: true,
  digits: "latn",
  toastDur: 3600,
  defaultTab: "dashboard",
};

export interface Accent {
  id: string;
  label: string;
  jade: string;
  deep: string;
  soft: string;
  pine: string;
  pine2: string;
  pine3: string;
  ice: string;
  frost: string;
}

/* لوحات ألوان مميزة — كل واحدة تعيد تلوين النظام بالكامل */
export const ACCENTS: Accent[] = [
  { id: "ocean", label: "أزرق محيطي", jade: "#1273c4", deep: "#0b518f", soft: "#e1eefb", pine: "#0a2b47", pine2: "#0e3a63", pine3: "#124a7d", ice: "#7fd4ff", frost: "#4fc9f7" },
  { id: "teal", label: "تركواز طبي", jade: "#0d8f83", deep: "#0a6158", soft: "#e3f2ef", pine: "#0b2f2b", pine2: "#10403a", pine3: "#175248", ice: "#7fe0d4", frost: "#3fd0c0" },
  { id: "emerald", label: "زمردي", jade: "#1f9d55", deep: "#14663a", soft: "#e1f4e9", pine: "#0d2b1c", pine2: "#123b27", pine3: "#1a5236", ice: "#8ce8b4", frost: "#4fd98a" },
  { id: "royal", label: "بنفسجي ملكي", jade: "#7c5cd6", deep: "#553ea3", soft: "#ece7fa", pine: "#221a44", pine2: "#2d2359", pine3: "#3a2e72", ice: "#c0aaff", frost: "#a78bfa" },
  { id: "crimson", label: "قرمزي", jade: "#d64560", deep: "#a12c44", soft: "#fae3e8", pine: "#3a1220", pine2: "#4d1a2c", pine3: "#63223a", ice: "#ff9eb1", frost: "#fb7185" },
  { id: "amber", label: "كهرماني ذهبي", jade: "#d98a1f", deep: "#a06410", soft: "#fbf0dd", pine: "#33230b", pine2: "#453012", pine3: "#5a401a", ice: "#ffd58a", frost: "#fbbf24" },
];

const KEY = "dental-pref-v1";

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* بيئات بلا تخزين */
  }
}

const FONT_SIZES: Record<Prefs["fontSize"], string> = {
  sm: "14.5px",
  md: "16px",
  lg: "17.5px",
};

/** تطبيق التفضيلات على المستند — تُستدعى عند الإقلاع وعند كل تغيير */
export function applyPrefs(p: Prefs) {
  const root = document.documentElement;

  /* النمط: فاتح / داكن / تلقائي (حسب النظام) */
  const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = p.mode === "dark" || (p.mode === "auto" && !!prefersDark);
  root.classList.toggle("dark", dark);

  /* اللون المميز — يعيد تلوين كل عناصر الهوية */
  const a = ACCENTS.find((x) => x.id === p.accent) ?? ACCENTS[0];
  const vars: Record<string, string> = {
    "--color-jade": a.jade,
    "--color-jade-deep": a.deep,
    "--color-jade-soft": a.soft,
    "--color-pine": a.pine,
    "--color-pine-2": a.pine2,
    "--color-pine-3": a.pine3,
    "--color-ice": a.ice,
    "--color-frost": a.frost,
  };
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

  /* حجم الخط — يقيّس الواجهة كلها (rem) */
  root.style.fontSize = FONT_SIZES[p.fontSize];

  /* تقليل الحركة */
  root.classList.toggle("reduce-motion", !p.motion);
}

/** لغة الأرقام حسب التفضيل — لاتيني 123 أو عربي ١٢٣ */
export function arLocale(): string {
  return loadPrefs().digits === "ar" ? "ar-EG" : "ar-EG-u-nu-latn";
}
