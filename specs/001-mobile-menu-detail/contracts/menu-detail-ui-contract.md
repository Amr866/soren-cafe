# UI Contract: Menu Detail Bottom Sheet & Unslopped Catalog

**Feature Branch**: `001-mobile-menu-detail`  
**Date**: 2026-11-02  
**Status**: Completed  

---

## 1. DOM Hierarchy & Structural Contract

The following semantic DOM nodes MUST be injected into `frontend/index.html` as direct children of `<body>`, positioned immediately before `<nav class="mobile-bottom-nav">`:

```html
<!-- Ambient Backdrop Blur -->
<div id="menu-detail-backdrop" class="menu-detail-backdrop" aria-hidden="true"></div>

<!-- Menu Detail Bottom Sheet Container -->
<section
  id="menu-detail-sheet"
  class="menu-detail-sheet"
  role="dialog"
  aria-modal="true"
  aria-labelledby="menu-detail-title"
  aria-hidden="true"
>
  <!-- Touch drag handle zone -->
  <div class="sheet-drag-handle-zone" id="menu-detail-drag-handle">
    <div class="sheet-drag-handle-bar"></div>
  </div>

  <!-- Header with Category Tag and Close Button -->
  <header class="sheet-header">
    <span class="sheet-category-badge" id="menu-detail-category">اسپرسو بار</span>
    <button
      type="button"
      class="sheet-close-btn"
      id="menu-detail-close-btn"
      aria-label="بستن مشخصات محصول"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  </header>

  <!-- Scrollable Sheet Content -->
  <div class="sheet-body">
    <!-- Visual hero frame -->
    <div class="detail-visual-box">
      <img id="menu-detail-img" src="" alt="" loading="lazy" />
      <span class="detail-provenance-tag" id="menu-detail-tag">تک‌خاستگاه</span>
    </div>

    <!-- Title & Tabular Price -->
    <div class="detail-title-row">
      <h3 id="menu-detail-title" class="detail-title"></h3>
      <div class="detail-price-box">
        <span id="menu-detail-price" class="detail-price"></span>
        <span class="detail-currency">تومان</span>
      </div>
    </div>

    <!-- Editorial Description -->
    <p id="menu-detail-desc" class="detail-desc"></p>

    <!-- Artisanal Specs 2-Column Grid -->
    <div class="detail-specs-grid">
      <div class="spec-cell">
        <span class="spec-label">خاستگاه دانه</span>
        <span class="spec-val" id="menu-detail-origin">-</span>
      </div>
      <div class="spec-cell">
        <span class="spec-label">روش عصاره‌گیری</span>
        <span class="spec-val" id="menu-detail-brew">-</span>
      </div>
      <div class="spec-cell">
        <span class="spec-label">دمای سرو</span>
        <span class="spec-val" id="menu-detail-temp">-</span>
      </div>
      <div class="spec-cell">
        <span class="spec-label">نت‌های چشایی</span>
        <span class="spec-val" id="menu-detail-notes">-</span>
      </div>
    </div>
  </div>

  <!-- Sticky 48px Action Footer -->
  <footer class="sheet-footer">
    <button
      type="button"
      id="menu-detail-add-btn"
      class="detail-add-btn"
    >
      <span>افزودن به سبد خرید</span>
    </button>
  </footer>
</section>
```

---

## 2. JavaScript Interface Contract (`SorenMenuDetail`)

Exposed on global window or as an internal module in `frontend/main.js`:

```javascript
const SorenMenuDetail = {
  /**
   * Initializes event listeners (delegation on cards, touch gestures, backdrop, keyboard).
   */
  init: () => void,

  /**
   * Opens the bottom sheet with metadata for the given product ID.
   * @param {string} productId - Matching product ID in PRODUCT_CATALOG
   */
  open: (productId: string) => void,

  /**
   * Dismisses the bottom sheet with spring slide-down easing.
   */
  close: () => void,

  /**
   * Returns current open state.
   */
  isOpen: () => boolean
};
```

### Event Contracts
- **Card Click**: A click on `.featured-card` or `.product-card` triggers `SorenMenuDetail.open(id)` EXCEPT when `e.target.closest('.card-action-box, .card-stepper, .card-add-btn')` evaluates to truthy.
- **Add to Cart**: Tapping `#menu-detail-add-btn` executes:
  1. `SorenCartStore.addItem(activeProductId, 1)`
  2. `navigator.vibrate?.(14)` (subtle haptic feedback)
  3. Text changes to `✓ افزوده شد!` with pulse class
  4. `setTimeout(() => SorenMenuDetail.close(), 400)`
- **Dismissal Triggers**:
  - Tapping `#menu-detail-backdrop`
  - Tapping `#menu-detail-close-btn`
  - Keydown `Escape` on `window`
  - Dragging down on `#menu-detail-drag-handle` by > 80px.

---

## 3. Styling & Token Invariants

- **Backdrop**: `background: rgba(20, 16, 14, 0.45); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);`
- **Sheet Surface**: `background: #FAF7F2; border-top: 1px solid rgba(140, 94, 60, 0.18); border-radius: 28px 28px 0 0;`
- **Typography Numerals**: `font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1;`
- **Spring Transition**: `transition: transform 0.38s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease;`
- **Touch Target**: `#menu-detail-add-btn` MUST have `min-height: 48px;` and `width: 100%;`.
