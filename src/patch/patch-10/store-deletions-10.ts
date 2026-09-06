 /* =====================================================================
   الحزمة العاشرة — إضافات src/store.tsx  (الحذف الدائم عبر كل الأجهزة)
   ---------------------------------------------------------------------
   انسخ كل قسم إلى الموضع الموضّح في README-الحذف-الدائم.md
   ===================================================================== */

import type { DB } from "./store"; // ← احذف هذا السطر عند اللصق داخل store.tsx نفسه

/* ============================================================
   القسم A — الأنواع والدوال المساعدة
   (ألصقه قبل `export function StoreProvider`)
   ============================================================ */

export interface Tombstone { entity: string; id: string; at: number }

/**
 * خريطة: نوع فعل الحذف ← اسم المصفوفة في DB.
 * هذه هي القائمة الشاملة — أي حذف من أي شاشة يمرّ هنا تلقائيًا.
 */
export const DELETE_ENTITY_MAP: Record<string, string> = {
  DELETE_PATIENT: "patients",
  DELETE_APPT: "appointments",
  DELETE_SESSION: "sessions",
  DELETE_INVOICE: "invoices",
  DELETE_EXPENSE: "expenses",
  DELETE_FOLLOWUP: "followUps",
  DELETE_PRESCRIPTION: "prescriptions",
  DELETE_SERVICE: "services",
  DELETE_SUPPLY: "supplies",
  DELETE_SUPPLY_MOVE: "supplyMoves",
  DELETE_IMPLANT: "implants",
  DELETE_PROSTHETIC: "prosthetics",
  DELETE_ORTHO: "orthoCases",
  DELETE_XRAY: "xrays",
  DELETE_PLAN: "plans",
  DELETE_USER: "users",
  DELETE_FOLLOWUP_REASON: "followUpReasons",
};

/**
 * تُفلتر كل مصفوفة في DB من أي سجل له بصمة حذف.
 * هذه هي الدالة التي تمنع "عودة" السجلات المحذوفة بعد المزامنة.
 */
export function applyTombstones(db: DB): DB {
  const stones = db.tombstones ?? [];
  if (stones.length === 0) return db;
  const out: Record<string, unknown> = { ...db };
  for (const t of stones) {
    const coll = out[t.entity];
    if (Array.isArray(coll)) {
      out[t.entity] = coll.filter((r: any) => !(r && typeof r === "object" && r.id === t.id));
    }
  }
  return out as DB;
}

/** توحيد مصفوفتي شواهد (اتحاد حسب entity+id) */
export function unionTombstones(a: Tombstone[] = [], b: Tombstone[] = []): Tombstone[] {
  const map = new Map<string, Tombstone>();
  for (const t of [...a, ...b]) map.set(`${t.entity}::${t.id}`, t);
  return [...map.values()];
}

/* ============================================================
   القسم B — حالتي الـ reducer
   (ألصقهما قبل `case "RESET":`)
   ============================================================ */

/*
    // إضافة بصمة حذف دائم (تُزامَن لكل الأجهزة)
    case "ADD_TOMBSTONE": {
      const exists = (db.tombstones ?? []).some(
        (t) => t.entity === action.entity && t.id === action.id
      );
      if (exists) return db;
      return {
        ...db,
        tombstones: [
          ...(db.tombstones ?? []),
          { entity: action.entity, id: action.id, at: Date.now() },
        ],
      };
    }

    // حذف جلسة علاج مكتملة نهائيًا (البصمة تُضاف تلقائيًا عبر dispatch)
    case "DELETE_SESSION":
      return { ...db, sessions: db.sessions.filter((s) => s.id !== action.id) };
*/

/* ============================================================
   القسم C — تعديل الموزّع dispatch داخل StoreProvider
   (استبدل جسم `const dispatch = useCallback((action: Action) => { ... }` بهذا)
   ============================================================ */

/*
  const dispatch = useCallback((action: Action) => {
    const isInternal =
      action.type === "MERGE" || action.type === "SYNCED" || action.type === "HYDRATE" || action.type === "ADD_TOMBSTONE";

    if (!isInternal) {
      stampAction(action);
      queueActionEvent(action, dbRef.current);
      dirtyRef.current = true;
      if (action.type === "RESET" || action.type === "IMPORT") wipeRef.current = true;
    }

    baseDispatch(action);

    // ★ قلب الحل: أي فعل حذف من أي شاشة ← سجّل بصمته فورًا وبشكل دائم
    const a = action as unknown as { type: string; id?: string };
    const entity = DELETE_ENTITY_MAP[a.type];
    if (entity && a.id) {
      baseDispatch({ type: "ADD_TOMBSTONE", entity, id: a.id } as Action);
    }
  }, []);
*/

/* ============================================================
   القسم D — ربط الفلترة بمدخلي البيانات (الأهم)
   ============================================================ */

/*
  1) في دالة normalizeDB — اجعل آخر سطر:
       return applyTombstones(db);
     بدل إرجاع الكائن مباشرة.

  2) في حالة الـ reducer `case "MERGE":` — عند تبنّي الحالة القادمة من الخادم،
     وحّد شواهدها مع شواهدنا ثم فلتر:

       case "MERGE": {
         const merged = action.db as DB;
         const stones = unionTombstones(db.tombstones ?? [], merged.tombstones ?? []);
         const cleaned = applyTombstones({ ...merged, tombstones: stones });
         return cleaned;
       }

     (إن كان شكل MERGE لديك مختلفًا — مثل استقبال `{db, tombstones}` — فقط تأكّد من
      أن الكائن النهائي يمرّ بـ unionTombstones ثم applyTombstones قبل الإرجاع.)
*/
