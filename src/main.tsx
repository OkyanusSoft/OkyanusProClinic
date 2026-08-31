import React from "react";
import ReactDOM from "react-dom/client";
/* خط Cairo مضمّن محلياً داخل حزمة البناء — يعمل بلا إنترنت نهائياً */
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/500.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";
import "./index.css";
import App from "./App.tsx";
import { applyPrefs, loadPrefs } from "./prefs";

/* تطبيق تفضيلات المظهر قبل الرسم الأول لتجنّب وميض الألوان */
applyPrefs(loadPrefs());

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
