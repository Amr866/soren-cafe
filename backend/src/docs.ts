// OpenAPI 3.0 specification for Soren Cafe API
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Soren Café — Real-Time POS & KDS API",
    version: "1.0.0",
    description: "مستندات رسمی و تعاملی سیستم سفارش‌گیر و مانیتورینگ باریستای کافه سورن (Soren Café)",
    contact: {
      name: "Soren Engineering Team",
    },
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Local Development Server",
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
    },
  },
  paths: {
    "/api/v1/products": {
      get: {
        summary: "دریافت لیست محصولات (منو)",
        description: "دریافت ۱۸ محصول کافه با امکان فیلتر بر اساس دسته بندی",
        parameters: [
          {
            name: "category",
            in: "query",
            schema: { type: "string", enum: ["coffee", "cake", "shake"] },
            description: "فیلتر بر اساس دسته‌بندی",
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
        summary: "ثبت سفارش جدید (توسط مشتری)",
        description: "محاسبه قطعی قیمت در سرور و ارسال آنی به مانیتور باریستا",
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
    "/api/v1/analytics/stats": {
      get: {
        summary: "دریافت آمار فروش و صف زنده کافه",
        security: [{ BaristaPin: [] }],
        responses: {
          200: { description: "درآمد کل، تعداد سفارش‌ها و پرفروش‌ترین‌ها" },
        },
      },
    },
    "/api/v1/health": {
      get: {
        summary: "بررسی سلامت و تله‌متری سرور",
        responses: {
          200: { description: "زمان فعالیت، مصرف حافظه و تعداد اتصالات وب‌سوکت" },
        },
      },
    },
  },
};

// Generates modern Scalar UI HTML pointing to openapi.json
export function getScalarHtml(): string {
  return `<!doctype html>
<html lang="fa" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Soren Café API Documentation</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      body {
        margin: 0;
        font-family: 'Vazirmatn', -apple-system, sans-serif;
        background-color: #0f1115;
      }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/v1/openapi.json"
      data-configuration='{"theme":"purple","darkMode":true,"showSidebar":true}'
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
    ></script>
  </body>
</html>`;
}
