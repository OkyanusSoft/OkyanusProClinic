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

/** جلب الحالة الكاملة من MySQL — null إذا تعذّر */
export async function fetchState(): Promise<Record<string, unknown> | null> {
  try {
    const data = await req<{ db: Record<string, unknown> | null }>("/api/state");
    return data?.db ?? null;
  } catch {
    return null;
  }
}

/** دفع الحالة الكاملة إلى MySQL — true عند النجاح */
export async function saveState(db: unknown): Promise<boolean> {
  try {
    await req("/api/state", { method: "PUT", body: JSON.stringify(db) });
    return true;
  } catch {
    return false;
  }
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
