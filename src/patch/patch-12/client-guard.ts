/* =====================================================================
   الحزمة الثانية عشرة — حماية العميل الإضافية (طبقة ثانية)
   ---------------------------------------------------------------------
   هذه طبقة دفاع إضافية في src/store.tsx، تُطبق عند استقبال أي دمج:
   الجلسة التي أغلقناها محليًا لا يقبل الموزّع أن يعيدها الدمج مفتوحة.
   (الحل الجذري هو حارس الخادم — هذه مجرد شبكة أمان)
   ===================================================================== */

/* ============================================================
   1) أضف هذا الـ ref أعلى StoreProvider
      (إن لم تكن قد أضفته من الحزمة الحادية عشرة)
   ============================================================ */

/*
  /** معرفات الجلسات التي أغلقناها محليًا ولا نقبل استرجاعها *\/
  const closedSessionsRef = useRef<Map<string, "done" | "cancelled">>(new Map());
*/

/* ============================================================
   2) سجّل الإغلاق عند END_SESSION / CANCEL_SESSION
      داخل الموزّع dispatch، أضف:
   ============================================================ */

/*
  // بعد baseDispatch(action):
  if (action.type === "END_SESSION") {
    closedSessionsRef.current.set(action.id, "done");
  } else if (action.type === "CANCEL_SESSION") {
    closedSessionsRef.current.set(action.id, "cancelled");
  }
*/

/* ============================================================
   3) فرض الحماية عند الدمج MERGE
      في حالة case "MERGE": وقبل إرجاع الحالة القادمة، مرّر جلساتَها
      عبر هذه الحماية:
   ============================================================ */

/*
  // دالة مساعدة — ألصقها خارج المكوّن:
  function shieldClosedSessions(
    sessions: ClinicalSession[],
    closed: Map<string, "done" | "cancelled">
  ): ClinicalSession[] {
    if (closed.size === 0) return sessions;
    return sessions.map((s) => {
      const forced = closed.get(s.id);
      return forced && s.status !== forced ? { ...s, status: forced } : s;
    });
  }

  // ثم داخل case "MERGE":
  // const cleaned = applyTombstones({ ...merged, tombstones: stones });
  // cleaned.sessions = shieldClosedSessions(cleaned.sessions, closedSessionsRef.current);
  // return cleaned;
*/

/* ============================================================
   4) (تنظيف) ارفع الحماية بعد تأكد الحفظ، كي لا تتراكم:
      في نقطة نجاح الحفظ (بعد saveState ترجع ok):
   ============================================================ */

/*
  // بعد نجاح الدفع للخادم:
  // لا حاجة لرفعها فورًا — يكفي حدّها بآخر ٥٠ جلسة
  const arr = [...closedSessionsRef.current.entries()];
  if (arr.length > 50) {
    closedSessionsRef.current = new Map(arr.slice(-50));
  }
*/
function deleteAllSessionsForever() {
  console.log('🗑️ جاري حذف جميع الجلسات...');
  
  const raw = localStorage.getItem("sharafi-dental-v1");
  if (!raw) {
    console.log('❌ لا توجد بيانات');
    return;
  }
  
  const data = JSON.parse(raw);
  const oldCount = data.sessions?.length || 0;
  
  data.sessions = [];
  localStorage.setItem("sharafi-dental-v1", JSON.stringify(data));
  
  console.log(`✅ تم حذف ${oldCount} جلسة من localStorage`);
  
  fetch('http://localhost:4000/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(result => {
    console.log('✅ تم حذف الجلسات من MySQL:', result);
  })
  .catch(err => {
    console.error('❌ خطأ:', err);
  });
  
  const newData = JSON.parse(localStorage.getItem("sharafi-dental-v1"));
  console.log('📊 عدد الجلسات الآن:', newData.sessions?.length || 0);
}

deleteAllSessionsForever();