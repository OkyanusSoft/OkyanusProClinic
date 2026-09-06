/* =====================================================================
   الحزمة الحادية عشرة — حارس الجلسات المغلقة  (src/store.tsx)
   ---------------------------------------------------------------------
   يمنع استرجاع جلسة أنهيتها أو ألغيتها عبر المزامنة/الدمج.
   كل التعديلات داخل StoreProvider فقط — لا حاجة لمس أي شاشة.

   ▸ لماذا يعمل؟
     عند END/CANCEL نضع الجلسة في "قائمة حماية" بالحالة المستهدفة.
     أي دمج قادم (MERGE) يمرّ عبر الموزّع، فيفرض الموزّع الحالة المحمية
     على الجلسة ويمنع استرجاع حالتها القديمة، حتى يتأكد الحفظ في الخادم.
   ===================================================================== */

/* ============================================================
   التعديل ١ — أضف هذين الـ ref بعد بقية الـ refs
   (ابحث عن `const wipeRef = useRef(false);` وأضف تحته)
   ============================================================ */

const protectedRef = useRef<Map<string, "done" | "cancelled">>(new Map());
const flushNowRef = useRef(false);

/* ============================================================
   التعديل ٢ — استبدل جسم الموزّع dispatch بالكامل
   (ابحث عن `const dispatch = useCallback((action: Action) => { ... }`
    واستبدل جسمه حتى `}, []);` بهذا)
   ============================================================ */

const dispatch = useCallback((action: Action) => {
  /* ① عند إغلاق جلسة: فعّل حمايتها واطلب دفعًا فوريًا */
  const a = action as unknown as { type: string; id?: string };
  if (a.type === "END_SESSION" && a.id) {
    protectedRef.current.set(a.id, "done");
    flushNowRef.current = true;
    // مهلة أمان قصوى — تُرفع الحماية بعد 20 ثانية بأي حال
    setTimeout(() => protectedRef.current.delete(a.id!), 20000);
  } else if (a.type === "CANCEL_SESSION" && a.id) {
    protectedRef.current.set(a.id, "cancelled");
    flushNowRef.current = true;
    setTimeout(() => protectedRef.current.delete(a.id!), 20000);
  }

  /* ② عند أي دمج قادم: افرض الحالة المحمية على الجلسات المغلقة حديثًا
        حتى لا تسترجع حالتها القديمة من الخادم */
  let act: Action = action;
  if (a.type === "MERGE" && protectedRef.current.size > 0) {
    const merged = (action as { db?: { sessions?: { id: string; status: string }[] } }).db;
    if (merged?.sessions?.length) {
      const guarded = merged.sessions.map((s) => {
        const target = protectedRef.current.get(s.id);
        return target && s.status !== target ? { ...s, status: target } : s;
      });
      act = { ...(action as object), db: { ...merged, sessions: guarded } } as Action;
    }
  }

  /* ③ المنطق الأصلي (الختم + أحداث المراقبة + التغييرات المحلية) */
  const isInternal =
    act.type === "MERGE" || act.type === "SYNCED" || act.type === "HYDRATE" || act.type === "ADD_TOMBSTONE";
  if (!isInternal) {
    stampAction(act);
    queueActionEvent(act, dbRef.current);
    dirtyRef.current = true;
    if (act.type === "RESET" || act.type === "IMPORT") wipeRef.current = true;
  }

  baseDispatch(act);

  /* ④ شواهد الحذف الدائم (من الحزمة العاشرة) */
  const entity = DELETE_ENTITY_MAP[act.type];
  const aid = (act as { id?: string }).id;
  if (entity && aid) {
    baseDispatch({ type: "ADD_TOMBSTONE", entity, id: aid } as Action);
  }
}, []);

/* ============================================================
   التعديل ٣ — استبدل مؤثر الدفع (الحفظ المحلي + المزامنة) بالكامل
   (ابحث عن المؤثر الذي يبدأ بـ `/* حفظ محلي دائم ... */` أو
    الذي يستدعي `saveState(` ، واستبدله بهذا)
   ============================================================ */

useEffect(() => {
  const stamped = { ...db, savedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(stamped));
  } catch {
    /* تجاهل */
  }
  if (!bootedRef.current || connRef.current !== "online" || !dirtyRef.current) return;

  /* دفع فوري (بدون تأخير) عند إغلاق جلسة، وإلا التأخير المعتاد */
  const delay = flushNowRef.current ? 0 : 700;
  setSyncing(true);
  const t = setTimeout(async () => {
    flushNowRef.current = false;
    const res = await saveState({ ...db, savedAt: Date.now(), wipe: wipeRef.current });
    const ok = typeof res === "boolean" ? res : !!res?.ok;
    setSyncing(false);
    if (ok) {
      dirtyRef.current = false;
      wipeRef.current = false;
      /* تأكد الحفظ → ارفع الحماية عن الجلسات التي حالتها صحيحة الآن */
      for (const sid of [...protectedRef.current.keys()]) {
        const sess = dbRef.current.sessions.find((s) => s.id === sid);
        if (!sess || sess.status === protectedRef.current.get(sid)) {
          protectedRef.current.delete(sid);
        }
      }
    }
  }, delay);
  return () => clearTimeout(t);
}, [db]);

/* ============================================================
   التعديل ٤ — تأكد من استيراد useRef أعلى الملف
   ============================================================ */

// import { ..., useRef, ... } from "react";

/* ============================================================
   ملاحظات مهمة:
   • إن كانت دوال stampAction / queueActionEvent / DELETE_ENTITY_MAP
     بأسماء مختلفة لديك، عدّل الأسطر ③ و⑤ لتطابقها.
   • إن كان saveState يرجع boolean فقط، الكود يتعامل مع الشكلين تلقائيًا.
   • لا حاجة لتغيير Session.tsx أو App.tsx — الحماية تعمل من الموزّع المركزي.
   ============================================================ */
