# Mobile Responsive Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Soren Café into a high-performance, thumb-zone ergonomic, standalone PWA mobile experience with a bottom navigation bar, sticky category chips, interactive cart bottom sheet, and session-cached intro.

**Architecture:** Implement a client-side reactive store (`SorenCartStore`) in `frontend/main.js` synced via `localStorage` and `SorenWS`, paired with a mobile UI architecture in `frontend/css/style.css` and `frontend/index.html` using modern CSS tokens (`dvh`, safe-area insets, smart auto-hide navigation, and fluid typography).

**Tech Stack:** HTML5, CSS3 (CSS Variables, Flexbox/Grid, Safe Areas, Media Queries), Vanilla ES6+ JavaScript, Web Audio/Vibration API, Web App Manifest.

**Spec:** [`docs/superpowers/specs/2026-10-19-mobile-responsive-design.md`](file:///d:/projects/soren-cafe/docs/superpowers/specs/2026-10-19-mobile-responsive-design.md)

## Global Constraints
- Target mobile viewport widths: 320px to 767px (tablet/desktop ≥ 768px remains visually unchanged).
- Minimum interactive touch target: 44px to 48px.
- Zero horizontal overflow (`overflow-x: hidden` globally on mobile).
- Strict RTL Persian layout direction (`dir="rtl"`, Vazirmatn font).
- PWA manifest theme color: `#F7F4EE`.

---

### Task 1: PWA Manifest, Viewport Meta & Mobile CSS Tokens

**Files:**
- Create: `frontend/manifest.json`
- Modify: `frontend/index.html:1-35`
- Modify: `frontend/css/style.css:1-60`

**Interfaces:**
- Consumes: None
- Produces: CSS custom properties `--safe-bottom`, `--app-height`, `--bottom-nav-height`, `--touch-target`; PWA manifest linked to `index.html`.

- [ ] **Step 1: Create `frontend/manifest.json`**
```json
{
  "name": "کافه سورن | Soren Café",
  "short_name": "سورن کافه",
  "description": "برشته‌کاری تخصصی و کافه سورن - عصاره اصیل و کیک‌های دست‌ساز",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#F7F4EE",
  "theme_color": "#F7F4EE",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "./images/brand/favicon.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    }
  ]
}
```

- [ ] **Step 2: Add PWA & Apple Mobile Meta tags to `frontend/index.html`**
Add manifest link, `apple-mobile-web-app-capable: yes`, `apple-mobile-web-app-status-bar-style: default`, and `viewport-fit=cover` in `<head>`.

- [ ] **Step 3: Add Mobile Design Tokens in `frontend/css/style.css`**
Add `:root` variables:
```css
:root {
  --app-height: 100dvh;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 12px);
  --bottom-nav-height: 64px;
  --touch-target: 48px;
}
```

- [ ] **Step 4: Verify PWA link and CSS tokens load**
Check browser console/HTML inspector: verify manifest link resolves with HTTP 200, no CSS syntax errors.

- [ ] **Step 5: Commit**
```bash
git add frontend/manifest.json frontend/index.html frontend/css/style.css
git commit -m "feat(mobile): add PWA manifest, viewport meta and mobile CSS tokens"
```

---

### Task 2: Central Reactive Cart Store (`SorenCartStore`) & Session-Cached Intro

**Files:**
- Modify: `frontend/main.js:1-120` (Store & Session Cache)
- Modify: `frontend/css/style.css: preloader rules`

**Interfaces:**
- Consumes: `SorenWS` WebSocket engine, `localStorage`, `sessionStorage`
- Produces: `window.SorenCartStore` API with methods: `addItem`, `removeItem`, `updateQuantity`, `getItems`, `getTotalPrice`, `getTotalCount`, `clearCart`. Emits `soren:cart-changed`.

- [ ] **Step 1: Implement `SorenCartStore` in `frontend/main.js`**
Write reactive store maintaining items in `localStorage['soren_cart_v1']`, broadcasting `soren:cart-changed` event and publishing `cart:sync` over `SorenWS`.

- [ ] **Step 2: Implement session caching & touch-to-dismiss for the preloader**
In `frontend/main.js` (preloader initialization):
Check `sessionStorage.getItem('soren_intro_seen')`. If true, add class `preloader-bypassed` to skip animation immediately.
If false, set flag upon animation completion or on first touch/click event.

- [ ] **Step 3: Update CSS for bypassed preloader**
Add `.soren-preloader.preloader-bypassed { display: none !important; }` in `frontend/css/style.css`.

- [ ] **Step 4: Verify cart store and session cache in DevTools**
Run in console:
`SorenCartStore.addItem({ id: 'espresso', name: 'اسپرسو دبل', price: 95000, quantity: 1 });`
Verify `localStorage` stores the item and `soren:cart-changed` fires. Refresh page to verify preloader is bypassed.

- [ ] **Step 5: Commit**
```bash
git add frontend/main.js frontend/css/style.css
git commit -m "feat(store): implement SorenCartStore with localStorage sync and session-cached intro"
```

---

### Task 3: Minimalist Mobile Top Bar & Off-Canvas Drawer

**Files:**
- Modify: `frontend/index.html: header section`
- Modify: `frontend/css/style.css: header and drawer rules`
- Modify: `frontend/main.js: drawer toggle logic`

**Interfaces:**
- Consumes: Mobile menu button, header actions
- Produces: Clean sticky top bar on screens `< 768px`, slide-in off-canvas drawer with cafe information.

- [ ] **Step 1: Add drawer markup to `frontend/index.html`**
Add `.soren-drawer-backdrop` and `.soren-offcanvas-drawer` containing: cafe story link, barista live status indicator, working hours (ساعات کاری: ۸:۰۰ الی ۲۳:۳۰), phone, and Instagram.

- [ ] **Step 2: Add styles for minimal top bar and off-canvas drawer**
Style drawer with `transform: translateX(100%)`, `transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)`, `backdrop-filter: blur(12px)`. In mobile media query, streamline header to logo (36px) and 2 touch-friendly buttons.

- [ ] **Step 3: Add drawer toggle handler in `frontend/main.js`**
Support open, close button, backdrop click, and Escape key dismissal with body scroll lock.

- [ ] **Step 4: Verify mobile header and drawer behavior**
Test at 375px viewport: toggle drawer, ensure smooth open/close, no horizontal layout shift, body doesn't scroll when drawer is open.

- [ ] **Step 5: Commit**
```bash
git add frontend/index.html frontend/css/style.css frontend/main.js
git commit -m "feat(mobile): implement minimal top bar and off-canvas drawer"
```

---

### Task 4: Bottom Navigation Bar with Smart Auto-Hide (Thumb Zone)

**Files:**
- Modify: `frontend/index.html: body end`
- Modify: `frontend/css/style.css: bottom nav styles`
- Modify: `frontend/main.js: scroll tracking & badge sync`

**Interfaces:**
- Consumes: `SorenCartStore` `soren:cart-changed` events, `window` scroll events
- Produces: Persistent bottom bar with 4 tabs (`#home`, `#menu`, `#cart-sheet`, `login.html`), dynamic badge counter, smart headroom auto-hide.

- [ ] **Step 1: Add `.mobile-bottom-nav` markup to `frontend/index.html`**
Add navigation container with 4 semantic items:
1. Home (SVG icon + "خانه")
2. Menu (SVG icon + "منو")
3. Cart (SVG icon + "سبد" + `.cart-badge`)
4. Account (SVG icon + "حساب")

- [ ] **Step 2: Add CSS for Bottom Nav & Smart Auto-Hide in `frontend/css/style.css`**
Fixed at bottom with `env(safe-area-inset-bottom)`.
`.mobile-bottom-nav.nav-hidden { transform: translateY(calc(100% + 20px)); }`
Smooth transition: `transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)`.

- [ ] **Step 3: Implement scroll headroom and cart badge listeners in `frontend/main.js`**
Track `lastScrollY`: when `currentScrollY - lastScrollY > 15`, add `.nav-hidden`. When scrolling up, remove `.nav-hidden`.
Listen to `soren:cart-changed` to update `.cart-badge` text and trigger scale pulse.

- [ ] **Step 4: Verify Bottom Nav on mobile view**
Scroll down: bar hides smoothly. Scroll up: bar immediately appears. Add item to cart: badge updates to 1 with bounce animation.

- [ ] **Step 5: Commit**
```bash
git add frontend/index.html frontend/css/style.css frontend/main.js
git commit -m "feat(mobile): add bottom navigation bar with smart auto-hide and cart badge"
```

---

### Task 5: Single-Surface Catalog with Sticky Category Chips & 2-Column Touch Cards

**Files:**
- Modify: `frontend/index.html: products section`
- Modify: `frontend/css/style.css: sticky chips and product cards`
- Modify: `frontend/main.js: catalog filtering, steppers & haptics`

**Interfaces:**
- Consumes: `SorenCartStore`, browser `history.pushState`, `navigator.vibrate`
- Produces: Instant filtering without page reload, interactive stepper on cards (`+ / count / -`), tactile scale and haptic feedback.

- [ ] **Step 1: Add Sticky Category Chips markup to `frontend/index.html`**
Add `<nav class="category-chips-bar" id="category-chips">` with chips: "همه (۱۸)", "☕ قهوه‌ها", "🥤 شیک‌ها", "🍰 کیک و دسر".

- [ ] **Step 2: Add CSS for horizontal scrollable chips and 2-column mobile card grid**
Chips: `position: sticky; top: 56px; overflow-x: auto; scrollbar-width: none;`.
Mobile card grid: `grid-template-columns: repeat(2, 1fr); gap: 12px;`.
Touch micro-interaction: `.chip:active, .card-add-btn:active { transform: scale(0.92); }`.

- [ ] **Step 3: Implement instant filtering, stepper buttons, and haptics in `frontend/main.js`**
Filter cards based on `data-category` attribute.
Sync with `history.pushState(null, '', '#menu?cat=' + category)`.
If item is in cart, show stepper `[- qty +]`. Tapping vibrates for 10ms via `navigator.vibrate(10)`.

- [ ] **Step 4: Verify catalog filtering and stepper on mobile**
Tap "قهوه‌ها": only coffee cards display. Tap "+": item is added to `SorenCartStore`, button becomes stepper showing "۱", bottom badge updates.

- [ ] **Step 5: Commit**
```bash
git add frontend/index.html frontend/css/style.css frontend/main.js
git commit -m "feat(mobile): implement sticky category chips, 2-column cards with stepper and haptics"
```

---

### Task 6: Floating Order Bar & Interactive Cart Bottom Sheet Drawer

**Files:**
- Modify: `frontend/index.html: cart sheet container`
- Modify: `frontend/css/style.css: bottom sheet styles`
- Modify: `frontend/main.js: bottom sheet gestures & checkout flow`

**Interfaces:**
- Consumes: `SorenCartStore`, `window.visualViewport`
- Produces: Floating Order Bar when `totalCount > 0`, swipeable Cart Bottom Sheet with quantity adjustment, note field, and instant checkout.

- [ ] **Step 1: Add Floating Order Bar & Bottom Sheet markup in `frontend/index.html`**
Add `#floating-order-bar` and `#cart-bottom-sheet` with drag handle, item list container, order note textarea, price summary, and checkout button.

- [ ] **Step 2: Add CSS for Bottom Sheet & Floating Bar in `frontend/css/style.css`**
Floating bar above bottom nav.
Bottom sheet: `max-height: 85dvh; border-radius: 24px 24px 0 0; transform: translateY(100%); transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);`.

- [ ] **Step 3: Implement touch drag-to-dismiss, sheet rendering, and viewport handling in `frontend/main.js`**
Swipe down on drag handle to dismiss.
Listen to `soren:cart-changed` to re-render items inside sheet.
Adjust height on `window.visualViewport` resize (when virtual keyboard opens).

- [ ] **Step 4: Verify Bottom Sheet end-to-end**
Add 2 items: floating order bar appears with total. Tap order bar: bottom sheet smoothly slides up. Increase quantity: total updates immediately. Swipe down: sheet closes smoothly.

- [ ] **Step 5: Commit**
```bash
git add frontend/index.html frontend/css/style.css frontend/main.js
git commit -m "feat(mobile): add floating order bar and interactive cart bottom sheet"
```

---

### Task 7: Multi-Device Responsive Polish, Verification & Standalone Pages Check

**Files:**
- Modify: `frontend/css/style.css: subpages responsive tweaks`
- Verify: `frontend/pages/coffee.html`, `shakes.html`, `cake.html`, `cart.html`, `login.html`

**Interfaces:**
- Consumes: All components from Tasks 1-6
- Produces: Zero horizontal overflow, seamless standalone subpages, validated PWA experience.

- [ ] **Step 1: Check and tune standalone subpages (`cart.html`, `login.html`, category pages)**
Ensure standalone pages inherit the mobile tokens and cart store correctly.

- [ ] **Step 2: Verify zero horizontal overflow on small screens**
Run check at 320px, 360px, 390px, 412px, 768px.
Check `document.documentElement.scrollWidth <= window.innerWidth`.

- [ ] **Step 3: Final performance and interaction review**
Ensure 60fps smooth scrolling, clean keyboard dismissals, and no console errors.

- [ ] **Step 4: Commit**
```bash
git add frontend/
git commit -m "chore(mobile): polish responsive subpages and complete mobile overhaul verification"
```
