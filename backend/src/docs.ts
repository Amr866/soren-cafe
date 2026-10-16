// OpenAPI 3.0 specification for Soren Cafe API
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Soren Café — Real-Time POS, KDS & Telemetry API",
    version: "1.4.0",
    description: `
### مستندات رسمی معماری و API کافه سورن (Soren Café)

این مستندات مشخصات کامل اندپوینت‌های RESTful و پروتکل سوکت زنده سیستم را پوشش می‌دهد:
* **Real-Time Order & Kitchen Display (KDS):** ثبت سفارش مشتری و تغییر وضعیت آنی برای تبلت باریستا.
* **Table Occupancy & Hold Management:** رزرو و هولد موقت میزهای ۸ گانه سالن (انقضای ۱۵ دقیقه‌ای).
* **Distributed Telemetry & Cluster Theatre:** تریس میکروثانیه‌ای اسپان‌ها، شیلد WAF و سوئیچ فیل‌اور بین ورکرها.
* **Live WebSocket Bus:** پروتکل اشتراک کلاینت‌ها روی \`ws://localhost:4000/ws\`.
    `,
    contact: {
      name: "Soren Engineering Team",
    },
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Local Development & Presentation Server",
    },
  ],
  components: {
    securitySchemes: {
      BaristaPin: {
        type: "apiKey",
        in: "header",
        name: "X-Barista-Pin",
        description: "پین ۴ رقمی ورود باریستا (پیش‌فرض: 1234)",
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
          category: { type: "string", enum: ["coffee", "cake", "shake"] },
          price: { type: "integer", example: 95000, description: "قیمت به تومان" },
          description: { type: "string" },
          tags: { type: "string", example: "میکروفوم, متعادل" },
          is_available: { type: "integer", example: 1 },
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
          held_by_session: { type: "string", nullable: true },
          held_at: { type: "string", nullable: true },
          hold_expires_at: { type: "string", nullable: true },
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
    },
  },
  paths: {
    "/api/v1/products": {
      get: {
        summary: "دریافت لیست محصولات (منو)",
        description: "دریافت کاتالوگ محصولات با کش‌هیت حافظه‌ای L1 و پشتیبانی از فیلتر دسته‌بندی",
        parameters: [
          {
            name: "category",
            in: "query",
            schema: { type: "string", enum: ["coffee", "cake", "shake"] },
            description: "فیلتر بر اساس دسته‌بندی",
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
          },
        },
      },
    },
    "/api/v1/products/{id}/toggle-stock": {
      patch: {
        summary: "تغییر وضعیت موجودی محصول (توسط باریستا)",
        security: [{ BaristaPin: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
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
          200: { description: "وضعیت موجودی تغییر یافت و برودکست شد" },
        },
      },
    },
    "/api/v1/orders": {
      post: {
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
          201: { description: "سفارش با موفقیت ثبت شد" },
          400: { description: "خطای اعتبارسنجی یا ناموجودی محصول" },
          429: { description: "توقف درخواست توسط شیلد Rate-Limit" },
        },
      },
      get: {
        summary: "دریافت صف سفارشات فعال (برای مانیتور باریستا)",
        security: [{ BaristaPin: [] }],
        responses: {
          200: { description: "لیست سفارش‌های PENDING و BREWING و READY" },
        },
      },
    },
    "/api/v1/orders/{id}/status": {
      patch: {
        summary: "تغییر وضعیت سفارش (توسط باریستا)",
        security: [{ BaristaPin: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["PENDING", "BREWING", "READY", "DELIVERED", "CANCELLED"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "وضعیت سفارش تغییر یافت و به مشتری ارسال شد" },
        },
      },
    },
    "/api/v1/orders/tables/{tableNumber}/settle": {
      patch: {
        summary: "تسویه حساب کل سفارش‌های یک میز (Open Tab Checkout)",
        security: [{ BaristaPin: [] }],
        parameters: [
          { name: "tableNumber", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "میز با موفقیت تسویه و بسته شد" },
        },
      },
    },
    "/api/v1/tables": {
      get: {
        summary: "دریافت وضعیت تمام میزهای سالن کافه",
        description: "دریافت وضعیت ظرفیت و اشغال بودن میزها (VACANT, HELD, OCCUPIED)",
        responses: {
          200: { description: "لیست میزهای کافه" },
        },
      },
    },
    "/api/v1/tables/{id}/hold": {
      post: {
        summary: "رزرو موقت میز برای شروع سفارش (Hold 15-min)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  sessionToken: { type: "string", example: "token_123" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "میز با موفقیت هولد شد" },
          409: { description: "میز در حال حاضر توسط مشتری دیگر اشغال است" },
        },
      },
    },
    "/api/v1/tables/{id}/release": {
      post: {
        summary: "آزادسازی هولد میز",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "میز آزاد شد" },
        },
      },
    },
    "/api/v1/cluster/state": {
      get: {
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
        summary: "تغییر وضعیت کش L1 در حافظه (فعال‌سازی یا بای‌پس)",
        responses: {
          200: { description: "وضعیت کش حافظه تغییر یافت" },
        },
      },
    },
    "/api/v1/analytics/stats": {
      get: {
        summary: "دریافت آمار فروش و تله‌متری زنده کافه",
        security: [{ BaristaPin: [] }],
        responses: {
          200: { description: "درآمد کل، تعداد سفارش‌ها و پرفروش‌ترین‌ها" },
        },
      },
    },
    "/api/v1/health": {
      get: {
        summary: "بررسی سلامت و تله‌متری هسته سرور Bun",
        responses: {
          200: { description: "زمان فعالیت، مصرف حافظه و تعداد اتصالات وب‌سوکت" },
        },
      },
    },
  },
};

// Generates custom branded minimalist dark Scalar UI HTML
export function getScalarHtml(): string {
  return `<!doctype html>
<html lang="fa" dir="rtl" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Soren Café — Interactive API Contract & Documentation</title>
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet">
    
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
      body {
        margin: 0;
        background-color: #090A0D;
        color: #E4E4E7;
      }
      /* Clean hairline scrollbars */
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 9999px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/v1/openapi.json"
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
  </body>
</html>`;
}
