const path = require("path");
try { require("dotenv").config({ path: path.join(__dirname, "server", ".env") }); } catch { require(path.join(__dirname, "server", "node_modules", "dotenv")).config({ path: path.join(__dirname, "server", ".env") }); }
const express = require("express");

function requireEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === "") throw new Error(`متغير البيئة مطلوب: ${name} (ضعه في server/.env)`);
  return v;
}

const app = express();
const WEB_PORT = Number(requireEnv("WEB_PORT"));
const WEB_HOST = requireEnv("WEB_HOST");
if (!Number.isFinite(WEB_PORT) || WEB_PORT <= 0) throw new Error("WEB_PORT غير صالح");

const distDir = path.join(__dirname, "dist");
const NO_CACHE = new Set(["/index.html", "/sw.js", "/manifest.json", "/version.json", "/clear-cache.html"]);
app.use(express.static(distDir, {
  setHeaders(res, filePath) {
    const p = "/" + filePath.replace(/\\/g, "/").split("/").pop();
    if (NO_CACHE.has(p) || filePath.replace(/\\/g, "/").endsWith("/index.html")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    } else if (/\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico|webp|map)$/i.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  },
}));
app.get("*", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(WEB_PORT, WEB_HOST, () => {
  console.log(`الواجهة تعمل على http://${WEB_HOST}:${WEB_PORT}`);
});
