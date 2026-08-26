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

/* نسخة هذه الدفعة محفوظة قبل إعادة الرسم بأشكال أسنان حقيقية (2026-02-17 11:00).
   بقية الملف (ToothCell + DentalChart الكامل) مطابق للنسخة العاملة المبنية السابقة. */
