/* ═══════════════════════════════════════════════════════════════════
   الحزمة 9 — ألوان مميزة لأزرار شاشة المواعيد والعودات
   الملف: src/pages/Appointments.tsx
   ═══════════════════════════════════════════════════════════════════

   ─────────────────────────────────────────────────────────────────
   الخطوة 1 — تأكد من استيراد IconPulse:
   في قائمة استيراد الأيقونات أعلى الملف تأكد من وجود IconPulse،
   وإن لم يكن موجوداً أضفه.
   ─────────────────────────────────────────────────────────────────

   ─────────────────────────────────────────────────────────────────
   الخطوة 2 — استبدل كتلة الأزرار:
   ابحث عن هذه الكتلة (ترويسة الشاشة — أزرار الإجراءات):

     {view === "followups" && (
       <button className="btn-soft" onClick={() => setShowFu(true)}>
         <IconPlus className="w-4 h-4" />
         عودة جديد
       </button>
     )}
     <button className="btn-soft" onClick={() => setShowNewPatient(true)}>
       <IconUserPlus className="w-4 h-4" />
       مريض جديد
     </button>
     <button className="btn-primary" onClick={() => onBook()}>
       <IconCalendarPlus className="w-4.5 h-4.5" />
       موعد جديد
     </button>

   واستبدلها بهذه (لكل زر لون مميز وظل خاص):
   ───────────────────────────────────────────────────────────────── */

          {view === "followups" && (
            <button
              className="btn !bg-amber !text-white hover:!bg-[#c77f1d] hover:-translate-y-px transition-all"
              style={{ boxShadow: "0 8px 18px -6px rgba(226,149,43,.6)" }}
              onClick={() => setShowFu(true)}
            >
              <IconPulse className="w-4 h-4" />
              عودة جديد
            </button>
          )}
          <button
            className="btn !bg-sky !text-white hover:!bg-[#2b6cb0] hover:-translate-y-px transition-all"
            style={{ boxShadow: "0 8px 18px -6px rgba(58,134,196,.55)" }}
            onClick={() => setShowNewPatient(true)}
          >
            <IconUserPlus className="w-4 h-4" />
            مريض جديد
          </button>
          <button className="btn-primary" onClick={() => onBook()}>
            <IconCalendarPlus className="w-4.5 h-4.5" />
            موعد جديد
          </button>

/* ═══════════════════════════════════════════════════════════════════
   النتيجة — ثلاثة أزرار بهوية واضحة:
   🟠 عودة جديد   → كهرماني (لون المتابعة المعتمد في النظام)
   🔵 مريض جديد   → أزرق سماوي (لون الجدد/الاستقبال)
   🟢 موعد جديد   → أخضر/أزرق أساسي (الزر الرئيسي)
   مع ظل ملوّن وحركة ارتفاع خفيفة عند التحويم لكل زر.
   ═══════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════
<button
  className="btn !bg-sky !text-white hover:!bg-[#2b6cb0] hover:-translate-y-px transition-all"
  style={{ boxShadow: "0 8px 18px -6px rgba(58,134,196,.55)" }}
  onClick={() => setShowNewPatient(true)}
>
  <IconUserPlus className="w-4 h-4" />
  مريض جديد
</button>
 ───────────────────────────────────────────────────────────────── */