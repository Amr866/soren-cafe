"use strict";

/* ========================================================
   SOREN CAFÉ — Unified Interactive Client & Backend Bridge
   ======================================================== */

// Ensure cold loads and page refreshes pin reliably at scrollY: 0 (Hero section)
if (typeof history !== "undefined" && "scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", () => {
    const hash = window.location.hash;
    if (!hash || hash === "#" || hash === "#home") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      const hash = window.location.hash;
      if (!hash || hash === "#" || hash === "#home") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    });
  } else {
    const hash = window.location.hash;
    if (!hash || hash === "#" || hash === "#home") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }
}

// Zero-flash check: verify if preloader has already been seen in current session
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
   Soren Café Real-Time WebSocket PubSub Engine
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

// Initialize global WebSocket connection on page load
if (typeof window !== "undefined") {
  SorenWS.init();
}

// Full catalog mapping (37 products) with backend database identifiers
const PRODUCT_CATALOG = {
  // Core Coffee Menu
  "لاته": { id: "prd_latte", name: "لاته", price: 150000, image: "../images/products/coffee/latte.png", category: "coffee", desc: "قهوه تخصصی · ۲۵۰ میلی‌لیتر" },
  "کاپوچینو": { id: "prd_cappuccino", name: "کاپوچینو", price: 140000, image: "../images/products/coffee/cappuccino.png", category: "coffee", desc: "نوشیدنی گرم · ۳۰۰ میلی‌لیتر" },
  "اسپرسو": { id: "prd_espresso", name: "اسپرسو", price: 90000, image: "../images/products/coffee/espresso.png", category: "coffee", desc: "شات دوبل اصیل · ۴۰ میلی‌لیتر" },
  "اسپرسو دبل": { id: "prd_espresso_double", name: "اسپرسو دبل", price: 95000, image: "../images/products/coffee/double-espresso.png", category: "coffee", desc: "شات دوبل تخصصی با کرمای غلیظ" },
  "اسپرسو دوپیو": { id: "prd_doppio", name: "اسپرسو دوپیو سورن", price: 75000, image: "../images/products/coffee/double-espresso.png", category: "coffee", desc: "اتیوپی یرگاچف، نت‌های یاس و مرکبات" },
  "دوپیو": { id: "prd_doppio", name: "اسپرسو دوپیو سورن", price: 75000, image: "../images/products/coffee/double-espresso.png", category: "coffee", desc: "عصاره‌گیری ۹ بار استاندارد" },
  "آمریکانو": { id: "prd_americano", name: "آمریکانو", price: 110000, image: "../images/products/coffee/americano.png", category: "coffee", desc: "اسپرسو با آب تصفیه · ۲۲۰ میلی‌لیتر" },
  "موکا": { id: "prd_mocha", name: "موکا", price: 160000, image: "../images/products/coffee/mocha.png", category: "coffee", desc: "اسپرسو با شکلات فرانسوی · ۲۸۰ میلی‌لیتر" },
  "آیس لاته": { id: "prd_iced_latte", name: "آیس لاته", price: 170000, image: "../images/products/coffee/iced-latte.png", category: "coffee", desc: "سرو خنک با یخ قالبی · ۳۰۰ میلی‌لیتر" },

  // Specialty Coffee Bar
  "کورتادو": { id: "prd_cortado", name: "کورتادو پارسه", price: 95000, image: "../images/products/coffee/espresso.png", category: "coffee", desc: "اسپرسو با شیر بخارپز مخملی (۱:۱)" },
  "فلت وایت": { id: "prd_flatwhite", name: "فلت‌وایت عسل و دارچین", price: 115000, image: "../images/products/coffee/latte.png", category: "coffee", desc: "شیر جو دوسر، عسل طبیعی کوهستان" },
  "پوراوور V60": { id: "prd_geisha_v60", name: "پوراوور V60 کلمبیا", price: 140000, image: "../images/products/coffee/americano.png", category: "coffee", desc: "دم‌آوری دستی چکه‌ای، نت هلو و فینیش شفاف" },
  "کلد برو": { id: "prd_coldbrew", name: "کلد برو دودی زعفرانی", price: 125000, image: "../images/products/coffee/iced-latte.png", category: "coffee", desc: "۱۸ ساعت دم‌آوری سرد با زعفران قائنات" },
  "ماچا لاته": { id: "prd_matcha_latte", name: "ماچا لاته تشریفاتی", price: 135000, image: "../images/products/coffee/latte.png", category: "coffee", desc: "ماچای خالص اوجی کیوتو با شیر بادام" },

  // Cakes and Desserts
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

  // Shakes and Cold Beverages
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

// Expose key variables on window object for global client access
if (typeof window !== "undefined") {
  window.PRODUCT_CATALOG = PRODUCT_CATALOG;
  window.SorenWS = SorenWS;
}

/* ========================================================
   موتور سنتز صدای ارگانیک و بازخورد لمسی (Soren Acoustic & Haptic Engine)
   ======================================================== */
const SorenAudio = {
  ctx: null,
  enabled: true,

  init() {
    try {
      const saved = localStorage.getItem("soren_sound_enabled");
      if (saved !== null) {
        this.enabled = saved === "true";
      }
    } catch (e) {}

    // Audio and haptics remain enabled by default across navigation and interactions
    this.enabled = true;

    // WebAudio feedback for navigation buttons, tabs, chips, and controls
    document.addEventListener("click", (e) => {
      const target = e.target.closest(
        ".category-chip, .hero-btn-primary, .sheet-checkout-btn, .order-bar-btn, .cart-button, .bottom-nav-cart, .filter-btn, .mobile-nav-item, #drawer-close-btn, #sheet-close-btn"
      );
      if (target) {
        this.playWarmTap();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(12);
          } catch (err) {}
        }
      }
    });
  },

  updateToggleButton(btn) {
    if (this.enabled) {
      btn.classList.remove("sound-muted");
      btn.setAttribute("title", "صدای تعاملی فعال است (کلیک برای قطع)");
      btn.setAttribute("aria-label", "صدای تعاملی فعال است");
    } else {
      btn.classList.add("sound-muted");
      btn.setAttribute("title", "صدای تعاملی غیرفعال است (کلیک برای وصل)");
      btn.setAttribute("aria-label", "صدای تعاملی غیرفعال است");
    }
  },

  getContext() {
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  },

  playTone(freqStart, freqEnd, duration, volume = 0.05, type = "sine") {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const trigger = () => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const now = ctx.currentTime;

          osc.type = type;
          osc.frequency.setValueAtTime(freqStart, now);
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

          gain.gain.setValueAtTime(volume, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + duration + 0.01);
        } catch (err) {}
      };

      if (ctx.state === "suspended") {
        ctx.resume().then(trigger).catch(() => {});
      } else {
        trigger();
      }
    } catch (e) {}
  },

  // Sound: warm ascending chime for add-to-cart and increment
  playAdd() {
    this.playTone(340, 560, 0.09, 0.05, "sine");
  },

  // Sound: soft descending chime for item decrement or removal
  playRemove() {
    this.playTone(420, 240, 0.08, 0.04, "sine");
  },

  // Sound: subtle wooden tap for organic UI interactions
  playWarmTap() {
    this.playTone(380, 160, 0.07, 0.04, "sine");
  },
};

if (typeof window !== "undefined") {
  window.SorenAudio = SorenAudio;
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
    if (typeof SorenAudio !== "undefined" && typeof SorenAudio.playAdd === "function") {
      SorenAudio.playAdd();
    }
  },

  removeItem(id) {
    this.items = this.items.filter((it) => it.id !== id);
    this.save();
    this.notify(true);
    if (typeof SorenAudio !== "undefined" && typeof SorenAudio.playRemove === "function") {
      SorenAudio.playRemove();
    }
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
    if (typeof SorenAudio !== "undefined") {
      if (delta > 0 && typeof SorenAudio.playAdd === "function") {
        SorenAudio.playAdd();
      } else if (delta < 0 && typeof SorenAudio.playRemove === "function") {
        SorenAudio.playRemove();
      }
    }
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

// Backward compatibility bridge for legacy cart store access
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
      if (count > 0) {
        badge.classList.remove("badge-pop");
        void badge.offsetWidth;
        badge.classList.add("badge-pop");
      } else {
        badge.classList.remove("badge-pop");
      }
    });
    const drawerBadge = document.getElementById("drawer-cart-badge");
    if (drawerBadge) {
      drawerBadge.textContent = count > 0 ? String(count) : "۰";
      drawerBadge.dataset.count = String(count);
    }
  },
};

// Expose on window and register global event listeners
if (typeof window !== "undefined") {
  window.SorenCartStore = SorenCartStore;
  window.SorenCart = SorenCart;

  // Synchronize badge counts with cart store updates
  window.addEventListener("soren:cart-changed", () => {
    SorenCart.syncBadges();
  });

  // Synchronize cross-tab state via StorageEvent
  window.addEventListener("storage", (e) => {
    if (e.key === "soren_cart_v1") {
      SorenCartStore.init();
    }
  });

  // Real-time WebSocket synchronization across client sessions
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

  // Initialize SorenCartStore on DOM readiness
  SorenCartStore.init();
}

/* ========================================
   1. موتور جست‌وجوی سراسری، فیلتر زنده و همگام‌سازی (Unified Search Engine)
   ======================================== */
(function initUnifiedSearch() {
  const desktopBox = document.querySelector(".desktop-search");
  const desktopInput = desktopBox?.querySelector("input");
  const desktopToggle = desktopBox?.querySelector(".search-toggle");
  const mobileInput = document.getElementById("mobile-search-input");
  const mobileForm = document.querySelector(".mobile-search-form");
  const emptyState = document.getElementById("catalog-empty-state") || document.querySelector(".catalog-empty-state");
  const resetBtn = document.getElementById("reset-filter-btn");

  const chipsBar = document.getElementById("category-chips");
  const categoryChips = chipsBar ? Array.from(chipsBar.querySelectorAll(".category-chip")) : [];
  const defaultChipCounts = {
    all: "۱۸",
    coffee: "۶",
    shakes: "۶",
    cake: "۶"
  };

  categoryChips.forEach((chip) => {
    const cat = chip.dataset.category || "all";
    const countEl = chip.querySelector(".chip-count");
    if (countEl && countEl.textContent.trim()) {
      defaultChipCounts[cat] = countEl.textContent.trim();
    }
  });

  let searchTimeout = null;
  let inFlightAbortController = null;
  let savedCategoryBeforeSearch = null;
  const DEBOUNCE_MS = 250;

  function toFaDigits(num) {
    const fa = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return String(num).replace(/[0-9]/g, (d) => fa[d]);
  }

  const CARD_ENGLISH_KEYWORDS = {
    // 18 Landing page items
    prd_espresso_double: "espresso double doppio coffee shot 9bar",
    prd_cappuccino: "cappuccino coffee milk foam latte art",
    prd_latte: "latte caffe coffee art velvety microfoam",
    prd_espresso: "espresso single shot coffee classic",
    prd_americano: "americano black coffee purified water",
    prd_mocha: "mocha chocolate french dark cocoa espresso coffee",
    prd_shake_choc: "chocolate shake milkshake cocoa dutch ice cream",
    prd_shake_strawberry: "strawberry shake milkshake fresh puree",
    prd_shake_vanilla: "vanilla shake milkshake madagascar fresh milk",
    prd_shake_oreo: "oreo shake milkshake cookie biscuits butter cream",
    prd_shake_banana: "banana shake milkshake pistachio nut fruit",
    prd_shake_caramel: "caramel salted caramel dulce de leche shake milkshake",
    prd_choc_cake: "double chocolate cake dark chocolate ganache sponge bakery dessert",
    prd_cheesecake: "new york cheesecake cheese cake caramel creamy bakery dessert",
    prd_brownie: "chocolate fudge brownie dark chocolate molten cake bakery dessert",
    prd_tiramisu: "classic tiramisu ladyfinger espresso mascarpone dessert",
    prd_carrot_cake: "carrot walnut cake cinnamon cream cheese bakery dessert",
    prd_cookie: "chocolate chunk cookie soft cookie 70% bakery",

    // Additional menu items
    prd_doppio: "espresso doppio double coffee yirgacheffe jasmine citrus",
    prd_iced_latte: "iced latte ice cold coffee cube",
    prd_cortado: "cortado coffee steamed milk velvety parseh 1:1",
    prd_flatwhite: "flat white flatwhite honey cinnamon oat milk mountain coffee",
    prd_geisha_v60: "v60 pour over pourover drip geisha colombia filter coffee manual",
    prd_coldbrew: "cold brew coldbrew smoky saffron iced coffee 18h",
    prd_matcha_latte: "matcha latte pure uji kyoto almond milk ceremonial green tea",
    prd_basque: "san sebastian basque cheesecake cheese cake pistachio creamy damghan",
    prd_honey_tart: "ancient honey walnut tart sable pastry french bakery dessert",
    prd_lime_meringue: "ammani lime tart meringue citrus roasted bakery dessert",
    prd_espresso_fudge: "dark chocolate coffee fudge cake belgian espresso bakery dessert",
    prd_croissant: "almond orange blossom croissant butter layered french bakery pastry",
    prd_banana_bread: "toasted banana bread espresso butter walnut bakery bread",
    prd_pistachio_shake: "pistachio salted caramel shake milkshake vanilla",
    prd_hazelnut_mocha: "hazelnut mocha crunch shake milkshake nutella praline double espresso",
    prd_lotus_shake: "lotus biscoff espresso shake milkshake belgian",
    prd_saffron_velvet: "saffron velvet mascarpone cardamom shake milkshake handmade",
    prd_coconut_frappe: "coconut cold brew frappe organic coldbrew milkshake",
    prd_berry_dark: "dark chocolate wild berry raspberry shake milkshake belgian"
  };

  const BILINGUAL_KEYWORD_MAP = {
    // Coffee & brew methods
    espresso: ["اسپرسو", "دبل", "دوپیو"],
    doppio: ["دوپیو", "اسپرسو"],
    latte: ["لاته", "آیس لاته"],
    cappuccino: ["کاپوچینو"],
    americano: ["آمریکانو"],
    mocha: ["موکا"],
    cortado: ["کورتادو"],
    flatwhite: ["فلت وایت", "فلت‌وایت"],
    "flat white": ["فلت وایت", "فلت‌وایت"],
    v60: ["v60", "پوراوور", "چکه‌ای"],
    pourover: ["v60", "پوراوور"],
    "pour over": ["v60", "پوراوور"],
    coldbrew: ["کلد برو", "کلدبرو"],
    "cold brew": ["کلد برو", "کلدبرو"],
    matcha: ["ماچا"],
    coffee: ["قهوه", "اسپرسو", "لاته", "کاپوچینو", "آمریکانو", "موکا", "کورتادو", "فلت وایت", "v60", "کلد برو"],

    // Shakes & cold bar
    shake: ["شیک"],
    milkshake: ["شیک"],
    vanilla: ["وانیل"],
    chocolate: ["شکلات", "شکلاتی", "چاکلت"],
    choc: ["شکلات", "چاکلت"],
    oreo: ["اورئو", "اوریو"],
    strawberry: ["توت فرنگی", "توت‌فرنگی"],
    caramel: ["کارامل"],
    pistachio: ["پسته"],
    lotus: ["لوتوس"],
    frappe: ["فراپه"],
    coconut: ["نارگیل"],
    hazelnut: ["فندق", "فندقی"],
    saffron: ["زعفران", "زعفرانی"],
    berry: ["تمشک", "بری"],

    // Bakery, cakes & desserts
    cheesecake: ["چیزکیک", "چیز کیک", "سن سباستین", "سن‌سباستین"],
    "cheese cake": ["چیزکیک", "چیز کیک"],
    sansebastian: ["سن سباستین", "سن‌سباستین", "چیزکیک"],
    "san sebastian": ["سن سباستین", "سن‌سباستین", "چیزکیک"],
    basque: ["سن سباستین", "سن‌سباستین", "چیزکیک"],
    brownie: ["براونی"],
    tiramisu: ["تیرامیسو"],
    cookie: ["کوکی"],
    croissant: ["کروسان", "کرواسان"],
    cake: ["کیک", "چیزکیک", "براونی", "تارت", "تیرامیسو"],
    tart: ["تارت"],
    lime: ["لیمو"],
    meringue: ["مرنگ"],
    carrot: ["هویج"],
    walnut: ["گردو"],
    banana: ["موز", "موزی"]
  };

  function normalize(str) {
    if (!str) return "";
    return String(str)
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "") // remove arabic diacritics / harakat
      .replace(/\u064A/g, "\u06CC") // Arabic Yeh (ي) -> Persian Yeh (ی)
      .replace(/\u0643/g, "\u06A9") // Arabic Kaf (ك) -> Persian Keheh (ک)
      .replace(/\u0629/g, "\u0647") // Teh Marbuta (ة) -> Heh (ه)
      .replace(/\u06C0/g, "\u0647") // Heh with yeh (ۀ) -> Heh (ه)
      .replace(/\u200C/g, " ") // Zero-width non-joiner -> space
      .replace(/[()[\]{}*+?!.,:;"'\\^$|~`_#\-—–/]/g, " ") // Punctuation & symbols -> space
      .replace(/\s+/g, " ")
      .trim();
  }

  function getCards() {
    return Array.from(
      document.querySelectorAll(
        ".product-card, #catalog-products-grid .featured-card, .featured-grid .featured-card"
      )
    );
  }

  function getActiveCategory() {
    const activeChip = document.querySelector(".category-chip.active");
    if (activeChip && activeChip.dataset.category) {
      return activeChip.dataset.category;
    }
    const activeBtn = document.querySelector(".menu-page .filter-btn.is-active");
    if (activeBtn && activeBtn.dataset.category) {
      return activeBtn.dataset.category;
    }
    return "all";
  }

  function cardMatchesQuery(card, queryNorm) {
    if (!queryNorm) return true;

    const title = card.querySelector(".product-title, .featured-title, h2, h3")?.textContent || "";
    const desc = card.querySelector(".product-desc, .featured-desc, p")?.textContent || "";
    const catText = card.querySelector(".product-category, .featured-category")?.textContent || "";
    const popularText = card.querySelector(".featured-popular, .featured-top")?.textContent || "";
    const nameAttr = card.dataset.name || "";
    const idAttr = card.dataset.id || card.dataset.productId || "";
    const enKeywords = CARD_ENGLISH_KEYWORDS[idAttr] || "";

    const textToSearch = `${title} ${desc} ${catText} ${popularText} ${nameAttr} ${idAttr} ${enKeywords}`;
    const textNorm = normalize(textToSearch);

    const queryTokens = queryNorm.split(" ").filter(Boolean);

    return queryTokens.every((token) => {
      if (textNorm.includes(token)) return true;
      const faSynonyms = BILINGUAL_KEYWORD_MAP[token];
      if (faSynonyms && faSynonyms.some((syn) => textNorm.includes(normalize(syn)))) {
        return true;
      }
      return false;
    });
  }

  function applyFilter(rawQuery) {
    const queryNorm = normalize(rawQuery);
    const cards = getCards();
    const activeCat = getActiveCategory();

    if (cards.length === 0) return 0;

    // 1. Calculate matching cards per category for chip counts
    const catCounts = {
      all: 0,
      coffee: 0,
      shakes: 0,
      cake: 0
    };

    cards.forEach((card) => {
      const isMatch = cardMatchesQuery(card, queryNorm);
      if (isMatch) {
        catCounts.all++;
        const cardCat = card.dataset.category;
        if (cardCat) {
          const normCat = (cardCat === "shake" || cardCat === "shakes") ? "shakes" : cardCat;
          if (catCounts.hasOwnProperty(normCat)) {
            catCounts[normCat]++;
          }
        }
      }
    });

    // 2. Update category chips count on landing page (#category-chips)
    if (categoryChips.length > 0) {
      categoryChips.forEach((chip) => {
        const cat = chip.dataset.category || "all";
        const countEl = chip.querySelector(".chip-count");
        if (countEl) {
          if (!queryNorm) {
            countEl.textContent = defaultChipCounts[cat] || countEl.textContent;
          } else {
            const count = catCounts[cat] || 0;
            countEl.textContent = toFaDigits(count);
          }
        }
      });
    }

    // 3. Filter cards according to both query and active category
    let matchCount = 0;
    cards.forEach((card) => {
      const cardCat = card.dataset.category;
      const normCat = (cardCat === "shake" || cardCat === "shakes") ? "shakes" : cardCat;
      const catMatch = activeCat === "all" || !normCat || normCat === activeCat;
      const isMatch = cardMatchesQuery(card, queryNorm);
      const shouldShow = isMatch && catMatch;

      card.hidden = !shouldShow;
      card.classList.toggle("is-filtered-out", !shouldShow);
      if (shouldShow) {
        card.style.display = "";
        matchCount++;
      } else {
        card.style.display = "none";
      }
    });

    // 4. Toggle empty state
    if (emptyState) {
      const showEmpty = matchCount === 0 && Boolean(queryNorm);
      emptyState.hidden = !showEmpty;
      emptyState.style.display = showEmpty ? "block" : "none";
    }

    return matchCount;
  }

  function onSearchInput(query) {
    // 1. Abort previous in-flight fetch request if running
    if (inFlightAbortController) {
      inFlightAbortController.abort();
    }
    inFlightAbortController = new AbortController();

    // 2. Debounce local DOM filter & API sync
    if (searchTimeout) clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
      // Sync other input if present
      if (desktopInput && desktopInput.value !== query) desktopInput.value = query;
      if (mobileInput && mobileInput.value !== query) mobileInput.value = query;

      const normQ = normalize(query);
      const activeCat = getActiveCategory();

      if (normQ) {
        // Entering search: remember current category and switch active chip to "all"
        if (activeCat !== "all" && !savedCategoryBeforeSearch) {
          savedCategoryBeforeSearch = activeCat;
          if (categoryChips.length > 0) {
            categoryChips.forEach((chip) => {
              const isAll = chip.dataset.category === "all";
              chip.classList.toggle("active", isAll);
              chip.setAttribute("aria-pressed", String(isAll));
            });
          }
        }
      } else {
        // Search cleared: restore previous category if one was saved
        if (savedCategoryBeforeSearch) {
          const catToRestore = savedCategoryBeforeSearch;
          savedCategoryBeforeSearch = null;
          if (categoryChips.length > 0) {
            categoryChips.forEach((chip) => {
              const isMatch = chip.dataset.category === catToRestore;
              chip.classList.toggle("active", isMatch);
              chip.setAttribute("aria-pressed", String(isMatch));
            });
          }
        }
      }

      applyFilter(query);

      // Async fetch to API if endpoint is available (with cancellation signal)
      const currentSignal = inFlightAbortController?.signal;
      if (typeof fetch === "function") {
        const apiUrl = `/api/v1/products?q=${encodeURIComponent(normQ)}`;
        fetch(apiUrl, { signal: currentSignal })
          .then((r) => (r.ok ? r.json() : null))
          .catch((err) => {
            if (err.name !== "AbortError") {
              // Ignore abort errors
            }
          });
      }
    }, DEBOUNCE_MS);
  }

  function handleFormSubmit(e, inputEl) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    const query = inputEl?.value || (desktopInput ? desktopInput.value : "") || "";
    if (searchTimeout) clearTimeout(searchTimeout);
    const matchCount = applyFilter(query);

    // Close offcanvas drawer if open
    const drawer = document.getElementById("soren-offcanvas-drawer");
    const backdrop = document.getElementById("soren-drawer-backdrop");
    if (drawer && drawer.classList.contains("is-open")) {
      drawer.classList.remove("is-open");
      backdrop?.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      backdrop?.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    const pathname = window.location.pathname || "";
    const isLandingPage =
      pathname === "/" ||
      pathname.endsWith("/index.html") ||
      pathname.endsWith("soren-cafe/") ||
      !pathname.includes("/pages/");

    if (isLandingPage) {
      const menuSection = document.getElementById("menu") || document.getElementById("catalog-products-grid");
      if (menuSection) {
        menuSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      // Highlight matching cards with subtle pulse
      const cards = getCards();
      const visibleCards = cards.filter((c) => !c.hidden && !c.classList.contains("is-filtered-out"));
      visibleCards.forEach((c) => {
        c.classList.remove("search-matched-pulse");
        void c.offsetWidth;
        c.classList.add("search-matched-pulse");
        setTimeout(() => c.classList.remove("search-matched-pulse"), 1000);
      });
    } else {
      const cards = getCards();
      if (cards.length === 0 && query.trim()) {
        const isPagesDir = pathname.includes("/pages/");
        const target = isPagesDir ? "./products.html" : "./pages/products.html";
        window.location.href = `${target}?q=${encodeURIComponent(query.trim())}`;
      }
    }
  }

  // Bind desktop search
  if (desktopBox && desktopInput) {
    if (desktopToggle) {
      function setOpen(isOpen) {
        desktopBox.classList.toggle("active", isOpen);
        desktopToggle.setAttribute("aria-expanded", String(isOpen));
        desktopToggle.setAttribute(
          "aria-label",
          isOpen ? "بستن جست‌وجو" : "باز کردن جست‌وجو"
        );
        if (isOpen) desktopInput.focus();
      }
      desktopToggle.addEventListener("click", () => {
        setOpen(!desktopBox.classList.contains("active"));
      });
      document.addEventListener("click", (e) => {
        if (!desktopBox.contains(e.target)) setOpen(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setOpen(false);
      });
    }

    desktopInput.addEventListener("input", (e) => {
      onSearchInput(e.target.value);
    });

    desktopInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleFormSubmit(e, desktopInput);
      }
    });

    desktopBox.addEventListener("submit", (e) => {
      handleFormSubmit(e, desktopInput);
    });
  }

  // Bind mobile search
  if (mobileInput) {
    mobileInput.addEventListener("input", (e) => {
      onSearchInput(e.target.value);
    });
    mobileInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleFormSubmit(e, mobileInput);
      }
    });
  }
  if (mobileForm && mobileInput) {
    mobileForm.addEventListener("submit", (e) => {
      handleFormSubmit(e, mobileInput);
    });
  }

  // Reset filter button
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (desktopInput) desktopInput.value = "";
      if (mobileInput) mobileInput.value = "";
      savedCategoryBeforeSearch = null;
      // Reset category filter buttons if present
      const filterBtns = document.querySelectorAll(".menu-page .filter-btn");
      filterBtns.forEach((btn) => {
        const isAll = btn.dataset.category === "all";
        btn.classList.toggle("is-active", isAll);
        btn.setAttribute("aria-pressed", String(isAll));
      });
      if (categoryChips.length > 0) {
        categoryChips.forEach((chip) => {
          const isAll = chip.dataset.category === "all";
          chip.classList.toggle("active", isAll);
          chip.setAttribute("aria-pressed", String(isAll));
        });
      }
      applyFilter("");
    });
  }

  // Hydrate search from URL query parameter ?q= or ?search=
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const initialQ = urlParams.get("q") || urlParams.get("search");
    if (initialQ) {
      if (desktopInput) desktopInput.value = initialQ;
      if (mobileInput) mobileInput.value = initialQ;
      if (desktopBox) desktopBox.classList.add("active");
      setTimeout(() => applyFilter(initialQ), 100);
    }
  } catch (e) {}

  // Expose global helper for other scripts / category switchers
  window.sorenApplySearch = applyFilter;
  window.sorenNormalizeSearch = normalize;
  window.sorenGetCurrentQuery = () => (desktopInput?.value || mobileInput?.value || "");
  window.sorenNotifyCategoryManualChange = () => { savedCategoryBeforeSearch = null; };
})();

/* ========================================
   2. کشوی ناوبری ثانویه و منوی موبایل (Off-Canvas Drawer)
   ======================================== */
(function initOffcanvasDrawer() {
  let drawer = document.getElementById("soren-offcanvas-drawer");
  let backdrop = document.getElementById("soren-drawer-backdrop");
  const menuButtons = document.querySelectorAll(".mobile-menu-button");
  let closeBtn = document.getElementById("drawer-close-btn");
  let lastFocusedTrigger = null;
  const searchBtn = document.querySelector(".mobile-search");
  const panel = document.getElementById("mobile-panel");
  const searchInput = document.getElementById("mobile-search-input");
  const menuBtn = document.querySelector(".mobile-menu-btn, .mobile-menu-button");
  const drawerBaristaText = document.getElementById("drawer-barista-text");

  // Self-healing: if drawer markup is missing on a subpage, inject the standard artisanal drawer
  if (!drawer || !backdrop) {
    const isSubpage = window.location.pathname.includes("/pages/");
    const basePrefix = isSubpage ? ".." : ".";
    const pagesPrefix = isSubpage ? "." : "./pages";

    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "soren-drawer-backdrop";
      backdrop.id = "soren-drawer-backdrop";
      backdrop.setAttribute("aria-hidden", "true");
      document.body.appendChild(backdrop);
    }

    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.className = "soren-offcanvas-drawer";
      drawer.id = "soren-offcanvas-drawer";
      drawer.setAttribute("role", "dialog");
      drawer.setAttribute("aria-modal", "true");
      drawer.setAttribute("aria-label", "منوی اصلی و دسترسی کافه سورن");
      drawer.setAttribute("aria-hidden", "true");

      drawer.innerHTML = `
        <div class="drawer-header">
          <a href="${basePrefix}/index.html" class="drawer-brand" aria-label="صفحه اصلی کافه سورن">
            <img src="${basePrefix}/images/brand/soren-logo.svg" alt="" class="drawer-brand-logo" width="36" height="36" aria-hidden="true" />
            <div class="drawer-brand-text">
              <span class="drawer-title">کافه سورن</span>
              <span class="drawer-subtitle">برشته‌کاری تخصصی و بیکری</span>
            </div>
          </a>
          <button type="button" class="drawer-close-btn" id="drawer-close-btn" aria-label="بستن منو">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="drawer-body">
          <div class="drawer-barista-status">
            <div class="drawer-status-top">
              <span class="status-pulse-dot" aria-hidden="true"></span>
              <span class="status-text" id="drawer-barista-text">باریستا: آماده پذیرش سفارش حضوری و بیرون‌بر</span>
            </div>
            <span class="drawer-status-hours">ساعات سرویس‌دهی: ۸:۰۰ الی ۲۳:۳۰</span>
          </div>
          <nav class="drawer-nav" aria-label="پیوندهای اصلی سایت">
            <div class="drawer-nav-group-title">بخش‌های کافه</div>
            <a href="${basePrefix}/index.html" class="drawer-nav-item">
              <span class="nav-item-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" />
                </svg>
              </span>
              <span class="nav-item-label">صفحه اصلی</span>
            </a>
            <div class="drawer-menu-category-block">
              <a href="${pagesPrefix}/products.html" class="drawer-nav-item drawer-menu-parent">
                <span class="nav-item-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8ZM6 2v3M10 2v3M14 2v3"/>
                  </svg>
                </span>
                <span class="nav-item-label">منوی محصولات</span>
                <span class="drawer-nav-tag">کاتالوگ</span>
              </a>
              <div class="drawer-category-quicklinks" aria-label="دسته‌بندی‌های منو">
                <a href="${pagesPrefix}/coffee.html" class="category-quicklink">
                  <span class="quicklink-dot" aria-hidden="true"></span>
                  <span>قهوه‌ها</span>
                </a>
                <a href="${pagesPrefix}/shakes.html" class="category-quicklink">
                  <span class="quicklink-dot" aria-hidden="true"></span>
                  <span>شیک‌ها</span>
                </a>
                <a href="${pagesPrefix}/cake.html" class="category-quicklink">
                  <span class="quicklink-dot" aria-hidden="true"></span>
                  <span>کیک و دسر</span>
                </a>
              </div>
            </div>
            <a href="${pagesPrefix}/about.html" class="drawer-nav-item">
              <span class="nav-item-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </span>
              <span class="nav-item-label">درباره ما و داستان سورن</span>
            </a>
            <a href="${pagesPrefix}/cart.html" class="drawer-nav-item drawer-cart-link">
              <span class="nav-item-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M5 8h14l1 12H4L5 8Z" />
                  <path d="M9 9V6a3 3 0 0 1 6 0v3" />
                </svg>
              </span>
              <span class="nav-item-label">سبد خرید سفارش</span>
              <span class="drawer-cart-badge" id="drawer-cart-badge" aria-live="polite">۰</span>
            </a>
            <a href="${pagesPrefix}/login.html" class="drawer-nav-item">
              <span class="nav-item-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M4.5 20c.6-4 3.2-6 7.5-6s6.9 2 7.5 6" />
                </svg>
              </span>
              <span class="nav-item-label">ورود / حساب کاربری</span>
            </a>
          </nav>
          <div class="drawer-contact-card">
            <div class="drawer-nav-group-title">اطلاعات و تماس سریع</div>
            <a href="tel:03136224422" class="drawer-action-row call-row" aria-label="تماس با کافه سورن ۰۳۱۳۶۲۲۴۴۲۲">
              <div class="action-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div class="action-texts">
                <span class="action-title">سفارش و هماهنگی تلفنی</span>
                <span class="action-sub" dir="ltr">۰۳۱-۳۶۲۲۴۴۲۲</span>
              </div>
            </a>
            <a href="https://maps.google.com/?q=Isfahan+Soren+Cafe" target="_blank" rel="noopener noreferrer" class="drawer-action-row map-row" aria-label="مسیریابی به کافه سورن در اصفهان">
              <div class="action-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div class="action-texts">
                <span class="action-title">مراجعه حضوری</span>
                <span class="action-sub">اصفهان، خیابان چهارباغ عباسی</span>
              </div>
            </a>
            <div class="drawer-socials">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" class="drawer-social-link" aria-label="اینستاگرام کافه سورن">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
                <span>اینستاگرام</span>
              </a>
              <a href="https://t.me" target="_blank" rel="noopener noreferrer" class="drawer-social-link" aria-label="تلگرام کافه سورن">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M21.8 4.2 18.6 20c-.2 1.1-.8 1.4-1.7.9l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-8c.4-.4-.1-.6-.6-.2L6.5 14 1.9 12.6c-1-.3-1-1 .2-1.5L20 4.1c.8-.3 1.9.2 1.8.1Z"/>
                </svg>
                <span>تلگرام</span>
              </a>
            </div>
          </div>
          <div class="drawer-footer">
            <p class="drawer-colophon">برشته‌کاری تخصصی و بیکری دست‌ساز سورن</p>
            <span class="drawer-motto">عصاره اصیل، آرامش و کیفیت</span>
          </div>
        </div>
      `;
      document.body.appendChild(drawer);
    }
  }

  closeBtn = document.getElementById("drawer-close-btn");

  function syncDrawerCartBadge() {
    const badge = document.getElementById("drawer-cart-badge");
    if (badge && window.SorenCart) {
      const count = window.SorenCart.getTotalCount();
      badge.textContent = count > 0 ? String(count) : "۰";
    }
  }

  function openDrawer(triggerBtn) {
    if (!drawer || !backdrop) return;
    lastFocusedTrigger = triggerBtn || document.activeElement;
    drawer.classList.add("is-open");
    backdrop.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.setAttribute("aria-hidden", "false");
    menuButtons.forEach((btn) => {
      btn.setAttribute("aria-expanded", "true");
      btn.classList.add("is-active");
    });
    document.body.style.overflow = "hidden";
    syncDrawerCartBadge();

    // Move focus inside drawer for accessibility
    setTimeout(() => {
      if (closeBtn) {
        closeBtn.focus();
      } else {
        const firstLink = drawer.querySelector("a, button");
        if (firstLink) firstLink.focus();
      }
    }, 50);
  }

  function closeDrawer() {
    if (!drawer || !backdrop) return;
    drawer.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.setAttribute("aria-hidden", "true");
    menuButtons.forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");
      btn.classList.remove("is-active");
    });
    document.body.style.overflow = "";

    // Return focus to the trigger button that opened it
    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === "function") {
      lastFocusedTrigger.focus();
    }
  }

  function toggleDrawer(triggerBtn) {
    if (!drawer) return;
    if (drawer.classList.contains("is-open")) {
      closeDrawer();
    } else {
      openDrawer(triggerBtn);
    }
  }

  menuButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toggleDrawer(btn);
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeDrawer();
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      closeDrawer();
    });
  }

  if (drawer) {
    // Delegated click handling: close drawer on link navigation
    drawer.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link) {
        closeDrawer();
      }
    });

    // Touch swipe-to-dismiss gesture (swipe right to dismiss in RTL)
    let touchStartX = 0;
    let touchStartY = 0;
    drawer.addEventListener(
      "touchstart",
      (e) => {
        if (e.changedTouches && e.changedTouches[0]) {
          touchStartX = e.changedTouches[0].clientX;
          touchStartY = e.changedTouches[0].clientY;
        }
      },
      { passive: true }
    );

    drawer.addEventListener(
      "touchend",
      (e) => {
        if (e.changedTouches && e.changedTouches[0]) {
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
          // Require >= 50px horizontal swipe with < 40px vertical delta
          if (deltaX > 50 && deltaY < 40) {
            closeDrawer();
          }
        }
      },
      { passive: true }
    );
  }

  // Focus trap inside drawer while open (Web Interface Guidelines compliance)
  document.addEventListener("keydown", (e) => {
    if (!drawer || !drawer.classList.contains("is-open")) return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeDrawer();
      return;
    }

    if (e.key === "Tab") {
      const focusableEls = drawer.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableEls.length === 0) return;
      const firstEl = focusableEls[0];
      const lastEl = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  });

  // Auto-dismiss drawer when viewport expands to desktop (>= 768px)
  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth >= 768 && drawer && drawer.classList.contains("is-open")) {
        closeDrawer();
      }
    },
    { passive: true }
  );

  // Mobile header quick search trigger
  if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const menuSection = document.getElementById("menu");
      if (menuSection) {
        menuSection.scrollIntoView({ behavior: "smooth" });
        const filterInput =
          document.getElementById("menu-quick-search") ||
          document.querySelector(".menu-search input") ||
          searchInput;
        if (filterInput) {
          setTimeout(() => {
            try {
              filterInput.focus({ preventScroll: true });
            } catch (err) {}
          }, 350);
        }
      } else if (panel && searchInput) {
        panel.classList.add("open");
        if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
        searchInput.focus({ preventScroll: true });
      }
    });
  }

  // Handle live barista and kitchen status updates via WebSocket
  if (typeof SorenWS !== "undefined" && drawerBaristaText) {
    SorenWS.on("connection:open", () => {
      drawerBaristaText.textContent = "باریستا: آماده پذیرش سفارش حضوری و بیرون‌بر";
    });

    SorenWS.on("connection:close", () => {
      drawerBaristaText.textContent = "باریستا: ثبت آفلاین و همگام‌سازی";
    });

    SorenWS.on("barista:status", (data) => {
      if (data && data.text) {
        drawerBaristaText.textContent = data.text;
      }
    });
  }

  // Legacy search form compatibility fallback
  if (panel) {
    panel.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        panel.classList.remove("open");
        if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Mobile search is unified with desktop in initUnifiedSearch
})();

/* ========================================================
   2.1 نوار ناوبری پایین صفحه موبایل (Mobile Bottom Navigation & Smart Auto-Hide)
   ======================================================== */
(function initMobileBottomNav() {
  const bottomNav = document.getElementById("mobile-bottom-nav");
  if (!bottomNav) return;

  const homeItem = document.getElementById("bottom-nav-home");
  const menuItem = document.getElementById("bottom-nav-menu");
  const cartItem = document.getElementById("bottom-nav-cart");
  const accountItem = document.getElementById("bottom-nav-account");
  const bottomBadge = document.getElementById("bottom-cart-badge");
  const navItems = bottomNav.querySelectorAll(".bottom-nav-item");

  function setActiveTab(activeItem) {
    if (!activeItem) return;
    navItems.forEach((item) => {
      if (item === activeItem) {
        item.classList.add("active");
        item.setAttribute("aria-current", "page");
      } else {
        item.classList.remove("active");
        item.removeAttribute("aria-current");
      }
    });
  }

  // 1. Intelligent scroll direction detection (Headroom auto-hide)
  let lastScrollY = typeof window !== "undefined" ? (window.scrollY || window.pageYOffset || 0) : 0;
  let scrollTicking = false;

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        window.requestAnimationFrame(() => {
          const curr = Math.max(0, window.scrollY || window.pageYOffset || 0);
          const docHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          );
          const maxScroll = Math.max(0, docHeight - window.innerHeight);
          const isNearFooter = maxScroll - curr < 220;

          // Prevent bottom nav deck from overlapping footer content
          if (isNearFooter) {
            bottomNav.classList.remove("nav-hidden");
          } else if (curr > lastScrollY && curr > 80 && curr - lastScrollY > 12) {
            bottomNav.classList.add("nav-hidden");
          } else if (curr < lastScrollY || curr <= 40) {
            bottomNav.classList.remove("nav-hidden");
          }
          lastScrollY = curr;
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    },
    { passive: true }
  );

  // 2. Handle bottom tab navigation clicks
  if (homeItem) {
    homeItem.addEventListener("click", (e) => {
      setActiveTab(homeItem);
      const homeSection = document.getElementById("home");
      if (homeSection) {
        e.preventDefault();
        homeSection.scrollIntoView({ behavior: "smooth" });
        if (history.pushState) history.pushState(null, "", "#home");
      }
    });
  }

  if (menuItem) {
    menuItem.addEventListener("click", (e) => {
      setActiveTab(menuItem);
      const menuSection = document.getElementById("menu");
      if (menuSection) {
        e.preventDefault();
        menuSection.scrollIntoView({ behavior: "smooth" });
        if (history.pushState) history.pushState(null, "", "#menu");
      }
    });
  }

  if (cartItem) {
    cartItem.addEventListener("click", (e) => {
      e.preventDefault();
      const cartSheet = document.getElementById("cart-bottom-sheet");
      if (cartSheet && typeof window.openCartBottomSheet === "function") {
        window.openCartBottomSheet();
      } else if (cartSheet && typeof window.openCartSheet === "function") {
        window.openCartSheet();
      } else {
        window.location.href = "./pages/cart.html";
      }
    });
  }

  // 3. Scroll spy: update active navigation tab based on scroll position
  if ("IntersectionObserver" in window) {
    const homeEl = document.getElementById("home");
    const menuEl = document.getElementById("menu");
    const observed = [
      { el: homeEl, tab: homeItem },
      { el: menuEl, tab: menuItem },
    ].filter((s) => s.el && s.tab);

    if (observed.length > 0) {
      const navObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
              const match = observed.find((s) => s.el === entry.target);
              if (match) {
                setActiveTab(match.tab);
              }
            }
          });
        },
        { threshold: [0.2, 0.4] }
      );
      observed.forEach((s) => navObserver.observe(s.el));
    }
  }

  // 4. Synchronize cart badge indicator with pop bounce animation
  function updateCartBadge(count) {
    if (!bottomBadge) return;
    const num = typeof count === "number" ? count : (window.SorenCartStore ? window.SorenCartStore.getTotalCount() : 0);
    if (num > 0) {
      bottomBadge.textContent = String(num);
      bottomBadge.dataset.count = String(num);
      bottomBadge.classList.remove("badge-pop");
      void bottomBadge.offsetWidth; // Trigger reflow to restart CSS keyframe animation
      bottomBadge.classList.add("badge-pop");
    } else {
      bottomBadge.textContent = "";
      bottomBadge.dataset.count = "0";
      bottomBadge.classList.remove("badge-pop");
    }
  }

  if (bottomBadge) {
    bottomBadge.addEventListener("animationend", () => {
      bottomBadge.classList.remove("badge-pop");
    });
  }

  // Subscribe to cart store mutation events
  window.addEventListener("soren:cart-changed", (e) => {
    const count = e.detail && typeof e.detail.totalCount === "number" ? e.detail.totalCount : 0;
    updateCartBadge(count);
  });

  // Initial cart badge synchronization
  if (typeof SorenCartStore !== "undefined") {
    updateCartBadge(SorenCartStore.getTotalCount());
  }
})();

/* ========================================================
   2.2 کاتالوگ یکپارچه و تراشه‌های چسبان دسته‌بندی منو
   (Single-Surface Catalog with Sticky Category Chips & Touch Steppers)
   ======================================================== */
function initSingleSurfaceCatalog() {
  const chipsBar = document.getElementById("category-chips");
  const chips = chipsBar ? Array.from(chipsBar.querySelectorAll(".category-chip")) : [];

  function triggerHaptic() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch (e) {}
    }
  }

  function toFaDigits(num) {
    const fa = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return String(num).replace(/[0-9]/g, (d) => fa[d]);
  }

  // 1. Instant client-side category filtering with smooth crossfade
  function setCategory(cat, shouldPushState = true, shouldScrollChip = false) {
    if (typeof window !== "undefined") window.setCatalogCategory = setCategory;
    if (!cat) cat = "all";

    // Update active state on category chips
    chips.forEach((chip) => {
      const match = chip.dataset.category === cat;
      chip.classList.toggle("active", match);
      chip.setAttribute("aria-pressed", String(match));
      if (match && shouldScrollChip) {
        try {
          const track = chipsBar?.querySelector(".chips-scroll-track") || chipsBar;
          if (track && typeof track.scrollTo === "function") {
            const targetLeft = chip.offsetLeft - (track.clientWidth - chip.clientWidth) / 2;
            track.scrollTo({ left: targetLeft, behavior: "smooth" });
          }
        } catch (e) {}
      }
    });

    // Filter catalog product cards by category and active search query
    const cards = document.querySelectorAll("#catalog-products-grid .featured-card, .featured-grid .featured-card");
    if (typeof window.sorenApplySearch === "function") {
      if (typeof window.sorenNotifyCategoryManualChange === "function") {
        window.sorenNotifyCategoryManualChange();
      }
      const curQ = typeof window.sorenGetCurrentQuery === "function" ? window.sorenGetCurrentQuery() : "";
      window.sorenApplySearch(curQ);
    } else {
      cards.forEach((card) => {
        const cardCat = card.dataset.category;
        const isMatch = cat === "all" || cardCat === cat;
        if (isMatch) {
          card.classList.remove("is-filtered-out");
        } else {
          card.classList.add("is-filtered-out");
        }
      });
    }

    // Smooth entry animation for visible cards
    cards.forEach((card) => {
      if (!card.hidden && !card.classList.contains("is-filtered-out")) {
        card.style.opacity = "0";
        card.style.transform = "translateY(8px)";
        requestAnimationFrame(() => {
          card.style.transition = "opacity 0.25s ease, transform 0.25s ease";
          card.style.opacity = "1";
          card.style.transform = "translateY(0)";
        });
      }
    });

    // Synchronize browser history and hash state without page reload
    if (shouldPushState && typeof history !== "undefined" && history.pushState) {
      const newHash = cat === "all" ? "#menu" : `#menu?cat=${cat}`;
      history.pushState({ category: cat }, "", newHash);
    }
  }

  // Bind click listener to each category chip
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      triggerHaptic();
      const cat = chip.dataset.category || "all";
      setCategory(cat, true, true);
    });
  });

  // Hydrate initial category from URL and listen to popstate/hashchange
  function checkUrlCategory(shouldPushState = false) {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    const match = hash.match(/cat=([a-z]+)/);
    if (match && match[1]) {
      setCategory(match[1], shouldPushState, false);
    } else if (hash.includes("#menu")) {
      setCategory("all", shouldPushState, false);
    }
  }

  window.addEventListener("popstate", () => checkUrlCategory(false));
  window.addEventListener("hashchange", () => checkUrlCategory(false));
  checkUrlCategory(false);

  // 2. In-card stepper (+ / count / -) with 2000ms inactivity auto-collapse & hover/focus pause
  const STEPPER_INACTIVITY_MS = 2000;
  const activeStepperTimers = new Map();
  const activeStepperMeta = new Map();

  function clearStepperTimer(id) {
    if (activeStepperTimers.has(id)) {
      clearTimeout(activeStepperTimers.get(id));
      activeStepperTimers.delete(id);
    }
  }

  function startStepperTimer(id, delay = STEPPER_INACTIVITY_MS) {
    clearStepperTimer(id);
    const meta = activeStepperMeta.get(id);
    if (meta?.isHovered || meta?.isFocused) {
      return;
    }

    const timer = setTimeout(() => {
      activeStepperTimers.delete(id);
      dismissCardStepper(id);
    }, delay);

    activeStepperTimers.set(id, timer);
  }

  function showCardStepper(id, duration = STEPPER_INACTIVITY_MS) {
    if (!id) return;
    renderSingleCardAction(id, true);
    startStepperTimer(id, duration);
  }

  function dismissCardStepper(id) {
    if (!id) return;
    const meta = activeStepperMeta.get(id);
    if (meta?.isHovered || meta?.isFocused) {
      return;
    }
    const cards = document.querySelectorAll(
      `.featured-card[data-id="${id}"], .featured-card[data-product-id="${id}"], .product-card[data-id="${id}"]`
    );
    cards.forEach((card) => {
      const stepper = card.querySelector(".card-stepper");
      if (stepper) {
        stepper.classList.add("is-collapsing");
        setTimeout(() => {
          const currentMeta = activeStepperMeta.get(id);
          if (currentMeta?.isHovered || currentMeta?.isFocused) {
            stepper.classList.remove("is-collapsing");
            return;
          }
          renderSingleCardAction(id, false);
        }, 200);
      } else {
        renderSingleCardAction(id, false);
      }
    });
  }

  function dismissCardStepperImmediately(id) {
    clearStepperTimer(id);
    activeStepperMeta.delete(id);
    renderSingleCardAction(id, false);
  }

  // Hover & Keyboard focus interaction persistence (pauses 2000ms countdown)
  document.addEventListener("mouseover", (e) => {
    const stepper = e.target.closest(".card-stepper");
    if (!stepper) return;
    const card = stepper.closest(".featured-card, .product-card");
    const id = stepper.dataset.id || card?.dataset.id || card?.dataset.productId;
    if (!id) return;

    let meta = activeStepperMeta.get(id);
    if (!meta) {
      meta = { isHovered: true, isFocused: false };
      activeStepperMeta.set(id, meta);
    } else {
      meta.isHovered = true;
    }
    stepper.classList.remove("is-collapsing");
    clearStepperTimer(id);
  });

  document.addEventListener("mouseout", (e) => {
    const stepper = e.target.closest(".card-stepper");
    if (!stepper) return;
    if (e.relatedTarget && stepper.contains(e.relatedTarget)) {
      return;
    }
    const card = stepper.closest(".featured-card, .product-card");
    const id = stepper.dataset.id || card?.dataset.id || card?.dataset.productId;
    if (!id) return;

    let meta = activeStepperMeta.get(id);
    if (meta) {
      meta.isHovered = false;
    }
    startStepperTimer(id, STEPPER_INACTIVITY_MS);
  });

  document.addEventListener("focusin", (e) => {
    const stepper = e.target.closest(".card-stepper");
    if (!stepper) return;
    const card = stepper.closest(".featured-card, .product-card");
    const id = stepper.dataset.id || card?.dataset.id || card?.dataset.productId;
    if (!id) return;

    let meta = activeStepperMeta.get(id);
    if (!meta) {
      meta = { isHovered: false, isFocused: true };
      activeStepperMeta.set(id, meta);
    } else {
      meta.isFocused = true;
    }
    stepper.classList.remove("is-collapsing");
    clearStepperTimer(id);
  });

  document.addEventListener("focusout", (e) => {
    const stepper = e.target.closest(".card-stepper");
    if (!stepper) return;
    if (e.relatedTarget && stepper.contains(e.relatedTarget)) {
      return;
    }
    const card = stepper.closest(".featured-card, .product-card");
    const id = stepper.dataset.id || card?.dataset.id || card?.dataset.productId;
    if (!id) return;

    let meta = activeStepperMeta.get(id);
    if (meta) {
      meta.isFocused = false;
    }
    startStepperTimer(id, STEPPER_INACTIVITY_MS);
  });

  function renderSingleCardAction(id, isStepperActive = false) {
    if (!id) return;
    const cards = document.querySelectorAll(
      `.featured-card[data-id="${id}"], .featured-card[data-product-id="${id}"], .product-card[data-id="${id}"]`
    );
    const qty = typeof SorenCartStore !== "undefined" ? SorenCartStore.getItemQuantity(id) : 0;

    cards.forEach((card) => {
      let actionBox = card.querySelector(".card-action-box");
      if (!actionBox) {
        const footer = card.querySelector(".featured-footer, .product-footer");
        if (footer) {
          actionBox = document.createElement("div");
          actionBox.className = "card-action-box";
          footer.appendChild(actionBox);
        }
      }
      if (!actionBox) return;

      const name = card.dataset.name || card.querySelector("h3, .product-title")?.textContent.trim() || "محصول";
      const currentState = actionBox.dataset.renderedState || (actionBox.querySelector(".card-stepper") ? "stepper" : (actionBox.querySelector(".card-in-cart-pill") ? "pill" : "empty"));
      const currentQty = parseInt(actionBox.dataset.renderedQty || "0", 10);

      if (qty > 0 && isStepperActive) {
        if (currentState === "stepper") {
          if (currentQty !== qty) {
            const countEl = actionBox.querySelector(".stepper-count");
            if (countEl) countEl.textContent = toFaDigits(qty);
            actionBox.dataset.renderedQty = String(qty);
          }
          return;
        }
        actionBox.dataset.renderedState = "stepper";
        actionBox.dataset.renderedQty = String(qty);
        actionBox.innerHTML = `
          <div class="card-stepper" data-id="${id}" aria-label="تنظیم تعداد ${name}">
            <button type="button" class="stepper-btn stepper-minus" data-id="${id}" aria-label="کاهش تعداد ${name}">−</button>
            <span class="stepper-count" aria-live="polite">${toFaDigits(qty)}</span>
            <button type="button" class="stepper-btn stepper-plus" data-id="${id}" aria-label="افزایش تعداد ${name}">+</button>
          </div>
        `;
      } else if (qty > 0) {
        if (currentState === "pill" && currentQty === qty) return;
        actionBox.dataset.renderedState = "pill";
        actionBox.dataset.renderedQty = String(qty);
        actionBox.innerHTML = `
          <button
            class="featured-order card-add-btn has-items"
            type="button"
            data-product="${name}"
            data-id="${id}"
            aria-label="افزودن ${name} به سبد (${toFaDigits(qty)} عدد در سبد)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <path d="M5 8h14l1 12H4L5 8Z" stroke-linejoin="round" />
              <path d="M9 9V6a3 3 0 0 1 6 0v3" stroke-linecap="round" />
            </svg>
            <span>افزودن به سبد</span>
            <span class="card-in-cart-pill" aria-hidden="true">${toFaDigits(qty)}</span>
          </button>
        `;
      } else {
        if (currentState === "empty") return;
        actionBox.dataset.renderedState = "empty";
        actionBox.dataset.renderedQty = "0";
        actionBox.innerHTML = `
          <button
            class="featured-order card-add-btn"
            type="button"
            data-product="${name}"
            data-id="${id}"
            aria-label="افزودن ${name} به سبد"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <path d="M5 8h14l1 12H4L5 8Z" stroke-linejoin="round" />
              <path d="M9 9V6a3 3 0 0 1 6 0v3" stroke-linecap="round" />
            </svg>
            <span>افزودن به سبد</span>
          </button>
        `;
      }
    });
  }

  function syncCardSteppers() {
    if (typeof SorenCartStore === "undefined") return;
    const cards = document.querySelectorAll(".featured-card[data-id], .product-card[data-id]");

    cards.forEach((card) => {
      const id = card.dataset.id || card.dataset.productId;
      if (!id) return;
      const qty = SorenCartStore.getItemQuantity(id);
      if (qty <= 0) {
        clearStepperTimer(id);
        activeStepperMeta.delete(id);
        renderSingleCardAction(id, false);
      } else {
        const isStepperActive = activeStepperTimers.has(id);
        renderSingleCardAction(id, isStepperActive);
      }
    });
  }

  // Listen to cart mutations to synchronize active stepper quantities
  window.addEventListener("soren:cart-changed", () => {
    syncCardSteppers();
  });

  // Initial invocation
  syncCardSteppers();

  // Expose stepper utility functions globally on window
  window.showCardStepper = showCardStepper;
  window.dismissCardStepper = dismissCardStepper;
  window.dismissCardStepperImmediately = dismissCardStepperImmediately;
  window.renderSingleCardAction = renderSingleCardAction;
  window.syncCardSteppers = syncCardSteppers;
  window.setMenuCategory = setCategory;
  window.setCatalogCategory = setCategory;
}

/* ========================================================
   2.3 اسلایدر متمرکز دسته‌بندی‌ها و همگام‌سازی با کاتالوگ منو
   (Category Carousel Scroll-Snap & Catalog Sync Engine)
   ======================================================== */
function initCategoryCarouselSync() {
  const container = document.querySelector(".categories-grid");
  const dotsBar = document.getElementById("category-dots");
  if (!container || !dotsBar) return;

  const cards = Array.from(container.querySelectorAll(".category-card"));
  const dots = Array.from(dotsBar.querySelectorAll(".carousel-dot"));
  if (cards.length === 0 || dots.length === 0) return;

  let isProgrammaticScroll = false;
  let scrollTimeout = null;

  function updateActiveState(catId, index, shouldScrollChip = false) {
    dots.forEach((dot, i) => {
      const match = i === index || dot.dataset.category === catId;
      dot.classList.toggle("active", match);
      dot.setAttribute("aria-selected", String(match));
    });

    if (catId && typeof window.setCatalogCategory === "function") {
      window.setCatalogCategory(catId, false, shouldScrollChip);
    }
  }

  // 1. Pagination dot click handler
  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      const targetCard = cards[index];
      if (targetCard) {
        isProgrammaticScroll = true;
        targetCard.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        updateActiveState(dot.dataset.category, index, false);
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isProgrammaticScroll = false;
        }, 600);
      }
    });
  });

  // 2. Synchronize active pagination dot via IntersectionObserver during swipe
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            const catId = entry.target.dataset.category;
            const index = cards.indexOf(entry.target);
            if (index !== -1) {
              updateActiveState(catId, index);
            }
          }
        });
      },
      {
        root: container,
        threshold: [0.55, 0.75],
      }
    );

    cards.forEach((card) => observer.observe(card));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCategoryCarouselSync);
} else {
  initCategoryCarouselSync();
}

/* ========================================================
   2.3 نوار شناور سفارش جاری و دراور برگه کشویی سبد خرید موبایل
   (Floating Order Bar & Interactive Cart Bottom Sheet Drawer)
   ======================================================== */
let isCartBottomSheetInitialized = false;

function initCartBottomSheetAndFloatingBar() {
  const floatingBar = document.getElementById("floating-order-bar");
  const orderBarOpenBtn = document.getElementById("order-bar-open-btn");
  const orderBarCount = document.getElementById("order-bar-count");
  const orderBarPrice = document.getElementById("order-bar-price");

  const sheet = document.getElementById("cart-bottom-sheet");
  const backdrop = document.getElementById("cart-sheet-backdrop");

  if (isCartBottomSheetInitialized) {
    if (typeof window.syncFloatingOrderBar === "function") {
      window.syncFloatingOrderBar();
    }
    return;
  }
  isCartBottomSheetInitialized = true;
  const dragZone = document.getElementById("sheet-drag-zone");
  const closeBtn = document.getElementById("sheet-close-btn");
  const itemsList = document.getElementById("sheet-items-list");
  const itemsCount = document.getElementById("sheet-items-count");
  const subtotalEl = document.getElementById("sheet-subtotal-price");
  const discountEl = document.getElementById("sheet-discount-price");
  const finalPriceEl = document.getElementById("sheet-final-price");
  const checkoutBtn = document.getElementById("sheet-checkout-btn");
  const noteInput = document.getElementById("sheet-order-note");
  const bottomNavCart = document.getElementById("bottom-nav-cart");

  // Utility: convert Latin digits to Persian digits
  function toFaDigits(num) {
    const fa = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return String(num).replace(/[0-9]/g, (d) => fa[d]);
  }

  // Utility: format currency in Tomans with Persian numerals
  function formatPriceFa(num) {
    const formatted = new Intl.NumberFormat("fa-IR").format(Number(num) || 0);
    return toFaDigits(formatted).replace(/['\u0027\u2019]/g, "٬") + " تومان";
  }

  // Normalize relative image paths across root and pages/ directories
  function resolveItemImage(img) {
    if (!img) return "./images/brand/favicon.svg";
    const isPagesDir = typeof window !== "undefined" && window.location.pathname.includes("/pages/");
    if (isPagesDir && !img.startsWith("..") && !img.startsWith("/")) {
      return "../" + img;
    } else if (!isPagesDir && img.startsWith("../")) {
      return img.replace(/^\.\.\//, "./");
    }
    return img;
  }

  // Open cart bottom sheet drawer
  function openCartBottomSheet() {
    if (!sheet || !backdrop) return;
    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
    backdrop.classList.add("is-open");
    backdrop.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

    if (window.SorenCartStore) {
      renderCartBottomSheet(window.SorenCartStore.getItems());
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch (err) {}
    }
  }

  // Close cart bottom sheet drawer
  function closeCartBottomSheet() {
    if (!sheet || !backdrop) return;
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("is-open");
    backdrop.setAttribute("aria-hidden", "true");

    sheet.style.transform = "";
    sheet.style.transition = "";
    sheet.style.bottom = "";
    backdrop.style.opacity = "";

    document.body.style.overflow = "";
  }

  // Render live items inside cart bottom sheet
  function renderCartBottomSheet(items) {
    if (!itemsList) return;

    const validItems = Array.isArray(items) ? items : [];
    const totalCount = window.SorenCartStore
      ? window.SorenCartStore.getTotalCount()
      : validItems.reduce((s, it) => s + (it.qty || it.quantity || 1), 0);
    const totalPrice = window.SorenCartStore
      ? window.SorenCartStore.getTotalPrice()
      : validItems.reduce((s, it) => s + ((it.price || 0) * (it.qty || it.quantity || 1)), 0);

    if (itemsCount) itemsCount.textContent = `${toFaDigits(totalCount)} آیتم`;
    if (subtotalEl) subtotalEl.textContent = formatPriceFa(totalPrice);
    if (discountEl) discountEl.textContent = "۰ تومان";
    if (finalPriceEl) finalPriceEl.textContent = formatPriceFa(totalPrice);

    if (validItems.length === 0) {
      itemsList.innerHTML = `
        <div class="sheet-empty-state">
          <span class="sheet-empty-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--coffee, #795239)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>
            </svg>
          </span>
          <p class="sheet-empty-text">سبد خرید شما در حال حاضر خالی است</p>
          <p class="sheet-empty-subtext">می‌توانید از منوی متنوع سورن آیتم‌های دلخواهتان را اضافه کنید.</p>
        </div>
      `;
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.classList.remove("is-loading");
    }

    itemsList.innerHTML = validItems
      .map((item) => {
        const q = Number(item.quantity != null ? item.quantity : item.qty) || 1;
        const unitPrice = Number(item.price) || 0;
        const lineTotal = unitPrice * q;
        const imgSrc = resolveItemImage(item.image);
        const name = item.name || "محصول کافه سورن";
        const id = item.id;

        return `
          <article class="sheet-item-row" data-id="${id}">
            <div class="sheet-item-swipe-action" aria-hidden="true">
              <button type="button" class="sheet-swipe-delete-btn" data-id="${id}" aria-label="حذف ${name}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>حذف</span>
              </button>
            </div>
            <img src="${imgSrc}" alt="${name}" class="sheet-item-img" loading="lazy" onerror="window.handleImageError && window.handleImageError(this)" />
            <div class="sheet-item-head">
              <h4 class="sheet-item-name">${name}</h4>
              <span class="sheet-item-unit-price">${formatPriceFa(unitPrice)} واحد</span>
            </div>
            <div class="sheet-item-actions">
              <div class="sheet-item-prices">
                <span class="sheet-item-total-price">${formatPriceFa(lineTotal)}</span>
              </div>
              <div class="sheet-item-controls">
                <div class="sheet-stepper" data-id="${id}" aria-label="تنظیم تعداد ${name}">
                  <button type="button" class="sheet-stepper-btn sheet-minus-btn" data-id="${id}" aria-label="کاهش تعداد ${name}">−</button>
                  <span class="sheet-stepper-count" aria-live="polite">${toFaDigits(q)}</span>
                  <button type="button" class="sheet-stepper-btn sheet-plus-btn" data-id="${id}" aria-label="افزایش تعداد ${name}">+</button>
                </div>
                <button type="button" class="sheet-delete-btn" data-id="${id}" aria-label="حذف ${name} از سبد">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    // Attach rubber-band swipe-to-delete gestures to cart item cards
    itemsList.querySelectorAll(".sheet-item-row").forEach(attachItemSwipeGestures);

    renderCartUpsellShelf(validItems);
  }

  // Mobile touch swipe gesture handler with rubber-band resistance
  function attachItemSwipeGestures(row) {
    if (!row) return;
    let startX = 0;
    let startY = 0;
    let currentDx = 0;
    let isSwiping = false;
    let isHorizontal = null;

    row.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;
        if (e.target.closest("button") || e.target.closest("input")) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentDx = 0;
        isSwiping = true;
        isHorizontal = null;
        row.style.transition = "none";
      },
      { passive: true }
    );

    row.addEventListener(
      "touchmove",
      (e) => {
        if (!isSwiping || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;

        if (isHorizontal === null) {
          if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
            isHorizontal = Math.abs(dx) > Math.abs(dy);
          }
        }

        if (!isHorizontal) return;

        if (e.cancelable) e.preventDefault();

        // Rubber-band resistance formula: dx / (1 + |dx| * 0.005)
        const dampedDx = dx / (1 + Math.abs(dx) * 0.005);
        currentDx = dampedDx;
        row.style.transform = `translateX(${dampedDx}px)`;

        const swipeAction = row.querySelector(".sheet-item-swipe-action");
        if (swipeAction) {
          const progress = Math.min(Math.abs(dampedDx) / 65, 1);
          swipeAction.style.opacity = `${progress}`;
          swipeAction.style.pointerEvents = Math.abs(dampedDx) > 35 ? "auto" : "none";
        }
      },
      { passive: false }
    );

    const endSwipe = () => {
      if (!isSwiping) return;
      isSwiping = false;
      row.style.transition = "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease";

      const swipeAction = row.querySelector(".sheet-item-swipe-action");

      // Full swipe threshold: auto delete with tactile vibration
      if (Math.abs(currentDx) > 135) {
        row.style.transform = currentDx > 0 ? "translateX(100%)" : "translateX(-100%)";
        row.style.opacity = "0";
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try { navigator.vibrate([15, 30, 15]); } catch (err) {}
        }
        setTimeout(() => {
          const id = row.dataset.id;
          if (id && window.SorenCartStore) {
            window.SorenCartStore.removeItem(id);
          }
        }, 220);
      } else if (Math.abs(currentDx) > 50) {
        // Partial swipe: snap open to reveal action button
        const snapOffset = currentDx < 0 ? -74 : 74;
        row.style.transform = `translateX(${snapOffset}px)`;
        if (swipeAction) {
          swipeAction.style.opacity = "1";
          swipeAction.style.pointerEvents = "auto";
        }
      } else {
        // Snap back to neutral
        row.style.transform = "";
        if (swipeAction) {
          swipeAction.style.opacity = "0";
          swipeAction.style.pointerEvents = "none";
        }
      }
      currentDx = 0;
    };

    row.addEventListener("touchend", endSwipe, { passive: true });
    row.addEventListener("touchcancel", endSwipe, { passive: true });
  }

  // Render contextual upsell shelf (AOV booster for coffee pairings)
  function renderCartUpsellShelf(validItems) {
    const upsellContainer = document.getElementById("cart-upsell-shelf-container");
    if (!upsellContainer) return;

    // Check if cart contains coffee products
    const hasCoffee = validItems.some((it) => {
      const cat = (it.category || "").toLowerCase();
      const id = (it.productId || it.id || "").toLowerCase();
      const name = (it.name || "").toLowerCase();
      return (
        cat === "coffee" ||
        id.includes("espresso") ||
        id.includes("latte") ||
        id.includes("cappuccino") ||
        id.includes("americano") ||
        id.includes("mocha") ||
        name.includes("قهوه") ||
        name.includes("اسپرسو") ||
        name.includes("لاته") ||
        name.includes("کاپوچینو")
      );
    });

    // Check if Basque cheesecake upsell item is already in cart
    const hasBasque = validItems.some((it) => (it.productId || it.id) === "prd_basque");

    if (hasCoffee && !hasBasque) {
      const basquePrice = 165000;
      upsellContainer.innerHTML = `
        <div class="cart-upsell-shelf" role="complementary" aria-label="پیشنهاد ویژه باریستا">
          <div class="upsell-shelf-header">
            <h5 class="upsell-shelf-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>
              </svg>
              <span>پیشنهاد باریستا؛ ترکیب مکمل با قهوه:</span>
            </h5>
            <span class="upsell-badge">پیشنهاد سرآشپز</span>
          </div>
          <div class="upsell-shelf-item">
            <div class="upsell-item-content">
              <img src="./images/products/cake/cheesecake.png" alt="چیزکیک سن‌سباستین پسته" class="upsell-item-thumb" />
              <div class="upsell-item-meta">
                <span class="upsell-item-name">چیزکیک سن‌سباستین پسته</span>
                <span class="upsell-item-price">${formatPriceFa(basquePrice)}</span>
              </div>
            </div>
            <button type="button" class="upsell-add-btn" id="upsell-add-basque-btn" aria-label="افزودن چیزکیک سن‌سباستین پسته به سفارش">
              <span>+ افزودن</span>
            </button>
          </div>
        </div>
      `;

      const addBtn = upsellContainer.querySelector("#upsell-add-basque-btn");
      if (addBtn) {
        addBtn.addEventListener("click", () => {
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try { navigator.vibrate(12); } catch (e) {}
          }
          if (window.SorenCartStore) {
            window.SorenCartStore.addItem({
              id: "prd_basque",
              name: "چیزکیک سن‌سباستین پسته",
              price: basquePrice,
              category: "cake",
              image: "./images/products/cake/cheesecake.png",
              quantity: 1,
              qty: 1,
            });
          }
          if (typeof showToast === "function") {
            showToast("«چیزکیک سن‌سباستین پسته» به سبد سفارش اضافه شد.");
          }
        });
      }
    } else {
      upsellContainer.innerHTML = "";
    }
  }

  // Synchronize floating active order bar with spring pulse & haptic feedback
  let lastPillCount = 0;
  function syncFloatingOrderBar() {
    if (!floatingBar) return;
    const count = window.SorenCartStore ? window.SorenCartStore.getTotalCount() : 0;
    const price = window.SorenCartStore ? window.SorenCartStore.getTotalPrice() : 0;

    if (count > 0) {
      floatingBar.classList.add("is-visible");
      floatingBar.setAttribute("aria-hidden", "false");
      if (orderBarCount) orderBarCount.textContent = `${toFaDigits(count)} آیتم`;
      if (orderBarPrice) orderBarPrice.textContent = formatPriceFa(price);

      // Trigger spring pulse animation on quantity increment
      if (count > lastPillCount) {
        floatingBar.classList.remove("order-pill-pulse");
        void floatingBar.offsetWidth; // Reflow trigger
        floatingBar.classList.add("order-pill-pulse");
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try { navigator.vibrate(12); } catch (err) {}
        }
      }
      lastPillCount = count;
    } else {
      floatingBar.classList.remove("is-visible");
      floatingBar.setAttribute("aria-hidden", "true");
      lastPillCount = 0;
    }

    if (sheet && sheet.classList.contains("is-open") && window.SorenCartStore) {
      renderCartBottomSheet(window.SorenCartStore.getItems());
    }
  }

  // Quantity change & removal event delegation in cart item list
  if (itemsList) {
    itemsList.addEventListener("click", (e) => {
      const plusBtn = e.target.closest(".sheet-plus-btn");
      const minusBtn = e.target.closest(".sheet-minus-btn");
      const delBtn = e.target.closest(".sheet-delete-btn");
      const swipeDelBtn = e.target.closest(".sheet-swipe-delete-btn");

      if (!plusBtn && !minusBtn && !delBtn && !swipeDelBtn) return;
      if (!window.SorenCartStore) return;

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(12);
        } catch (err) {}
      }

      if (swipeDelBtn) {
        const id = swipeDelBtn.dataset.id;
        window.SorenCartStore.removeItem(id);
      } else if (plusBtn) {
        const id = plusBtn.dataset.id;
        const item = window.SorenCartStore.getItems().find((i) => i.id === id);
        if (item) {
          window.SorenCartStore.addItem(item);
        }
      } else if (minusBtn) {
        const id = minusBtn.dataset.id;
        window.SorenCartStore.updateQuantity(id, -1);
      } else if (delBtn) {
        const id = delBtn.dataset.id;
        window.SorenCartStore.removeItem(id);
      }
    });
  }

  // Drawer open and close trigger bindings
  if (orderBarOpenBtn) {
    orderBarOpenBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openCartBottomSheet();
    });
  }

  if (bottomNavCart) {
    bottomNavCart.addEventListener("click", (e) => {
      e.preventDefault();
      openCartBottomSheet();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeCartBottomSheet();
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      closeCartBottomSheet();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (sheet && sheet.classList.contains("is-open")) {
        closeCartBottomSheet();
      }
    }
  });

  // Mobile swipe-to-dismiss drawer gesture
  function attachDragGesture(element) {
    if (!element || !sheet) return;
    let startY = 0;
    let currentDelta = 0;
    let isDragging = false;

    element.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;
        if (e.target.closest("button")) return;
        startY = e.touches[0].clientY;
        currentDelta = 0;
        isDragging = true;
        sheet.style.transition = "none";
      },
      { passive: true }
    );

    element.addEventListener(
      "touchmove",
      (e) => {
        if (!isDragging) return;
        const dy = e.touches[0].clientY - startY;
        if (dy > 0) {
          if (e.cancelable) e.preventDefault();
          currentDelta = dy;
          sheet.style.transform = `translateY(${dy}px)`;
          const dim = Math.min(dy / 300, 0.6);
          if (backdrop) backdrop.style.opacity = `${1 - dim}`;
        } else {
          currentDelta = 0;
          sheet.style.transform = "";
        }
      },
      { passive: false }
    );

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      sheet.style.transition = "";
      if (backdrop) backdrop.style.opacity = "";

      if (currentDelta > 60) {
        closeCartBottomSheet();
      } else {
        sheet.style.transform = "";
      }
      currentDelta = 0;
    };

    element.addEventListener("touchend", endDrag, { passive: true });
    element.addEventListener("touchcancel", endDrag, { passive: true });
  }

  if (dragZone) attachDragGesture(dragZone);
  const sheetHeader = sheet ? sheet.querySelector(".sheet-header") : null;
  if (sheetHeader) attachDragGesture(sheetHeader);

  // Optional barista special instructions field
  if (noteInput) {
    try {
      const savedNote = localStorage.getItem("soren_barista_note");
      if (savedNote) noteInput.value = savedNote;
    } catch (err) {}

    noteInput.addEventListener("input", (e) => {
      try {
        localStorage.setItem("soren_barista_note", e.target.value);
      } catch (err) {}
    });
  }

  // Checkout completion button handler
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      const totalCount = window.SorenCartStore ? window.SorenCartStore.getTotalCount() : 0;
      if (totalCount === 0) return;

      checkoutBtn.classList.add("is-loading");
      checkoutBtn.disabled = true;

      if (noteInput && noteInput.value.trim()) {
        try {
          localStorage.setItem("soren_barista_note", noteInput.value.trim());
        } catch (err) {}
      }

      if (typeof showToast === "function") {
        showToast("در حال انتقال به صفحه پرداخت و تکمیل سفارش...");
      }

      setTimeout(() => {
        const isPagesDir = typeof window !== "undefined" && window.location.pathname.includes("/pages/");
        window.location.href = isPagesDir ? "./cart.html" : "./pages/cart.html";
      }, 320);
    });
  }

  // Visual viewport repositioning for virtual on-screen keyboards
  if (typeof window !== "undefined" && window.visualViewport) {
    const handleViewportChange = () => {
      if (!sheet || !sheet.classList.contains("is-open")) return;
      const offset = Math.max(0, window.innerHeight - window.visualViewport.height);
      sheet.style.bottom = offset > 0 ? `${offset}px` : "";
    };
    window.visualViewport.addEventListener("resize", handleViewportChange);
    window.visualViewport.addEventListener("scroll", handleViewportChange);
  }

  // Global cart change subscription
  window.addEventListener("soren:cart-changed", () => {
    syncFloatingOrderBar();
  });

  // Auto-close bottom sheet on desktop resize to release scroll lock
  if (typeof window !== "undefined" && window.matchMedia) {
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    desktopQuery.addEventListener("change", (e) => {
      if (e.matches && sheet && sheet.classList.contains("is-open")) {
        closeCartBottomSheet();
      }
    });
  }

  // Expose drawer functions on window for global consumption
  window.openCartBottomSheet = openCartBottomSheet;
  window.closeCartBottomSheet = closeCartBottomSheet;
  window.renderCartBottomSheet = renderCartBottomSheet;
  window.syncFloatingOrderBar = syncFloatingOrderBar;

  // Initial sync of floating active order bar
  syncFloatingOrderBar();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCartBottomSheetAndFloatingBar);
} else {
  initCartBottomSheetAndFloatingBar();
}

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

  if (form.id === "loginForm" || form.id === "registerForm") {
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
  }
})();

/* ========================================
   6. صفحه سبد خرید پویا (Dynamic Cart Page)
   ======================================== */
/* ========================================
   6. موتور پیشرفته سبد خرید و تعاملات ارگانیک (Principal Cart Engine)
   ======================================== */
(function initCartPage() {
  const emptyState = document.getElementById("cart-state-empty");
  const filledState = document.getElementById("cart-state-populated");
  if (!emptyState || !filledState) return;

  const itemsContainer = document.getElementById("cart-items-list") || filledState.querySelector(".cart-items");
  const subtotalEl = document.getElementById("summary-subtotal");
  const discountEl = document.getElementById("summary-discount");
  const couponRow = document.getElementById("summary-coupon-row");
  const couponAmountEl = document.getElementById("summary-coupon");
  const totalEl = document.getElementById("summary-total");
  const statusBadge = document.getElementById("header-status-badge");
  const shippingEl = document.getElementById("summary-shipping");

  // Shipping Tier Progress Elements
  const shippingTierCard = document.getElementById("shipping-tier-card");
  const shippingProgressBar = document.getElementById("shipping-progress-bar");
  const shippingTierText = document.getElementById("shipping-tier-text");
  const shippingTierBadge = document.getElementById("shipping-tier-badge");

  // Promo Code Accordion Elements
  const couponAccordion = document.getElementById("coupon-accordion");
  const couponAccordionBtn = document.getElementById("coupon-accordion-btn");
  const couponPanel = document.getElementById("coupon-panel");
  const couponInputGroup = document.getElementById("coupon-input-group");
  const couponInput = document.getElementById("coupon-input");
  const couponButton = document.getElementById("coupon-apply");
  const couponMessage = document.getElementById("coupon-message");
  const couponAppliedChip = document.getElementById("coupon-applied-chip");
  const appliedCouponCode = document.getElementById("applied-coupon-code");
  const appliedCouponPercent = document.getElementById("applied-coupon-percent");
  const couponRemoveBtn = document.getElementById("coupon-remove-btn");

  // Action Buttons
  const checkoutBtn = document.querySelector(".checkout-btn, #checkout-btn");
  const mobileCheckoutBtn = document.getElementById("mobile-checkout-btn");
  const mobileBar = document.getElementById("cart-mobile-bar");
  const mobileBarTotal = document.getElementById("mobile-bar-total");
  const mobileBarCount = document.getElementById("mobile-bar-count");
  const emptyCartRestoreBtn = document.getElementById("empty-cart-restore-sample");

  // Slide-Over Drawer Elements
  const drawerBackdrop = document.getElementById("cart-slideover-backdrop");
  const drawer = document.getElementById("cart-slideover-drawer");
  const drawerOpenBtn = document.getElementById("open-cart-drawer-btn");
  const drawerCloseBtn = document.getElementById("drawer-close-btn");
  const drawerItemsList = document.getElementById("drawer-items-list");
  const drawerItemsCount = document.getElementById("drawer-items-count");
  const drawerSubtotal = document.getElementById("drawer-subtotal");
  const drawerDiscount = document.getElementById("drawer-discount");
  const drawerDiscountRow = document.getElementById("drawer-discount-row");
  const drawerTotal = document.getElementById("drawer-total");
  const drawerCheckoutBtn = document.getElementById("drawer-checkout-btn");

  // Ask-Sonner Toast Container
  const toastContainer = document.getElementById("soren-toast-container");

  // Break-UI Stress-Test Switcher
  const breakUiSwitcher = document.getElementById("break-ui-switcher");

  const formatter = new Intl.NumberFormat("fa-IR");
  const format = (n) => formatter.format(n);

  const CLUB_DISCOUNT_RATE = 0.05;
  const CLUB_DISCOUNT_STEP = 5000;
  const FREE_SHIPPING_THRESHOLD = 500000;
  const COUPONS = { SOREN10: 0.1, SOREN20: 0.2, WELCOME: 0.15 };
  let couponRate = 0;
  let activeCouponCode = null;

  // Memoized DOM node mapping (id -> { rowEl, item })
  const renderedRowMap = new Map();

  // Undo pending registry for animated item removal
  let pendingUndo = null;

  // Curated default artisan items for fresh visitors
  const DEFAULT_CURATED_CART = [
    {
      id: "prd_latte",
      name: "لاته تخصصی ارگانیک",
      price: 150000,
      quantity: 1,
      qty: 1,
      desc: "قهوه تخصصی · ۲۵۰ میلی‌لیتر",
      category: "coffee",
      image: "../images/products/coffee/latte.png",
    },
    {
      id: "prd_cappuccino",
      name: "کاپوچینو ابری",
      price: 140000,
      quantity: 1,
      qty: 1,
      desc: "نوشیدنی گرم · ۳۰۰ میلی‌لیتر",
      category: "coffee",
      image: "../images/products/coffee/cappuccino.png",
    },
    {
      id: "prd_shake_choc",
      name: "شیک شکلات دست‌ساز",
      price: 180000,
      quantity: 1,
      qty: 1,
      desc: "شیک تخصصی با بستنی شکلاتی هلندی",
      category: "shake",
      image: "../images/products/shakes/chocolate-shake.png",
    },
  ];

  // Extreme test items for Break-UI stress testing
  const EXTREME_DATA_CART = [
    {
      id: "prd_extreme_title",
      name: "اسپرسو دبل بلند اختصاصی تک‌خاستگاه اتیوپی یرگاچف فرآوری شسته با اسیدیته شفاف مرکباتی و بادی سنگین برشته‌کاری باریستا ویژه سورن",
      price: 125000000,
      quantity: 99,
      qty: 99,
      desc: "قهوه تخصصی فوق‌العاده با نت‌های یاس، شکوفه پرتقال، هلو، ترنج و فرآوری تخمیر بی‌هوازی طولانی‌مدت",
      category: "coffee",
      image: "../images/products/coffee/double-espresso.png",
    },
    {
      id: "prd_extreme_cake",
      name: "چیزکیک سن سباستین کاراملی پخت تنوری دست‌ساز باریستا با کرم پسته تازه دامغان و زعفران اعلای قائنات",
      price: 1850000,
      quantity: 12,
      qty: 12,
      desc: "بافت خامه‌ای کاراملیزه با سس توت‌فرنگی وحشی و پرک بادام بوداده فرانسوی",
      category: "cake",
      image: "../images/products/cake/cheesecake.png",
    },
  ];

  // Seed default items if user is on a brand new session without saved cart
  (function seedInitialCartIfEmpty() {
    try {
      const stored = localStorage.getItem("soren_cart_v1");
      if (stored === null) {
        SorenCartStore.items = JSON.parse(JSON.stringify(DEFAULT_CURATED_CART));
        SorenCartStore.save();
      }
    } catch (e) {}
  })();

  /* ========================================================
     محاسبات مبالغ و به‌روزرسانی خلاصه سفارش (Summary Engine)
     ======================================================== */
  function updateSummaryTotals() {
    const items = SorenCart.getItems();
    const count = SorenCart.getTotalCount();
    const subtotal = SorenCart.getSubtotal();

    if (statusBadge) statusBadge.textContent = `${format(count)} مورد`;

    if (items.length === 0) {
      emptyState.hidden = false;
      filledState.hidden = true;
      if (mobileBar) mobileBar.style.display = "none";
      updateDrawer();
      return;
    }

    emptyState.hidden = true;
    filledState.hidden = false;
    if (mobileBar && window.innerWidth <= 768) {
      mobileBar.style.display = "flex";
    }

    // Dynamic Club Discount (5% rounded to 5,000 Tomans)
    const clubDiscount = Math.round((subtotal * CLUB_DISCOUNT_RATE) / CLUB_DISCOUNT_STEP) * CLUB_DISCOUNT_STEP;
    const couponDiscount = Math.round(subtotal * couponRate);
    const total = Math.max(subtotal - clubDiscount - couponDiscount, 0);

    if (subtotalEl) subtotalEl.textContent = format(subtotal);
    if (discountEl) discountEl.textContent = format(clubDiscount);
    if (couponAmountEl) couponAmountEl.textContent = format(couponDiscount);
    if (couponRow) couponRow.hidden = couponDiscount === 0;
    if (totalEl) totalEl.textContent = format(total);

    // Shipping Tier Progress Calculation
    if (shippingProgressBar && shippingTierText) {
      if (subtotal >= FREE_SHIPPING_THRESHOLD) {
        shippingProgressBar.style.width = "100%";
        shippingTierText.innerHTML = "🎉 تبریک! سفارش شما شامل <strong>ارسال رایگان</strong> شد!";
        if (shippingTierBadge) {
          shippingTierBadge.textContent = "ارسال رایگان";
          shippingTierBadge.style.background = "rgba(125, 140, 108, 0.25)";
        }
        if (shippingEl) shippingEl.textContent = "رایگان";
      } else {
        const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
        const progressPercent = Math.min(Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100), 99);
        shippingProgressBar.style.width = `${progressPercent}%`;
        shippingTierText.innerHTML = `تنها <strong>${format(remaining)} تومان</strong> دیگر تا <strong>ارسال رایگان</strong>`;
        if (shippingTierBadge) {
          shippingTierBadge.textContent = "ارسال اکسپرس";
          shippingTierBadge.style.background = "rgba(125, 140, 108, 0.16)";
        }
        if (shippingEl) shippingEl.textContent = "۳۵٬۰۰۰ تومان";
      }
    }

    // Mobile Checkout Bar
    if (mobileBarTotal) mobileBarTotal.textContent = format(total);
    if (mobileBarCount) mobileBarCount.textContent = `${format(count)} مورد`;

    // Sync Slide-Over Drawer
    updateDrawer();
  }

  /* ========================================================
     رندر گرانولار و بدون فلش اقلام (Memoized Granular Row Renderer)
     ======================================================== */
  function getProductImage(item) {
    const isPagesDir = window.location.pathname.includes("/pages/");
    let displayImage = item.image || "";
    if (isPagesDir && !displayImage.startsWith("..") && !displayImage.startsWith("/")) {
      displayImage = "../" + displayImage;
    } else if (!isPagesDir && displayImage.startsWith("../")) {
      displayImage = displayImage.replace(/^\.\.\//, "./");
    }
    return displayImage;
  }

  function createCartItemRow(item) {
    const card = document.createElement("article");
    card.className = "cart-item";
    card.dataset.id = item.id;
    card.dataset.price = String(item.price);
    card.dataset.qty = String(item.qty || item.quantity || 1);

    const displayImage = getProductImage(item);
    const tag = item.desc || "محصول تخصصی کافه سورن";
    const tagClass = item.category === "shake" ? "product-tag--terracotta" : (item.category === "cake" ? "product-tag--sage" : "");

    card.innerHTML = `
      <div class="product-image">
        <img src="${displayImage}" alt="${item.name}" width="120" height="120" loading="lazy" onerror="this.src='../images/brand/soren-logo.svg'" />
      </div>
      <div class="product-details">
        <div class="product-top">
          <div>
            <div class="product-tags-wrap">
              <span class="product-tag ${tagClass}">${tag}</span>
            </div>
            <h3>${item.name}</h3>
            <p>قیمت واحد: ${format(item.price)} تومان</p>
          </div>
          <button class="delete-btn" type="button" aria-label="حذف ${item.name} از سبد خرید">
            <svg class="icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
        <div class="product-bottom">
          <div class="price">
            <strong>${format(item.price * (item.qty || item.quantity || 1))}</strong>
            <span>تومان</span>
          </div>
          <div class="quantity">
            <button type="button" data-qty-step="1" aria-label="افزایش تعداد ${item.name}">+</button>
            <span class="quantity-value" aria-live="polite">
              <span class="quantity-number">${format(item.qty || item.quantity || 1)}</span>
            </span>
            <button type="button" data-qty-step="-1" aria-label="کاهش تعداد ${item.name}">−</button>
          </div>
        </div>
      </div>
    `;

    // Tactile Stepper Listeners (Optimistic UI with Granular DOM updates)
    card.querySelector("[data-qty-step='1']").addEventListener("click", () => {
      handleQuantityChange(item.id, 1);
    });

    card.querySelector("[data-qty-step='-1']").addEventListener("click", () => {
      handleQuantityChange(item.id, -1);
    });

    // Animated Item Removal Listener with FLIP Layout Morphing & Undo Toast
    card.querySelector(".delete-btn").addEventListener("click", () => {
      handleAnimatedItemRemoval(item.id);
    });

    return card;
  }

  /* ========================================================
     به‌روزرسانی بهینه تعداد با انیمیشن غلتشی (Tactile Stepper)
     ======================================================== */
  function handleQuantityChange(itemId, delta) {
    const item = SorenCartStore.items.find((it) => it.id === itemId);
    if (!item) return;

    const oldQty = item.qty || item.quantity || 1;
    const newQty = oldQty + delta;

    if (newQty <= 0) {
      handleAnimatedItemRemoval(itemId);
      return;
    }

    // 1. Optimistic Store Update
    item.quantity = newQty;
    item.qty = newQty;
    SorenCartStore.save();

    // 2. Granular In-Place DOM Mutation (No full list re-render)
    const row = renderedRowMap.get(itemId);
    if (row) {
      row.dataset.qty = String(newQty);

      // Numeric slide/fade animation
      const valueContainer = row.querySelector(".quantity-value");
      if (valueContainer) {
        const animClass = delta > 0 ? "num-roll-up" : "num-roll-down";
        valueContainer.innerHTML = `<span class="quantity-number ${animClass}">${format(newQty)}</span>`;
      }

      // Update row item total price
      const priceStrong = row.querySelector(".price strong");
      if (priceStrong) {
        priceStrong.textContent = format(item.price * newQty);
      }
    }

    // 3. Audio & Haptic Feedback
    if (typeof SorenAudio !== "undefined") {
      if (delta > 0 && typeof SorenAudio.playAdd === "function") SorenAudio.playAdd();
      else if (delta < 0 && typeof SorenAudio.playRemove === "function") SorenAudio.playRemove();
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(10); } catch (e) {}
    }

    // 4. Update Summary, Badges & Drawer
    updateSummaryTotals();
    SorenCart.syncBadges();
  }

  /* ========================================================
     حذف متحرک با تکنیک FLIP و الگوی بازگردانی (Ask-Sonner Undo)
     ======================================================== */
  function handleAnimatedItemRemoval(itemId) {
    const itemIndex = SorenCartStore.items.findIndex((it) => it.id === itemId);
    if (itemIndex === -1) return;

    const removedItem = SorenCartStore.items[itemIndex];
    const rowEl = renderedRowMap.get(itemId);

    // Clear any previous pending undo permanently
    if (pendingUndo && pendingUndo.timerId) {
      clearTimeout(pendingUndo.timerId);
      if (pendingUndo.toastEl) pendingUndo.toastEl.remove();
      pendingUndo = null;
    }

    // Store in undo registry
    pendingUndo = {
      item: { ...removedItem },
      index: itemIndex,
      timerId: null,
      toastEl: null,
    };

    // Remove from in-memory cart store
    SorenCartStore.items.splice(itemIndex, 1);
    SorenCartStore.save();

    if (rowEl) {
      // 1. FLIP: capture initial positions of remaining items
      const remainingRows = Array.from(itemsContainer.querySelectorAll(".cart-item")).filter((r) => r !== rowEl);
      const firstPositions = remainingRows.map((r) => r.getBoundingClientRect().top);

      // 2. Play item collapsing animation
      rowEl.classList.add("is-deleting");

      setTimeout(() => {
        rowEl.remove();
        renderedRowMap.delete(itemId);

        // 3. Smooth FLIP morph for remaining rows to glide up
        remainingRows.forEach((r, i) => {
          const lastTop = r.getBoundingClientRect().top;
          const dy = firstPositions[i] - lastTop;
          if (dy !== 0) {
            r.style.transform = `translateY(${dy}px)`;
            r.style.transition = "none";
            requestAnimationFrame(() => {
              r.style.transition = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";
              r.style.transform = "";
            });
          }
        });

        updateSummaryTotals();
        SorenCart.syncBadges();
      }, 280);
    } else {
      updateSummaryTotals();
      SorenCart.syncBadges();
    }

    if (typeof SorenAudio !== "undefined" && typeof SorenAudio.playRemove === "function") {
      SorenAudio.playRemove();
    }

    // 4. Trigger Ask-Sonner Style Toast with Undo Button
    showUndoToast(removedItem);
  }

  function showUndoToast(item) {
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = "soren-toast";
    toast.setAttribute("role", "status");

    toast.innerHTML = `
      <div class="toast-main">
        <div class="toast-text">
          <svg class="toast-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <div>
            <strong class="toast-title">«${item.name}» از سبد حذف شد</strong>
          </div>
        </div>
        <button type="button" class="toast-undo-btn" aria-label="بازگردانی ${item.name} به سبد خرید">
          <span>بازگردانی</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M3 10h10a5 5 0 0 1 5 5v2m-15-7l4-4m-4 4l4 4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="toast-timer-bar"></div>
    `;

    toastContainer.appendChild(toast);

    // Animate countdown timer bar
    const timerBar = toast.querySelector(".toast-timer-bar");
    requestAnimationFrame(() => {
      if (timerBar) timerBar.style.width = "0%";
    });

    if (pendingUndo) {
      pendingUndo.toastEl = toast;
    }

    const undoBtn = toast.querySelector(".toast-undo-btn");
    undoBtn.addEventListener("click", () => {
      restoreItemFromUndo();
    });

    // Auto-dismiss after 5 seconds if not undone
    const timerId = setTimeout(() => {
      dismissToast(toast);
      pendingUndo = null;
    }, 5000);

    if (pendingUndo) {
      pendingUndo.timerId = timerId;
    }
  }

  function dismissToast(toastEl) {
    if (!toastEl) return;
    toastEl.style.transition = "opacity 200ms ease, transform 200ms ease";
    toastEl.style.opacity = "0";
    toastEl.style.transform = "translateY(12px) scale(0.96)";
    setTimeout(() => toastEl.remove(), 210);
  }

  function restoreItemFromUndo() {
    if (!pendingUndo || !pendingUndo.item) return;

    const { item, index, toastEl, timerId } = pendingUndo;
    if (timerId) clearTimeout(timerId);
    dismissToast(toastEl);

    // Restore to store at original or closest index
    const restoreIdx = Math.min(Math.max(index, 0), SorenCartStore.items.length);
    SorenCartStore.items.splice(restoreIdx, 0, item);
    SorenCartStore.save();

    // Re-create DOM row and insert
    const newRow = createCartItemRow(item);
    newRow.classList.add("is-restoring");
    renderedRowMap.set(item.id, newRow);

    const existingRows = itemsContainer.querySelectorAll(".cart-item");
    if (existingRows.length > restoreIdx) {
      itemsContainer.insertBefore(newRow, existingRows[restoreIdx]);
    } else {
      itemsContainer.appendChild(newRow);
    }

    updateSummaryTotals();
    SorenCart.syncBadges();

    if (typeof SorenAudio !== "undefined" && typeof SorenAudio.playAdd === "function") {
      SorenAudio.playAdd();
    }
    pendingUndo = null;
  }

  /* ========================================================
     رندر جامع و اولیه لیست سبد خرید
     ======================================================== */
  function renderCart() {
    const items = SorenCart.getItems();
    itemsContainer.innerHTML = "";
    renderedRowMap.clear();

    items.forEach((item) => {
      const row = createCartItemRow(item);
      renderedRowMap.set(item.id, row);
      itemsContainer.appendChild(row);
    });

    updateSummaryTotals();
  }

  /* ========================================================
     کشوی شناور پیش‌نمایش سبد خرید (Slide-Over Drawer)
     ======================================================== */
  function updateDrawer() {
    if (!drawerItemsList) return;

    const items = SorenCart.getItems();
    const count = SorenCart.getTotalCount();
    const subtotal = SorenCart.getSubtotal();
    const clubDiscount = Math.round((subtotal * CLUB_DISCOUNT_RATE) / CLUB_DISCOUNT_STEP) * CLUB_DISCOUNT_STEP;
    const couponDiscount = Math.round(subtotal * couponRate);
    const totalDiscount = clubDiscount + couponDiscount;
    const total = Math.max(subtotal - totalDiscount, 0);

    if (drawerItemsCount) drawerItemsCount.textContent = String(count);
    if (drawerSubtotal) drawerSubtotal.textContent = `${format(subtotal)} تومان`;
    if (drawerDiscount) drawerDiscount.textContent = `${format(totalDiscount)} تومان`;
    if (drawerDiscountRow) drawerDiscountRow.hidden = totalDiscount === 0;
    if (drawerTotal) drawerTotal.textContent = `${format(total)} تومان`;

    if (items.length === 0) {
      drawerItemsList.innerHTML = `
        <div style="text-align: center; padding: 48px 16px; color: var(--muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;">
            <use href="#i-bag"/>
          </svg>
          <p style="font-size: 14px; font-weight: 600; margin: 0 0 6px;">سبد خرید خالی است</p>
          <span style="font-size: 12px;">آیتمی در سبد قرار ندارد.</span>
        </div>
      `;
      return;
    }

    drawerItemsList.innerHTML = "";
    items.forEach((item) => {
      const itemEl = document.createElement("div");
      itemEl.className = "drawer-item";
      const displayImage = getProductImage(item);

      itemEl.innerHTML = `
        <img class="drawer-item-img" src="${displayImage}" alt="${item.name}" loading="lazy" onerror="this.src='../images/brand/soren-logo.svg'"/>
        <div class="drawer-item-info">
          <h4>${item.name}</h4>
          <span class="drawer-item-price">${format(item.price * (item.qty || item.quantity || 1))} تومان</span>
          <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">تعداد: ${format(item.qty || item.quantity || 1)}</div>
        </div>
        <div class="quantity" style="transform: scale(0.85); transform-origin: right center;">
          <button type="button" data-drawer-step="1">+</button>
          <span class="quantity-value">${format(item.qty || item.quantity || 1)}</span>
          <button type="button" data-drawer-step="-1">−</button>
        </div>
      `;

      itemEl.querySelector("[data-drawer-step='1']").addEventListener("click", () => {
        handleQuantityChange(item.id, 1);
      });
      itemEl.querySelector("[data-drawer-step='-1']").addEventListener("click", () => {
        handleQuantityChange(item.id, -1);
      });

      drawerItemsList.appendChild(itemEl);
    });
  }

  function openCartDrawer() {
    if (!drawer || !drawerBackdrop) return;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    drawerBackdrop.classList.add("is-open");
    drawerBackdrop.setAttribute("aria-hidden", "false");
    if (drawerCloseBtn) drawerCloseBtn.focus();
    updateDrawer();
  }

  function closeCartDrawer() {
    if (!drawer || !drawerBackdrop) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    drawerBackdrop.classList.remove("is-open");
    drawerBackdrop.setAttribute("aria-hidden", "true");
  }

  if (drawerOpenBtn) drawerOpenBtn.addEventListener("click", openCartDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener("click", closeCartDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeCartDrawer);

  // Header cart button also toggles drawer on cart page
  document.querySelectorAll(".cart-button").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (window.location.pathname.includes("cart.html")) {
        e.preventDefault();
        openCartDrawer();
      }
    });
  });

  // Touch swipe-to-dismiss gesture for Slide-Over Drawer
  if (drawer) {
    let startX = 0;
    drawer.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) startX = e.touches[0].clientX;
    }, { passive: true });

    drawer.addEventListener("touchend", (e) => {
      if (e.changedTouches.length === 1) {
        const diffX = e.changedTouches[0].clientX - startX;
        // In RTL, sliding rightwards dismisses drawer
        if (diffX > 60) closeCartDrawer();
      }
    }, { passive: true });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer && drawer.classList.contains("is-open")) {
      closeCartDrawer();
    }
  });

  if (drawerCheckoutBtn) {
    drawerCheckoutBtn.addEventListener("click", () => {
      closeCartDrawer();
      if (typeof openCheckoutModal === "function") openCheckoutModal();
    });
  }

  /* ========================================================
     آکاردئون کد تخفیف با حالات لودینگ و چیپ (Promo Code States)
     ======================================================== */
  if (couponAccordionBtn && couponPanel) {
    couponAccordionBtn.addEventListener("click", () => {
      const isExpanded = couponAccordionBtn.getAttribute("aria-expanded") === "true";
      couponAccordionBtn.setAttribute("aria-expanded", String(!isExpanded));
      couponAccordion.classList.toggle("is-open", !isExpanded);
      couponPanel.hidden = isExpanded;
      if (!isExpanded && couponInput) {
        couponInput.focus();
      }
    });
  }

  if (couponButton && couponInput) {
    couponButton.addEventListener("click", async () => {
      const code = couponInput.value.trim().toUpperCase();
      if (!code) {
        showCouponMsg("لطفاً کد تخفیف خود را وارد نمایید.", "error");
        return;
      }

      // 1. Loading State
      couponButton.classList.add("is-loading");
      showCouponMsg("در حال استعلام و بررسی کد تخفیف از سرور...", "loading");

      // Simulate network verification latency (400ms)
      await new Promise((r) => setTimeout(r, 420));
      couponButton.classList.remove("is-loading");

      // 2. Validate Code
      if (code in COUPONS) {
        couponRate = COUPONS[code];
        activeCouponCode = code;
        const percent = Math.round(couponRate * 100);

        // Transition to Applied Chip State
        if (couponInputGroup) couponInputGroup.hidden = true;
        if (couponAppliedChip) couponAppliedChip.hidden = false;
        if (appliedCouponCode) appliedCouponCode.textContent = code;
        if (appliedCouponPercent) appliedCouponPercent.textContent = `${format(percent)}٪ تخفیف اعمال شد`;

        showCouponMsg(`کد تخفیف ${format(percent)}٪ با موفقیت روی سفارش اعمال گردید.`, "success");
      } else {
        couponRate = 0;
        activeCouponCode = null;
        showCouponMsg("کد تخفیف وارد شده معتبر نیست یا منقضی شده است.", "error");
      }

      updateSummaryTotals();
    });
  }

  if (couponRemoveBtn) {
    couponRemoveBtn.addEventListener("click", () => {
      couponRate = 0;
      activeCouponCode = null;
      if (couponInput) couponInput.value = "";
      if (couponInputGroup) couponInputGroup.hidden = false;
      if (couponAppliedChip) couponAppliedChip.hidden = true;
      showCouponMsg("کد تخفیف حذف گردید.", "info");
      setTimeout(() => {
        if (couponMessage) couponMessage.hidden = true;
      }, 2000);
      updateSummaryTotals();
    });
  }

  function showCouponMsg(text, type) {
    if (!couponMessage) return;
    couponMessage.textContent = text;
    couponMessage.className = `coupon-message is-${type}`;
    couponMessage.hidden = false;
  }

  /* ========================================================
     تست حالت‌های حدی با سوییچر Break-UI (Edge-Case Stress Test)
     ======================================================== */
  if (breakUiSwitcher) {
    breakUiSwitcher.addEventListener("click", (e) => {
      const btn = e.target.closest(".mode-btn");
      if (!btn) return;

      breakUiSwitcher.querySelectorAll(".mode-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");

      const mode = btn.dataset.mode;
      if (mode === "standard") {
        SorenCartStore.items = JSON.parse(JSON.stringify(DEFAULT_CURATED_CART));
        SorenCartStore.save();
        renderCart();
      } else if (mode === "extreme") {
        SorenCartStore.items = JSON.parse(JSON.stringify(EXTREME_DATA_CART));
        SorenCartStore.save();
        renderCart();
      } else if (mode === "empty") {
        SorenCartStore.clearCart();
        renderCart();
      }
    });
  }

  if (emptyCartRestoreBtn) {
    emptyCartRestoreBtn.addEventListener("click", () => {
      SorenCartStore.items = JSON.parse(JSON.stringify(DEFAULT_CURATED_CART));
      SorenCartStore.save();
      renderCart();
      if (breakUiSwitcher) {
        const stdBtn = breakUiSwitcher.querySelector("[data-mode='standard']");
        if (stdBtn) {
          breakUiSwitcher.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
          stdBtn.classList.add("active");
        }
      }
    });
  }

  /* ========================================================
     اتصال تسویه حساب دسکتاپ و موبایل (Checkout Modal Bridge)
     ======================================================== */
  if (checkoutBtn) checkoutBtn.addEventListener("click", openCheckoutModal);
  if (mobileCheckoutBtn) mobileCheckoutBtn.addEventListener("click", openCheckoutModal);

  // Initial Cart Mount
  renderCart();

  // Listen to external store updates
  window.addEventListener("soren:cart-changed", () => {
    updateSummaryTotals();
  });

  checkActiveOrder();

  /* ========================================
     مودال تسویه و انتخاب میز (Checkout Flow)
     ======================================== */
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", openCheckoutModal);
  }
  // Subtle tactile haptic feedback for mobile touches
  function triggerHaptic(type = "light") {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        if (type === "selection") navigator.vibrate(10);
        else if (type === "medium") navigator.vibrate(18);
        else if (type === "success") navigator.vibrate([12, 35, 20]);
        else navigator.vibrate(8);
      }
    } catch (_) {}
  }

  window.openCheckoutModal = openCheckoutModal;
  async function openCheckoutModal() {
    let items = SorenCart.getItems();
    if (!items || items.length === 0) {
      try {
        const raw = localStorage.getItem("soren_cart") || localStorage.getItem("soren_cart_v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            items = parsed.map((it) => ({ ...it, qty: it.qty || it.quantity || 1 }));
          }
        }
      } catch (_) {}
    }
    if (!items || items.length === 0) {
      items = [{ id: "prd_sample", name: "سفارش حضور در کافه", price: 0, qty: 1 }];
    }

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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--coffee)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 19v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5M8 12V7a4 4 0 0 1 8 0v5M3 19h18"/>
            </svg>
            <span>انتخاب جایگاه و ثبت نهایی سفارش</span>
          </h2>
          <button type="button" class="soren-modal-close" aria-label="بستن">✕</button>
        </header>

        <div class="soren-modal-body">
          <form id="soren-order-form">
            <!-- Cafe zone filter tabs -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-size: 13px; font-weight: 700; color: var(--charcoal);">انتخاب میز یا بار:</span>
              <span id="selected-table-label" style="font-size: 12px; font-weight: 600; color: var(--coffee);">میزی انتخاب نشده</span>
            </div>

            <div class="zone-tabs-bar" role="tablist" aria-label="انتخاب بخش‌های سالن">
              <button type="button" class="zone-tab-btn is-active" data-zone="all" role="tab" aria-selected="true">همه جایگاه‌ها</button>
              <button type="button" class="zone-tab-btn" data-zone="indoor" role="tab" aria-selected="false">سالن اصلی</button>
              <button type="button" class="zone-tab-btn" data-zone="courtyard" role="tab" aria-selected="false">حیاط و فضای سبز</button>
              <button type="button" class="zone-tab-btn" data-zone="vip" role="tab" aria-selected="false">تشریفات VIP</button>
            </div>

            <!-- Interactive table selection grid -->
            <div class="table-selection-grid" id="tables-container">
              <div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: var(--muted); font-size: 13px;">
                در حال دریافت نقشه سالن و استعلام میزهای آزاد...
              </div>
            </div>

            <!-- Delivery and customer info section -->
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

              <!-- Payment method selection -->
              <label style="font-size: 12px; font-weight: 700; color: var(--charcoal); display: block; margin-bottom: 8px;">
                شیوه تسویه و پرداخت:
              </label>
              <div class="payment-methods-grid" role="radiogroup" aria-label="شیوه تسویه">
                <div class="pay-card-option is-active" data-method="PAY_AT_COUNTER" role="radio" aria-checked="true" tabindex="0">
                  <div class="pay-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="M7 15h0M2 10h20"/>
                    </svg>
                  </div>
                  <div class="pay-card-text">
                    <strong>پرداخت در کافه</strong>
                    <span>پای بار یا روی میز پس از سرو</span>
                  </div>
                  <div class="pay-card-radio" aria-hidden="true">
                    <span class="pay-radio-dot"></span>
                  </div>
                </div>

                <div class="pay-card-option" data-method="ONLINE" role="radio" aria-checked="false" tabindex="0">
                  <div class="pay-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                  <div class="pay-card-text">
                    <strong>پرداخت آنلاین</strong>
                    <span>درگاه شتاب و سفارش سریع</span>
                  </div>
                  <div class="pay-card-radio" aria-hidden="true">
                    <span class="pay-radio-dot"></span>
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
    modalBackdrop.setAttribute("aria-hidden", "false");
    triggerHaptic("light");

    const modalHeader = modalBackdrop.querySelector(".soren-modal-header");
    const dragBar = modalBackdrop.querySelector(".soren-sheet-drag-handle-bar");
    const modalCard = modalBackdrop.querySelector(".soren-modal-card");
    const modalBody = modalBackdrop.querySelector(".soren-modal-body");

    let cleanTableWsListeners = null;

    const closeModal = () => {
      if (cleanTableWsListeners) {
        cleanTableWsListeners();
        cleanTableWsListeners = null;
      }
      modalBackdrop.classList.remove("is-open");
      modalBackdrop.setAttribute("aria-hidden", "true");
      if (modalCard) {
        modalCard.style.transform = "";
        modalCard.style.transition = "";
      }
      modalBackdrop.style.opacity = "";
      modalBackdrop.style.transition = "";
      document.removeEventListener("keydown", onKeyDown);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    const closeBtn = modalBackdrop.querySelector(".soren-modal-close");
    if (closeBtn) closeBtn.addEventListener("click", () => {
      triggerHaptic("light");
      closeModal();
    });

    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) {
        triggerHaptic("light");
        closeModal();
      }
    });

    // Apple-Style Fluid Bottom Sheet Drag-to-Dismiss Gesture
    if (modalCard && (modalHeader || dragBar)) {
      let startY = 0;
      let startX = 0;
      let currentDelta = 0;
      let isDragging = false;
      let isSwipeDismiss = false;

      const onTouchStart = (e) => {
        if (e.touches.length !== 1) return;
        if (e.target.closest("button") || e.target.closest("input") || e.target.closest(".table-card") || e.target.closest(".pay-card-option") || e.target.closest(".zone-tab-btn")) return;

        const isHandleOrHeader = !!e.target.closest(".soren-modal-header") || !!e.target.closest(".soren-sheet-drag-handle-bar");
        const isAtTop = modalBody ? modalBody.scrollTop <= 0 : true;

        if (!isHandleOrHeader && !isAtTop) return;

        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        currentDelta = 0;
        isDragging = true;
        isSwipeDismiss = isHandleOrHeader;
        modalCard.style.transition = "none";
      };

      const onTouchMove = (e) => {
        if (!isDragging) return;
        const dy = e.touches[0].clientY - startY;
        const dx = e.touches[0].clientX - startX;

        // If horizontal motion exceeds vertical, cancel drag
        if (!isSwipeDismiss && Math.abs(dx) > Math.abs(dy)) {
          isDragging = false;
          modalCard.style.transform = "";
          return;
        }

        if (dy > 0) {
          if (e.cancelable && (isSwipeDismiss || (modalBody && modalBody.scrollTop <= 0))) {
            e.preventDefault();
          }
          currentDelta = dy;
          modalCard.style.transform = `translateY(${dy}px)`;
          const dim = Math.min(dy / 340, 0.75);
          modalBackdrop.style.opacity = `${1 - dim}`;
        } else {
          currentDelta = 0;
          modalCard.style.transform = "";
        }
      };

      const onTouchEnd = () => {
        if (!isDragging) return;
        isDragging = false;

        if (currentDelta > 70) {
          // Smooth fluid dismissal
          modalCard.style.transition = "transform 0.24s cubic-bezier(0.32, 0.72, 0, 1)";
          modalBackdrop.style.transition = "opacity 0.24s ease";
          modalCard.style.transform = "translateY(105%)";
          modalBackdrop.style.opacity = "0";
          triggerHaptic("medium");
          setTimeout(() => {
            closeModal();
          }, 240);
        } else {
          // Spring snap back
          modalCard.style.transition = "transform 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.15)";
          modalBackdrop.style.transition = "opacity 0.2s ease";
          modalCard.style.transform = "translateY(0)";
          modalBackdrop.style.opacity = "1";
          setTimeout(() => {
            if (modalCard) modalCard.style.transition = "";
            modalBackdrop.style.transition = "";
          }, 320);
        }
        currentDelta = 0;
      };

      const dragZones = [dragBar, modalHeader].filter(Boolean);
      dragZones.forEach((zone) => {
        zone.addEventListener("touchstart", onTouchStart, { passive: true });
        zone.addEventListener("touchmove", onTouchMove, { passive: false });
        zone.addEventListener("touchend", onTouchEnd, { passive: true });
        zone.addEventListener("touchcancel", onTouchEnd, { passive: true });
      });
    }

    let selectedTable = null;
    let selectedPayment = "PAY_AT_COUNTER";
    const tablesContainer = modalBackdrop.querySelector("#tables-container");
    const selectedLabel = modalBackdrop.querySelector("#selected-table-label");
    const zoneTabs = modalBackdrop.querySelectorAll(".zone-tab-btn");
    const payOptions = modalBackdrop.querySelectorAll(".pay-card-option");

    // Payment method selector handling
    payOptions.forEach((opt) => {
      const selectMethod = () => {
        payOptions.forEach((o) => {
          o.classList.remove("is-active");
          o.setAttribute("aria-checked", "false");
        });
        opt.classList.add("is-active");
        opt.setAttribute("aria-checked", "true");
        selectedPayment = opt.dataset.method;
        triggerHaptic("selection");
      };

      opt.addEventListener("click", selectMethod);
      opt.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectMethod();
        }
      });
    });

    const zoneNames = {
      indoor: "سالن اصلی",
      courtyard: "حیاط و فضای سبز",
      vip: "تشریفات VIP",
    };

    let allTablesData = [];
    let currentFilterZone = "all";

    const toFaDigits = (str) => String(str).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

    function renderTables(filterZone = currentFilterZone) {
      currentFilterZone = filterZone;
      tablesContainer.innerHTML = "";
      const filtered = allTablesData.filter((t) => filterZone === "all" || t.zone === filterZone);

      if (filtered.length === 0) {
        tablesContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 24px; color: var(--muted); font-size: 13px;">میزی در این بخش یافت نشد.</div>`;
        return;
      }

      filtered.forEach((t, idx) => {
        const isFree = t.status === "FREE";
        const isHeld = t.status === "HELD";
        const isOccupied = !isFree && !isHeld;
        const isSelected = selectedTable && selectedTable.id === t.id;

        let statusClass = "is-free";
        let statusLabel = "آماده پذیرایی";
        if (isHeld) {
          statusClass = "is-held";
          const remSec = Number(t.remainingHoldSeconds) || 0;
          if (remSec > 0) {
            const m = Math.floor(remSec / 60);
            const s = remSec % 60;
            const timeStr = `${m}:${s < 10 ? "0" + s : s}`;
            statusLabel = `در حال رزرو (${toFaDigits(timeStr)})`;
          } else {
            statusLabel = "در حال رزرو موقت";
          }
        } else if (isOccupied) {
          statusClass = "is-occupied";
          statusLabel = "مشغول";
        }

        const card = document.createElement("div");
        card.className = `table-card ${isOccupied ? "is-occupied" : ""} ${isHeld ? "is-held" : ""} ${isSelected ? "is-selected" : ""}`;
        card.dataset.zone = t.zone;
        card.dataset.id = t.id;
        card.setAttribute("role", "button");
        card.setAttribute("aria-pressed", isSelected ? "true" : "false");
        card.style.animationDelay = `${idx * 28}ms`;

        if (!isFree) {
          card.setAttribute("aria-disabled", "true");
        } else {
          card.setAttribute("tabindex", "0");
        }

        card.innerHTML = `
          ${isSelected ? `
            <div class="table-card-selected-badge" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          ` : ""}
          <div class="table-card-top">
            <span class="table-card-number">${t.number}</span>
            <span class="table-card-capacity">
              <svg class="capacity-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>${toFaDigits(t.capacity)} نفره</span>
            </span>
          </div>
          <p class="table-card-name">${t.name}</p>
          <div class="table-card-footer">
            <span class="table-status-pill ${statusClass}">
              <span class="table-status-dot ${statusClass}"></span>
              <span class="table-status-text ${statusClass}">${statusLabel}</span>
            </span>
            <span class="table-zone-name">${zoneNames[t.zone] || t.zone}</span>
          </div>
        `;

        if (isFree) {
          const selectHandler = () => {
            selectedTable = t;
            selectedLabel.textContent = `${t.number} (${t.name})`;
            triggerHaptic("selection");
            renderTables(filterZone);
          };
          card.addEventListener("click", selectHandler);
          card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              selectHandler();
            }
          });
        }

        tablesContainer.appendChild(card);
      });
    }

    // Fetch available table data from API
    try {
      const res = await fetch(`${API_BASE}/tables`);
      if (res.ok) {
        allTablesData = await res.json();
        // Auto-select first available table
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
        { id: "tbl_2", number: "میز ۲", name: "رو به فضای سبز باغ", capacity: 4, zone: "courtyard", status: "FREE" },
        { id: "tbl_3", number: "میز ۳", name: "سالن اصلی - کنار شومینه", capacity: 4, zone: "indoor", status: "FREE" },
        { id: "tbl_4", number: "میز ۴", name: "کنار بار و دم‌آوری دستی", capacity: 2, zone: "indoor", status: "FREE" },
        { id: "tbl_5", number: "میز VIP ۱", name: "جایگاه اختصاصی دیپلمات", capacity: 6, zone: "vip", status: "FREE" },
        { id: "tbl_6", number: "میز VIP ۲", name: "سالن تشریفات شیشه‌ای", capacity: 8, zone: "vip", status: "FREE" },
      ];
      selectedTable = allTablesData[0];
      selectedLabel.textContent = `${selectedTable.number} (${selectedTable.name})`;
      renderTables("all");
    }

    // Real-Time Table Sync via WebSocket
    const onTableHeld = (data) => {
      if (!data || !data.tableId) return;
      const t = allTablesData.find((x) => x.id === data.tableId);
      if (t) {
        t.status = "HELD";
        t.heldBy = data.heldBy;
        t.heldUntil = data.heldUntil;
        t.remainingHoldSeconds = data.remainingHoldSeconds || (data.heldUntil ? Math.max(0, Math.round((data.heldUntil - Date.now()) / 1000)) : 120);
        if (selectedTable && selectedTable.id === t.id) {
          selectedTable = null;
          selectedLabel.textContent = "انتخاب میز";
        }
        renderTables(currentFilterZone);
      }
    };

    const onTableReleased = (data) => {
      if (!data || !data.tableId) return;
      const t = allTablesData.find((x) => x.id === data.tableId);
      if (t) {
        t.status = "FREE";
        t.heldBy = null;
        t.heldUntil = null;
        t.remainingHoldSeconds = 0;
        renderTables(currentFilterZone);
      }
    };

    const onTableTaken = (data) => {
      if (!data || !data.tableId) return;
      const t = allTablesData.find((x) => x.id === data.tableId);
      if (t) {
        t.status = "OCCUPIED";
        if (selectedTable && selectedTable.id === t.id) {
          selectedTable = null;
          selectedLabel.textContent = "انتخاب میز";
        }
        renderTables(currentFilterZone);
      }
    };

    let holdTicker = setInterval(() => {
      let shouldRerender = false;
      allTablesData.forEach((t) => {
        if (t.status === "HELD" && t.remainingHoldSeconds > 0) {
          t.remainingHoldSeconds--;
          shouldRerender = true;
        }
      });
      if (shouldRerender) {
        renderTables(currentFilterZone);
      }
    }, 1000);

    if (typeof SorenWS !== "undefined" && SorenWS.on) {
      SorenWS.init();
      SorenWS.on("table:held", onTableHeld);
      SorenWS.on("table:released", onTableReleased);
      SorenWS.on("table:taken", onTableTaken);
    }

    cleanTableWsListeners = () => {
      if (holdTicker) clearInterval(holdTicker);
      if (typeof SorenWS !== "undefined" && SorenWS.off) {
        SorenWS.off("table:held", onTableHeld);
        SorenWS.off("table:released", onTableReleased);
        SorenWS.off("table:taken", onTableTaken);
      }
    };

    // Zone filter tabs for cafe tables
    zoneTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        zoneTabs.forEach((b) => {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
        });
        tab.classList.add("is-active");
        tab.setAttribute("aria-selected", "true");
        triggerHaptic("selection");
        renderTables(tab.dataset.zone);
      });
    });

    // Submit table order to backend API
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
      triggerHaptic("medium");

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

  // Live tracking for active customer orders
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

    // GSAP spring bounce animation for current order status step
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

    // WebSocket real-time subscription for instant order status updates
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

    // One-time initial fetch on page load to verify order status
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

  // Menu grid filtering and sort handlers
  if (grid) {
    const filterButtons = document.querySelectorAll(".menu-page .filter-btn");
    const cards = Array.from(grid.querySelectorAll(".product-card"));

    function filterCards(category) {
      const currentQuery =
        document.querySelector(".desktop-search input")?.value ||
        document.getElementById("mobile-search-input")?.value ||
        "";
      if (typeof window.sorenApplySearch === "function") {
        window.sorenApplySearch(currentQuery);
      } else {
        cards.forEach((card) => {
          card.hidden = category !== "all" && card.dataset.category !== category;
        });
      }
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

  // Add-to-cart and stepper event delegation with physical haptic pulse
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".btn-add, .featured-order, .card-add-btn");
    const plusBtn = e.target.closest(".stepper-plus");
    const minusBtn = e.target.closest(".stepper-minus");

    if (addBtn || plusBtn) {
      const button = addBtn || plusBtn;
      const card = button.closest(".product-card, .featured-card");
      if (!card) return;

      // 10ms haptic vibration for tactile button press feedback
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(12); } catch (err) {}
      }

      const id = card.dataset.id || card.dataset.productId || button.dataset.id;
      const currentQty = (typeof SorenCartStore !== "undefined" && id) ? SorenCartStore.getItemQuantity(id) : 0;

      // If item is already in cart and collapsed, clicking the indicator brings controls back
      if (addBtn && addBtn.classList.contains("has-items") && currentQty > 0) {
        if (id && typeof window.showCardStepper === "function") {
          window.showCardStepper(id, 2000);
        }
        return;
      }

      const productName =
        card.dataset.name ||
        button.dataset.product ||
        card.querySelector(".product-title, h3")?.textContent.trim() ||
        "";
      const price = Number(card.dataset.price || 0);
      const imgEl = card.querySelector(".product-image, .featured-image, img");
      const imgSrc = imgEl?.getAttribute("src") || "";

      // Resolve product data against database catalog
      let catalogItem = PRODUCT_CATALOG[productName];
      if (!catalogItem && id) {
        catalogItem = Object.values(PRODUCT_CATALOG).find((it) => it.id === id);
      }
      if (!catalogItem) {
        const cleanName = productName.replace(/[()]/g, "").trim();
        const matchedKey = Object.keys(PRODUCT_CATALOG).find(
          (k) => cleanName.includes(k) || k.includes(cleanName)
        );
        if (matchedKey) catalogItem = PRODUCT_CATALOG[matchedKey];
      }

      const product = catalogItem || {
        id: id || "prd_espresso",
        name: productName || "محصول کافه سورن",
        price: price || 95000,
        image: imgSrc || "../images/products/coffee/espresso.png",
        category: card.dataset.category || "coffee",
        desc: card.querySelector(".product-desc, p")?.textContent.trim() || "",
      };

      // Activate in-card stepper with 2000ms auto-collapse timer
      if (id && typeof window.showCardStepper === "function") {
        window.showCardStepper(id, 2000);
      }

      // Fly-to-cart micro-animation and toast feedback
      if (addBtn) {
        animateFlyToCart(addBtn);
        showToast(`«${product.name}» به سبد خرید شما اضافه شد.`);
      }

      SorenCart.addItem(product);
    } else if (minusBtn) {
      // 10ms haptic pulse on quantity decrement
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(12); } catch (err) {}
      }

      const card = minusBtn.closest(".product-card, .featured-card");
      const id = minusBtn.dataset.id || card?.dataset.id || card?.dataset.productId;
      if (id) {
        SorenCartStore.updateQuantity(id, -1);
        const newQty = SorenCartStore.getItemQuantity(id);
        if (newQty > 0) {
          if (typeof window.showCardStepper === "function") {
            window.showCardStepper(id, 2000);
          }
        } else {
          if (typeof window.dismissCardStepperImmediately === "function") {
            window.dismissCardStepperImmediately(id);
          }
        }
      }
    }
  });
})();

/* ========================================================
   8. مجموعه انیمیشن و فیزیک حرکتی (Animation Lab Suite)
   ======================================================== */

// Accelerated physics particle trajectory toward header cart icon
function animateFlyToCart(button) {
  if (typeof gsap === "undefined") return;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const cartButton = document.querySelector(".cart-button");
  if (!cartButton) return;
  if (typeof gsap === "undefined") return;

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

// Interactive 3D mouse parallax tilt on hero artwork
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

// Scroll-driven motion choreography & SVG stroke drawing
function initScrollChoreography() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  gsap.registerPlugin(ScrollTrigger);

  // 1. Progressive SVG stroke-dashoffset drawing for story accent
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

  // 2. Staggered reveal for featured product cards
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

  // 3. Staggered reveal for menu category items
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

  // 4. Smooth entrance animation for about feature cards
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

// Global listener for product inventory mutations via backend WebSocket
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

      // 1. Synchronize and enrich client product catalog
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

      // 2. Update live inventory status and identifiers on DOM cards
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

      // 1. Exact name match
      let product = this.products.find((p) => p.name === name);

      // 2. Match via static catalog with unique product ID
      if (!product && PRODUCT_CATALOG[name]) {
        const catId = PRODUCT_CATALOG[name].id;
        product = this.products.find((p) => p.id === catId);
      }

      // 3. Fuzzy matching via tokens and prefixes
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

    if (typeof window.syncCardSteppers === "function") {
      window.syncCardSteppers();
    }
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

  // 1. Header brand logo interactive hover micro-animation
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

  // 2. Cinematic Simurgh preloader entrance with session caching & touch dismiss
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

  // Touch/click dismiss handler for preloader skip button and backdrop
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

  // GSAP timeline: majestic Simurgh feather & stroke animation
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

/* ========================================================
   موتور برگه کشویی جزئیات محصول (Soren Artisanal Menu Detail Engine)
   ======================================================== */
const SorenMenuDetail = {
  backdrop: null,
  sheet: null,
  closeBtn: null,
  addBtn: null,
  dragHandle: null,
  activeProduct: null,
  isOpenState: false,
  dragStartY: 0,
  currentTranslateY: 0,
  isDragging: false,

  specsMap: {
    prd_espresso_double: {
      origin: "اتیوپی یرگاچف ۱۰۰٪ عربیکا",
      brewMethod: "اسپرسو ماشین ۹ بار",
      temperature: "۹۳.۵ درجه سانتی‌گراد",
      tastingNotes: "شکلات تلخ، مرکبات، کرمای ماندگار",
      tag: "عصاره‌گیری ۹ بار"
    },
    prd_cappuccino: {
      origin: "کلمبیا سوپریمو + اتیوپی",
      brewMethod: "اسپرسو دبل با استیم شیر ۶۵°",
      temperature: "۶۵ درجه سانتی‌گراد",
      tastingNotes: "میکروفوم مخملی، گردو، کارامل",
      tag: "میکروفوم مخملی"
    },
    prd_shake_choc: {
      origin: "شکلات تلخ بلژیکی ۷۰٪ و فندق بوداده",
      brewMethod: "میکسر صنعتی با بافت مخملی",
      temperature: "۴- درجه سانتی‌گراد",
      tastingNotes: "شکلات غلیظ، مغز فندق کرانچی",
      tag: "فندق بو داده"
    },
    prd_shake_strawberry: {
      origin: "توت فرنگی ارگانیک جیرفت و شیر تازه",
      brewMethod: "اسموتی بار با یخ خرد شده",
      temperature: "۴- درجه سانتی‌گراد",
      tastingNotes: "میوه‌ای تازه، شیرین ملایم، خنک",
      tag: "توت فرنگی تازه"
    },
    prd_cheesecake: {
      origin: "پنیر خامه‌ای طبیعی و وانیل ماداگاسکار",
      brewMethod: "پخت کارگاهی با پوسته کاراملی باسک",
      temperature: "۱۰ درجه سانتی‌گراد",
      tastingNotes: "بافت خامه‌ای لغزان، کارامل دودی",
      tag: "امضای قنادی"
    },
    prd_choc_cake: {
      origin: "کاکائو خالص ماداگاسکار و گردوی تویسرکان",
      brewMethod: "پخت روزانه تنوری",
      temperature: "دمای اتاق (سرو همراه خامه)",
      tastingNotes: "شکلاتی مرطوب، بافت غنی، گردوی برشته",
      tag: "گردوی تازه"
    }
  },

  defaultCategorySpecs: {
    coffee: {
      origin: "اتیوپی یرگاچف ۱۰۰٪ عربیکا",
      brewMethod: "اسپرسو ماشین لا مارزوکو ۹ بار",
      temperature: "۹۳.۵ درجه سانتی‌گراد",
      tastingNotes: "یاس، ترنج، عسل وحشی",
      tag: "عصاره‌گیری ۹ بار"
    },
    shakes: {
      origin: "شیر تازه ارگانیک و بستنی دست‌ساز",
      brewMethod: "میکسر حرفه‌ای دور بالا",
      temperature: "۳- درجه سانتی‌گراد",
      tastingNotes: "خامه‌ای، غلیظ، دست‌ساز",
      tag: "ترکیب اصیل"
    },
    cake: {
      origin: "کره فرانسوی و آرد ارگانیک",
      brewMethod: "پخت روزانه کارگاهی با هیزم",
      temperature: "دمای محیط (تازه پخت)",
      tastingNotes: "بافت نرم، کاراملی، عطر وانیل",
      tag: "پخت روزانه"
    }
  },

  init() {
    this.backdrop = document.getElementById("menu-detail-backdrop");
    this.sheet = document.getElementById("menu-detail-sheet");
    if (!this.sheet) return;

    this.closeBtn = document.getElementById("menu-detail-close-btn");
    this.addBtn = document.getElementById("menu-detail-add-btn");
    this.dragHandle = document.getElementById("menu-detail-drag-handle");

    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.close());
    }
    if (this.backdrop) {
      this.backdrop.addEventListener("click", () => this.close());
    }

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen()) {
        this.close();
      }
    });

    if (this.addBtn) {
      this.addBtn.addEventListener("click", () => this.handleAddToCart());
    }

    if (this.dragHandle) {
      this.dragHandle.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: true });
      this.dragHandle.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
      this.dragHandle.addEventListener("touchend", () => this.onTouchEnd(), { passive: true });
    }

    // Catalog card click delegation with stepper event isolation
    document.addEventListener("click", (e) => {
      if (e.target.closest(".card-action-box, .card-stepper, .card-add-btn, .featured-order, .btn-stepper-touch, .stepper-btn, .stepper-count")) {
        return;
      }

      const card = e.target.closest(".featured-card, .product-card");
      if (!card) return;

      const id = card.dataset.id || card.dataset.productId || "";
      const name = card.dataset.name || card.querySelector("h3, .product-title")?.textContent.trim() || "";
      this.open(id || name, card);
    });
  },

  onTouchStart(e) {
    if (!e.touches || e.touches.length === 0) return;
    this.isDragging = true;
    this.dragStartY = e.touches[0].clientY;
    this.currentTranslateY = 0;
    this.sheet.classList.add("is-dragging");
  },

  onTouchMove(e) {
    if (!this.isDragging || !e.touches || e.touches.length === 0) return;
    const deltaY = e.touches[0].clientY - this.dragStartY;
    if (deltaY > 0) {
      e.preventDefault();
      this.currentTranslateY = deltaY;
      this.sheet.style.transform = `translateY(${deltaY}px)`;
    }
  },

  onTouchEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.sheet.classList.remove("is-dragging");

    if (this.currentTranslateY > 80) {
      this.close();
    } else {
      this.sheet.style.transform = "";
    }
    this.currentTranslateY = 0;
  },

  open(productIdOrName, cardEl = null) {
    if (!this.sheet) return;

    let product = null;
    if (typeof PRODUCT_CATALOG !== "undefined") {
      if (PRODUCT_CATALOG[productIdOrName]) {
        product = PRODUCT_CATALOG[productIdOrName];
      } else {
        product = Object.values(PRODUCT_CATALOG).find(p => p.id === productIdOrName || p.name === productIdOrName);
      }
    }

    if (!product && cardEl) {
      product = {
        id: cardEl.dataset.id || "prd_item",
        name: cardEl.dataset.name || cardEl.querySelector("h3")?.textContent.trim() || "محصول کافه سورن",
        price: Number(cardEl.dataset.price) || 95000,
        image: cardEl.querySelector("img")?.getAttribute("src") || "",
        category: cardEl.dataset.category || "coffee",
        desc: cardEl.querySelector(".product-desc, p")?.textContent.trim() || ""
      };
    }

    if (!product) return;
    this.activeProduct = product;

    const category = product.category || "coffee";
    const specs = this.specsMap[product.id] || this.defaultCategorySpecs[category] || this.defaultCategorySpecs.coffee;

    const catBadge = document.getElementById("menu-detail-category");
    if (catBadge) {
      const catNames = { coffee: "اسپرسو بار تخصصی", shakes: "بار سرد و شیک", cake: "قنادی و بیکری روز" };
      catBadge.textContent = catNames[category] || "تخصصی سورن";
    }

    const imgEl = document.getElementById("menu-detail-img");
    if (imgEl) {
      delete imgEl.dataset.hasFallback;
      imgEl.style.padding = "";
      imgEl.style.background = "";
      imgEl.src = product.image || "";
      imgEl.alt = product.name || "";
    }

    const tagEl = document.getElementById("menu-detail-tag");
    if (tagEl) {
      tagEl.textContent = specs.tag || "اصیل";
    }

    const titleEl = document.getElementById("menu-detail-title");
    if (titleEl) {
      titleEl.textContent = product.name;
    }

    const priceEl = document.getElementById("menu-detail-price");
    if (priceEl) {
      const formatted = (product.price || 0).toLocaleString("fa-IR");
      priceEl.textContent = formatted;
    }

    const descEl = document.getElementById("menu-detail-desc");
    if (descEl) {
      descEl.textContent = product.desc || "تهیه شده از مرغوب‌ترین مواد اولیه با دقت باریستاهای سورن.";
    }

    const originEl = document.getElementById("menu-detail-origin");
    if (originEl) originEl.textContent = specs.origin;

    const brewEl = document.getElementById("menu-detail-brew");
    if (brewEl) brewEl.textContent = specs.brewMethod;

    const tempEl = document.getElementById("menu-detail-temp");
    if (tempEl) tempEl.textContent = specs.temperature;

    const notesEl = document.getElementById("menu-detail-notes");
    if (notesEl) notesEl.textContent = specs.tastingNotes;

    const isSoldOut = product.isAvailable === false || (cardEl && cardEl.classList.contains("is-sold-out"));
    if (this.addBtn) {
      if (isSoldOut) {
        this.addBtn.disabled = true;
        this.addBtn.classList.add("is-sold-out");
        this.addBtn.innerHTML = "<span>ناموجود در شیفت جاری</span>";
      } else {
        this.addBtn.disabled = false;
        this.addBtn.classList.remove("is-sold-out", "is-added");
        this.addBtn.innerHTML = "<span>افزودن به سبد خرید</span>";
      }
    }

    this.sheet.style.transform = "";
    this.sheet.classList.add("is-open");
    this.sheet.setAttribute("aria-hidden", "false");
    if (this.backdrop) {
      this.backdrop.classList.add("is-open");
      this.backdrop.setAttribute("aria-hidden", "false");
    }
    this.isOpenState = true;
    document.body.style.overflow = "hidden";
  },

  close() {
    if (!this.sheet) return;
    this.sheet.classList.remove("is-open", "is-dragging");
    this.sheet.style.transform = "";
    this.sheet.setAttribute("aria-hidden", "true");
    if (this.backdrop) {
      this.backdrop.classList.remove("is-open");
      this.backdrop.setAttribute("aria-hidden", "true");
    }
    this.isOpenState = false;
    this.activeProduct = null;
    document.body.style.overflow = "";
  },

  isOpen() {
    return this.isOpenState;
  },

  handleAddToCart() {
    if (!this.activeProduct || (this.addBtn && this.addBtn.disabled)) return;

    if (typeof SorenCart !== "undefined" && typeof SorenCart.addItem === "function") {
      SorenCart.addItem(this.activeProduct);
    } else if (typeof SorenCartStore !== "undefined" && typeof SorenCartStore.addItem === "function") {
      SorenCartStore.addItem(this.activeProduct.id, 1);
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(14); } catch (e) {}
    }

    if (this.addBtn) {
      this.addBtn.classList.add("is-added");
      this.addBtn.innerHTML = "<span>✓ افزوده شد!</span>";
    }

    setTimeout(() => {
      this.close();
      if (this.addBtn) {
        this.addBtn.classList.remove("is-added");
        this.addBtn.innerHTML = "<span>افزودن به سبد خرید</span>";
      }
    }, 400);
  }
};

if (typeof window !== "undefined") {
  window.SorenCatalog = SorenCatalog;
  window.SorenMenuDetail = SorenMenuDetail;
  window.initSorenLogoExperience = initSorenLogoExperience;
}

// ==========================================================================
// Contact Quick-Action Popover Deck (Accessible click & escape interaction)
// ==========================================================================
function initContactPopover() {
  const trigger = document.getElementById("contact-popover-trigger");
  if (!trigger) return;
  const dropdown = trigger.closest(".contact-dropdown");
  const popover = document.getElementById("contact-popover-menu");
  if (!dropdown || !popover) return;

  function setExpanded(expanded) {
    trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
    dropdown.classList.toggle("is-active", expanded);
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isCurrentlyOpen = trigger.getAttribute("aria-expanded") === "true";
    setExpanded(!isCurrentlyOpen);
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      setExpanded(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && trigger.getAttribute("aria-expanded") === "true") {
      setExpanded(false);
      trigger.focus();
    }
  });
}

// Initialize application on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  if (typeof SorenCartStore !== "undefined") {
    SorenCartStore.init();
  }
  SorenCart.syncBadges();
  SorenCatalog.init();
  if (typeof SorenMenuDetail !== "undefined") {
    SorenMenuDetail.init();
  }
  if (typeof initSingleSurfaceCatalog === "function") {
    initSingleSurfaceCatalog();
  }
  if (typeof initCategoryCarouselSync === "function") {
    initCategoryCarouselSync();
  }
  if (typeof initCartBottomSheetAndFloatingBar === "function") {
    initCartBottomSheetAndFloatingBar();
  }
  initHero3DMotion();
  initScrollChoreography();
  initSorenLogoExperience();
  initContactPopover();
  SorenAudio.init();
});

// ==========================================================================
// Graceful Fallback for Broken / Offline Product Images (FR-017)
// ==========================================================================
if (typeof window !== "undefined") {
  window.handleImageError = function(img) {
    if (!img || img.dataset.hasFallback) return;
    img.dataset.hasFallback = "true";
    const basePath = location.pathname.includes("/pages/") ? "../" : "./";
    img.style.objectFit = "contain";
    img.style.padding = "32px";
    img.style.background = "linear-gradient(145deg, #2a221d, #191513)";
    img.src = basePath + "images/brand/soren-logo.svg";
  };

  window.addEventListener("error", (e) => {
    const t = e.target;
    if (t && t.tagName === "IMG" && (t.classList.contains("featured-image") || t.id === "menu-detail-img")) {
      window.handleImageError(t);
    }
  }, true);
}
