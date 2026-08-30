/**
 * عميل الاتصال بقاعدة البيانات المركزية (MySQL عبر الخادم).
 * يفشل بأمان ويعيد null عند غياب الخادم — فتبقى الواجهة على التخزين المحلي.
 */

function baseUrl(): string {
  try {
    const manual = localStorage.getItem("dental-api-url");
    if (manual) return manual.replace(/\/$/, "");
  } catch {
    /* بيئات بلا localStorage */
  }
  const env = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL;
  return (env || "http://localhost:4000").replace(/\/$/, "");
}

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(baseUrl() + path, {
      ...opts,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** رسالة الخطأ من استجابة غير ناجحة — لقراءة الخطأ الحقيقي من MySQL */
async function reqWithBody<T>(path: string, opts?: RequestInit): Promise<{ status: number; body: T | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(baseUrl() + path, {
      ...opts,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    });
    let body: T | null = null;
    try {
      body = (await res.json()) as T;
    } catch {
      /* استجابة بلا جسم */
    }
    return { status: res.status, body };
  } catch (e) {
    return { status: 0, body: null };
  } finally {
    clearTimeout(timer);
  }
}

/** جلب الحالة الكاملة من MySQL — null إذا تعذّر */
export async function fetchState(): Promise<Record<string, unknown> | null> {
  try {
    const data = await req<{ db: Record<string, unknown> | null }>("/api/state");
    return data?.db ?? null;
  } catch {
    return null;
  }
}

/** دفع الحالة إلى MySQL (دمج) — `wipe` تعني استبدالاً شاملاً لكل الأجهزة */
export async function saveState(db: unknown): Promise<{ ok: boolean; error?: string }> {
  const { status, body } = await reqWithBody<{ ok?: boolean; error?: string }>("/api/state", {
    method: "PUT",
    body: JSON.stringify(db),
  });
  if (status === 0) return { ok: false, error: "تعذّر الوصول إلى الخادم — تأكد أنه يعمل (npm start)." };
  if (status >= 200 && status < 300) return { ok: true };
  const msg = body?.error;
  return { ok: false, error: msg ? `خطأ MySQL: ${msg}` : `فشل الحفظ (HTTP ${status}).` };
}

/** فحص توفر الخادم */
export async function ping(): Promise<boolean> {
  try {
    await req("/api/health");
    return true;
  } catch {
    return false;
  }
}

/* ============================ المزامنة اللحظية ============================ */

/** استطلاع: هل تغيّرت المركزية منذ لحظة معينة؟ (gen يرتفع عند الاستبدال الشامل) */
export async function pollState(since: number): Promise<{ changed: boolean; at: number; gen: number } | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${baseUrl()}/api/poll?since=${since}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as { changed: boolean; at: number; gen: number };
  } catch {
    return null;
  }
}

/** جلب الحالة المدمجة مع سجل الحذف والجيل الحالي */
export async function fetchMergedState(): Promise<{ db: Record<string, unknown> | null; tombstones: { entity: string; record_id: string }[]; gen: number } | null> {
  try {
    const data = await req<{ db: Record<string, unknown> | null; tombstones?: { entity: string; record_id: string }[]; gen?: number }>("/api/state");
    return { db: data?.db ?? null, tombstones: data?.tombstones ?? [], gen: data?.gen ?? 0 };
  } catch {
    return null;
  }
}

/* ============================ سجل النشاط ============================ */

export interface ActivityEvent {
  at: number;
  action: string;
  cat: string;
  desc: string;
  entity?: string;
  recordId?: string;
}

/** دفع دفعة أحداث نشاط */
export async function postEvents(payload: {
  deviceId: string;
  deviceLabel: string;
  userName: string;
  userRole: string;
  events: ActivityEvent[];
}): Promise<boolean> {
  const { status } = await reqWithBody("/api/events", { method: "POST", body: JSON.stringify(payload) });
  return status >= 200 && status < 300;
}

export interface LogRow {
  id: number;
  at: number;
  device_id: string;
  device_label: string;
  user_name: string;
  user_role: string;
  action: string;
  cat: string;
  description: string;
}

/** جلب سجل الأحداث (للمدير) */
export async function fetchEvents(limit = 300): Promise<LogRow[]> {
  try {
    return await req<LogRow[]>(`/api/events?limit=${limit}`);
  } catch {
    return [];
  }
}

export interface DeviceRow {
  device_id: string;
  label: string;
  last_user: string;
  last_seen: number;
}

/** الأجهزة المسجلة في الشبكة */
export async function fetchDevices(): Promise<DeviceRow[]> {
  try {
    return await req<DeviceRow[]>("/api/devices");
  } catch {
    return [];
  }
}

/** مراحل تشخيص الاتصال */
export type DbCheckStage = "ok" | "no-server" | "old-server" | "db-error";

/** فحص اتصال قاعدة البيانات الفعلي — تشخيص متعدد المراحل برسائل دقيقة */
export async function checkDb(): Promise<{ stage: DbCheckStage; error?: string; records?: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(baseUrl() + "/api/db-check", { signal: ctrl.signal });
    if (res.status === 404 || res.status === 405)
      return {
        stage: "old-server",
        error: "الخادم يعمل لكن نسخة الكود قديمة — لا تحتوي نقطة فحص القاعدة. أعد تشغيل الخادم بالنسخة المحدّثة (server/index.js).",
      };
    let body: { ok?: boolean; error?: string; records?: number } | null = null;
    try {
      body = (await res.json()) as { ok?: boolean; error?: string; records?: number };
    } catch {
      /* استجابة غير JSON */
    }
    if (res.ok && body?.ok) return { stage: "ok", records: body.records };
    return { stage: "db-error", error: body?.error ?? `رفض من الخادم (HTTP ${res.status}).` };
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    return {
      stage: "no-server",
      error: aborted
        ? "انتهت مهلة الاتصال (4 ثوانٍ) — الخادم لا يستجيب على العنوان المحدد."
        : "تعذّر الوصول إلى الخادم — تأكد من تشغيله (npm start) ومن العنوان، ومن السماح بـ CORS.",
    };
  } finally {
    clearTimeout(timer);
  }
}
