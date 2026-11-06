import React, { useRef, useState } from "react";
import { useStore, today } from "../store";
import { IconPrinter, IconPencil } from "../icons";
import { EmptyState, Field, TInput, TSelect, useToast } from "../components/ui";

const TEMPLATES = [
  { key: "extraction", title: "نموذج موافقة: خلع سن", body: "أوافق على إجراء خلع السن رقم ___، وأعلم بالمخاطر (نزيف، عدوى، تلف عصب مجاور) والبدائل. تم شرح الإجراء لي وأجبت على أسئلتي." },
  { key: "anesthesia", title: "نموذج موافقة: تخدير موضعي", body: "أوافق على التخدير الموضعي وأعلم بالآثار (خدر، وذمة، حساسية). أُبلغت عن أي حساسيات/},' " },
  { key: "endo", title: "نموذج موافقة: علاج عصب", body: "أوافق على علاج عصب السن رقم ___، وأعلم بالمخاطر (كسر آلة، ثقب، فشل، Not guaranteed). " },
  { key: "implant", title: "نموذج موافقة: زراعة سن", body: "أوافق على زراعة سن وأعلم بالمخاطر (فشل، التهاب، كسر). " },
];

export default function ConsentFormsPage() {
  const { db, patientById } = useStore();
  const { push } = useToast();
  const [patientId, setPatientId] = useState("");
  const [tpl, setTpl] = useState(TEMPLATES[0].key);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    setDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
  };
  const endDraw = () => setDrawing(false);
  const clearSig = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const template = TEMPLATES.find((t) => t.key === tpl)!;
  const patient = patientId ? patientById(patientId) : null;

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display font-bold text-3xl text-ink">نماذج الموافقة (Consent)</h1><p className="text-sm text-soft mt-1">قوالب + توقيع إلكتروني · قابلة للطباعة</p></div>
        <button className="btn-soft" onClick={() => window.print()}><IconPrinter className="w-4 h-4" /> طباعة</button>
      </div>
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="المريض"><TSelect value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">— اختر —</option>
          {db.patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </TSelect></Field>
        <Field label="النموذج"><TSelect value={tpl} onChange={(e) => setTpl(e.target.value)}>
          {TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
        </TSelect></Field>
      </div>
      <div className="card p-6 space-y-4">
        <h2 className="font-display font-bold text-xl text-ink">{template.title}</h2>
        <p className="text-sm text-soft leading-relaxed">{template.body}</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><b>المريض:</b> {patient?.name ?? "____________"}</div>
          <div><b>التاريخ:</b> {today(0)}</div>
          <div><b>العمر:</b> {patient?.age ?? "___"}</div>
          <div><b>الهاتف:</b> {patient?.phone ?? "___"}</div>
        </div>
        <div>
          <p className="text-xs font-bold text-soft mb-2">توقيع المريض / الولي:</p>
          <canvas ref={canvasRef} width={500} height={120} className="border border-line rounded-lg w-full touch-none" style={{ background: "#fafafa" }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
          <button className="text-xs text-coral hover:underline mt-2" onClick={clearSig}>مسح التوقيع</button>
        </div>
      </div>
    </div>
  );
}
