"use strict";

/* ========================================================
   SOREN CAFÉ — Unified Interactive Client & Backend Bridge
   ======================================================== */

// بررسی سریع و فوری وضعیت مشاهده پری‌لودر در سشن جاری (Zero Flash)
(function checkEarlyPreloaderSeen() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    if (sessionStorage.getItem("soren_intro_seen") === "true") {
      const el = document.getElementById("soren-preloader");
      if (el) {
        el.classList.add("preloader-bypassed");
        el.setAttribute("aria-hidden", "true");
      }
    }
  } catch (e) {}
})();

const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:4000";
const API_BASE = origin.startsWith("http")
  ? `${origin}/api/v1`
  : "http://localhost:4000/api/v1";

const WS_BASE = origin.startsWith("http")
  ? `${origin.replace(/^http/, "ws")}/ws`
  : "ws://localhost:4000/ws";

/* ========================================================
   موتور بی‌درنگ وب‌سوکت کافه سورن (SorenWS PubSub Engine)
   ======================================================== */
const SorenWS = {
  socket: null,
  reconnectTimer: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 12,
  reconnectDelay: 1500,
  listeners: new Map(),

  init() {
    if (typeof WebSocket === "undefined") return;
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      this.socket = new WebSocket(WS_BASE);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit("connection:open", { timestamp: Date.now() });
        console.log(
          "%c[SOREN WS] Connected to Real-Time PubSub Engine",
          "color: #C89D66; font-weight: bold;"
        );
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event) {
            this.emit(payload.event, payload.data);
          }
        } catch (e) {
          console.warn("[SOREN WS] Parse error:", e);
        }
      };

      this.socket.onclose = () => {
        this.emit("connection:close", { timestamp: Date.now() });
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn("[SOREN WS] Socket error:", err);
      };
    } catch (e) {
      console.warn("[SOREN WS] Init error:", e);
      this.scheduleReconnect();
    }
  },

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    clearTimeout(this.reconnectTimer);
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.4, this.reconnectAttempts++),
      12000
    );
    this.reconnectTimer = setTimeout(() => this.init(), delay);
  },

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  },

  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
    }
  },

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error(err);
        }
      });
    }
  },

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(typeof data === "string" ? data : JSON.stringify(data));
    }
  },
};

// راه‌اندازی سراسری وب‌سوکت در زمان لود صفحه
if (typeof window !== "undefined") {
  SorenWS.init();
}

// کاتالوگ تطبیقی کامل ۳۷ محصول کافه سورن با شناسه‌های دیتابیس بک‌اند
const PRODUCT_CATALOG = {
  // قهوه‌های منوی اصلی
  "لاته": { id: "prd_latte", name: "لاته", price: 150000, image: "../images/products/coffee/latte.png", category: "coffee", desc: "قهوه تخصصی · ۲۵۰ میلی‌لیتر" },
  "کاپوچینو": { id: "prd_cappuccino", name: "کاپوچینو", price: 140000, image: "../images/products/coffee/cappuccino.png", category: "coffee", desc: "نوشیدنی گرم · ۳۰۰ میلی‌لیتر" },
  "اسپرسو": { id: "prd_espresso", name: "اسپرسو", price: 90000, image: "../images/products/coffee/espresso.png", category: "coffee", desc: "شات دوبل اصیل · ۴۰ میلی‌لیتر" },
  "اسپرسو دبل": { id: "prd_espresso_double", name: "اسپرسو دبل", price: 95000, image: "../images/products/coffee/double-espresso.png", category: "coffee", desc: "شات دوبل تخصصی با کرمای غلیظ" },
  "اسپرسو دوپیو": { id: "prd_doppio", name: "اسپرسو دوپیو سورن", price: 75000, image: "../images/products/coffee/double-espresso.png", category: "coffee", desc: "اتیوپی یرگاچف، نت‌های یاس و مرکبات" },
  "دوپیو": { id: "prd_doppio", name: "اسپرسو دوپیو سورن", price: 75000, image: "../images/products/coffee/double-espresso.png", category: "coffee", desc: "عصاره‌گیری ۹ بار استاندارد" },
  "آمریکانو": { id: "prd_americano", name: "آمریکانو", price: 110000, image: "../images/products/coffee/americano.png", category: "coffee", desc: "اسپرسو با آب تصفیه · ۲۲۰ میلی‌لیتر" },
  "موکا": { id: "prd_mocha", name: "موکا", price: 160000, image: "../images/products/coffee/mocha.png", category: "coffee", desc: "اسپرسو با شکلات فرانسوی · ۲۸۰ میلی‌لیتر" },
  "آیس لاته": { id: "prd_iced_latte", name: "آیس لاته", price: 170000, image: "../images/products/coffee/iced-latte.png", category: "coffee", desc: "سرو خنک با یخ قالبی · ۳۰۰ میلی‌لیتر" },

  // قهوه‌های تخصصی (Specialty Coffee Bar)
  "کورتادو": { id: "prd_cortado", name: "کورتادو پارسه", price: 95000, image: "../images/products/coffee/espresso.png", category: "coffee", desc: "اسپرسو با شیر بخارپز مخملی (۱:۱)" },
  "فلت وایت": { id: "prd_flatwhite", name: "فلت‌وایت عسل و دارچین", price: 115000, image: "../images/products/coffee/latte.png", category: "coffee", desc: "شیر جو دوسر، عسل طبیعی کوهستان" },
  "پوراوور V60": { id: "prd_geisha_v60", name: "پوراوور V60 کلمبیا", price: 140000, image: "../images/products/coffee/americano.png", category: "coffee", desc: "دم‌آوری دستی چکه‌ای، نت هلو و فینیش شفاف" },
  "کلد برو": { id: "prd_coldbrew", name: "کلد برو دودی زعفرانی", price: 125000, image: "../images/products/coffee/iced-latte.png", category: "coffee", desc: "۱۸ ساعت دم‌آوری سرد با زعفران قائنات" },
  "ماچا لاته": { id: "prd_matcha_latte", name: "ماچا لاته تشریفاتی", price: 135000, image: "../images/products/coffee/latte.png", category: "coffee", desc: "ماچای خالص اوجی کیوتو با شیر بادام" },

  // کیک و دسرها
  "چیزکیک نیویورکی": { id: "prd_cheesecake", name: "چیزکیک نیویورکی", price: 180000, image: "../images/products/cake/cheesecake.png", category: "cake", desc: "بافت خامه‌ای کاراملیزه دست‌ساز" },
  "چیز‌کیک": { id: "prd_cheesecake", name: "چیزکیک نیویورکی", price: 180000, image: "../images/products/cake/cheesecake.png", category: "cake", desc: "بافت خامه‌ای کاراملیزه دست‌ساز" },
  "براونی شکلاتی فاج": { id: "prd_brownie", name: "براونی شکلاتی فاج", price: 130000, image: "../images/products/cake/chocolate-fudge-brownie.png", category: "cake", desc: "براونی غلیظ با مغز شکلات مذاب" },
  "کیک دبل چاکلت": { id: "prd_choc_cake", name: "کیک دبل چاکلت", price: 150000, image: "../images/products/cake/chocolate-cake.png", category: "cake", desc: "اسفنج شکلات تلخ با گاناش دست‌ساز" },
  "کیک شکلاتی": { id: "prd_choc_cake", name: "کیک دبل چاکلت", price: 150000, image: "../images/products/cake/chocolate-cake.png", category: "cake", desc: "اسفنج شکلات تلخ با گاناش دست‌ساز" },
  "تیرامیسو کلاسیک": { id: "prd_tiramisu", name: "تیرامیسو کلاسیک", price: 170000, image: "../images/products/cake/tiramisu.png", category: "cake", desc: "لیدی فینگر اسپرسو و ماسکارپونه" },
  "تیرامیسو": { id: "prd_tiramisu", name: "تیرامیسو کلاسیک", price: 170000, image: "../images/products/cake/tiramisu.png", category: "cake", desc: "لیدی فینگر اسپرسو و ماسکارپونه" },
  "کیک هویج و گردو": { id: "prd_carrot_cake", name: "کیک هویج و گردو", price: 140000, image: "../images/products/cake/carrot-walnut-cake.png", category: "cake", desc: "معطر با دارچین و کرم پنیر" },
  "کوکی چاکلت چانک": { id: "prd_cookie", name: "کوکی چاکلت چانک", price: 80000, image: "../images/products/cake/chocolate-chunk-cookie.png", category: "cake", desc: "کوکی نرم با تکه‌های شکلات ۷۰٪" },
  "چیزکیک سن سباستین": { id: "prd_basque", name: "چیزکیک سن‌سباستین پسته", price: 165000, image: "../images/products/cake/cheesecake.png", category: "cake", desc: "بافت خامه‌ای کاراملیزه با کرم پسته دامغان" },
  "تارت عسل": { id: "prd_honey_tart", name: "تارت عسل و گردوی باستانی", price: 135000, image: "../images/products/cake/carrot-walnut-cake.png", category: "cake", desc: "خمیر سابله ترد فرانسوی، گردو و عسل" },
  "تارت لیمو": { id: "prd_lime_meringue", name: "تارت لیمو امانی و مرنگ", price: 120000, image: "../images/products/cake/cheesecake.png", category: "cake", desc: "کرم ترش لیمو امانی با مرنگ برشته" },
  "کیک خیس": { id: "prd_espresso_fudge", name: "کیک خیس شکلات تلخ و قهوه", price: 145000, image: "../images/products/cake/chocolate-cake.png", category: "cake", desc: "شکلات بلژیکی ۷۰٪ همراه شات اسپرسو" },
  "کروسان": { id: "prd_croissant", name: "کروسان بادام و بهارنارنج", price: 110000, image: "../images/products/cake/chocolate-chunk-cookie.png", category: "cake", desc: "لایه‌لایه کره‌ای با عطر بهارنارنج شیراز" },
  "نان موزی": { id: "prd_banana_bread", name: "نان موزی برشته با کره قهوه", price: 95000, image: "../images/products/cake/carrot-walnut-cake.png", category: "cake", desc: "نان موزی گردویی برشته با کره اسپرسو" },

  // شیک‌ها و نوشیدنی‌های خنک
  "شیک شکلات": { id: "prd_shake_choc", name: "شیک شکلات", price: 180000, image: "../images/products/shakes/chocolate-shake.png", category: "shake", desc: "بستنی شکلاتی و سس کاکائو هلندی" },
  "شیک وانیل": { id: "prd_shake_vanilla", name: "شیک وانیل", price: 160000, image: "../images/products/shakes/vanilla-shake.png", category: "shake", desc: "وانیل ماداگاسکار و شیر تازه" },
  "شیک توت‌فرنگی": { id: "prd_shake_strawberry", name: "شیک توت‌فرنگی", price: 170000, image: "../images/products/shakes/strawberry-shake.png", category: "shake", desc: "پوره طبیعی توت‌فرنگی تازه" },
  "شیک اورئو": { id: "prd_shake_oreo", name: "شیک اورئو", price: 190000, image: "../images/products/shakes/oreo-shake.png", category: "shake", desc: "بیسکویت اورئو با بستنی کره‌ای" },
  "شیک موز": { id: "prd_shake_banana", name: "شیک موز", price: 170000, image: "../images/products/shakes/banana-shake.png", category: "shake", desc: "موز طبیعی با مغز پسته" },
  "شیک کارامل": { id: "prd_shake_caramel", name: "شیک کارامل", price: 185000, image: "../images/products/shakes/caramel-shake.png", category: "shake", desc: "کارامل نمکی دولچه دلچه" },
  "شیک پسته": { id: "prd_pistachio_shake", name: "شیک پسته و کارامل نمکی", price: 185000, image: "../images/products/shakes/caramel-shake.png", category: "shake", desc: "بستنی وانیل، کارامل نمکی، خلال پسته" },
  "شیک موکا فندقی": { id: "prd_hazelnut_mocha", name: "شیک موکا کرانچ فندقی", price: 170000, image: "../images/products/shakes/chocolate-shake.png", category: "shake", desc: "دبل اسپرسو، نوتلا دست‌ساز، پرالین فندق" },
  "شیک لوتوس": { id: "prd_lotus_shake", name: "شیک لوتوس و اسپرسو", price: 165000, image: "../images/products/shakes/vanilla-shake.png", category: "shake", desc: "کرم بیسکویت لوتوس بلژیکی، اسپرسو" },
  "شیک زعفران": { id: "prd_saffron_velvet", name: "شیک زعفران و ماسکارپونه", price: 190000, image: "../images/products/shakes/banana-shake.png", category: "shake", desc: "بستنی دست‌ساز، ماسکارپونه، زعفران و هل" },
  "فراپه نارگیل": { id: "prd_coconut_frappe", name: "فراپه نارگیل و کلد برو", price: 140000, image: "../images/products/shakes/oreo-shake.png", category: "shake", desc: "قهوه سرددم ۱۸ ساعته، شیر نارگیل ارگانیک" },
  "شیک دارک چاکلت": { id: "prd_berry_dark", name: "شیک دارک چاکلت و تمشک وحشی", price: 175000, image: "../images/products/shakes/chocolate-shake.png", category: "shake", desc: "شکلات تلخ بلژیکی با پوره ملس تمشک جنگلی" },
};

// انتشار متغیرهای کلیدی روی شیء window برای دسترسی کامل کلاینت
if (typeof window !== "undefined") {
  window.PRODUCT_CATALOG = PRODUCT_CATALOG;
  window.SorenWS = SorenWS;
}

/* ========================================================
   موتور واکنشی و متمرکز سبد خرید (SorenCartStore)
   ======================================================== */
const SorenCartStore = {
  items: [],

  init() {
    try {
      const stored = typeof localStorage !== "undefined" ? localStorage.getItem("soren_cart_v1") : null;
      const parsed = stored ? JSON.parse(stored) : [];
      this.items = Array.isArray(parsed)
        ? parsed.map((it) => {
            const q = Number(it.quantity != null ? it.quantity : it.qty) || 1;
            return {
              ...it,
              quantity: q,
              qty: q,
            };
          })
        : [];
    } catch (e) {
      this.items = [];
    }
    this.notify(false); // initial state notification
  },

  save() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("soren_cart_v1", JSON.stringify(this.items));
      }
    } catch (e) {
      console.warn("[SorenCartStore] Save error:", e);
    }
  },

  addItem(product) {
    if (!product || !product.id) return;
    const existing = this.items.find((it) => it.id === product.id);
    if (existing) {
      existing.quantity = (existing.quantity || existing.qty || 1) + 1;
      existing.qty = existing.quantity;
    } else {
      const q = Number(product.quantity != null ? product.quantity : product.qty) || 1;
      this.items.push({
        id: product.id,
        name: product.name || "",
        price: Number(product.price) || 0,
        quantity: q,
        qty: q,
        category: product.category || "",
        image: product.image || "",
        desc: product.desc || "",
      });
    }
    this.save();
    this.notify(true);
  },

  removeItem(id) {
    this.items = this.items.filter((it) => it.id !== id);
    this.save();
    this.notify(true);
  },

  updateQuantity(id, delta) {
    const item = this.items.find((it) => it.id === id);
    if (!item) return;
    item.quantity = (item.quantity || item.qty || 1) + delta;
    item.qty = item.quantity;
    if (item.quantity <= 0) {
      this.removeItem(id);
      return;
    }
    this.save();
    this.notify(true);
  },

  getItems() {
    return [...this.items];
  },

  getTotalPrice() {
    return this.items.reduce((sum, it) => sum + (it.price * (it.quantity || it.qty || 0)), 0);
  },

  getTotalCount() {
    return this.items.reduce((sum, it) => sum + (it.quantity || it.qty || 1), 0);
  },

  getItemQuantity(id) {
    const item = this.items.find((it) => it.id === id);
    return item ? (item.quantity || item.qty || 0) : 0;
  },

  clearCart() {
    this.items = [];
    this.save();
    this.notify(true);
  },

  notify(broadcastWs = true) {
    const detail = {
      items: this.getItems(),
      totalCount: this.getTotalCount(),
      totalPrice: this.getTotalPrice(),
    };
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("soren:cart-changed", { detail }));
    }
    if (broadcastWs && typeof SorenWS !== "undefined" && SorenWS.send) {
      SorenWS.send({ event: "cart:sync", data: detail });
    }
  },
};

// پل سازگاری رو به عقب برای کدهای پیشین سبد خرید (Backward Compatibility Bridge)
const SorenCart = {
  KEY: "soren_cart_v1",

  getItems() {
    return SorenCartStore.getItems();
  },

  save(items) {
    SorenCartStore.items = Array.isArray(items)
      ? items.map((it) => {
          const q = Number(it.quantity != null ? it.quantity : it.qty) || 1;
          return { ...it, quantity: q, qty: q };
        })
      : [];
    SorenCartStore.save();
    SorenCartStore.notify(true);
    this.syncBadges();
  },

  addItem(product) {
    SorenCartStore.addItem(product);
  },

  updateQty(productId, delta) {
    SorenCartStore.updateQuantity(productId, delta);
  },

  removeItem(productId) {
    SorenCartStore.removeItem(productId);
  },

  clear() {
    SorenCartStore.clearCart();
  },

  getTotalCount() {
    return SorenCartStore.getTotalCount();
  },

  getSubtotal() {
    return SorenCartStore.getTotalPrice();
  },

  syncBadges() {
    const count = SorenCartStore.getTotalCount();
    if (typeof document === "undefined") return;
    document.querySelectorAll(".cart-button, .bottom-nav-cart").forEach((btn) => {
      let badge = btn.querySelector(".cart-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "cart-badge";
        btn.appendChild(badge);
      }
      badge.textContent = count > 0 ? String(count) : "";
      badge.dataset.count = String(count);
    });
  },
};

// انتشار روی window و گوش‌دادن به رویدادها
if (typeof window !== "undefined") {
  window.SorenCartStore = SorenCartStore;
  window.SorenCart = SorenCart;

  // همگام‌سازی نشانگرها با تغییرات سبد خرید
  window.addEventListener("soren:cart-changed", () => {
    SorenCart.syncBadges();
  });

  // همگام‌سازی بین تب‌های مختلف مرورگر با storage event
  window.addEventListener("storage", (e) => {
    if (e.key === "soren_cart_v1") {
      SorenCartStore.init();
    }
  });

  // همگام‌سازی بلادرنگ وب‌سوکت با دیگر نشست‌ها
  if (typeof SorenWS !== "undefined" && SorenWS.on) {
    SorenWS.on("cart:sync", (data) => {
      if (data && Array.isArray(data.items)) {
        SorenCartStore.items = data.items.map((it) => {
          const q = Number(it.quantity != null ? it.quantity : it.qty) || 1;
          return { ...it, quantity: q, qty: q };
        });
        SorenCartStore.save();
        SorenCartStore.notify(false);
      }
    });
  }

  // راه‌اندازی اولیه فروشگاه
  SorenCartStore.init();
}

/* ========================================
   1. جست‌وجوی دسکتاپ و فیلتر زنده
   ======================================== */
(function initDesktopSearch() {
  const box = document.querySelector(".desktop-search");
  if (!box) return;

  const toggle = box.querySelector(".search-toggle");
  const input = box.querySelector("input");

  function setOpen(isOpen) {
    box.classList.toggle("active", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute(
      "aria-label",
      isOpen ? "بستن جست‌وجو" : "باز کردن جست‌وجو"
    );
    if (isOpen) input.focus();
  }

  toggle.addEventListener("click", () => {
    setOpen(!box.classList.contains("active"));
  });

  document.addEventListener("click", (e) => {
    if (!box.contains(e.target)) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  box.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = input.value.trim().toLowerCase();
    if (!query) return;

    const cards = document.querySelectorAll(".product-card");
    if (cards.length > 0) {
      cards.forEach((card) => {
        const title = card.querySelector(".product-title")?.textContent.toLowerCase() || "";
        const desc = card.querySelector(".product-desc")?.textContent.toLowerCase() || "";
        const matched = title.includes(query) || desc.includes(query);
        card.hidden = !matched;
      });
    } else {
      const isPagesDir = window.location.pathname.includes("/pages/");
      const target = isPagesDir ? "./coffee.html" : "./pages/coffee.html";
      window.location.href = `${target}?q=${encodeURIComponent(query)}`;
    }
  });
})();

/* ========================================
   2. منوی موبایل
   ======================================== */
(function initMobileMenu() {
  const panel = document.getElementById("mobile-panel");
  const menuBtn = document.querySelector(".mobile-menu-button");
  const searchBtn = document.querySelector(".mobile-search");
  const searchForm = document.querySelector(".mobile-search-form");
  const searchInput = document.getElementById("mobile-search-input");

  if (!panel || !menuBtn) return;

  function setOpen(isOpen) {
    panel.classList.toggle("open", isOpen);
    menuBtn.setAttribute("aria-expanded", String(isOpen));
  }

  menuBtn.addEventListener("click", () => {
    setOpen(!panel.classList.contains("open"));
  });

  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
      setOpen(true);
      searchInput.focus({ preventScroll: true });
    });
  }

  panel.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = searchInput.value.trim().toLowerCase();
      if (!query) return;
      const cards = document.querySelectorAll(".product-card");
      if (cards.length > 0) {
        cards.forEach((card) => {
          const title = card.querySelector(".product-title")?.textContent.toLowerCase() || "";
          card.hidden = !title.includes(query);
        });
        setOpen(false);
      }
    });
  }
})();

/* ========================================
   3. اسکرول نرم به بخش‌های صفحه
   ======================================== */
(function initSmoothAnchors() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const id = link.getAttribute("href").slice(1);
    if (!id) return;

    link.addEventListener("click", (e) => {
      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({
        behavior: reduceMotion.matches ? "auto" : "smooth",
        block: "start",
      });
      history.pushState(null, "", `#${id}`);
    });
  });
})();

/* ========================================
   4. انیمیشن تصویر درباره ما
   ======================================== */
(function initArtworkReveal() {
  const artwork = document.getElementById("about-artwork");
  if (!artwork) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    artwork.classList.add("revealed");
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  observer.observe(artwork);
})();

/* ========================================
   5. فرم‌های ورود و ثبت‌نام
   ======================================== */
(function initAuthForms() {
  const form = document.querySelector(".auth-form");
  if (!form) return;

  form.querySelectorAll("[data-password-toggle]").forEach((button) => {
    const input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;

    button.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute(
        "aria-label",
        show ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"
      );
    });
  });

  const password = form.querySelector("#password");
  const confirm = form.querySelector("#confirmPassword");
  const strength = document.getElementById("passwordStrength");

  const levels = { 0: "امنیت رمز", 1: "ضعیف", 2: "متوسط", 3: "قوی" };

  function getStrength(value) {
    if (!value) return 0;
    const points = [
      value.length >= 8,
      value.length >= 12,
      /[a-z]/.test(value) && /[A-Z]/.test(value),
      /\d/.test(value),
      /[^A-Za-z0-9]/.test(value),
    ].filter(Boolean).length;

    if (points <= 1) return 1;
    return points <= 3 ? 2 : 3;
  }

  function checkMatch() {
    if (!confirm) return;
    const mismatch = confirm.value && confirm.value !== password.value;
    confirm.setCustomValidity(mismatch ? "رمز عبور و تکرار آن یکسان نیست" : "");
  }

  if (password && strength) {
    const label = strength.querySelector(".strength-label");
    password.addEventListener("input", () => {
      const level = getStrength(password.value);
      strength.dataset.level = String(level);
      label.textContent = levels[level];
      checkMatch();
    });
  }

  if (password && confirm) {
    confirm.addEventListener("input", checkMatch);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nameInput = form.querySelector("#fullName");
    const name = nameInput ? nameInput.value.trim() : "مشتری کافه";
    const idInput = form.querySelector("#identifier") || form.querySelector("#phone") || form.querySelector("#email");
    const identifier = idInput ? idInput.value.trim() : "";

    localStorage.setItem(
      "soren_user",
      JSON.stringify({
        name: name || "مشتری کافه",
        identifier: identifier,
        isLoggedIn: true,
        savedAt: Date.now(),
      })
    );

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = "با موفقیت وارد شدید...";
      submitBtn.disabled = true;
    }

    setTimeout(() => {
      window.location.href = "../index.html";
    }, 600);
  });
})();

/* ========================================
   6. صفحه سبد خرید پویا (Dynamic Cart Page)
   ======================================== */
(function initCartPage() {
  const emptyState = document.getElementById("cart-state-empty");
  const filledState = document.getElementById("cart-state-populated");
  if (!emptyState || !filledState) return;

  const itemsContainer = filledState.querySelector(".cart-items");
  const subtotalEl = document.getElementById("summary-subtotal");
  const discountEl = document.getElementById("summary-discount");
  const couponRow = document.getElementById("summary-coupon-row");
  const couponAmountEl = document.getElementById("summary-coupon");
  const totalEl = document.getElementById("summary-total");
  const statusBadge = document.getElementById("header-status-badge");

  const couponInput = document.getElementById("coupon-input");
  const couponButton = document.getElementById("coupon-apply");
  const couponMessage = document.getElementById("coupon-message");
  const checkoutBtn = document.querySelector(".checkout-btn");

  const formatter = new Intl.NumberFormat("fa-IR");
  const format = (n) => formatter.format(n);

  const CLUB_DISCOUNT_RATE = 0.05;
  const CLUB_DISCOUNT_STEP = 5000;
  const COUPONS = { SOREN10: 0.1, WELCOME: 0.15 };
  let couponRate = 0;

  function renderCart() {
    const items = SorenCart.getItems();
    const count = SorenCart.getTotalCount();
    const subtotal = SorenCart.getSubtotal();

    if (statusBadge) statusBadge.textContent = `${format(count)} مورد`;

    if (items.length === 0) {
      emptyState.hidden = false;
      filledState.hidden = true;
      return;
    }

    emptyState.hidden = true;
    filledState.hidden = false;

    // رندر آیتم‌ها در کانتینر
    const shippingNotice = itemsContainer.querySelector(".shipping-notice");
    itemsContainer.innerHTML = "";
    if (shippingNotice) itemsContainer.appendChild(shippingNotice);

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "cart-item";
      card.dataset.id = item.id;
      card.dataset.price = String(item.price);
      card.dataset.qty = String(item.qty);

      const isPagesDir = window.location.pathname.includes("/pages/");
      let displayImage = item.image || "";
      if (isPagesDir && !displayImage.startsWith("..") && !displayImage.startsWith("/")) {
        displayImage = "../" + displayImage;
      } else if (!isPagesDir && displayImage.startsWith("../")) {
        displayImage = displayImage.replace(/^\.\.\//, "./");
      }

      card.innerHTML = `
        <div class="product-image">
          <img src="${displayImage}" alt="${item.name}" width="128" height="128" loading="lazy" />
        </div>
        <div class="product-details">
          <div class="product-top">
            <div>
              <span class="product-tag">${item.desc || "محصول کافه سورن"}</span>
              <h3>${item.name}</h3>
              <p>قیمت واحد: ${format(item.price)} تومان</p>
            </div>
            <button class="delete-btn" type="button" aria-label="حذف ${item.name} از سبد">
              <svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
          <div class="product-bottom">
            <div class="price">
              <strong>${format(item.price * item.qty)}</strong>
              <span>تومان</span>
            </div>
            <div class="quantity">
              <button type="button" data-qty-step="1" aria-label="افزایش تعداد">+</button>
              <span class="quantity-value" aria-live="polite">${format(item.qty)}</span>
              <button type="button" data-qty-step="-1" aria-label="کاهش تعداد">−</button>
            </div>
          </div>
        </div>
      `;

      card.querySelector("[data-qty-step='1']").addEventListener("click", () => {
        SorenCart.updateQty(item.id, 1);
        renderCart();
      });

      card.querySelector("[data-qty-step='-1']").addEventListener("click", () => {
        SorenCart.updateQty(item.id, -1);
        renderCart();
      });

      card.querySelector(".delete-btn").addEventListener("click", () => {
        SorenCart.removeItem(item.id);
        renderCart();
      });

      itemsContainer.appendChild(card);
    });

    // تخفیف‌ها
    const clubDiscount = Math.round((subtotal * CLUB_DISCOUNT_RATE) / CLUB_DISCOUNT_STEP) * CLUB_DISCOUNT_STEP;
    const couponDiscount = Math.round(subtotal * couponRate);
    const total = Math.max(subtotal - clubDiscount - couponDiscount, 0);

    if (subtotalEl) subtotalEl.textContent = format(subtotal);
    if (discountEl) discountEl.textContent = format(clubDiscount);
    if (couponAmountEl) couponAmountEl.textContent = format(couponDiscount);
    if (couponRow) couponRow.hidden = couponDiscount === 0;
    if (totalEl) totalEl.textContent = format(total);
  }

  // کوپن تخفیف
  if (couponButton && couponInput) {
    couponButton.addEventListener("click", () => {
      const code = couponInput.value.trim().toUpperCase();
      if (!code) {
        showCouponMsg("لطفاً کد تخفیف را وارد کنید.", "error");
        return;
      }
      if (code in COUPONS) {
        couponRate = COUPONS[code];
        showCouponMsg(`کد تخفیف ${Math.round(couponRate * 100)}٪ با موفقیت اعمال شد.`, "success");
      } else {
        couponRate = 0;
        showCouponMsg("کد تخفیف وارد شده معتبر نیست.", "error");
      }
      renderCart();
    });
  }

  function showCouponMsg(text, type) {
    if (!couponMessage) return;
    couponMessage.textContent = text;
    couponMessage.className = `coupon-message is-${type}`;
    couponMessage.hidden = false;
  }

  // اجرای رندر اولیه
  renderCart();

  // چک کردن سفارش فعال از قبل
  checkActiveOrder();

  /* ========================================
     مودال تسویه و انتخاب میز (Checkout Flow)
     ======================================== */
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", openCheckoutModal);
  }

  async function openCheckoutModal() {
    const items = SorenCart.getItems();
    if (items.length === 0) return;

    let modalBackdrop = document.getElementById("soren-checkout-modal");
    if (!modalBackdrop) {
      modalBackdrop = document.createElement("div");
      modalBackdrop.id = "soren-checkout-modal";
      modalBackdrop.className = "soren-modal-backdrop";
      document.body.appendChild(modalBackdrop);
    }

    const userRaw = localStorage.getItem("soren_user");
    const user = userRaw ? JSON.parse(userRaw) : { name: "مشتری کافه", identifier: "" };
    const totalFormatted = totalEl ? totalEl.textContent : format(SorenCart.getSubtotal());

    modalBackdrop.innerHTML = `
      <div class="soren-modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-head-title">
        <header class="soren-modal-header">
          <h2 class="soren-modal-title" id="modal-head-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--coffee)" stroke-width="2">
              <path d="M4 19v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5M8 12V7a4 4 0 0 1 8 0v5M3 19h18" stroke-linecap="round"/>
            </svg>
            انتخاب جایگاه و ثبت نهایی سفارش
          </h2>
          <button type="button" class="soren-modal-close" aria-label="بستن">✕</button>
        </header>

        <div class="soren-modal-body">
          <form id="soren-order-form">
            <!-- نوار فیلتر زون‌های کافه -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 13px; font-weight: 700; color: var(--charcoal);">انتخاب میز یا بار:</span>
              <span id="selected-table-label" style="font-size: 12px; font-weight: 600; color: var(--coffee);">میزی انتخاب نشده</span>
            </div>

            <div class="zone-tabs-bar" role="tablist">
              <button type="button" class="zone-tab-btn is-active" data-zone="all">همه جایگاه‌ها</button>
              <button type="button" class="zone-tab-btn" data-zone="indoor">سالن اصلی</button>
              <button type="button" class="zone-tab-btn" data-zone="courtyard">حیاط و فضای سبز</button>
              <button type="button" class="zone-tab-btn" data-zone="vip">تشریفات VIP</button>
            </div>

            <!-- نقشه تعاملی میزها -->
            <div class="table-selection-grid" id="tables-container">
              <div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: var(--muted); font-size: 13px;">
                در حال دریافت نقشه سالن و استعلام میزهای آزاد...
              </div>
            </div>

            <!-- اطلاعات تحویل -->
            <div class="order-details-section">
              <div class="order-fields-grid">
                <div class="order-field-group">
                  <label for="order-cust-name">نام تحویل‌گیرنده:</label>
                  <input type="text" id="order-cust-name" value="${user.name}" required placeholder="مثال: پارسا راد" />
                </div>
                <div class="order-field-group">
                  <label for="order-cust-phone">شماره تماس (جهت اطلاع‌رسانی):</label>
                  <input type="tel" id="order-cust-phone" value="${user.identifier || ""}" placeholder="۰۹۱۲۳۴۵۶۷۸۹" />
                </div>
              </div>

              <!-- روش پرداخت -->
              <label style="font-size: 12px; font-weight: 700; color: var(--charcoal); display: block; margin-bottom: 8px;">
                شیوه تسویه و پرداخت:
              </label>
              <div class="payment-methods-grid">
                <div class="pay-card-option is-active" data-method="PAY_AT_COUNTER">
                  <div class="pay-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="M7 15h0M2 10h20"/>
                    </svg>
                  </div>
                  <div class="pay-card-text">
                    <strong>پرداخت در کافه</strong>
                    <span>پای بار یا روی میز پس از سرو</span>
                  </div>
                </div>

                <div class="pay-card-option" data-method="ONLINE">
                  <div class="pay-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                  <div class="pay-card-text">
                    <strong>پرداخت آنلاین</strong>
                    <span>درگاه شتاب و سفارش سریع</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <footer class="soren-modal-footer">
          <div class="modal-total-box">
            <span>مبلغ نهایی با تخفیف:</span>
            <strong>${totalFormatted} تومان</strong>
          </div>
          <button type="button" id="submit-order-btn" class="primary-btn" style="padding: 0 28px; height: 48px; border-radius: 12px; font-weight: 700; font-size: 14px;">
            تایید و ارسال به باریستا
            <svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m9 18 6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </footer>
      </div>
    `;

    modalBackdrop.classList.add("is-open");

    const closeBtn = modalBackdrop.querySelector(".soren-modal-close");
    closeBtn.addEventListener("click", () => modalBackdrop.classList.remove("is-open"));

    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) modalBackdrop.classList.remove("is-open");
    });

    let selectedTable = null;
    let selectedPayment = "PAY_AT_COUNTER";
    const tablesContainer = modalBackdrop.querySelector("#tables-container");
    const selectedLabel = modalBackdrop.querySelector("#selected-table-label");
    const zoneTabs = modalBackdrop.querySelectorAll(".zone-tab-btn");
    const payOptions = modalBackdrop.querySelectorAll(".pay-card-option");

    // مدیریت روش پرداخت
    payOptions.forEach((opt) => {
      opt.addEventListener("click", () => {
        payOptions.forEach((o) => o.classList.remove("is-active"));
        opt.classList.add("is-active");
        selectedPayment = opt.dataset.method;
      });
    });

    const zoneNames = {
      indoor: "سالن اصلی",
      courtyard: "حیاط و تراس",
      vip: "بخش VIP",
    };

    let allTablesData = [];

    function renderTables(filterZone = "all") {
      tablesContainer.innerHTML = "";
      const filtered = allTablesData.filter((t) => filterZone === "all" || t.zone === filterZone);

      if (filtered.length === 0) {
        tablesContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--muted); font-size: 12px;">میزی در این بخش یافت نشد.</div>`;
        return;
      }

      filtered.forEach((t) => {
        const isFree = t.status === "FREE";
        const isSelected = selectedTable && selectedTable.id === t.id;

        const card = document.createElement("div");
        card.className = `table-card ${!isFree ? "is-occupied" : ""} ${isSelected ? "is-selected" : ""}`;
        card.dataset.zone = t.zone;

        card.innerHTML = `
          <div class="table-card-top">
            <span class="table-card-number">${t.number}</span>
            <span class="table-card-capacity">${t.capacity} نفره</span>
          </div>
          <p class="table-card-name">${t.name}</p>
          <div class="table-card-footer">
            <span class="table-status-pill">
              <span class="table-status-dot"></span>
              <span style="font-weight: 600; color: ${isFree ? "var(--sage)" : "#888"}">${isFree ? "آماده پذیرایی" : "مشغول"}</span>
            </span>
            <span style="color: var(--muted);">${zoneNames[t.zone] || t.zone}</span>
          </div>
        `;

        if (isFree) {
          card.addEventListener("click", () => {
            selectedTable = t;
            selectedLabel.textContent = `${t.number} (${t.name})`;
            renderTables(filterZone);
          });
        }

        tablesContainer.appendChild(card);
      });
    }

    // لود دیتا از API
    try {
      const res = await fetch(`${API_BASE}/tables`);
      if (res.ok) {
        allTablesData = await res.json();
        // انتخاب خودکار اولین میز آزاد
        const firstFree = allTablesData.find((t) => t.status === "FREE");
        if (firstFree) {
          selectedTable = firstFree;
          selectedLabel.textContent = `${firstFree.number} (${firstFree.name})`;
        }
        renderTables("all");
      } else {
        throw new Error();
      }
    } catch {
      allTablesData = [
        { id: "tbl_1", number: "میز ۱", name: "رو به حیاط و آب‌نما", capacity: 2, zone: "courtyard", status: "FREE" },
        { id: "tbl_2", number: "میز ۲", name: "رو به حیاط و فضای سبز", capacity: 4, zone: "courtyard", status: "FREE" },
        { id: "tbl_3", number: "میز ۳", name: "سالن اصلی - کنار شومینه", capacity: 4, zone: "indoor", status: "FREE" },
        { id: "tbl_4", number: "میز ۴", name: "کنار بار و دم‌آوری دستی", capacity: 2, zone: "indoor", status: "FREE" },
      ];
      selectedTable = allTablesData[0];
      selectedLabel.textContent = `${selectedTable.number} (${selectedTable.name})`;
      renderTables("all");
    }

    // تب‌های فیلتر زون
    zoneTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        zoneTabs.forEach((b) => b.classList.remove("is-active"));
        tab.classList.add("is-active");
        renderTables(tab.dataset.zone);
      });
    });

    // سابمیت سفارش
    const submitBtn = modalBackdrop.querySelector("#submit-order-btn");
    submitBtn.addEventListener("click", async () => {
      if (!selectedTable) {
        alert("لطفاً یک میز انتخاب کنید.");
        return;
      }

      const nameInput = modalBackdrop.querySelector("#order-cust-name");
      const phoneInput = modalBackdrop.querySelector("#order-cust-phone");
      const customerName = nameInput.value.trim() || "مشتری کافه";
      const phoneNumber = phoneInput.value.trim() || null;

      submitBtn.textContent = "در حال ارسال به باریستا...";
      submitBtn.disabled = true;

      const payload = {
        table_number: selectedTable.number,
        customer_name: customerName,
        phone_number: phoneNumber,
        payment_method: selectedPayment,
        items: items.map((i) => ({
          productId: i.id,
          quantity: i.qty,
        })),
      };

      try {
        const orderRes = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Client-Id": `soren_client_${Date.now()}`,
            "X-Audience-Name": encodeURIComponent(customerName),
          },
          body: JSON.stringify(payload),
        });

        if (orderRes.ok) {
          const created = await orderRes.json();
          modalBackdrop.classList.remove("is-open");
          SorenCart.clear();
          renderCart();

          localStorage.setItem(
            "soren_active_order",
            JSON.stringify({
              id: created.order ? created.order.id : created.id,
              table: created.order ? created.order.table_number : selectedTable.number,
              total: created.order ? created.order.total_price : SorenCart.getSubtotal(),
              status: created.order ? created.order.status : "PENDING",
              createdAt: Date.now(),
            })
          );

          checkActiveOrder();
        } else {
          const err = await orderRes.json().catch(() => ({}));
          alert(`خطا در ثبت سفارش: ${err.message || "لطفاً دوباره امتحان کنید."}`);
          submitBtn.textContent = "تایید و ارسال به باریستا";
          submitBtn.disabled = false;
        }
      } catch (err) {
        console.error("Order submission failed:", err);
        alert("عدم برقراری ارتباط با سرور کافه. لطفاً از روشن بودن بک‌اند مطمئن شوید.");
        submitBtn.textContent = "تایید و ارسال به باریستا";
        submitBtn.disabled = false;
      }
    });
  }

  // رهگیری زنده سفارش فعال
  function checkActiveOrder() {
    const raw = localStorage.getItem("soren_active_order");
    if (!raw) return;

    let order = JSON.parse(raw);
    let card = document.getElementById("active-order-tracker");
    if (!card) {
      card = document.createElement("div");
      card.id = "active-order-tracker";
      card.className = "order-tracking-card";
      const cartSection = document.querySelector(".cart-section .cart-inner") || document.querySelector("main");
      if (cartSection) cartSection.prepend(card);
    }

    const stepIndex = { PENDING: 1, BREWING: 2, READY: 3, DELIVERED: 4 }[order.status] || 1;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
        <div>
          <span style="font-size: 11px; color: var(--muted); display: block;">شناسه رهگیری سفارش</span>
          <strong style="font-size: 16px; color: var(--charcoal);">${order.id}</strong>
        </div>
        <span style="padding: 4px 10px; border-radius: 999px; background: rgba(121, 82, 57, 0.1); color: var(--coffee); font-size: 12px; font-weight: 700;">
          ${order.table}
        </span>
      </div>

      <div class="order-stepper">
        <div class="order-step ${stepIndex >= 1 ? (stepIndex === 1 ? "is-active" : "is-done") : ""}">
          <div class="order-step-dot">۱</div>
          <span>ثبت سفارش</span>
        </div>
        <div class="order-step ${stepIndex >= 2 ? (stepIndex === 2 ? "is-active" : "is-done") : ""}">
          <div class="order-step-dot">۲</div>
          <span>دم‌آوری و آماده‌سازی</span>
        </div>
        <div class="order-step ${stepIndex >= 3 ? (stepIndex === 3 ? "is-active" : "is-done") : ""}">
          <div class="order-step-dot">۳</div>
          <span>آماده تحویل</span>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; font-size: 12px; color: var(--muted);">
        <span>وضعیت لحظه‌ای: <strong style="color: var(--coffee);">${order.status === "PENDING" ? "در انتظار تایید باریستا" : order.status === "BREWING" ? "در حال آماده‌سازی..." : order.status === "READY" ? "سفارش آماده است! بفرمایید" : "تحویل داده شد"}</strong></span>
        ${stepIndex >= 3 ? '<button type="button" id="dismiss-order-btn" style="background: none; border: none; color: var(--muted); cursor: pointer; text-decoration: underline;">بستن رسید</button>' : ""}
      </div>
    `;

    const dismissBtn = card.querySelector("#dismiss-order-btn");
    if (dismissBtn) {
      dismissBtn.addEventListener("click", () => {
        localStorage.removeItem("soren_active_order");
        card.remove();
      });
    }

    // انیمیشن فنری مرحله فعال در صورت بارگذاری GSAP
    if (typeof gsap !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const activeDot = card.querySelector(".order-step.is-active .order-step-dot");
      if (activeDot) {
        gsap.fromTo(
          activeDot,
          { scale: 0.6, rotate: -20 },
          { scale: 1, rotate: 0, duration: 0.5, ease: "back.out(2)" }
        );
      }
    }

    // اتصال بی‌درنگ به وب‌سوکت برای رهگیری لحظه‌ای سفارش بدون پولینگ
    if (!window._sorenWsOrderSubscribed) {
      window._sorenWsOrderSubscribed = true;
      SorenWS.init();
      SorenWS.on("order:status_updated", (data) => {
        if (!data || !data.orderId) return;
        const currentRaw = localStorage.getItem("soren_active_order");
        if (!currentRaw) return;
        const currentOrder = JSON.parse(currentRaw);
        if (currentOrder.id === data.orderId && currentOrder.status !== data.status) {
          console.log(`%c[SOREN WS] Order ${data.orderId} status changed -> ${data.status}`, "color: #3B7A57; font-weight: bold;");
          currentOrder.status = data.status;
          localStorage.setItem("soren_active_order", JSON.stringify(currentOrder));
          checkActiveOrder();
        }
      });
    }

    // بررسی اولیه یک‌باره فقط هنگام لود صفحه (در صورت تغییر وضعیت حین بسته بودن مرورگر)
    if (stepIndex < 3 && !window._sorenInitialOrderChecked) {
      window._sorenInitialOrderChecked = true;
      fetch(`${API_BASE}/orders/${order.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((fresh) => {
          if (fresh && fresh.status && fresh.status !== order.status) {
            order.status = fresh.status;
            localStorage.setItem("soren_active_order", JSON.stringify(order));
            checkActiveOrder();
          }
        })
        .catch(() => {});
    }
  }
})();

/* ========================================
   7. شبکه محصولات (فیلتر، سورت و افزودن به سبد)
   ======================================== */
(function initProductGrid() {
  const grid = document.getElementById("products-grid");
  const sortSelect = document.getElementById("sort-select");

  let toast = document.getElementById("cart-toast");
  let toastMessage = document.getElementById("toast-message");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "cart-toast";
    toast.id = "cart-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = `
      <svg class="icon cart-toast-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;">
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12.5 2.8 2.8L16 9.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span id="toast-message"></span>
    `;
    document.body.appendChild(toast);
    toastMessage = toast.querySelector("#toast-message");
  }

  // فیلتر و مرتب‌سازی تنها در صورت وجود شبکه منو
  if (grid) {
    const filterButtons = document.querySelectorAll(".menu-page .filter-btn");
    const cards = Array.from(grid.querySelectorAll(".product-card"));

    function filterCards(category) {
      cards.forEach((card) => {
        card.hidden = category !== "all" && card.dataset.category !== category;
      });
    }

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        filterButtons.forEach((btn) => {
          const isActive = btn === button;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-pressed", String(isActive));
        });
        filterCards(button.dataset.category);
      });
    });

    const sorters = {
      popular: (a, b) => Number(b.dataset.popularity || 0) - Number(a.dataset.popularity || 0),
      "price-asc": (a, b) => Number(a.dataset.price || 0) - Number(b.dataset.price || 0),
      "price-desc": (a, b) => Number(b.dataset.price || 0) - Number(a.dataset.price || 0),
    };

    function sortCards(mode) {
      const compare = sorters[mode];
      if (!compare) return;
      [...cards].sort(compare).forEach((card) => grid.appendChild(card));
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => sortCards(e.target.value));
      sortCards(sortSelect.value);
    }
  }

  let toastTimer;
  function showToast(message) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3000);
  }

  // رویداد افزودن به سبد خرید (پشتیبانی همزمان از دکمه‌های منو و کارت‌های منتخب صفحه اصلی)
  const addButtons = document.querySelectorAll(".btn-add, .featured-order");
  addButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".product-card, .featured-card");
      const productName =
        button.dataset.product ||
        card?.querySelector(".product-title, h3")?.textContent.trim() ||
        "";
      const price = Number(card?.dataset.price || 0);
      const imgEl = card?.querySelector(".product-image, .featured-image");
      const imgSrc = imgEl?.getAttribute("src") || "";

      // استخراج هوشمند یا تطبیقی محصول بر اساس کاتالوگ معتبر دیتابیس
      let catalogItem = PRODUCT_CATALOG[productName];
      if (!catalogItem) {
        const cleanName = productName.replace(/[()]/g, "").trim();
        const matchedKey = Object.keys(PRODUCT_CATALOG).find(
          (k) => cleanName.includes(k) || k.includes(cleanName)
        );
        if (matchedKey) catalogItem = PRODUCT_CATALOG[matchedKey];
      }

      const product = catalogItem || {
        id: "prd_espresso",
        name: productName || "محصول کافه سورن",
        price: price || 95000,
        image: imgSrc || "../images/products/coffee/espresso.png",
        category: card?.dataset.category || "coffee",
        desc: card?.querySelector(".product-desc, p")?.textContent.trim() || "",
      };

      SorenCart.addItem(product);

      // اجرای میکرو-انیمیشن پرواز آیتم به سمت سبد خرید (Animation Lab Flex)
      animateFlyToCart(button);

      // فیدبک بصری دکمه
      const label = button.querySelector(".btn-add-label");
      const defaultText = label ? label.textContent : "";
      if (label) label.textContent = "افزوده شد";
      button.classList.add("is-added");

      showToast(`«${product.name}» به سبد خرید شما اضافه شد.`);

      setTimeout(() => {
        if (label) label.textContent = defaultText;
        button.classList.remove("is-added");
      }, 1800);
    });
  });
})();

/* ========================================================
   8. مجموعه انیمیشن و فیزیک حرکتی (Animation Lab Suite)
   ======================================================== */

// میکرو-انیمیشن پرواز ذره به سمت سبد خرید در هدر با فیزیک شتاب‌دار
function animateFlyToCart(button) {
  if (typeof gsap === "undefined") return;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const cartButton = document.querySelector(".cart-button");
  if (!cartButton) return;

  const btnRect = button.getBoundingClientRect();
  const cartRect = cartButton.getBoundingClientRect();

  const startX = btnRect.left + btnRect.width / 2;
  const startY = btnRect.top + btnRect.height / 2;
  const endX = cartRect.left + cartRect.width / 2;
  const endY = cartRect.top + cartRect.height / 2;

  const particle = document.createElement("div");
  particle.className = "soren-fly-particle";
  particle.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>`;
  document.body.appendChild(particle);

  gsap.set(particle, {
    x: startX,
    y: startY,
    xPercent: -50,
    yPercent: -50,
    scale: 0.9,
    opacity: 1,
    zIndex: 9999,
  });

  gsap.to(particle, {
    x: endX,
    y: endY,
    scale: 0.25,
    opacity: 0.2,
    duration: 0.65,
    ease: "power2.in",
    onComplete: () => {
      particle.remove();
      const badges = document.querySelectorAll(".cart-badge");
      if (badges.length > 0) {
        gsap.fromTo(
          badges,
          { scale: 1.55 },
          { scale: 1, duration: 0.45, ease: "back.out(3)" }
        );
      }
      gsap.fromTo(
        cartButton,
        { scale: 0.9 },
        { scale: 1, duration: 0.35, ease: "power2.out" }
      );
    },
  });
}

// انیمیشن سه‌بعدی تعاملی ماوس بر روی هیرو (Hero 3D Perspective Tilt)
function initHero3DMotion() {
  if (typeof gsap === "undefined") return;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const heroContainer = document.querySelector(".hero-container");
  const heroFrame = document.querySelector(".hero-image-frame");
  const heroBadge = document.querySelector(".hero-image-badge");
  const heroTag = document.querySelector(".hero-image-tag");

  if (!heroContainer || !heroFrame) return;

  heroContainer.addEventListener("mousemove", (e) => {
    const rect = heroFrame.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const normX = (e.clientX - centerX) / (rect.width / 2);
    const normY = (e.clientY - centerY) / (rect.height / 2);

    const rotateY = Math.max(-12, Math.min(12, normX * 10));
    const rotateX = Math.max(-12, Math.min(12, -normY * 10));

    gsap.to(heroFrame, {
      rotateX: rotateX,
      rotateY: rotateY,
      transformPerspective: 1200,
      scale: 1.02,
      duration: 0.5,
      ease: "power2.out",
    });

    if (heroBadge) {
      gsap.to(heroBadge, {
        x: -normX * 14,
        y: -normY * 14,
        duration: 0.6,
        ease: "power2.out",
      });
    }

    if (heroTag) {
      gsap.to(heroTag, {
        x: -normX * 20,
        y: -normY * 20,
        duration: 0.7,
        ease: "power2.out",
      });
    }
  });

  heroContainer.addEventListener("mouseleave", () => {
    gsap.to(heroFrame, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: 1.1,
      ease: "elastic.out(1, 0.5)",
    });

    if (heroBadge) {
      gsap.to(heroBadge, { x: 0, y: 0, duration: 0.8, ease: "power2.out" });
    }
    if (heroTag) {
      gsap.to(heroTag, { x: 0, y: 0, duration: 0.8, ease: "power2.out" });
    }
  });
}

// رقص محتوایی با اسکرول (ScrollTrigger Choreography & SVG Drawing)
function initScrollChoreography() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  gsap.registerPlugin(ScrollTrigger);

  // ۱. ترسیم تدریجی خط تأکید SVG داستان سورن (DrawSVG / stroke-dashoffset)
  const underlineSvg = document.querySelector(".underline-svg path");
  if (underlineSvg) {
    const len = underlineSvg.getTotalLength ? underlineSvg.getTotalLength() : 110;
    gsap.set(underlineSvg, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(underlineSvg, {
      strokeDashoffset: 0,
      duration: 1.3,
      ease: "power2.inOut",
      scrollTrigger: {
        trigger: ".about-section",
        start: "top 75%",
      },
    });
  }

  // ۲. استگر کارتهای منتخب سورن (Featured Cards Stagger)
  const featuredCards = document.querySelectorAll(".featured-card");
  if (featuredCards.length > 0) {
    gsap.from(featuredCards, {
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".featured-grid",
        start: "top 85%",
      },
    });
  }

  // ۳. استگر دسته‌بندی‌های صفحه اصلی (Categories Stagger)
  const categoryCards = document.querySelectorAll(".category-card");
  if (categoryCards.length > 0) {
    gsap.from(categoryCards, {
      y: 35,
      opacity: 0,
      duration: 0.75,
      stagger: 0.12,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".categories-grid",
        start: "top 85%",
      },
    });
  }

  // ۴. ورود نرم کارت‌های ویژگی‌های درباره ما (Features Grid)
  const featureCards = document.querySelectorAll(".feature-card");
  if (featureCards.length > 0) {
    gsap.from(featureCards, {
      scale: 0.9,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "back.out(1.5)",
      scrollTrigger: {
        trigger: ".features-grid",
        start: "top 85%",
      },
    });
  }
}

// شنونده سراسری بروزرسانی موجودی محصولات از طریق وب‌سوکت بک‌اند
if (typeof SorenWS !== "undefined") {
  SorenWS.on("product:stock_updated", (data) => {
    if (!data || !data.productId) return;
    const cards = document.querySelectorAll(`[data-product-id="${data.productId}"]`);
    cards.forEach((card) => {
      card.classList.toggle("is-sold-out", !data.isAvailable);
      const btn = card.querySelector(".btn-add, .featured-order");
      if (btn) {
        btn.disabled = !data.isAvailable;
        const label = btn.querySelector(".btn-add-label, span");
        if (label) label.textContent = data.isAvailable ? "افزودن به سبد" : "ناموجود";
      }
    });
  });
}

/* ========================================================
   9. هیدراتاسیون پویا و همگام‌سازی زنده کاتالوگ (Dynamic Catalog Hydration)
   ======================================================== */
const SorenCatalog = {
  products: [],
  isHydrated: false,

  async init() {
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) return;
      this.products = await res.json();
      this.isHydrated = true;
      console.log(
        `%c[SOREN CATALOG] Hydrated ${this.products.length} live products from database`,
        "color: #795239; font-weight: bold;"
      );

      // ۱. همگام‌سازی و غنی‌سازی کاتالوگ
      this.products.forEach((p) => {
        PRODUCT_CATALOG[p.name] = {
          id: p.id,
          name: p.name,
          price: p.price,
          image: p.image_url,
          category: p.category,
          desc: p.description,
          tags: p.tags,
          isAvailable: Boolean(p.is_available),
        };
      });

      // ۲. به‌روزرسانی زنده وضعیت موجودی و شناسه‌ها روی کارت‌های DOM
      this.syncDOMCards();
    } catch (e) {
      console.warn("[SOREN CATALOG] Hydration running in offline fallback mode:", e);
    }
  },

  syncDOMCards() {
    const cards = document.querySelectorAll(".product-card, .featured-card");
    cards.forEach((card) => {
      const name = card.querySelector(".product-title, h3")?.textContent.trim();
      if (!name) return;

      // ۱. تطبیق دقیق
      let product = this.products.find((p) => p.name === name);

      // ۲. تطبیق از طریق کاتالوگ استاتیک در صورت وجود شناسه یکتا
      if (!product && PRODUCT_CATALOG[name]) {
        const catId = PRODUCT_CATALOG[name].id;
        product = this.products.find((p) => p.id === catId);
      }

      // ۳. تطبیق دقیق‌تر با واژه‌ها و پیشوند
      if (!product) {
        product = this.products.find((p) => p.name.startsWith(name)) ||
                  this.products.find((p) => p.name === name + " سورن" || name === p.name + " سورن") ||
                  this.products.find((p) => p.name.includes(name) && !p.name.includes("ماچا") && !p.name.includes("آیس"));
      }

      if (product) {
        card.setAttribute("data-product-id", product.id);
        card.setAttribute("data-price", String(product.price));

        const isAvail = Boolean(product.is_available);
        card.classList.toggle("is-sold-out", !isAvail);
        const btn = card.querySelector(".btn-add, .featured-order");
        if (btn) {
          btn.disabled = !isAvail;
          const label = btn.querySelector(".btn-add-label, span");
          if (label && !isAvail) label.textContent = "ناموجود";
        }
      }
    });
  },
};

/* ========================================================
   تجربه سینمایی لوگوی سیمرغ و ترنزیشن پری‌لودر (Soren Logo Experience)
   ======================================================== */
function initSorenLogoExperience() {
  const preloader = document.getElementById("soren-preloader");
  const skipBtn = document.getElementById("preloader-skip-btn");
  const brandContainer = document.getElementById("header-logo-container");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ۱. انیمیشن تعاملی هاور لوگوی هدر
  const brandLink = document.getElementById("main-brand-logo") || brandContainer;
  if (brandLink && typeof gsap !== "undefined") {
    brandLink.addEventListener("mouseenter", () => {
      if (prefersReduced) return;
      gsap.to("#header-logo-container .logo-wing-top", { y: -4, rotation: -8, transformOrigin: "bottom right", duration: 0.35, ease: "power2.out" });
      gsap.to("#header-logo-container .logo-wing-mid", { y: -3, rotation: -5, transformOrigin: "bottom right", duration: 0.35, ease: "power2.out" });
      gsap.to("#header-logo-container .logo-lotus-flower", { scale: 1.15, transformOrigin: "center center", duration: 0.4, ease: "back.out(2)" });
      gsap.to(["#header-logo-container .logo-letter-s", "#header-logo-container .logo-letter-r"], { fill: "#c86d51", duration: 0.3 });
      gsap.to("#header-logo-container .logo-boteh-jegheh", { rotation: 8, transformOrigin: "top left", duration: 0.4, ease: "power2.out" });
    });

    brandLink.addEventListener("mouseleave", () => {
      if (prefersReduced) return;
      gsap.to("#header-logo-container .soren-path", {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        fill: "currentColor",
        duration: 0.5,
        ease: "power3.out",
      });
    });
  }

  // ۲. انیمیشن پرده‌برداری سینمایی پری‌لودر با کش سشن و بستن لمسی
  if (!preloader) return;

  let isIntroSeen = false;
  try {
    isIntroSeen = typeof sessionStorage !== "undefined" && sessionStorage.getItem("soren_intro_seen") === "true";
  } catch (e) {
    isIntroSeen = false;
  }

  if (isIntroSeen) {
    preloader.classList.add("preloader-bypassed");
    preloader.setAttribute("aria-hidden", "true");
    try {
      preloader.remove();
    } catch {}
    return;
  }

  const markIntroSeen = () => {
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("soren_intro_seen", "true");
      }
    } catch (e) {}
  };

  const bypassPreloader = () => {
    markIntroSeen();
    preloader.classList.add("preloader-bypassed");
    preloader.classList.add("is-hidden");
    preloader.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      try {
        preloader.remove();
      } catch {}
    }, 100);
  };

  const closePreloader = () => {
    markIntroSeen();
    preloader.classList.add("is-hidden");
    preloader.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      try {
        preloader.remove();
      } catch {}
    }, 700);
  };

  // بستن لمسی با کلیک یا لمس دکمه رد کردن یا پس‌زمینه
  if (skipBtn) {
    skipBtn.addEventListener("click", bypassPreloader);
    skipBtn.addEventListener("pointerdown", bypassPreloader);
  }

  const backdrop = preloader.querySelector(".preloader-backdrop");
  if (backdrop) {
    backdrop.addEventListener("click", bypassPreloader);
    backdrop.addEventListener("pointerdown", bypassPreloader);
  }

  preloader.addEventListener("pointerdown", (e) => {
    if (e.target === preloader || e.target === backdrop) {
      bypassPreloader();
    }
  });

  if (typeof gsap === "undefined" || prefersReduced) {
    setTimeout(closePreloader, 600);
    return;
  }

  // تایم‌لاین شکوهمند ترسیم اجزای سیمرغ با GSAP
  const tl = gsap.timeline({
    onComplete: closePreloader,
  });

  const paths = preloader.querySelectorAll(".soren-path");
  gsap.set(paths, { opacity: 0, scale: 0.75, transformOrigin: "center center" });
  gsap.set(".preloader-brand-box", { opacity: 0, y: 16 });
  gsap.set(".preloader-bar-fill", { width: "0%" });

  tl.to(".preloader-svg .logo-lotus-flower", { opacity: 1, scale: 1, duration: 0.65, ease: "back.out(2)" })
    .to(
      [".preloader-svg .logo-letter-s", ".preloader-svg .logo-letter-r"],
      { opacity: 1, scale: 1, stagger: 0.12, duration: 0.55, ease: "power3.out" },
      "-=0.25"
    )
    .to(".preloader-svg .logo-bird-body", { opacity: 1, scale: 1, duration: 0.75, ease: "power4.out" }, "-=0.3")
    .to(
      [".preloader-svg .logo-wing-top", ".preloader-svg .logo-wing-mid"],
      { opacity: 1, scale: 1, stagger: 0.1, duration: 0.6, ease: "back.out(1.8)" },
      "-=0.4"
    )
    .to(
      [".preloader-svg .logo-boteh-jegheh", ".preloader-svg .logo-tail-upper", ".preloader-svg .logo-tail-lower"],
      { opacity: 1, scale: 1, stagger: 0.08, duration: 0.55, ease: "power2.out" },
      "-=0.35"
    )
    .to(".preloader-brand-box", { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.25")
    .to(".preloader-bar-fill", { width: "100%", duration: 0.55, ease: "power1.inOut" }, "-=0.4")
    .to(".preloader-svg", { scale: 1.05, duration: 0.4, ease: "power2.out" })
    .to(preloader, { opacity: 0, scale: 1.03, duration: 0.65, ease: "power3.inOut" });
}

if (typeof window !== "undefined") {
  window.SorenCatalog = SorenCatalog;
  window.initSorenLogoExperience = initSorenLogoExperience;
}

// راه‌اندازی اولیه در زمان لود صفحه
document.addEventListener("DOMContentLoaded", () => {
  if (typeof SorenCartStore !== "undefined") {
    SorenCartStore.init();
  }
  SorenCart.syncBadges();
  SorenCatalog.init();
  initHero3DMotion();
  initScrollChoreography();
  initSorenLogoExperience();
});


