# SOREN CAFÉ — Frontend Integration Guide (راهنمای رفیق فرانت‌اند)

> **سلام رفیق!**  
> سرور بک‌اند کافه سورن با زبان TypeScript و رانتایم Bun به‌صورت فوق‌سریع بالا آمده است. تمام دیتای ۱۸ محصول، سیستم سوکت بلادرنگ، امنیت تراکنش‌ها و دیتابیس آماده است.  
> تنها کاری که باید در فرانت‌اند با **HTML + CSS + JavaScript خام** انجام دهی، طراحی دو صفحه و اتصال به روت‌های زیر است.

---

## ۱. ساختار دو صفحه‌ای که باید بسازی

در پوشه `05-animation-lab/soren-cafe/frontend/` دو فایل می‌سازی:
1. **`index.html` (منوی دیجیتال مشتری سر میز):**
   * کاربر با اسکن QR بارکد میز وارد می‌شود: `http://localhost:4000/?table=4`
   * ۱۸ محصول را از سرور می‌گیرد و با تب‌های دسته‌بندی (قهوه، کیک، شیک) نمایش می‌دهد.
   * کاربر دکمه «ثبت سفارش» را می‌زند.
   * وضعیت سفارش به صورت زنده (در صف ➔ در حال عصاره‌گیری ➔ آماده تحویل) با سوکت تغییر می‌کند.
2. **`barista.html` (داشبورد تبلت باریستا - KDS):**
   * روی تبلت یا لپ‌تاپ باریستا باز می‌شود: `http://localhost:4000/barista`
   * دارای ۳ ستون کانبان: **سفارشات جدید**، **در حال آماده‌سازی**، **آماده تحویل**.
   * وقتی مشتری سفارش می‌دهد، صدای دینگ 🔔 پخش می‌شود و کارت جدید انیمیت می‌شود.
   * باریستا دکمه «شروع پخت» و سپس «آماده شد» را می‌زند.
   * بخش بالای صفحه: دکمه‌های سریع برای ناموجود کردن شیرینی‌ها در صورت اتمام.

---

## ۲. کد جاوااسکریپت آماده برای اتصال به API (کپی و پیست)

### الف) دریافت ۱۸ محصول منو (در `index.html`):
```javascript
async function loadMenu() {
  const response = await fetch('/api/v1/products');
  const products = await response.json();
  
  // products آرایه‌ای از ۱۸ محصول است:
  // [{ id: "prd_cortado", name: "کورتادو پارسه", price: 95000, category: "coffee", is_available: 1, ... }]
  renderMenu(products);
}
```

### ب) ارسال سفارش توسط مشتری (در `index.html`):
```javascript
async function submitOrder(cartItems) {
  const tableParam = new URLSearchParams(window.location.search).get('table') || 'میز ۴';

  const payload = {
    tableNumber: tableParam,
    customerName: document.getElementById('name-input')?.value || 'مشتری کافه',
    sessionToken: localStorage.getItem('soren_session') || crypto.randomUUID(),
    items: cartItems.map(item => ({
      productId: item.id,
      quantity: item.quantity
    }))
  };

  const response = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (response.ok) {
    console.log("سفارش ثبت شد! شماره سفارش:", result.order.id);
    // ذخیره در استوریج برای پیگیری
    localStorage.setItem('active_order_id', result.order.id);
    trackOrderStatus(result.order.id);
  } else {
    alert(result.message);
  }
}
```

### ج) دریافت سفارشات فعال توسط باریستا (در `barista.html`):
```javascript
const BARISTA_PIN = "1234";

async function loadBaristaQueue() {
  const response = await fetch('/api/v1/orders', {
    headers: { 'X-Barista-Pin': BARISTA_PIN }
  });
  const activeOrders = await response.json();
  renderKanban(activeOrders);
}
```

### د) تغییر وضعیت سفارش توسط باریستا (در `barista.html`):
```javascript
async function advanceOrderStatus(orderId, nextStatus) {
  // nextStatus می‌تواند "BREWING" یا "READY" یا "DELIVERED" باشد
  await fetch(`/api/v1/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Barista-Pin': BARISTA_PIN
    },
    body: JSON.stringify({ status: nextStatus })
  });
}
```

### ه) ناموجود کردن آنی یک محصول توسط باریستا (Quick 86 / Out-of-Stock):
```javascript
async function toggleProductStock(productId, isAvailable) {
  await fetch(`/api/v1/products/${productId}/toggle-stock`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Barista-Pin': BARISTA_PIN
    },
    body: JSON.stringify({ isAvailable })
  });
}
```

---

## ۳. اتصال به وب‌سوکت بلادرنگ (بدون نیاز به نصب هیچ کتابخانه‌ای!)

مرورگر خودش وب‌سوکت نیتیو دارد. این کد را در فایل JS بگذار:

### در صفحه باریستا (`barista.js`):
```javascript
const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
const socket = new WebSocket(`${wsProto}//${location.host}/ws`);

socket.onopen = () => {
  // عضویت در کانال باریستا
  socket.send(JSON.stringify({ action: "subscribe_barista" }));
  console.log("متصل به کانال سفارشات زنده باریستا");
};

socket.onmessage = (event) => {
  const packet = JSON.parse(event.data);

  if (packet.event === "order:created") {
    // یک سفارش جدید آمد!
    playBaristaChime(); // صدای زنگ
    addNewCardToPendingColumn(packet.data);
  } else if (packet.event === "order:status_updated") {
    // تغییر وضعیت یک سفارش
    moveOrderCard(packet.data.orderId, packet.data.status);
  }
};
```

### در صفحه مشتری (`app.js`):
```javascript
const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);

socket.onmessage = (event) => {
  const packet = JSON.parse(event.data);

  // اگر محصولی توسط باریستا ناموجود شد:
  if (packet.event === "product:stock_updated") {
    updateProductButton(packet.data.productId, packet.data.isAvailable);
  }

  // اگر وضعیت سفارش خود کاربر آپدیت شد:
  if (packet.event === "order:status_updated") {
    const myOrderId = localStorage.getItem('active_order_id');
    if (packet.data.orderId === myOrderId) {
      updateLiveProgressBar(packet.data.status);
    }
  }
};
```

---

## ۴. صدای زنگ باریستا با Web Audio API (بدون نیاز به فایل صوتی MP3!)

این تابع را کپی کن؛ بدون نیاز به لود کردن هیچ فایل صوتی، یک زنگ ملایم کافه‌ای با بلندگو پخش می‌کند:

```javascript
function playBaristaChime() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime); // نت لا (زنگوله)
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.8);
}
```

---

## ۵. تست و مشاهده نتایج

وقتی هر دو فایل `index.html` و `barista.html` آماده شدند:
1. سرور رفیقت (بک‌اند) روی پورت ۴۰۰۰ ران است: `bun run dev`
2. مشتری را باز کن: `http://localhost:4000`
3. باریستا را باز کن: `http://localhost:4000/barista`
4. داشبورد تله‌متری را باز کن: `http://localhost:4000/dashboard`
5. سفارش ثبت کن و لذت ببر!
