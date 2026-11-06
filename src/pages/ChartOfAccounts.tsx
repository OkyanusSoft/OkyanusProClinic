import React, { useEffect, useMemo, useState } from "react";
import { useStore, useMoney, uid, today, type Account, type AccountType } from "../store";
import { IconPlus, IconTrash, IconPencil, IconPrinter } from "../icons";
import { EmptyState, Field, Modal, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";

const TYPE_LABEL: Record<AccountType, string> = { asset: "أصل", liability: "خصم", equity: "حقوق ملكية", revenue: "إيراد", expense: "مصروف" };
const TYPE_COLOR: Record<AccountType, string> = { asset: "#0d8f83", liability: "#d9503a", equity: "#3a86c4", revenue: "#2c9c69", expense: "#e2952b" };

export default function ChartOfAccountsPage() {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const accounts = useMemo(() => [...db.accounts].sort((a, b) => a.code.localeCompare(b.code)), [db.accounts]);
  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<Account | null>(null);

  const childrenOf = (parentId: string | null) => accounts.filter((a) => a.parentId === parentId);

  const renderTree = (parentId: string | null, depth = 0): React.ReactNode => {
    const kids = childrenOf(parentId);
    return kids.map((a) => (
      <div key={a.id}>
        <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-mist/60" style={{ paddingInlineStart: `${depth * 16 + 8}px` }}>
          <span className="stat-num text-xs text-soft w-20 shrink-0">{a.code}</span>
          <span className="flex-1 text-sm font-bold text-ink truncate">{a.name}</span>
          <span className="chip !text-[9px]" style={{ background: `${TYPE_COLOR[a.type]}22`, color: TYPE_COLOR[a.type] }}>{TYPE_LABEL[a.type]}</span>
          <span className="text-[10px] text-soft">L{a.level}</span>
          {a.isPosting && <span className="chip bg-jade-soft text-jade-deep !text-[9px]">حركي</span>}
          <button onClick={() => setEdit(a)} className="icon-btn !w-7 !h-7"><IconPencil className="w-3.5 h-3.5" /></button>
          <TwoStepDelete onConfirm={() => { dispatch({ type: "DELETE_ACCOUNT", id: a.id }); push("info", "حُذف الحساب", a.name); }} />
        </div>
        {renderTree(a.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="space-y-5">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink">دليل الحسابات</h1>
          <p className="text-sm text-soft mt-1">{accounts.length} حساب · 5 مستويات · 4 فئات (أصول/خصوم/حقوق/إيرادات/مصروفات)</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><IconPlus className="w-4.5 h-4.5" /> حساب جديد</button>
      </div>
      <div className="flex gap-2 mb-3">
        <button className="btn-soft" onClick={() => window.print()}><IconPrinter className="w-4 h-4" /> طباعة دليل الحسابات</button>
      </div>
      <div className="card p-3">{renderTree(null)}</div>
      {/* طباعة احترافية */}
      <div className="hidden print:block">
        <h1 className="font-display font-bold text-2xl text-center mb-4">دليل الحسابات — Chart of Accounts</h1>
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-mist"><th className="border border-line p-1.5">الرمز</th><th className="border border-line p-1.5">الاسم</th><th className="border border-line p-1.5">النوع</th><th className="border border-line p-1.5">المستوى</th><th className="border border-line p-1.5">حركي</th></tr></thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td className="border border-line p-1.5 stat-num">{a.code}</td>
                <td className="border border-line p-1.5" style={{ paddingInlineStart: `${a.level * 8}px` }}>{a.name}</td>
                <td className="border border-line p-1.5">{TYPE_LABEL[a.type]}</td>
                <td className="border border-line p-1.5 text-center">{a.level}</td>
                <td className="border border-line p-1.5 text-center">{a.isPosting ? "✓" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && <AccountModal onClose={() => setShowAdd(false)} />}
      {edit && <AccountModal initial={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function AccountModal({ initial, onClose }: { initial?: Account; onClose: () => void }) {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "asset");
  const [level, setLevel] = useState(initial?.level ?? 5);
  const [parentId, setParentId] = useState<string | null>(initial?.parentId ?? null);
  const isPosting = Number(level) === 5;
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // توليد تلقائي للرمز حسب آخر رقم في الدليل
  useEffect(() => {
    if (initial) return; // تعديل: لا نغير الرمز تلقائياً
    const lvl = Number(level);
    if (parentId) {
      const parent = db.accounts.find((a) => a.id === parentId);
      if (!parent) return;
      const siblings = db.accounts.filter((a) => a.parentId === parentId);
      const suffixLen = lvl === 5 ? 2 : 1;
      let max = 0;
      for (const s of siblings) {
        const tail = s.code.slice(parent.code.length);
        const num = parseInt(tail, 10);
        if (!isNaN(num) && num > max) max = num;
      }
      const next = (max + 1).toString().padStart(suffixLen, "0");
      setCode(parent.code + next);
    } else {
      // لا توليد تلقائي للحسابات من المستوى 1 (الفئات ثابتة: 1،2،3،4)
      if (!code) setCode("");
    }
  }, [parentId, level, db.accounts, initial]);

  const save = () => {
    if (!code.trim() || !name.trim()) { push("error", "أدخل الرمز والاسم"); return; }
    const acc: Account = { id: initial?.id ?? "acc-" + code, code: code.trim(), name: name.trim(), level: Number(level), type, parentId, isPosting, active: true, notes: notes.trim() || undefined, updatedAt: Date.now() };
    dispatch({ type: initial ? "UPDATE_ACCOUNT" : "ADD_ACCOUNT", a: acc });
    push("success", initial ? "تم التحديث" : "تمت الإضافة", name);
    onClose();
  };

  const parentOptions = db.accounts.filter((a) => a.level === Number(level) - 1 && a.type === type);

  return (
    <Modal open onClose={onClose} title={initial ? "تعديل حساب" : "حساب جديد"} subtitle="5 مستويات · الفئة/المجموعة/رئيسي/فرعي/حركي"
      footer={<><button className="btn-ghost" onClick={onClose}>إلغاء</button><button className="btn-primary" onClick={save}>حفظ</button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="النوع"><TSelect value={type} onChange={(e) => { setType(e.target.value as AccountType); setParentId(null); }}>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </TSelect></Field>
        <Field label="المستوى (1-5)"><TSelect value={level} onChange={(e) => { setLevel(Number(e.target.value)); }}>
          {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>{l}</option>)}
        </TSelect></Field>
        <Field label="حساب حركي (تلقائي)"><TInput value={isPosting ? "نعم (مستوى 5)" : "لا"} disabled className="!bg-mist" /></Field>
        <div className="col-span-2"><Field label="الحساب الأب"><TSelect value={parentId ?? ""} onChange={(e) => setParentId(e.target.value || null)}>
          <option value="">— لا يوجد (فئة) —</option>
          {parentOptions.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
        </TSelect></Field></div>
        <Field label="الرمز *"><TInput value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" /></Field>
        <Field label="الاسم *"><TInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="col-span-2"><Field label="ملاحظات"><TInput value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
      </div>
    </Modal>
  );
}
