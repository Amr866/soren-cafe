"use strict";

/* ========================================================
   SOREN CAFÉ — Unified Interactive Client & Backend Bridge
   ======================================================== */

const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:4000";
const API_BASE = origin.startsWith("http")
  ? `${origin}/api/v1`
  : "http://localhost:4000/api/v1";

const WS_BASE = origin.startsWith("http")
  ? `${origin.replace(/^http/, "ws")}/ws`
  : "ws://localhost:4000/ws";

// کاتالوگ تطبیقی ۱۸ محصول اصلی فرانت‌اند و شناسه دیتابیس بک‌اند
const PRODUCT_CATALOG = {
  // قهوه‌ها
  "لاته": { id: "prd_latte", name: "لاته", price: 150000, image: "../images/products/coffee/latte.png", category: "coffee", desc: "قهوه تخصصی · ۲۵۰ میلی‌لیتر" },
  "کاپوچینو": { id: "prd_cappuccino", name: "کاپوچینو", price: 140000, image: "../images/products/coffee/cappuccino.png", category: "coffee", desc: "نوشیدنی گرم · ۳۰۰ میلی‌لیتر" },
  "اسپرسو": { id: "prd_espresso", name: "اسپرسو", price: 90000, image: "../images/products/coffee/espresso.png", category: "coffee", desc: "شات دوبل اصیل · ۴۰ میلی‌لیتر" },
  "اسپرسو دبل": { id: "prd_espresso_double", name: "اسپرسو دبل", price: 95000, image: "../images/products/coffee/double-espresso.png", category: "coffee", desc: "شات دوبل تخصصی با کرمای غلیظ" },
  "آمریکانو": { id: "prd_americano", name: "آمریکانو", price: 110000, image: "../images/products/coffee/americano.png", category: "coffee", desc: "اسپرسو با آب تصفیه · ۲۲۰ میلی‌لیتر" },
  "موکا": { id: "prd_mocha", name: "موکا", price: 160000, image: "../images/products/coffee/mocha.png", category: "coffee", desc: "اسپرسو با شکلات فرانسوی · ۲۸۰ میلی‌لیتر" },
  "آیس لاته": { id: "prd_iced_latte", name: "آیس لاته", price: 170000, image: "../images/products/coffee/iced-latte.png", category: "coffee", desc: "سرو خنک با یخ قالبی · ۳۰۰ میلی‌لیتر" },

  // کیک و دسرها
  "چیزکیک نیویورکی": { id: "prd_cheesecake", name: "چیزکیک نیویورکی", price: 180000, image: "../images/products/cake/cheesecake.png", category: "cake", desc: "بافت خامه‌ای کاراملیزه دست‌ساز" },
  "چیز‌کیک": { id: "prd_cheesecake", name: "چیزکیک نیویورکی", price: 180000, image: "../images/products/cake/cheesecake.png", category: "cake", desc: "بافت خامه‌ای کاراملیزه دست‌ساز" },
  "براونی شکلاتی فاج": { id: "prd_brownie", name: "براونی شکلاتی فاج", price: 130000, image: "../images/products/cake/chocolate-fudge-brownie.png", category: "cake", desc: "براونی غلیظ با مغز شکلات مذاب" },
  "کیک دبل چاکلت": { id: "prd_choc_cake", name: "کیک دبل چاکلت", price: 150000, image: "../images/products/cake/chocolate-cake.png", category: "cake", desc: "اسفنج شکلات تلخ با گاناش دست‌ساز" },
  "کیک شکلاتی": { id: "prd_choc_cake", name: "کیک دبل چاکلت", price: 150000, image: "../images/products/cake/chocolate-cake.png", category: "cake", desc: "اسفنج شکلات تلخ با گاناش دست‌ساز" },
  "تیرامیسو کلاسیک": { id: "prd_tiramisu", name: "تیرامیسو کلاسیک", price: 170000, image: "../images/products/cake/tiramisu.png", category: "cake", desc: "لیدی فینگر اسپرسو و ماسکارپونه" },
  "کیک هویج و گردو": { id: "prd_carrot_cake", name: "کیک هویج و گردو", price: 140000, image: "../images/products/cake/carrot-walnut-cake.png", category: "cake", desc: "معطر با دارچین و کرم پنیر" },
  "کوکی چاکلت چانک": { id: "prd_cookie", name: "کوکی چاکلت چانک", price: 80000, image: "../images/products/cake/chocolate-chunk-cookie.png", category: "cake", desc: "کوکی نرم با تکه‌های شکلات ۷۰٪" },

  // شیک‌ها
  "شیک شکلات": { id: "prd_shake_choc", name: "شیک شکلات", price: 180000, image: "../images/products/shakes/chocolate-shake.png", category: "shake", desc: "بستنی شکلاتی و سس کاکائو هلندی" },
  "شیک وانیل": { id: "prd_shake_vanilla", name: "شیک وانیل", price: 160000, image: "../images/products/shakes/vanilla-shake.png", category: "shake", desc: "وانیل ماداگاسکار و شیر تازه" },
  "شیک توت‌فرنگی": { id: "prd_shake_strawberry", name: "شیک توت‌فرنگی", price: 170000, image: "../images/products/shakes/strawberry-shake.png", category: "shake", desc: "پوره طبیعی توت‌فرنگی تازه" },
  "شیک اورئو": { id: "prd_shake_oreo", name: "شیک اورئو", price: 190000, image: "../images/products/shakes/oreo-shake.png", category: "shake", desc: "بیسکویت اورئو با بستنی کره‌ای" },
  "شیک موز": { id: "prd_shake_banana", name: "شیک موز", price: 170000, image: "../images/products/shakes/banana-shake.png", category: "shake", desc: "موز طبیعی با مغز پسته" },
  "شیک کارامل": { id: "prd_shake_caramel", name: "شیک کارامل", price: 185000, image: "../images/products/shakes/caramel-shake.png", category: "shake", desc: "کارامل نمکی دولچه دلچه" },
};

/* ========================================
   موتور مشترک سبد خرید (SorenCart Store)
   ======================================== */
const SorenCart = {
  KEY: "soren_cart_v1",

  getItems() {
    try {
      const data = localStorage.getItem(this.KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  save(items) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Cart save error:", e);
    }
    this.syncBadges();
  },

  addItem(product) {
    const items = this.getItems();
    const existing = items.find((i) => i.id === product.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + 1, 99);
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        desc: product.desc || "",
        qty: 1,
      });
    }
    this.save(items);
  },

  updateQty(productId, delta) {
    const items = this.getItems();
    const item = items.find((i) => i.id === productId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      this.removeItem(productId);
      return;
    }
    item.qty = Math.min(item.qty, 99);
    this.save(items);
  },

  removeItem(productId) {
    const items = this.getItems().filter((i) => i.id !== productId);
    this.save(items);
  },

  clear() {
    this.save([]);
  },

  getTotalCount() {
    return this.getItems().reduce((sum, item) => sum + item.qty, 0);
  },

  getSubtotal() {
    return this.getItems().reduce((sum, item) => sum + item.price * item.qty, 0);
  },

  syncBadges() {
    const count = this.getTotalCount();
    document.querySelectorAll(".cart-button").forEach((btn) => {
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

    // استعلام وضعیت از سرور با پولینگ هر ۴ ثانیه
    if (stepIndex < 3) {
      setTimeout(async () => {
        try {
          const res = await fetch(`${API_BASE}/orders/${order.id}`);
          if (res.ok) {
            const fresh = await res.json();
            if (fresh.status !== order.status) {
              order.status = fresh.status;
              localStorage.setItem("soren_active_order", JSON.stringify(order));
              checkActiveOrder();
            }
          }
        } catch {}
      }, 4000);
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

      // استخراج یا تولید محصول تطبیقی
      const catalogItem = PRODUCT_CATALOG[productName];
      const product = catalogItem || {
        id: `prd_${productName.replace(/\s+/g, "_")}`,
        name: productName,
        price: price || 95000,
        image: imgSrc,
        category: card?.dataset.category || "coffee",
        desc: card?.querySelector(".product-desc, p")?.textContent.trim() || "",
      };

      SorenCart.addItem(product);

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

// همگام‌سازی اولیه نشانگر هدر در تمامی صفحات
document.addEventListener("DOMContentLoaded", () => {
  SorenCart.syncBadges();
});
