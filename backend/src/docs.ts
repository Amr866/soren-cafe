// OpenAPI 3.0.3 specification for Soren Cafe API
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Soren Café — Real-Time POS, KDS & Telemetry API",
    version: "1.4.2",
    description: `
### Soren Café Distributed Architecture & REST API Documentation

Authoritative specification for Soren Café high-performance distributed engine powered by **Bun Kernel**, **SQLite WAL**, and **Zero-Trust Defense Boundary**.

#### Architectural Highlights:
* **Real-Time Order & Kitchen Display (KDS):** Server-authoritative price validation and microsecond status dispatch.
* **Table Hold & Concurrency Lifecycle:** 15-minute optimistic table hold with atomic cleanup and seat management across all 8 tables.
* **Distributed Observability & Telemetry:** Physical Bézier network flow, microsecond span waterfall, and WAF rate mitigation.
* **Live WebSocket Bus:** Pub/sub channel multiplexing over \`ws://localhost:4000/ws\` for real-time table state and orders.
* **Zero-Trust Security Perimeter:** Hardware-grade rate limiting, SQL injection defense, and OWASP Top 10 mitigation.
    `,
    contact: {
      name: "Soren Engineering Team",
      url: "https://github.com/Amr866/soren-cafe",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Local Development Server (Bun Native)",
    },
    {
      url: "http://127.0.0.1:4000",
      description: "Localhost Loopback Interface",
    },
  ],
  tags: [
    { name: "Products", description: "کاتالوگ محصولات، کش L1 حافظه‌ای و مدیریت موجودی" },
    { name: "Orders", description: "ثبت سفارشات، مانیتور باریستا (KDS) و تسویه حساب میزها" },
    { name: "Tables", description: "مدیریت وضعیت میزها و چرخه رزرو موقت (Hold & Release)" },
    { name: "Cluster & Telemetry", description: "کنترل کلاستر، شبیه‌سازی فیل‌اور ورکرها و تریس‌های تله‌متری" },
    { name: "Authentication", description: "جریان امن بازیابی رمز عبور با حفاظت Rate Limit و Anti-Enumeration" },
    { name: "System", description: "سلامت هسته، مصرف حافظه و آمار تحلیلی موتور" },
  ],
  components: {
    securitySchemes: {
      BaristaPin: {
        type: "apiKey",
        in: "header",
        name: "X-Barista-Pin",
        description: "پین ۴ رقمی ورود باریستا (پیش‌فرض سیستم: 7788)",
      },
      AudienceIdentity: {
        type: "apiKey",
        in: "header",
        name: "X-Client-Id",
        description: "شناسه یکتای گوشی کلاینت سالن (مثلاً aud_9a4f21)",
      },
    },
    schemas: {
      Product: {
        type: "object",
        properties: {
          id: { type: "string", example: "prd_cortado" },
          name: { type: "string", example: "کورتادو پارسه (Parseh Cortado)" },
          category: { type: "string", enum: ["coffee", "cake", "shake"], example: "coffee" },
          price: { type: "integer", example: 95000, description: "قیمت نهایی به تومان" },
          description: { type: "string", example: "اسپرسو دوبل تخصصی با شیر بافت‌دار مخملی" },
          tags: { type: "string", example: "میکروفوم, متعادل" },
          is_available: { type: "integer", example: 1, description: "1 برای موجود، 0 برای ناموجود" },
          image_url: { type: "string", example: "/assets/products/cortado.png" },
        },
      },
      OrderInput: {
        type: "object",
        required: ["tableNumber", "items"],
        properties: {
          tableNumber: { type: "string", example: "میز ۴" },
          customerName: { type: "string", example: "استاد رضوانی" },
          phoneNumber: { type: "string", example: "09120000000" },
          sessionToken: { type: "string", example: "session-uuid-1234" },
          items: {
            type: "array",
            items: {
              type: "object",
              required: ["productId", "quantity"],
              properties: {
                productId: { type: "string", example: "prd_cortado" },
                quantity: { type: "integer", example: 2 },
              },
            },
          },
        },
      },
      CafeTable: {
        type: "object",
        properties: {
          id: { type: "string", example: "tbl_1" },
          table_number: { type: "string", example: "میز ۱" },
          capacity: { type: "integer", example: 4 },
          status: { type: "string", enum: ["VACANT", "HELD", "OCCUPIED"], example: "VACANT" },
          held_by_session: { type: "string", nullable: true, example: null },
          held_at: { type: "string", nullable: true, example: null },
          hold_expires_at: { type: "string", nullable: true, example: null },
        },
      },
      ClusterState: {
        type: "object",
        properties: {
          worker1: { type: "boolean", example: true },
          worker2: { type: "boolean", example: true },
          activeWorkerCount: { type: "integer", example: 2 },
          cacheEnabled: { type: "boolean", example: true },
          totalTracesRecorded: { type: "integer", example: 412 },
          p50LatencyUs: { type: "integer", example: 76 },
          p95LatencyUs: { type: "integer", example: 540 },
          currentRps: { type: "integer", example: 4 },
        },
      },
      TelemetryTrace: {
        type: "object",
        properties: {
          id: { type: "string", example: "trc_9a4f21" },
          clientId: { type: "string", example: "aud_device_01" },
          clientLabel: { type: "string", example: "Audience Device #1" },
          endpoint: { type: "string", example: "/api/v1/products" },
          method: { type: "string", example: "GET" },
          status: { type: "integer", example: 200 },
          outcome: { type: "string", enum: ["cache_hit", "db_query", "waf_blocked", "server_error"], example: "cache_hit" },
          totalDurationUs: { type: "integer", example: 340 },
          workerNode: { type: "string", example: "worker_1" },
          timestamp: { type: "integer", example: 1731234567890 },
        },
      },
    },
  },
  paths: {
    "/api/v1/products": {
      get: {
        tags: ["Products"],
        summary: "دریافت لیست محصولات (منو)",
        description: "دریافت کاتالوگ محصولات با کش‌هیت حافظه‌ای L1 و پشتیبانی از فیلتر دسته‌بندی و جستجوی متنی",
        parameters: [
          {
            name: "category",
            in: "query",
            schema: { type: "string", enum: ["all", "coffee", "cake", "shake"] },
            description: "فیلتر بر اساس دسته‌بندی",
          },
          {
            name: "q",
            in: "query",
            schema: { type: "string" },
            description: "جستجوی متنی در نام، توضیحات و تگ‌های محصولات",
          },
          {
            name: "bypass_cache",
            in: "query",
            schema: { type: "boolean" },
            description: "بای‌پس عمدی کش L1 جهت واکشی مستقیم از دیتابیس SQLite WAL",
          },
          {
            name: "ping",
            in: "query",
            schema: { type: "integer" },
            description: "ارسال سیگنال پینگ تله‌متری سالن",
          },
        ],
        responses: {
          200: {
            description: "لیست محصولات با موفقیت دریافت شد",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Product" },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/products/{id}/toggle-stock": {
      patch: {
        tags: ["Products"],
        summary: "تغییر وضعیت موجودی محصول (توسط باریستا)",
        security: [{ BaristaPin: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, example: "prd_cortado" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  isAvailable: { type: "boolean", example: false },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "وضعیت موجودی تغییر یافت و به تمام مانیتورها برودکست شد" },
          401: { description: "خطای پین باریستا نامعتبر" },
          404: { description: "محصول یافت نشد" },
        },
      },
    },
    "/api/v1/orders": {
      post: {
        tags: ["Orders"],
        summary: "ثبت سفارش جدید (توسط مشتری یا تبلت میز)",
        description: "محاسبه قطعی قیمت در سرور و ارسال آنی به مانیتور باریستا با ثبت اتمیک در SQLite WAL",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrderInput" },
            },
          },
        },
        responses: {
          201: { description: "سفارش با موفقیت ثبت شد و کد پیگیری صادر گردید" },
          400: { description: "خطای اعتبارسنجی، سبد خالی یا ناموجودی محصول" },
          429: { description: "توقف درخواست توسط شیلد ضد اسپم Rate-Limit" },
        },
      },
      get: {
        tags: ["Orders"],
        summary: "دریافت صف سفارشات فعال (برای مانیتور باریستا KDS)",
        security: [{ BaristaPin: [] }],
        responses: {
          200: { description: "لیست سفارش‌های فعال با وضعیت PENDING، BREWING و READY" },
          401: { description: "دسترسی غیرمجاز (نیازمند پین باریستا)" },
        },
      },
    },
    "/api/v1/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "استعلام وضعیت سفارش با شناسه یکتا",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, example: "ord_102" },
        ],
        responses: {
          200: { description: "جزئیات کامل سفارش و اقلام آن" },
          404: { description: "سفارش مورد نظر یافت نشد" },
        },
      },
    },
    "/api/v1/orders/{id}/status": {
      patch: {
        tags: ["Orders"],
        summary: "تغییر وضعیت سفارش (توسط باریستا)",
        security: [{ BaristaPin: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, example: "ord_102" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["PENDING", "BREWING", "READY", "DELIVERED", "CANCELLED"],
                    example: "BREWING",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "وضعیت سفارش تغییر یافت و از طریق وب‌سوکت به مشتری ارسال شد" },
          401: { description: "دسترسی غیرمجاز" },
        },
      },
    },
    "/api/v1/orders/tables/{tableNumber}/settle": {
      patch: {
        tags: ["Orders"],
        summary: "تسویه حساب کل سفارش‌های یک میز (Open Tab Checkout)",
        security: [{ BaristaPin: [] }],
        parameters: [
          { name: "tableNumber", in: "path", required: true, schema: { type: "string" }, example: "میز ۴" },
        ],
        responses: {
          200: { description: "تمام سفارشات فعال میز تسویه و بسته شدند" },
          401: { description: "دسترسی غیرمجاز" },
        },
      },
    },
    "/api/v1/tables": {
      get: {
        tags: ["Tables"],
        summary: "دریافت وضعیت تمام ۸ میز سالن کافه",
        description: "دریافت وضعیت اشغال بودن میزها (VACANT, HELD, OCCUPIED) همراه با انقضای هولد",
        responses: {
          200: {
            description: "لیست میزهای کافه",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/CafeTable" },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/tables/{id}/hold": {
      post: {
        tags: ["Tables"],
        summary: "رزرو موقت میز برای شروع سفارش (Hold 15-min)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, example: "tbl_4" },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  clientId: { type: "string", example: "aud_9a4f21" },
                  clientName: { type: "string", example: "مشتری میز ۴" },
                  ttlSeconds: { type: "integer", example: 900, description: "طول عمر هولد به ثانیه" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "میز با موفقیت هولد شد" },
          409: { description: "میز در حال حاضر توسط مشتری دیگر رزرو یا اشغال است" },
        },
      },
    },
    "/api/v1/tables/{id}/release": {
      post: {
        tags: ["Tables"],
        summary: "آزادسازی هولد میز",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, example: "tbl_4" },
        ],
        responses: {
          200: { description: "میز با موفقیت آزاد شد" },
        },
      },
    },
    "/api/v1/tables/{id}/book": {
      post: {
        tags: ["Tables"],
        summary: "تغییر وضعیت میز به حالت اشغال رسمی (Occupied)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, example: "tbl_4" },
        ],
        responses: {
          200: { description: "میز به حالت OCCUPIED تغییر وضعیت داد" },
        },
      },
    },
    "/api/v1/cluster/state": {
      get: {
        tags: ["Cluster & Telemetry"],
        summary: "دریافت وضعیت زنده کلاستر و ورکرها",
        description: "اطلاعات لحظه‌ای ورکر ۱ و ورکر ۲، وضعیت کش، RPS و لتنسی p95",
        responses: {
          200: {
            description: "وضعیت کلاستر",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ClusterState" },
              },
            },
          },
        },
      },
    },
    "/api/v1/cluster/worker/kill": {
      post: {
        tags: ["Cluster & Telemetry"],
        summary: "شبیه‌سازی قطعی سخت‌افزاری ورکر برای تست فیل‌اور",
        parameters: [
          {
            name: "worker",
            in: "query",
            schema: { type: "string", enum: ["worker_1", "worker_2"], default: "worker_1" },
          },
        ],
        responses: {
          200: { description: "ورکر قطع شد و ترافیک آنی ریروت گردید" },
        },
      },
    },
    "/api/v1/cluster/worker/restore": {
      post: {
        tags: ["Cluster & Telemetry"],
        summary: "بازیابی و آنلاین‌سازی مجدد ورکر خاموش‌شده",
        parameters: [
          {
            name: "worker",
            in: "query",
            schema: { type: "string", enum: ["worker_1", "worker_2"], default: "worker_1" },
          },
        ],
        responses: {
          200: { description: "ورکر با موفقیت به چرخه کلاستر بازگشت" },
        },
      },
    },
    "/api/v1/cluster/cache/toggle": {
      post: {
        tags: ["Cluster & Telemetry"],
        summary: "تغییر وضعیت کش L1 در حافظه (فعال‌سازی یا بای‌پس)",
        responses: {
          200: { description: "وضعیت کش حافظه تغییر یافت" },
        },
      },
    },
    "/api/v1/telemetry/traces": {
      get: {
        tags: ["Cluster & Telemetry"],
        summary: "دریافت تاریخچه آخرین تریس‌های تله‌متری ثبت‌شده",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 50 }, description: "حداکثر تعداد تریس‌ها" },
        ],
        responses: {
          200: {
            description: "آرایه‌ای از تریس‌های عملکردی سیستم",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/TelemetryTrace" },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/telemetry/traces/{id}": {
      get: {
        tags: ["Cluster & Telemetry"],
        summary: "مشاهده جزئیات هاپ‌های میکروثانیه‌ای یک تریس با Trace ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, example: "trc_9a4f21" },
        ],
        responses: {
          200: { description: "جزئیات تریس با ریز زمان‌بندی هر هاپ شبکه" },
          404: { description: "تریس مورد نظر یافت نشد" },
        },
      },
    },
    "/api/v1/analytics/stats": {
      get: {
        tags: ["System"],
        summary: "دریافت آمار فروش و تله‌متری زنده کافه",
        security: [{ BaristaPin: [] }],
        responses: {
          200: { description: "درآمد کل، تعداد سفارش‌ها و پرفروش‌ترین‌ها" },
          401: { description: "نیازمند پین باریستا" },
        },
      },
    },
    "/api/v1/health": {
      get: {
        tags: ["System"],
        summary: "بررسی سلامت و تله‌متری هسته سرور Bun",
        responses: {
          200: { description: "زمان فعالیت، مصرف حافظه RSS/Heap و تعداد اتصالات وب‌سوکت" },
        },
      },
    },
    "/api/v1/auth/forgot-password": {
      tags: ["Authentication"],
      post: {
        summary: "درخواست بازیابی رمز عبور با ایمیل (محافظت‌شده در برابر User Enumeration و Rate Limit)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email", example: "user@soren.cafe" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "پیام تایید عمومی با زمان انتظار مجدد (بدون افشای وجود حساب)" },
          400: { description: "فرمت نامعتبر ایمیل" },
          429: { description: "محدودیت نرخ ارسال درخواست" },
        },
      },
    },
    "/api/v1/auth/verify-reset-token": {
      tags: ["Authentication"],
      get: {
        summary: "اعتبارسنجی توکن بازیابی رمز عبور",
        parameters: [
          {
            name: "token",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "توکن معتبر است و ایمیل ماسک‌شده کاربر برمی‌گردد" },
          400: { description: "توکن نامعتبر، استفاده شده یا منقضی شده است" },
        },
      },
    },
    "/api/v1/auth/reset-password": {
      tags: ["Authentication"],
      post: {
        summary: "تنظیم رمز عبور جدید با توکن یک‌بار مصرف",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password"],
                properties: {
                  token: { type: "string" },
                  password: { type: "string", minLength: 8, example: "NewSecretPassword123!" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "رمز عبور با موفقیت به‌روزرسانی شد" },
          400: { description: "توکن نامعتبر یا رمز عبور ضعیف" },
        },
      },
    },
  },
};

// Generates custom branded minimalist dark Scalar UI HTML with mission-control avionics navigation
export function getScalarHtml(): string {
  const specJson = JSON.stringify(openApiSpec).replace(/<\/script>/gi, "<\\/script>");
  return `<!doctype html>
<html lang="fa" dir="rtl" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Soren Café — Interactive API Contract & Documentation</title>
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
      :root {
        --scalar-font: 'Vazirmatn', 'Plus Jakarta Sans', -apple-system, sans-serif;
        --scalar-font-code: 'JetBrains Mono', ui-monospace, monospace;
        --scalar-color-1: #F4F4F5;
        --scalar-color-2: #A1A1AA;
        --scalar-color-3: #71717A;
        --scalar-color-accent: #C99752;
        --scalar-background-1: #090A0D;
        --scalar-background-2: #0E1015;
        --scalar-background-3: #13161D;
        --scalar-border-color: rgba(255, 255, 255, 0.08);
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background-color: #090A0D;
        color: #E4E4E7;
        font-family: var(--scalar-font);
      }
      /* Clean hairline scrollbars */
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 9999px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

      /* Top Mission Control Sub-HUD */
      .soren-docs-hud {
        position: sticky;
        top: 0;
        z-index: 1000;
        background: rgba(9, 10, 13, 0.94);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding: 0 1.25rem;
        height: 3.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.8125rem;
      }
      .soren-docs-hud .hud-brand {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        text-decoration: none;
        color: #F4F4F5;
      }
      .soren-docs-hud .hud-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.2rem 0.5rem;
        border-radius: 0.25rem;
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid rgba(16, 185, 129, 0.3);
        color: #10B981;
        font-size: 0.6875rem;
        font-weight: 600;
        letter-spacing: 0.05em;
      }
      .soren-docs-hud .hud-links {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .soren-docs-hud .hud-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.625rem;
        border-radius: 0.375rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #D4D4D8;
        text-decoration: none;
        font-size: 0.75rem;
        transition: all 0.15s ease;
      }
      .soren-docs-hud .hud-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #FFFFFF;
        border-color: rgba(255, 255, 255, 0.16);
      }
      .soren-docs-hud .hud-btn.primary {
        background: #FFFFFF;
        color: #090A0D;
        font-weight: 600;
        border-color: #FFFFFF;
      }
      .soren-docs-hud .hud-btn.primary:hover {
        background: #E4E4E7;
      }
      .pulse-dot {
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 9999px;
        background-color: #10B981;
        box-shadow: 0 0 6px rgba(16, 185, 129, 0.8);
      }
      @media (max-width: 640px) {
        .soren-docs-hud .hide-mobile { display: none; }
      }
    </style>
  </head>
  <body>
    <!-- Top HUD Navigation Bar -->
    <header class="soren-docs-hud">
      <div style="display: flex; align-items: center; gap: 0.875rem;">
        <a href="./index.html" class="hud-brand" title="بازگشت به سایت کافه سورن">
          <span class="pulse-dot"></span>
          <strong style="letter-spacing: 0.06em;">SOREN API</strong>
          <span style="color: #71717A; font-size: 0.75rem;">v1.4.2</span>
        </a>
        <span class="hud-badge hide-mobile">BUN KERNEL • WAL</span>
      </div>

      <div class="hud-links">
        <a href="./dashboard.html" class="hud-btn" id="hud-link-dashboard" title="داشبورد زنده تله‌متری و تست نفوذ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          <span>داشبورد مانیتورینگ</span>
        </a>
        <a href="./index.html" class="hud-btn primary" id="hud-link-storefront" title="مشاهده منو و وب‌سایت اصلی">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span class="hide-mobile">سایت اصلی</span>
        </a>
      </div>
    </header>

    <!-- Embedded OpenAPI Spec for Offline & GitHub Pages Reliability -->
    <script id="openapi-spec-data" type="application/json">
${specJson}
    </script>

    <!-- Scalar Interactive API Reference -->
    <script
      id="api-reference"
      data-configuration='{
        "theme": "kepler",
        "darkMode": true,
        "showSidebar": true,
        "searchHotKey": "k",
        "hideModels": false,
        "hideDownloadButton": false
      }'
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
    ></script>

    <script>
      // Adaptive path resolution for relative links depending on path depth
      (function() {
        const specEl = document.getElementById('openapi-spec-data');
        const apiRefEl = document.getElementById('api-reference');
        
        // If loaded via file: or github.io or local bun server, bind spec directly
        if (specEl && apiRefEl) {
          try {
            const rawSpec = specEl.textContent;
            apiRefEl.setAttribute('data-content', rawSpec.trim());
          } catch(e) {
            apiRefEl.setAttribute('data-url', '/api/v1/openapi.json');
          }
        }

        // Adjust HUD links if served under /pages/ or /docs
        const isPagesDir = window.location.pathname.includes('/pages/');
        const dashLink = document.getElementById('hud-link-dashboard');
        const storeLink = document.getElementById('hud-link-storefront');

        if (isPagesDir) {
          if (dashLink) dashLink.href = './dashboard.html';
          if (storeLink) storeLink.href = '../index.html';
        } else if (window.location.pathname === '/docs' || window.location.pathname.endsWith('/docs')) {
          if (dashLink) dashLink.href = '/dashboard';
          if (storeLink) storeLink.href = '/';
        }
      })();
    </script>
  </body>
</html>`;
}
