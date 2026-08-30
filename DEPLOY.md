# 🚀 دليل النشر والتثبيت — نظام عيادة د. عبدالله الشرفي

دليل عملي كامل لتشغيل النظام على **سيرفر محلي (ويندوز 10)** و**سيرفر خارجي (cPanel)** — للواجهة الأمامية والخلفية معاً.

---

## 🏗️ معمارية النظام

```
┌─────────────────────┐      REST (JSON)      ┌──────────────────────┐     mysql2      ┌─────────────┐
│   الواجهة الأمامية   │  ───────────────────▶ │   الخلفية Node.js     │ ──────────────▶ │    MySQL     │
│  React + Vite        │   /api/state          │  Express · منفذ 4000  │   منفذ 3306     │ sharafi_     │
│  (ملفات dist/ الثابتة) │  ◀─────────────────── │  مجلد server/         │ ◀────────────── │ dental       │
└─────────────────────┘                        └──────────────────────┘                 └─────────────┘
        │
        └── إذا تعذّر الاتصال بالخلفية ← تعمل الواجهة تلقائياً بوضع التخزين المحلي (بدون فقد بيانات)
```

| المكوّن | التقنية | المجلد | المنفذ |
|---|---|---|---|
| الواجهة الأمامية | React 18 + Vite + Tailwind | جذر المشروع → `dist/` بعد البناء | 5173 (تطوير) / 80 (إنتاج) |
| الخلفية | Node.js 18+ + Express | `server/` | 4000 |
| قاعدة البيانات | MySQL 8 / MariaDB 10.6+ | مخطط: `server/schema.sql` | 3306 |

## 🤝 التشغيل متعدد الأجهزة (مزامنة الدمج)

النظام مبني على **مزامنة دمج مركزية** — كل الأجهزة (السكرتارية، الطبيب، المدير) تدمج بياناتها في قاعدة واحدة، ولا يحذف جهازٌ بياناتَ جهاز آخر:

- **لحظي**: ما تُدخله السكرتارية يظهر للطبيب خلال ~4 ثوانٍ (استطلاع دوري)، والعكس.
- **لا استبدال**: الدمج على مستوى السجل (الأحدث يفوز)، فإدخال مريض على جهاز لا يمحو ما أُدخل على جهاز آخر.
- **الحذف ينتشر**: حذف سجل على أي جهاز يسجَّل في `deletions` ويختفي من كل الأجهزة.
- **مراقبة المدير**: كل عملية (إضافة/تعديل/حذف/جلسة) تُسجَّل في `activity_log` باسم المستخدم وجهازه، وتُعرض في شاشة **«مراقبة النشاط»** (للمدير فقط) مع بث حي كل 5 ثوانٍ.
- **هوية الجهاز**: سمِّ كل جهاز من **الإعدادات العامة ← البيانات ← هوية هذا الجهاز** ليظهر باسمه في المراقبة.

| جدول MySQL جديد | الغرض |
|---|---|
| `activity_log` | سجل عمليات الموظفين (اسم، دور، جهاز، عملية، وصف، وقت) |
| `deletions` | سجل الحذف (tombstones) لنشر الحذف لكل الأجهزة |
| `device_registry` | الأجهزة المسجلة وآخر ظهور لها |

> عند أول تشغيل يرمّم الخادم جداوله بنفسه (`ensureSchema`) — لا حاجة لتنفيذ `schema.sql` يدوياً بعد التحديث.

---

# الجزء الأول — سيرفر محلي (ويندوز 10)

## 1️⃣ المتطلبات وتثبيتها

### Node.js (لواجهة + خلفية)
1. حمّل **Node.js LTS** من: `https://nodejs.org`
2. ثبّته بالخيارات الافتراضية (يشمل npm تلقائياً)
3. تحقق من موجه الأوامر (CMD):
```bat
node -v      :: يجب أن تظهر v18 أو أحدث
npm -v
```

### MySQL
الأسهل عبر **XAMPP** (يشمل MySQL + phpMyAdmin بواجهة رسومية):
1. حمّل XAMPP من `https://www.apachefriends.org` وثبّته
2. من لوحة XAMPP Control شغّل **MySQL** فقط
3. أو ثبّت **MySQL Installer** الرسمي من `https://dev.mysql.com/downloads/installer`

## 2️⃣ إنشاء قاعدة البيانات

### الطريقة الرسومية (phpMyAdmin — الموصى بها)
1. افتح `http://localhost/phpmyadmin`
2. تبويب **Import** ← **Choose File** ← اختر `server/schema.sql` من مجلد المشروع ← **Go**
3. سيتم إنشاء قاعدة `sharafi_dental` بكل جداولها تلقائياً ✓

### الطريقة النصية (CMD)
```bat
cd مسار\المشروع\server
mysql -u root -p < schema.sql
```
> إذا كان MySQL عبر XAMPP وكلمة المرور فارغة: `mysql -u root < schema.sql` (مسار mysql.exe داخل مجلد XAMPP\mysql\bin)

## 3️⃣ تشغيل الخلفية (Backend)

```bat
cd مسار\المشروع\server

:: 1. تثبيت الاعتماديات (مرة واحدة)
npm install

:: 2. إنشاء ملف الإعدادات
copy .env.example .env
```

افتح `server\.env` بمحرر نصوص وعدّله:
```ini
DB_HOST=localhost
DB_USER=root
DB_PASS=              :: اتركه فارغاً مع XAMPP الافتراضي
DB_NAME=sharafi_dental
PORT=4000
```

```bat
:: 3. تشغيل الخادم
npm start
```
✅ سترى: `خادم عيادة الشرفي يعمل على http://localhost:4000`

**اختبر الاتصال** — افتح في المتصفح:
```
http://localhost:4000/api/health
```
يجب أن يعود: `{"ok":true,"db":"sharafi_dental",...}`

## 4️⃣ تشغيل الواجهة الأمامية (Frontend)

### أ) وضع التطوير (مع إعادة تحميل فورية)
```bat
:: في نافذة CMD ثانية — من جذر المشروع
npm install
npm run dev
```
افتح: `http://localhost:5173`

### ب) وضع الإنتاج (الموصى به للتشغيل الدائم)
```bat
:: بناء نسخة نهائية مضغوطة مع عنوان الخلفية
set VITE_API_URL=http://localhost:4000
npm run build
```
ينتج مجلد `dist/` — شغّله بأي خادم ملفات ثابتة:
```bat
npx serve dist -l 8080
```
افتح: `http://localhost:8080`

### ربط الواجهة بالخلفية (طريقتان)
| الطريقة | متى | كيف |
|---|---|---|
| **عند البناء** | النسخة النهائية | متغير `VITE_API_URL` كما أعلاه |
| **أثناء التشغيل** | تغيير سريع بلا إعادة بناء | من وحدة تحكم المتصفح (F12): <br> `localStorage.setItem("dental-api-url", "http://localhost:4000")` ثم أعد تحميل الصفحة |

> 💡 **تحقق من الاتصال داخل النظام**: الإعدادات العامة ← البيانات والنسخ ← تبويب «قاعدة البيانات» ← زر «اختبار الاتصال» — أو راقب مؤشر «MySQL متصل» في الشريط العلوي.

## 5️⃣ إبقاء الخلفية تعمل دائماً

### الخيار الأسهل — Task Scheduler
1. أنشئ ملف `server\start-server.bat`:
```bat
cd /d "C:\المسار\الكامل\للمشروع\server"
npm start
```
2. «جدولة المهام» في ويندوز ← إنشاء مهمة أساسية ← **عند بدء تشغيل الكمبيوتر** ← تشغيل `start-server.bat`

### الخيار الاحترافي — PM2
```bat
npm install -g pm2
cd server
pm2 start index.js --name dental-api
pm2 save
:: للتشغيل التلقائي مع ويندوز: حزمة pm2-windows-service
```

## 6️⃣ مشاركة النظام على الشبكة المحلية (LAN)

للدخول من أجهزة العيادة الأخرى على نفس الراوتر:
1. اعرف IP السيرفر: في CMD اكتب `ipconfig` ← مثال `192.168.1.15`
2. اسمح بالمنافذ في جدار الحماية (PowerShell كمسؤول):
```powershell
New-NetFirewallRule -DisplayName "Dental API" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Dental Web" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```
3. أعد بناء الواجهة بعنوان الشبكة:
```bat
set VITE_API_URL=http://192.168.1.15:4000
npm run build
```
4. من أي جهاز عيادة افتح: `http://192.168.1.15:8080`

---

# الجزء الثاني — سيرفر خارجي (cPanel)

## ⚠️ أولاً: تحقق من دعم Node.js

ادخل لوحة cPanel وابحث عن **«Setup Node.js App»**:

| الحالة | الحل |
|---|---|
| ✅ **موجودة** (CloudLinux) | اتبع الخطوات أدناه مباشرة |
| ❌ **غير موجودة** (استضافة مشتركة PHP فقط) | انتقل إلى «الخطة البديلة» في نهاية هذا الجزء |

## 1️⃣ قاعدة البيانات على cPanel

1. من cPanel: **MySQL® Databases**
   - أنشئ قاعدة (مثال: `user_dental`)
   - أنشئ مستخدماً بكلمة مرور قوية
   - أضف المستخدم للقاعدة بصلاحيات **ALL PRIVILEGES**
   - 📝 دوّن الاسم الكامل مع البادئة: `user_dental` / `user_app`
2. افتح **phpMyAdmin** من cPanel
3. ⚠️ قبل الاستيراد: افتح `server/schema.sql` في محرر و**احذف السطرين الأولين**:
```sql
CREATE DATABASE IF NOT EXISTS sharafi_dental ...;   ← احذف
USE sharafi_dental;                                 ← احذف
```
> لأن cPanel ينشئ القاعدة مسبقاً ويمنع أمر CREATE DATABASE
4. اختر قاعدة `user_dental` من القائمة الجانبية ← تبويب **Import** ← ارفع الملف المعدّل ← **Go**

## 2️⃣ نشر الخلفية (Setup Node.js App)

1. cPanel ← **Setup Node.js App** ← **Create Application**
   - **Node.js version**: 18.x أو أحدث
   - **Application mode**: Production
   - **Application root**: `dental-api` (سيُنشأ مجلد بهذا الاسم)
   - **Application URL**: أنشئ نطاقاً فرعياً مثل `api.yourdomain.com`
   - **Application startup file**: `index.js`
2. عبر **File Manager** ارفع محتوى مجلد `server/` المحلي إلى `dental-api/`:
   - `index.js` · `package.json` · `.env` (⚠️ لا ترفع مجلد node_modules)
3. عدّل `.env` على السيرفر:
```ini
DB_HOST=localhost
DB_USER=user_app
DB_PASS=كلمة_المرور_القوية
DB_NAME=user_dental
PORT=4000
```
4. ارجع لصفحة Node.js App ← زر **Run NPM Install** بجانب التطبيق
5. زر **Restart** (أيقونة القلم ← حفظ/إعادة تشغيل)
6. اختبر: `https://api.yourdomain.com/api/health`

## 3️⃣ بناء الواجهة بعنوان السيرفر الخارجي

على جهازك المحلي:
```bat
set VITE_API_URL=https://api.yourdomain.com
npm run build
```

## 4️⃣ نشر الواجهة على cPanel

1. افتح `dist/` المحلي ← ارفع **محتوياته** (وليس المجلد نفسه) إلى `public_html/` عبر File Manager أو FTP
2. أضف ملف `public_html/.htaccess`:
```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# ضغط وتسريع
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
</IfModule>
```
3. من cPanel: **SSL/TLS Status** ← فعّل **AutoSSL** للنطاق والنطاق الفرعي (HTTPS إجباري — انظر ملاحظة الأمان)

## 🔐 ملاحظة أمان حاسمة

إذا كانت الواجهة على `https://` والخلفية على `http://` سيحجب المتصفح الاتصال (Mixed Content). الحلول:
- ✅ فعّل AutoSSL للخلفية أيضاً (`https://api.yourdomain.com`) — **الحل الصحيح**
- ثم أعد بناء الواجهة بعنوان `https://` وارفعها مجدداً

## 🔄 الخطة البديلة (استضافة لا تدعم Node.js)

| الخيار | الوصف |
|---|---|
| **A. ترقية لـ VPS مع cPanel** | بصلاحيات root ثبّت Node من SSH: <br> `curl -fsSL https://rpm.nodesource.com/setup_18.x \| bash -` ثم `yum install -y nodejs` <br> شغّل الخلفية بـ PM2 مع `pm2 startup` |
| **B. نفق آمن** | أبقِ الخلفية على سيرفر ويندوز المحلي وعرّضها عبر **Cloudflare Tunnel** (مجاني وآمن) أو ngrok، واربط الواجهة على cPanel بعنوان النفق `https://...trycloudflare.com` |
| **C. تشغيل محلي كامل** | النظام يعمل بوضع التخزين المحلي تلقائياً بلا خلفية — مع تصدير/استيراد النسخ الاحتياطية يدوياً بين الأجهزة |

---

# 🔧 حل المشكلات الشائعة

| العرض | السبب | الحل |
|---|---|---|
| مؤشر «تخزين محلي» رغم تشغيل الخلفية | عنوان API خاطئ | افحص `VITE_API_URL` أو `dental-api-url` في localStorage + زر اختبار الاتصال في الإعدادات |
| `ECONNREFUSED 3306` | MySQL غير شغّال | شغّله من XAMPP Control أو خدمات ويندوز |
| `ER_ACCESS_DENIED_ERROR` | بيانات `.env` خاطئة | طابق المستخدم/كلمة المرور مع صلاحيات القاعدة |
| صفحة بيضاء على cPanel | رُفع مجلد `dist` بدلاً من محتوياته | ارفع المحتويات داخل `public_html/` مباشرة |
| `Mixed Content blocked` | الخلفية http والواجهة https | فعّل SSL للنطاق الفرعي للخلفية |
| الخلفية تتوقف بعد إغلاق الجلسة | التشغيل من CMD مباشرة | استخدم PM2 أو Task Scheduler |
| `npm install` يفشل على cPanel | إصدار Node قديم | اختر Node 18+ من إعدادات التطبيق |

---

# 📦 روتين تحديث النظام

```bat
:: 1) حدّث ملفات المشروع من المصدر
:: 2) أعد بناء الواجهة بعنوان الخلفية
set VITE_API_URL=https://api.yourdomain.com
npm run build
:: 3) ارفع محتويات dist/ فوق ملفات public_html/
:: 4) إن تغيّر server/: ارفع الملفات و Run NPM Install ثم Restart من لوحة Node.js
```

> 🛡️ **قبل أي تحديث**: صدّر نسخة احتياطية من الإعدادات العامة ← البيانات والنسخ ← «تصدير نسخة احتياطية».

---

# 📌 ملخص سريع — عناوين التشغيل

| البيئة | الواجهة | الخلفية |
|---|---|---|
| تطوير محلي | `http://localhost:5173` | `http://localhost:4000` |
| إنتاج محلي | `http://localhost:8080` | `http://localhost:4000` |
| شبكة العيادة | `http://IP-السيرفر:8080` | `http://IP-السيرفر:4000` |
| cPanel | `https://yourdomain.com` | `https://api.yourdomain.com` |

**حسابات الدخول التجريبية**: مدير `abdullah/0000` · طبيب `najar/1111` · سكرتارية `arwa/4444`
