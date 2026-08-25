import React, { useMemo, useState } from "react";
import { PERMISSIONS, relTime, ROLE_META, uid, useAuth, useStore, type Role, type User } from "../store";
import { IconPencil, IconPlus, IconShield, IconStetho, IconUsers } from "../icons";
import { Avatar, Badge, Drop, DropItem, Field, Modal, Switch, TInput, TSelect, TwoStepDelete, useToast } from "../components/ui";

export default function UsersPage() {
  const { db, dispatch } = useStore();
  const { user: me } = useAuth();
  const { push } = useToast();
  const [editing, setEditing] = useState<User | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: db.users.length };
    (Object.keys(ROLE_META) as Role[]).forEach((r) => (c[r] = db.users.filter((u) => u.role === r).length));
    return c;
  }, [db.users]);

  const list = useMemo(
    () => db.users.filter((u) => roleFilter === "all" || u.role === roleFilter),
    [db.users, roleFilter]
  );

  const linkedName = (u: User) => {
    if (!u.linkId) return null;
    const d = db.doctors.find((x) => x.id === u.linkId);
    if (d) return { label: d.name, sub: d.specialty };
    const s = db.staff.find((x) => x.id === u.linkId);
    if (s) return { label: s.name, sub: s.role };
    return null;
  };

  const togglePerm = (u: User, key: string, on: boolean) => {
    if (u.role === "admin") return;
    const permissions = on ? [...new Set([...u.permissions, key])] : u.permissions.filter((p) => p !== key);
    dispatch({ type: "UPDATE_USER", u: { ...u, permissions } });
    push("info", on ? "مُنحت صلاحية" : "سُحبت صلاحية", `${u.name} — ${PERMISSIONS.find((p) => p.key === key)?.label}`);
  };

  return (
    <div className="space-y-6">
      <div className="anim-rise flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-ink flex items-center gap-3">
            <IconShield className="w-8 h-8 text-jade-deep" />
            المستخدمون والصلاحيات
          </h1>
          <p className="text-sm text-soft mt-1.5">تحكم كامل فيمن يدخل النظام وما الذي يراه — كل دور يرى شاشاته فقط.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <IconPlus className="w-4.5 h-4.5" />
          مستخدم جديد
        </button>
      </div>

      {/* شرائح الأدوار */}
      <div className="flex flex-wrap gap-2 anim-rise" style={{ animationDelay: "80ms" }}>
        {([["all", "الكل"], ...Object.entries(ROLE_META).map(([k, v]) => [k, v.label])] as [string, string][]).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setRoleFilter(k as "all" | Role)}
            className={`h-10 px-4 rounded-lg text-xs font-bold cursor-pointer transition-all border inline-flex items-center gap-2 ${
              roleFilter === k ? "bg-pine text-white border-pine shadow-sm" : "bg-white text-soft border-line hover:border-jade/50"
            }`}
          >
            {l}
            <span className={`stat-num !text-[10px] px-1.5 py-0.5 rounded ${roleFilter === k ? "bg-white/15" : "bg-mist"}`}>{counts[k] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* ====== مصفوفة الصلاحيات ====== */}
      <div className="card overflow-hidden anim-rise" style={{ animationDelay: "140ms" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <h2 className="font-display font-bold text-lg text-ink">مصفوفة الصلاحيات</h2>
          <p className="text-[11px] font-semibold text-soft">فعّل أو عطّل أي شاشة لأي مستخدم مباشرة</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-mist/70 border-b border-line">
              <tr>
                <th className="th sticky start-0 bg-mist z-10 min-w-52">المستخدم</th>
                {PERMISSIONS.map((p) => (
                  <th key={p.key} className="th text-center !px-2" title={p.desc}>
                    <span className="inline-block max-w-16 truncate">{p.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((u, i) => (
                <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-jade-soft/25 transition-colors anim-fade" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="td sticky start-0 bg-white z-10">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} size="w-8 h-8 text-[10px]" />
                      <div>
                        <p className="text-[13px] font-bold text-ink leading-tight">{u.name}</p>
                        <span className={`chip mt-1 ${ROLE_META[u.role].cls} !text-[9px] !px-2 !py-0.5`}>{ROLE_META[u.role].label}</span>
                      </div>
                    </div>
                  </td>
                  {PERMISSIONS.map((p) => {
                    const on = u.role === "admin" ? true : u.permissions.includes(p.key);
                    return (
                      <td key={p.key} className="td text-center !px-2">
                        {u.role === "admin" ? (
                          <span className="inline-flex w-10 h-[22px] rounded-full bg-pine items-center justify-center" title="للمدير كل الصلاحيات">
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                          </span>
                        ) : (
                          <Switch on={on} onChange={(v) => togglePerm(u, p.key, v)} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-[11px] font-semibold text-soft border-t border-line bg-mist/50 flex items-center gap-2">
          <IconShield className="w-4 h-4 text-jade-deep shrink-0" />
          الطبيب يرى تلقائياً مرضاه ومواعيده وجلساته فقط حتى داخل الشاشات المسموحة — وهذا النطاق لا يمكن توسيعه.
        </p>
      </div>

      {/* ====== الحسابات ====== */}
      <div className="card overflow-hidden anim-rise" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <h2 className="font-display font-bold text-lg text-ink flex items-center gap-2">
            <IconUsers className="w-5 h-5 text-jade-deep" />
            حسابات المستخدمين
          </h2>
          <span className="chip bg-mist text-soft stat-num">{db.users.length} حساب</span>
        </div>
        <ul className="divide-y divide-line/60">
          {list.map((u, i) => {
            const linked = linkedName(u);
            const isMe = me?.id === u.id;
            return (
              <li key={u.id} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-jade-soft/25 transition-colors anim-fade" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="relative">
                  <Avatar name={u.name} size="w-11 h-11 text-sm" />
                  <span
                    className={`absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${u.active ? "bg-mint pulse-dot" : "bg-line"}`}
                  />
                </div>
                <div className="min-w-40">
                  <p className="font-bold text-sm text-ink flex items-center gap-2">
                    {u.name}
                    {isMe && <span className="chip bg-jade-soft text-jade-deep !text-[9px] !px-1.5 !py-0.5">أنت</span>}
                  </p>
                  <p className="text-[11px] text-soft mt-0.5" dir="ltr">@{u.username} · رمز {u.pin.replace(/./g, "•")}</p>
                </div>
                <Badge cls={ROLE_META[u.role].cls}>{ROLE_META[u.role].label}</Badge>
                {linked && (
                  <span className="hidden md:inline-flex items-center gap-2 text-[11px] font-semibold text-soft bg-mist rounded-lg px-3 py-1.5">
                    <IconStetho className="w-3.5 h-3.5 text-jade-deep" />
                    {linked.label} — {linked.sub}
                  </span>
                )}
                <span className="text-[11px] font-semibold text-soft">
                  {u.role === "admin" ? "كل الصلاحيات" : `${u.permissions.length} صلاحية`}
                </span>
                <div className="ms-auto flex items-center gap-4">
                  <div className="text-end hidden sm:block">
                    <p className="text-[10px] font-bold text-soft">آخر دخول</p>
                    <p className="text-[11px] font-semibold text-ink mt-0.5">{u.lastLogin ? relTime(u.lastLogin) : "لم يدخل بعد"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-soft">{u.active ? "نشط" : "موقوف"}</span>
                    <Switch
                      on={u.active}
                      onChange={(v) => {
                        if (isMe && !v) {
                          push("warn", "لا يمكنك إيقاف حسابك أثناء استخدامك له");
                          return;
                        }
                        dispatch({ type: "UPDATE_USER", u: { ...u, active: v } });
                        push(v ? "success" : "warn", v ? "فُعِّل الحساب" : "أُوقف الحساب", u.name);
                      }}
                    />
                  </div>
                  <button onClick={() => setEditing(u)} className="icon-btn" aria-label="تعديل">
                    <IconPencil className="w-4 h-4" />
                  </button>
                  {u.role !== "admin" && !isMe && (
                    <TwoStepDelete
                      onConfirm={() => {
                        dispatch({ type: "DELETE_USER", id: u.id });
                        push("warn", "حُذف الحساب", u.name);
                      }}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {(showAdd || editing) && (
        <UserModal
          user={editing ?? undefined}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ============================ نافذة إنشاء / تعديل ============================ */

function UserModal({ user, onClose }: { user?: User; onClose: () => void }) {
  const { db, dispatch } = useStore();
  const { push } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [pin, setPin] = useState(user?.pin ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "doctor");
  const [linkId, setLinkId] = useState(user?.linkId ?? "");
  const [active, setActive] = useState(user?.active ?? true);
  const [perms, setPerms] = useState<string[]>(user?.permissions ?? ROLE_META.doctor.defaults);
  const [err, setErr] = useState("");

  const isEdit = !!user;

  const setPreset = (r: Role) => {
    setRole(r);
    setPerms(ROLE_META[r].defaults);
  };

  const toggle = (key: string) =>
    setPerms((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));

  const save = () => {
    if (name.trim().length < 2) return setErr("أدخل اسم المستخدم.");
    if (username.trim().length < 3) return setErr("اسم الدخول قصير جداً (3 أحرف على الأقل).");
    if (!/^[0-9]{4}$/.test(pin)) return setErr("رمز الدخول يجب أن يكون 4 أرقام بالضبط.");
    const dup = db.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== user?.id);
    if (dup) return setErr("اسم الدخول مستخدم من قبل — اختر اسماً آخر.");

    const u: User = {
      id: user?.id ?? uid(),
      name: name.trim(),
      username: username.trim().toLowerCase(),
      pin,
      role,
      linkId: role === "admin" ? undefined : linkId || undefined,
      active,
      permissions: role === "admin" ? ROLE_META.admin.defaults : perms,
      lastLogin: user?.lastLogin,
    };
    dispatch({ type: isEdit ? "UPDATE_USER" : "ADD_USER", u });
    push("success", isEdit ? "تم حفظ التعديلات" : "أُنشئ حساب جديد", `${u.name} — ${ROLE_META[u.role].label}`);
    onClose();
  };

  const linkOptions = role === "doctor" ? db.doctors.map((d) => ({ id: d.id, label: `${d.name} — ${d.specialty}` })) : db.staff.map((s) => ({ id: s.id, label: `${s.name} — ${s.role}` }));

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `تعديل حساب «${user.name}»` : "مستخدم جديد"}
      subtitle="حدد الدور ثم امنح الصلاحيات المناسبة — الطبيب يُربط بملفه ليُقيَّد بمرضاه"
      width="max-w-2xl"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>إلغاء</button>
          <button className="btn-primary" onClick={save}>{isEdit ? "حفظ التعديلات" : "إنشاء الحساب"}</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="الاسم الكامل *">
          <TInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أمل عبدالرحمن" />
        </Field>
        <Field label="اسم الدخول *">
          <TInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="amal" dir="ltr" />
        </Field>
        <Field label="رمز الدخول (4 أرقام) *">
          <TInput value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" dir="ltr" />
        </Field>
        <Field label="الحالة">
          <div className="flex items-center gap-3 h-10">
            <Switch on={active} onChange={setActive} />
            <span className="text-xs font-bold text-soft">{active ? "نشط — يمكنه الدخول" : "موقوف"}</span>
          </div>
        </Field>

        <div className="col-span-2">
          <label className="label">الدور</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(Object.keys(ROLE_META) as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setPreset(r)}
                className={`rounded-xl border-2 p-3 text-start cursor-pointer transition-all ${
                  role === r ? "border-jade bg-jade-soft" : "border-line bg-white hover:border-jade/40"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-ink">{ROLE_META[r].label}</span>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: ROLE_META[r].color }} />
                </span>
                <span className="block text-[10px] text-soft mt-1 leading-relaxed">{ROLE_META[r].desc}</span>
              </button>
            ))}
          </div>
        </div>

        {role !== "admin" && (
          <Field label={role === "doctor" ? "ربط بملف الطبيب *" : "ربط بملف الموظف"} hint={role === "doctor" ? "يُستخدم لتقييد الطبيب بمرضاه ومواعيده" : undefined}>
            <TSelect value={linkId} onChange={(e) => setLinkId(e.target.value)}>
              <option value="">— بدون ربط —</option>
              {linkOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </TSelect>
          </Field>
        )}

        {role !== "admin" && (
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">الصلاحيات الممنوحة ({perms.length})</label>
              <button onClick={() => setPerms(ROLE_META[role].defaults)} className="text-[11px] font-bold text-jade-deep hover:underline cursor-pointer">
                استعادة الافتراضي للدور
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PERMISSIONS.filter((p) => p.key !== "users").map((p) => {
                const on = perms.includes(p.key);
                return (
                  <button
                    key={p.key}
                    onClick={() => toggle(p.key)}
                    className={`rounded-lg border px-3 py-2.5 text-start cursor-pointer transition-all ${
                      on ? "border-jade bg-jade-soft" : "border-line bg-white hover:border-jade/40"
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-[12px] font-bold text-ink">{p.label}</span>
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${on ? "bg-jade border-jade" : "border-line"}`}>
                        {on && <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>}
                      </span>
                    </span>
                    <span className="block text-[10px] text-soft mt-0.5 leading-snug">{p.desc}</span>
                  </button>
                );
              })}
            </div>
            {role !== "doctor" && role !== "secretary" && (
              <p className="text-[10px] text-soft mt-2">صلاحية «المستخدمون والصلاحيات» متاحة للمدير فقط.</p>
            )}
          </div>
        )}
      </div>
      {err && <p className="mt-4 text-xs font-bold text-coral bg-coral-soft rounded-lg px-3 py-2.5 anim-pop">{err}</p>}
    </Modal>
  );
}
