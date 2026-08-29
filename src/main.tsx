import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { applyPrefs, loadPrefs } from "./prefs";

/* تطبيق تفضيلات المظهر قبل الرسم الأول لتجنّب وميض الألوان */
applyPrefs(loadPrefs());

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
