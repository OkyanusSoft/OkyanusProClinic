/* =====================================================================
   اختبار سريع — تأكد أن حارس الحالات النهائية يعمل قبل الاعتماد عليه
   ---------------------------------------------------------------------
   شغّله من داخل مجلد server:
       node test-guard.js
   (يستورد guardTerminalStates من server-terminal-guard.js — أو انسخ
    الدالة هنا مباشرة إن كانت مضمنة في index.js)
   ===================================================================== */

// انسخ دالة guardTerminalStates وثابت TERMINAL_STATES هنا للاختبار المستقل:
const TERMINAL_STATES = { sessions: new Set(["done", "cancelled"]) };

function guardTerminalStates(stored, incoming) {
  if (!incoming || typeof incoming !== "object") return incoming;
  for (const [entity, finals] of Object.entries(TERMINAL_STATES)) {
    const incomingList = incoming[entity];
    const storedList = stored?.[entity];
    if (!Array.isArray(incomingList) || !Array.isArray(storedList)) continue;
    const storedById = new Map(storedList.map((r) => [r && r.id, r]));
    incoming[entity] = incomingList.map((inc) => {
      if (!inc || typeof inc !== "object") return inc;
      const prev = storedById.get(inc.id);
      if (!prev) return inc;
      if (finals.has(prev.status) && !finals.has(inc.status)) {
        return { ...inc, status: prev.status, endedAt: prev.endedAt ?? inc.endedAt };
      }
      return inc;
    });
  }
  return incoming;
}

/* ---------- سيناريوهات الاختبار ---------- */

const pass = (name, cond) => console.log(`${cond ? "✅ نجح" : "❌ فشل"}: ${name}`);

// 1) جلسة منتهية مخزنة + محاولة إرجاعها مفتوحة ← يجب أن تبقى done
let stored = { sessions: [{ id: "s1", status: "done", endedAt: "t1" }] };
let incoming = { sessions: [{ id: "s1", status: "open" }] };
guardTerminalStates(stored, incoming);
pass("الجلسة المنتهية لا تعود مفتوحة", incoming.sessions[0].status === "done");

// 2) جلسة ملغاة مخزنة + محاولة إرجاعها مفتوحة ← يجب أن تبقى cancelled
stored = { sessions: [{ id: "s2", status: "cancelled" }] };
incoming = { sessions: [{ id: "s2", status: "open" }] };
guardTerminalStates(stored, incoming);
pass("الجلسة الملغاة لا تعود مفتوحة", incoming.sessions[0].status === "cancelled");

// 3) جلسة مفتوحة مخزنة + إنهاء قادم ← يجب أن تصبح done (التقدم مسموح)
stored = { sessions: [{ id: "s3", status: "open" }] };
incoming = { sessions: [{ id: "s3", status: "done", endedAt: "t3" }] };
guardTerminalStates(stored, incoming);
pass("الإغلاق الجديد يُقبل", incoming.sessions[0].status === "done");

// 4) جلسة جديدة غير موجودة في المخزن ← تمر كما هي
stored = { sessions: [] };
incoming = { sessions: [{ id: "s4", status: "open" }] };
guardTerminalStates(stored, incoming);
pass("الجلسة الجديدة تمر", incoming.sessions[0].status === "open");

// 5) جلسة منتهية + دمج منتهٍ أيضًا ← تبقى done مع endedAt
stored = { sessions: [{ id: "s5", status: "done", endedAt: "t5" }] };
incoming = { sessions: [{ id: "s5", status: "done" }] };
guardTerminalStates(stored, incoming);
pass("المنتهية تحافظ على endedAt", incoming.sessions[0].status === "done" && incoming.sessions[0].endedAt === "t5");

console.log("\n🎯 إن نجحت السيناريوهات ١ و٢ تحديدًا → الحارس يعمل ولن تعود الجلسات المغلقة.");
