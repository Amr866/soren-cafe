# SOREN CAFÉ — Official API & WebSocket Contract

> **نسخه:** ۱.۱.۰ (سازگار با Bun 1.4+ و فرانت‌اند React + Vite)  
> **مخاطب:** تیم توسعه فرانت‌اند و بک‌اند  
> **آدرس پایه (Base URL):** `http://localhost:4000/api/v1`  
> **آدرس وب‌سوکت (WebSocket):** `ws://localhost:4000/ws`  
> **مستندات تعاملی Scalar (OpenAPI):** `http://localhost:4000/docs`

---

## ۱. اصول عمومی و ساختار پاسخ‌ها

تمام درخواست‌های REST از ساختار استاندارد JSON پیروی می‌کنند.

### هدرهای الزامی کلاینت:
```http
Content-Type: application/json
X-Client-Id: <شناسه_یکتا_مانند_uuid_یا_aud_123>
X-Audience-Name: <نام_یا_شماره_میز_اختیاری_با_کدگذاری_utf8>
```

### هدر احراز هویت باریستا (فقط برای اندپوینت‌های مدیریتی):
```http
X-Barista-Pin: 1234
```

### ساختار پاسخ موفق:
پاسخ‌ها مستقیماً آرایه یا آبجکت دیتا با کد وضعیت HTTP مناسب (200 یا 201) هستند.

### ساختار پاسخ خطا:
کد وضعیت HTTP (400, 401, 403, 404, 409, 429) به همراه بدنه زیر:
```json
{
  "error": true,
  "message": "توضیح خطای فارسی جهت نمایش به کاربر"
}
```

---

## ۲. مدل‌های داده (Data Models & TypeScript Interfaces)

### مدل محصول منو (`Product`):
```typescript
export interface Product {
  id: string;               // مانند "prd_doppio"
  name: string;             // "اسپرسو دوپیو سورن (Soren Doppio)"
  category: "coffee" | "cake" | "shake";
  price: number;            // قیمت به تومان (مثلا 75000)
  description: string;      // توضیحات طعم و شیوه سرو
  tags: string;             // تگ‌ها جدا شده با کاما: "تک‌خاستگاه, ۹۳.۵°C"
  is_available: number;     // 1 یعنی موجود، 0 یعنی تمام شده
  stock_count: number;      // -1 نامحدود، یا تعداد موجودی دقیق
  image_url: string;        // آدرس تصویر لوکال: "/assets/products/doppio.png"
}
```

### مدل میز کافه (`CafeTable`):
```typescript
export interface CafeTable {
  id: string;               // مانند "tbl_4"
  number: string;           // "میز ۴"
  name: string;             // "کنار بار و دم‌آوری دستی"
  capacity: number;         // ظرفیت نفرات: 2, 4, 6, 8
  zone: "indoor" | "courtyard" | "vip"; // موقعیت در کافه
  status: "FREE" | "HELD" | "OCCUPIED"; // آزاد، در حال انتخاب، پر
  held_by?: string | null;  // شناسه کلاینتی که موقتاً میز را رزرو نگه داشته
  held_until?: number | null; // زمان اتمام قفل موقت (Unix Timestamp به میلی‌ثانیه)
  remainingHoldSeconds?: number; // ثانیه‌های باقی‌مانده تا آزادسازی خودکار
}
```

### مدل سفارش (`Order`):
```typescript
export interface OrderItem {
  productId: string;        // "prd_doppio"
  quantity: number;         // تعداد (بزرگتر از صفر)
}

export interface Order {
  id: string;               // مانند "ord_1001"
  table_number: string;     // "میز ۴"
  customer_name: string;    // نام مشتری
  phone_number: string | null;
  payment_status: "UNPAID" | "PAID";
  payment_method: "PAY_AT_COUNTER" | "ONLINE";
  status: "PENDING" | "BREWING" | "READY" | "DELIVERED" | "CANCELLED";
  total_price: number;      // مبلغ کل محاسبه شده توسط سرور (تومان)
  session_token: string;
  created_at: string;
  completed_at: string | null;
  items?: Array<{
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}
```

---

## ۳. اندپوینت‌های REST API

### ۳.۱ محصولات و منو (Products)

#### دریافت منوی کافه:
* **متد:** `GET /api/v1/products`
* **کوئری پارامترهای اختیاری:**
  * `category`: فیلتر بر اساس دسته‌بندی (`coffee`, `cake`, `shake`)
  * `no_cache=1`: تست تاخیر و عبور اجباری از کش L1
* **پاسخ (200 OK):**
  ```json
  [
    {
      "id": "prd_doppio",
      "name": "اسپرسو دوپیو سورن (Soren Doppio)",
      "category": "coffee",
      "price": 75000,
      "description": "اتیوپی یرگاچف، نت‌های یاس و مرکبات، عصاره‌گیری ۹ بار استاندارد",
      "tags": "تک‌خاستگاه, ۹۳.۵°C",
      "is_available": 1,
      "image_url": "/assets/products/doppio.png"
    }
  ]
  ```

#### تغییر موجودی توسط باریستا (Toggle Stock):
* **متد:** `PATCH /api/v1/products/:id/toggle-stock`
* **هدر:** `X-Barista-Pin: 1234`
* **بدنه:** `{"isAvailable": false}`
* **پاسخ (200 OK):**
  ```json
  {"success": true, "productId": "prd_doppio", "isAvailable": false}
  ```

---

### ۳.۲ نقشه میزها و مکانیزم ضد تداخل رزرو (Tables & Anti-Race Locks)

مکانیزم Hold مانع از آن می‌شود که دو نفر همزمان یک میز خالی را انتخاب و ثبت کنند.

#### دریافت لیست و وضعیت زنده تمام میزها:
* **متد:** `GET /api/v1/tables`
* **پاسخ (200 OK):**
  ```json
  [
    {
      "id": "tbl_1",
      "number": "میز ۱",
      "name": "رو به حیاط و آب‌نما",
      "capacity": 2,
      "zone": "courtyard",
      "status": "FREE",
      "held_by": null,
      "held_until": null,
      "remainingHoldSeconds": 0
    },
    {
      "id": "tbl_4",
      "number": "میز ۴",
      "name": "کنار بار و دم‌آوری دستی",
      "capacity": 2,
      "zone": "indoor",
      "status": "HELD",
      "held_by": "aud_8f92a",
      "held_until": 1792185000000,
      "remainingHoldSeconds": 84
    }
  ]
  ```

#### قفل موقت میز برای کاربر (Hold Table - ۲ دقیقه اعتبار):
* **متد:** `POST /api/v1/tables/:id/hold`
* **بدنه:**
  ```json
  {
    "clientId": "usr_phone_992",
    "clientName": "علی",
    "ttlSeconds": 120
  }
  ```
* **پاسخ موفق (200 OK):**
  ```json
  {
    "success": true,
    "tableId": "tbl_4",
    "status": "HELD",
    "heldUntil": 1792185120000,
    "ttlSeconds": 120,
    "message": "میز به مدت ۲ دقیقه برای شما قفل گردید."
  }
  ```
* **پاسخ تداخل و مسابقه (409 Conflict):**
  ```json
  {
    "error": true,
    "message": "این میز هم‌اکنون توسط شخص دیگری در حال انتخاب است. لطفاً میز دیگری برگزینید."
  }
  ```

#### آزادسازی اختیاری میز (Release Table):
* **متد:** `POST /api/v1/tables/:id/release`
* **بدنه:** `{"clientId": "usr_phone_992"}`
* **پاسخ (200 OK):**
  ```json
  {"success": true, "tableId": "tbl_4", "status": "FREE"}
  ```

---

### ۳.۳ سفارشات (Orders)

#### ثبت سفارش توسط مشتری:
* **متد:** `POST /api/v1/orders`
* **بدنه:**
  ```json
  {
    "tableNumber": "میز ۴",
    "customerName": "سارا رضایی",
    "phoneNumber": "09120000000",
    "sessionToken": "sess_89f2a0",
    "items": [
      { "productId": "prd_doppio", "quantity": 2 },
      { "productId": "prd_basque", "quantity": 1 }
    ]
  }
  ```
* **پاسخ موفق (201 Created):**
  ```json
  {
    "success": true,
    "message": "سفارش شما با موفقیت ثبت شد و به مانیتور باریستا ارسال گردید.",
    "order": {
      "id": "ord_1002",
      "table_number": "میز ۴",
      "customer_name": "سارا رضایی",
      "status": "PENDING",
      "total_price": 315000,
      "created_at": "2026-10-17 00:15:20",
      "items": [
        {
          "product_id": "prd_doppio",
          "product_name": "اسپرسو دوپیو سورن",
          "quantity": 2,
          "unit_price": 75000
        },
        {
          "product_id": "prd_basque",
          "product_name": "چیزکیک سن‌سباستین پسته",
          "quantity": 1,
          "unit_price": 165000
        }
      ]
    },
    "etaMinutes": 8,
    "telemetryMicroseconds": 412
  }
  ```

#### دریافت صف سفارشات فعال (مخصوص تبلت باریستا):
* **متد:** `GET /api/v1/orders`
* **هدر:** `X-Barista-Pin: 1234`
* **پاسخ (200 OK):** آرایه‌ای از سفارشات با وضعیت‌های `PENDING`, `BREWING`, `READY`.

#### تغییر وضعیت سفارش توسط باریستا:
* **متد:** `PATCH /api/v1/orders/:id/status`
* **هدر:** `X-Barista-Pin: 1234`
* **بدنه:** `{"status": "BREWING"}` یا `"READY"` یا `"DELIVERED"`
* **پاسخ (200 OK):**
  ```json
  {"success": true, "orderId": "ord_1002", "status": "BREWING"}
  ```

---

## ۴. قرارداد کانال‌ها و رویدادهای زنده (WebSocket Protocol)

اتصال به مسیر: `ws://localhost:4000/ws`

### عضویت در کانال‌ها (Subscription Messages):
پس از برقراری کانکشن، کلاینت می‌تواند پیام‌های زیر را به صورت JSON بفرستد:
```javascript
// دریافت رویدادهای عمومی
ws.send(JSON.stringify({ action: "subscribe_all" }));

// مخصوص تبلت باریستا (KDS)
ws.send(JSON.stringify({ action: "subscribe_barista" }));

// پیگیری سفارش خاص توسط مشتری
ws.send(JSON.stringify({ action: "subscribe_order", orderId: "ord_1002" }));

// مخصوص صفحه مانیتورینگ زنده
ws.send(JSON.stringify({ action: "subscribe_dashboard" }));

// اتصال حضور در سالن
ws.send(JSON.stringify({ action: "audience_join", clientId: "aud_123", clientName: "علی" }));
```

### رویدادهای دریافتی از سرور (Incoming Events):

| نام ایونت (`event`) | کانال | فیلد داده (`data`) | کاربرد در فرانت‌اند |
| :--- | :--- | :--- | :--- |
| `order:created` | `barista-kds` | آبجکت کامل سفارش `Order` | پخش صدای زنگ در تبلت باریستا و افزودن کارت به ستون «جدید» |
| `order:status_updated` | `all-clients` | `{"orderId": "ord_1002", "status": "BREWING"}` | تغییر انیمیشن نوار پیشرفت در گوشی مشتری و انتقال کارت به ستون مربوطه باریستا |
| `table:held` | `all-clients` | `{"tableId": "tbl_4", "heldBy": "...", "heldUntil": 1792...}` | زرد شدن رنگ میز در نقشه میزها و نمایش ثانیه‌شمار قفل |
| `table:released` | `all-clients` | `{"tableId": "tbl_4"}` | سبز شدن مجدد میز در نقشه میزها |
| `table:taken` | `all-clients` | `{"tableId": "tbl_4"}` | قرمز شدن میز در نقشه میزها (مشغول) |
| `product:stock_updated` | `all-clients` | `{"productId": "prd_doppio", "isAvailable": false}` | زدن برچسب «ناموجود» روی کارت آیتم در منوی دیجیتال مشتری |

---

## ۵. کدهای آماده کپی-پیست برای فرانت‌اند (React / Mock)

### ۵.۱ داده‌های Mock آماده (برای کار آفلاین بدون سرور):
در فایل `src/mock/cafeData.ts`:
```typescript
export const MOCK_TABLES = [
  { id: "tbl_1", number: "میز ۱", name: "رو به حیاط و آب‌نما", capacity: 2, zone: "courtyard", status: "FREE" },
  { id: "tbl_2", number: "میز ۲", name: "رو به حیاط و فضای سبز", capacity: 4, zone: "courtyard", status: "FREE" },
  { id: "tbl_3", number: "میز ۳", name: "سالن اصلی - کنار شومینه", capacity: 4, zone: "indoor", status: "OCCUPIED" },
  { id: "tbl_4", number: "میز ۴", name: "کنار بار و دم‌آوری دستی", capacity: 2, zone: "indoor", status: "FREE" },
  { id: "tbl_5", number: "میز ۵", name: "سالن اصلی - فضای خانوادگی", capacity: 6, zone: "indoor", status: "FREE" },
  { id: "tbl_6", number: "میز ۶", name: "میز کار اختصاصی با پریز برق", capacity: 4, zone: "indoor", status: "FREE" },
  { id: "tbl_7", number: "میز ۷", name: "تراس بهاره", capacity: 4, zone: "courtyard", status: "FREE" },
  { id: "tbl_8", number: "میز ۸", name: "اتاق تشریفات VIP", capacity: 8, zone: "vip", status: "FREE" }
];
```

### ۵.۲ هوک وب‌سوکت آماده در React (`useCafeSocket.ts`):
```typescript
import { useEffect, useRef } from 'react';

export function useCafeSocket(onEvent: (event: string, data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // یا 'localhost:4000' در حالت Dev
    const socket = new WebSocket(`${proto}//${host}/ws`);

    socket.onopen = () => {
      console.log('✔ Connected to Soren Cafe WebSocket');
      socket.send(JSON.stringify({ action: 'subscribe_all' }));
      socket.send(JSON.stringify({ action: 'subscribe_barista' }));
    };

    socket.onmessage = (msg) => {
      try {
        const payload = JSON.parse(msg.data);
        onEvent(payload.event, payload.data);
      } catch (err) {}
    };

    socket.onclose = () => {
      console.log('✖ WebSocket disconnected');
    };

    wsRef.current = socket;
    return () => socket.close();
  }, []);

  return wsRef;
}
```

---

## ۶. اندپوینت‌های تله‌متری، کلاستر و شبیه‌سازی صحنه (Cluster & Telemetry Theatre)

برای نمایش زنده معماری توزیع‌شده، فیل‌اور بین ورکرها و مانیتورینگ میکروثانیه‌ای:

### ۶.۱ دریافت وضعیت زنده کلاستر:
* **مسیر:** `GET /api/v1/cluster/state`
* **پاسخ موفق (200):**
```json
{
  "worker1": true,
  "worker2": true,
  "activeWorkerCount": 2,
  "cacheEnabled": true,
  "totalTracesRecorded": 420,
  "p50LatencyUs": 76,
  "p95LatencyUs": 540,
  "currentRps": 4
}
```

### ۶.۲ از دسترس خارج کردن یا بازیابی ورکر (Failover Test):
* **مسیر قطع ورکر:** `POST /api/v1/cluster/worker/kill?worker=worker_1`
* **مسیر بازیابی ورکر:** `POST /api/v1/cluster/worker/restore?worker=worker_1`
* **رفتار:** قطع ورکر ۱ بلافاصله ترافیک ورودی را به ورکر ۲ هدایت کرده و یک رویداد `telemetry:cluster_alert` در سوکت منتشر می‌کند.

### ۶.۳ فعال‌سازی یا بای‌پس کش حافظه‌ای (L1 In-Memory Cache):
* **مسیر:** `POST /api/v1/cluster/cache/toggle`
* **پاسخ موفق (200):**
```json
{
  "success": true,
  "cacheEnabled": false,
  "message": "L1 In-Memory Cache Bypassed (Direct Disk WAL writes)"
}
```

### ۶.۴ جستجو و بررسی تریس‌های میکروثانیه‌ای:
* **دریافت ۵۰ تریس اخیر:** `GET /api/v1/telemetry/traces?limit=50`
* **دریافت جزییات تریس با شناسه:** `GET /api/v1/telemetry/traces/{traceId}`

### ۶.۵ صفحات وب تعاملی سرور:
* **کنسول معماری و تله‌متری زنده:** `http://localhost:4000/dashboard`
* **ترمینال تعاملی موبایل حضار:** `http://localhost:4000/join`
* **مستندات تعاملی استاندارد Scalar:** `http://localhost:4000/docs`

