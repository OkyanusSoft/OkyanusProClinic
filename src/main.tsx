import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/500.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";
import "./index.css";
import App from "./App.tsx";
import { applyPrefs, loadPrefs } from "./prefs";

applyPrefs(loadPrefs());
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

const isProd = (import.meta as any).env?.PROD ?? !location.hostname.includes("localhost");
const VERSION_KEY = "app-build-version";

async function clearAllCaches() {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
}

async function forceReload(ver: string) {
  if (sessionStorage.getItem(VERSION_KEY) === ver) return; // avoid loop
  sessionStorage.setItem(VERSION_KEY, ver);
  try { await clearAllCaches(); } catch {}
  const u = new URL(window.location.href);
  u.searchParams.set("v", ver);
  window.location.replace(u.toString());
}

async function checkVersionAndUpdate() {
  try {
    const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const ver = String(data?.version ?? data?.build ?? "");
    if (!ver) return;
    const prev = localStorage.getItem(VERSION_KEY);
    if (prev && prev !== ver) {
      await forceReload(ver);
      return;
    }
    if (!prev) localStorage.setItem(VERSION_KEY, ver);
  } catch {}
}

if (isProd && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      reg.update().catch(() => {});
      setInterval(() => reg.update().catch(() => {}), 30 * 1000);
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) nw.postMessage({ type: "SKIP_WAITING" });
        });
      });
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", async () => {
        if (refreshing) return; refreshing = true;
        await forceReload(String(Date.now()));
      });
      await checkVersionAndUpdate();
      setInterval(checkVersionAndUpdate, 60 * 1000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { reg.update().catch(()=>{}); checkVersionAndUpdate(); } });
      window.addEventListener("focus", () => checkVersionAndUpdate());
    } catch {}
  });
}
