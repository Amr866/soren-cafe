# ☕ SOREN CAFÉ (کافه سورن)

> **Specialty Coffee & Artisan Bakehouse**  
> High-Performance Real-Time Ordering System, Telemetry Observability Suite & Microsecond Backend Engine.

[![Bun](https://img.shields.io/badge/Bun-1.4.2-black?logo=bun)](https://bun.sh)
[![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-blue?logo=sqlite)](https://sqlite.org)
[![WebSocket](https://img.shields.io/badge/WebSockets-Real--Time-orange)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Scalar Docs](https://img.shields.io/badge/API%20Docs-Scalar-purple)](http://localhost:4000/docs)
[![Zero-JS-Bloat](https://img.shields.io/badge/Frontend-Vanilla%20JS%20%7C%20PWA-green)](frontend/)

---

## 🏛️ معماری و ویژگی‌های کلیدی (Key Features)

### ۱. رابط کاربری مشتری (Craft Frontend Experience)
* **عملکرد فوق‌العاده سریع (<400ms FCP):** ساخته‌شده با Vanilla HTML5/CSS/JavaScript بدون هیچ فریم‌ورک سنگین، کامپایلر یا لایبرری اضافی؛ آماده برای اجرای آنی روی اینترنت موبایل.
* **استپرهای درلحظه روی کارت‌ها (Instant In-Card Steppers):** افزودن سریع آیتم‌ها تنها با لمس مستقیم دکمه `+` روی کارت‌ها، باز شدن نرم استپر `[ − ] [ ۱ ] [ + ]` و فیدبک لمسی هپتیک فیزیکی (`navigator.vibrate(12)`).
* **پیل شناور سفارش جاری (Floating Order Pill):** نوار خلاصه سفارش چسبان با انیمیشن تپش فنری (`order-pill-pulse`) و همگام‌سازی بی‌درنگ اقلام و قیمت کل.
* **قفسه هوشمند مکمل قهوه داخل سبد (Contextual Upsell Shelf - AOV +25%):** پیشنهاد هوشمند چیزکیک سن‌سباستین در دراور سبد خرید با افزودن ۱-تپ بدون قطع جریان سفارش.
* **سنتز صدای ارگانیک (Acoustic Feedback Engine):** بهره‌گیری از Web Audio API برای صدای لمسی ملایم روی تعاملات کاربر بدون دکمه‌های شلوغ‌کننده UI.
* **تجربه مشتری بدون اصطکاک (Zero Login Required):** ثبت سفارش سر میز با شماره میز بدون اجبار به ثبت‌نام/لاگین، به همراه پایداری کامل سبد خرید در `localStorage` در برابر رفرش ناخواسته.
* **طراحی ۱۰۰٪ واکنش‌گرا (Responsive PWA):** بهینه‌سازی‌شده برای تمامی نمایشگرهای ۳۲۰px تا ۱۲۸۰px (موبایل، تبلت و دسکتاپ).

### ۲. هسته بک‌اند و موتور توزیع‌شده (Backend Engine)
* **ران‌تایم مدرن:** توسعه‌یافته بر بستر **Bun 1.4.2** با معماری فول تایپ‌اسکریپت (`TypeScript`).
* **دیتابیس اتمیک:** استفاده از `bun:sqlite` با حالت Write-Ahead Logging (WAL) و کنترل همزمانی تراکنش‌ها.
* **درگاه بلادرنگ (WebSocket Gateway):** کانال‌های اختصاصی Pub/Sub برای هماهنگی وضعیت میزها (`all-clients`)، جریان سفارشات و تله‌متری.
* **پاکسازی خودکار هولد میزها:** سوییپر خودکار ۳ ثانیه‌ای برای آزادسازی میزهای رزرو موقت منقضی‌شده.
* **مستندات تعاملی API:** پشتیبانی کامل از OpenAPI 3.0 با رابط کاربری مدرن **Scalar** در آدرس `/docs`.
* **داشبورد مانیتورینگ زنده (Telemetry HUD):** رابط رصد متریک‌های بلادرنگ نظیر RPS، اتصالات فعال، حافظه Heap/RSS در مسیر `/dashboard`.

---

## 🚀 راهنمای نصب و اجرا (Quick Start)

### پیش‌نیازها
* [Bun](https://bun.sh/) (نسخه ۱.۲ یا بالاتر)
* Node.js (اختیاری، جهت اجرای اسکریپت‌های تست CDP و رسپانسیو)

### ۱. نصب وابستگی‌ها و سید دیتابیس
```bash
# نصب وابستگی‌های پکیج‌ها
bun install

# ایجاد جداول و وارد کردن ۳۷ محصول اصیل کافه سورن
bun run seed
```

### ۲. اجرای سرور توسعه (Dev Server)
```bash
bun run dev
```

سرور روی پورت `4000` بالا می‌آید و روی شبکه محلی (Wi-Fi) نیز در دسترس خواهد بود:
* ☕ **منوی فروشگاهی مشتری:** [http://localhost:4000](http://localhost:4000)
* 📱 **ورود تماشاچیان / نسخه موبایل:** `http://<YOUR_LOCAL_IP>:4000/join`
* 📊 **داشبورد تله‌متری و سلامت سرور:** [http://localhost:4000/dashboard](http://localhost:4000/dashboard)
* 📖 **داکیومنت تعاملی Scalar / OpenAPI:** [http://localhost:4000/docs](http://localhost:4000/docs)
* ⚡ **سوکت بلادرنگ:** `ws://localhost:4000/ws`

---

## 🛠️ دستورات تست و بنچمارک (Test & Benchmark Commands)

| دستور | کارایی |
| :--- | :--- |
| `bun run dev` | اجرای سرور با قابلیت Hot-Reload و گوش فرادادن به تغییرات فایل‌ها |
| `bun run seed` | بارگذاری اولیه ۳۷ محصول، دسته‌بندی‌ها و متادیتا در SQLite |
| `bun run reset` | پاکسازی سفارشات تستی، آزادسازی تمام میزها و تنظیم مجدد دیتابیس |
| `bun run test:load` | تست استرس و شلیک ۱۰,۰۰۰ درخواست پرسرعت (۵,۰۰۰+ RPS) برای تست پایداری |
| `bun run test:security` | تست نفوذ خودکار (جلوگیری از تقلب قیمت، حفاظت بروت‌فورس پین باریستا، و Rate-Limit) |
| `bun run test:responsive` | تست خودکار ۴۸ سناریوی ابعاد نمایشگر در مرورگر Headless Chrome با CDP |
| `node scripts/verify-stepper-and-upsell.mjs` | راستی‌آزمایی عملکرد استپرهای درون کارتی، پیل شناور و شلف آپ‌سل سبد خرید |

---

## 📂 ساختار پوشه‌بندی پروژه (Project Structure)

```text
soren-cafe/
├── assets/                     # فایل‌های گرافیکی، تصاویر محصولات و لوگو
├── backend/                    # هسته پرسرعت Bun + SQLite + WebSocket
│   ├── public/                 # صفحات مستقل داشبورد و تله‌متری
│   │   ├── dashboard.html      # داشبورد نظارتی زنده (Datadog/Grafana style)
│   │   └── join.html           # کلاینت ورود و تعامل موبایلی
│   ├── src/
│   │   ├── routes/             # تفکیک روت‌های API، استاتیک و کلاستر
│   │   │   ├── api.ts          # اندپوینت‌های RESTful سفارش، میزها و محصولات
│   │   │   ├── cluster.ts      # مسیرهای کلاستر و مانیتورینگ
│   │   │   ├── helpers.ts      # توابع کمکی CORS، احراز هویت باریستا و JSON
│   │   │   └── static.ts       # سرو مستقیم فرانت‌اند و مستندات
│   │   ├── db.ts               # لایه پایگاه داده bun:sqlite و تراکنش‌های اتمیک
│   │   ├── docs.ts             # تعریف مشخصات OpenAPI 3.0 و تولیدگر Scalar
│   │   ├── seed.ts             # بذرپاشی محصولات اصیل منو در دیتابیس
│   │   ├── server.ts           # اینتری‌پوینت سرور با Bun.serve
│   │   └── telemetry.ts        # موتور گردآوری متریک‌ها و ضربان قلب سیستم
│   ├── scripts/
│   │   ├── load-test.ts        # اسکریپت تست بار و اندازه‌گیری تأخیر
│   │   └── security-audit.ts   # ممیزی خودکار امنیت و محافظت نرخ
│   ├── package.json
│   └── tsconfig.json
├── docs/                       # اسناد فنی، تصمیمات معماری (ADR) و نقشه‌های راه
├── frontend/                   # رابط کاربری مستقل مشتری (Vanilla Web)
│   ├── css/
│   │   └── style.css           # سیستم طراحی مدرن، انیمیشن‌ها و استایل‌ها
│   ├── fonts/                  # وب‌فونت‌های محلی با لود بهینه
│   ├── images/                 # تصاویر عکاسی‌شده و ماکرو از نوشیدنی‌ها و کیک‌ها
│   ├── pages/                  # صفحات فرعی منو، درباره ما، حساب کاربری
│   │   ├── about.html
│   │   ├── cake.html
│   │   ├── cart.html
│   │   ├── coffee.html
│   │   ├── login.html
│   │   ├── register.html
│   │   └── shakes.html
│   ├── index.html              # صفحه اصلی و کاتالوگ فروشگاهی
│   ├── main.js                 # موتور منطق کلاینت، سبد خرید، کشو و هپتیک
│   └── manifest.json           # مانیفست وب‌اپلیکیشن پیش‌رونده (PWA)
├── scripts/                    # اسکریپت‌های تست بین دستگاهی و تست‌های E2E
│   ├── verify-responsive.mjs   # تست خودکار ریسپانسیو در ۶ ویوپورت
│   └── verify-stepper-and-upsell.mjs # راستی‌آزمایی E2E استپرها و شلف آپ‌سل
├── package.json                # مدیریت ورک‌اسپیس‌ها و اسکریپت‌های ریشه
└── README.md
```

---

## 👥 همکاران و توسعه‌دهندگان (Contributors & Collaboration)

این پروژه با همکاری نزدیک در بخش مهندسی فرانت‌اند و بک‌اند توسعه یافته است:

* **Frontend Engineering & Collaboration:**
  * [**Mohammad Hossein Yazdi** (@mhyazdi86-ai)](https://github.com/mhyazdi86-ai) — همکاری و مشارکت در توسعه فرانت‌اند، طراحی رابط کاربری (UI/UX) و پیاده‌سازی تجربه تعاملی مشتری در کافه سورن.
* **Core Architecture & System Engineering:**
  * تیم توسعه کافه سورن (Soren Café Development Team)

---

## 📄 مجوز (License)

این پروژه تحت مجوز خصوصی کافه سورن توسعه یافته است. تمامی حقوق محفوظ است.
