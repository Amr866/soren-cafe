# SOREN CAFÉ (کافه سورن)

> **Specialty Coffee & Artisan Bakehouse**  
> High-Performance Real-Time Ordering, Kitchen Display System (KDS) & Observability Suite.

---

## ☕ Architecture Overview

* **Backend Engine:** Bun 1.4.2 + TypeScript + `bun:sqlite` with Write-Ahead Logging (WAL).
* **Real-Time Layer:** Native WebSockets with Pub/Sub broadcast channels.
* **Observability HUD:** Datadog/Grafana-style telemetry dashboard at `/dashboard`.
* **API Documentation:** Interactive OpenAPI 3.0 / Scalar UI at `/docs`.
* **Frontend:** Vanilla HTML5 + CSS + JavaScript (Zero dependencies, instant rendering).

---

## 🚀 Quick Start (راهنمای اجرا)

### ۱. راه‌اندازی بک‌اند (Backend Startup)
```bash
cd backend
bun install
bun run dev
```

Server boots on port `4000`:
* 📱 **منوی مشتری:** `http://localhost:4000`
* ☕ **مانیتور باریستا (KDS):** `http://localhost:4000/barista`
* 📊 **داشبورد مانیتورینگ زنده:** `http://localhost:4000/dashboard`
* 📖 **داکیومنت سواگر / Scalar:** `http://localhost:4000/docs`

---

## 🛠️ دستورات مهم برای روز ارائه (Demo Commands)

| دستور | کارایی |
| :--- | :--- |
| `bun run dev` | اجرای سرور بک‌اند با Hot-Reload و نمایش آی‌پی محلی وای‌فای |
| `bun run reset` | پاکسازی سفارشات تستی و ریست کردن دیتابیس قبل از شروع پرزنتیشن |
| `bun run test:load` | شلیک ۱۰,۰۰۰ درخواست پرسرعت (۵,۰۰۰+ RPS) برای تست لود زنده |
| `bun run test:security` | اجرای اسکریپت تست نفوذ (تست تقلب قیمت، دور زدن پین باریستا، و محافظ Rate-Limit) |

---

## 📂 ساختار پوشه‌بندی پروژه

```text
soren-cafe/
├── assets/                 # لوگو و تصاویر محصولات
│   └── logo-soren.png
├── backend/                # هسته سرور Bun + SQLite + WebSockets
│   ├── src/
│   │   ├── db.ts           # دیتابیس bun:sqlite با تراکنش‌های اتمیک
│   │   ├── docs.ts         # مستندات OpenAPI 3.0 و Scalar
│   │   ├── seed.ts         # سید کردن ۱۸ محصول اصیل کافه
│   │   └── server.ts       # اینتری‌پوینت اصلی سرور Bun.serve
│   ├── scripts/
│   │   ├── load-test.ts    # بنچمارک استرس‌تست
│   │   └── security-audit.ts # اسکریپت تست امنیت و نفوذ
│   ├── public/
│   │   └── dashboard.html  # داشبورد تله‌متری Datadog/Grafana
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # کدهای فرانت‌اند (HTML/CSS/JS)
│   ├── FRONTEND_INTEGRATION_GUIDE.md # راهنمای اتصال فرانت به بک
│   ├── index.html          # منوی مشتری سر میز
│   └── barista.html        # داشبورد تبلت باریستا (KDS)
└── PROJECT_SPEC.md         # هویت بصری، پالت رنگ و مشخصات ۱۸ محصول
```

---

## 👥 راهنمای همکاری (Collaboration)
* **رفیق فرانت‌اند:** کدهای `index.html` و `barista.html` را در پوشه `frontend/` قرار داده و با راهنمای موجود در [`frontend/FRONTEND_INTEGRATION_GUIDE.md`](frontend/FRONTEND_INTEGRATION_GUIDE.md) به API وصل می‌کند.
* **پوش کدهای فرانت:**
  ```bash
  git add frontend/
  git commit -m "feat: update customer menu and barista UI"
  git push
  ```
