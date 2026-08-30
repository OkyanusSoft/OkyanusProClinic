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

/** دفع الحالة الكاملة إلى MySQL — يعيد النتيجة مع رسالة الخطأ الحقيقية */
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

/** فحص اتصال قاعدة البيانات الفعلي — يعيد رسالة الخطأ الحقيقية من MySQL */
export async function checkDb(): Promise<{ ok: boolean; error?: string; records?: number }> {
  try {
    const data = await req<{ ok: boolean; error?: string; records?: number }>("/api/db-check");
    return data;
  } catch {
    return { ok: false, error: "تعذّر الوصول إلى الخادم." };
  }
}
