# Mobile Landing Page & Menu Detail Unslopping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the mobile landing page and product catalog of Soren Café (`soren-cafe`) on phone aspect ratio using the `/unslop` discipline—stripping out AI/commercial e-commerce cliches (muddy dark card backgrounds on light canvas, screaming discount badges, fake strikethrough prices, raw emojis) and implementing an interactive **Artisanal Menu Detail Bottom Sheet** for inspecting coffee terroir, extraction parameters, and tasting notes.

**Architecture:** Vanilla HTML5, modern CSS3 (with CSS variables and custom bezier easings), and Vanilla ES6+ JavaScript. All product metadata synchronizes with `PRODUCT_CATALOG` and persists through `SorenCartStore` in `localStorage`.

**Tech Stack:** Vanilla JavaScript (ES6+), Native CSS3, Semantic HTML5, Chrome DevTools Protocol / Headless Chrome.

---

## 1. The 5-Line Direction

* **Product:** Digital specialty coffee catalog and in-table ordering engine for discerning café patrons.
* **Character:** Calm, architectural, quiet craft.
* **World:** Warm travertine, textured ivory linen, dark roasted basalt, and amber crema.
* **Moments:**
  1. Luminous artisanal catalog cards on phone viewports with authentic roast tags and clean tabular prices.
  2. The interactive **Menu Detail Bottom Sheet** on smartphone viewports—revealing terroir, extraction method, brew temperature, and 1-tap addition.
* **Signature:** The live barista status indicator with clean microsecond telemetry and physical haptic feedback (`navigator.vibrate`).

---

## 2. File Map & Responsibilities

* `frontend/index.html`:
  * Remove hero pill badge and template glow blobs.
  * Replace drawer navigation emojis (`☕`, `✦`, `📋`) with unified 1.8-stroke SVG line icons.
  * Replace footer emoji (`♥`) with quiet artisanal glyph (`✦`).
  * Remove commercial discount pills (`۲۱٪ تخفیف`) and strikethrough prices (`<del>...<del>`) from catalog cards; replace with authentic provenance tags.
  * Inject markup for `#menu-detail-backdrop` and `#menu-detail-sheet`.

* `frontend/css/style.css`:
  * Mobile `.featured-card`: Replace harsh `#2e2621` dark background with crisp `#ffffff` card surface, warm hairline border (`rgba(140, 94, 60, 0.14)`), and subtle ambient shadow.
  * Strict 4px spacing scale: 16px page gutters, 12px card gap, 12px internal card padding, 48px touch targets.
  * Style the **Menu Detail Bottom Sheet** (`.menu-detail-sheet`, `.menu-detail-backdrop`, drag handle, visual frame, specs grid, action button).
  * Ensure one-shot spring ease curve on floating order bar; remove indefinite pulse loops.

* `frontend/main.js`:
  * Implement `SorenMenuDetail` engine:
    * Card click delegation (open sheet on card tap without intercepting stepper `+`/`-`).
    * Dynamic detail rendering (visual, title, category, tabular price, roast terroir, brew method, temperature, flavor notes).
    * Single-tap add-to-cart with haptic feedback (`navigator.vibrate(14)`) and audio click.
    * Smooth touch drag-to-dismiss, backdrop tap, close button, and Escape key listeners.

---

## 3. Implementation Tasks

### Task 1: Navigation, Icons & Hero Chrome Unslopping
**Files:** `frontend/index.html`
- [ ] In `#soren-offcanvas-drawer`, replace the three raw emojis (`☕`, `✦`, `📋`) with clean 1.8-stroke SVG line icons (cup, origin star, catalog ledger).
- [ ] In `#site-footer`, replace the unicode heart `<span aria-hidden="true">♥</span>` with a subtle geometric brand glyph `<span aria-hidden="true">✦</span>`.
- [ ] In `#home` (Hero), refine the badge into a quiet editorial eyebrow and ensure no decorative glow blobs linger.
- [ ] Verify HTML structure and syntax.

### Task 2: Catalog Cards Content & Pricing Reset (Eliminate Promo Slop)
**Files:** `frontend/index.html`
- [ ] Remove all 6 occurrences of `<del>... تومان</del>` across the catalog cards.
- [ ] Remove commercial discount badges (`۲۱٪ تخفیف`, `۱۵٪ تخفیف`, `۱۰٪ تخفیف`, `۱۷٪ تخفیف`, `۱۲٪ تخفیف`).
- [ ] Replace with authentic specialty coffee & bakery provenance tags:
  - Espresso Double: `عصاره‌گیری ۹ بار`
  - Cappuccino: `میکروفوم مخملی`
  - Nutella Shake: `فندق بو داده`
  - Strawberry Shake: `توت فرنگی تازه`
  - Basque Cheesecake: `امضای قنادی`
  - Carrot Cake: `گردوی تازه`
- [ ] Verify clean single prices on all 18 product cards.

### Task 3: Mobile Card Surface & Spacing Refactor (CSS 4px Grid)
**Files:** `frontend/css/style.css`
- [ ] Under `@media (max-width: 640px)`:
  - Override `.featured-card` background from `#2e2621 !important` to `#ffffff !important` (pure white surface against ivory linen background).
  - Add border: `1px solid rgba(140, 94, 60, 0.14) !important`.
  - Add shadow: `0 4px 16px -2px rgba(36, 33, 32, 0.05) !important`.
  - Update image frame background to `#f7f4ee !important`.
  - Update card text colors: title to `#242120 !important`, category to `#795239 !important`, price to `#242120 !important`.
  - Style `.featured-top span` with subtle frosted pill tags (`rgba(247, 244, 238, 0.94)` with warm bronze borders).
- [ ] Lock margins, paddings, and gaps to the 4px scale.

### Task 4: Menu Detail Bottom Sheet (Markup & Styling)
**Files:** `frontend/index.html`, `frontend/css/style.css`
- [ ] Inject `#menu-detail-backdrop` and `#menu-detail-sheet` into `frontend/index.html` above the mobile bottom nav.
- [ ] Add CSS styling in `frontend/css/style.css`:
  - Backdrop with `blur(5px)` and opacity transition.
  - Sheet container with rounded top corners (28px radius), box shadow, and spring slide-up transform (`translateY(105%)` to `translateY(0)`).
  - Drag handle zone (`.sheet-drag-handle-zone`) with 40x4px handle bar.
  - Detail visual box with aspect ratio 16:10.
  - Specs grid (`.detail-specs-grid`) showing 2-column key-value metrics (Terroir, Brew method, Temperature, Extraction).
  - Full-width CTA button (`.detail-add-btn`) with active press state.

### Task 5: Menu Detail Bottom Sheet Interactive Engine
**Files:** `frontend/main.js`
- [ ] Create `SorenMenuDetail` module in `frontend/main.js`.
- [ ] Implement card tap listener on `.featured-card` and `.product-card` that opens the sheet while ignoring clicks on `.card-action-box` or steppers.
- [ ] Implement `open(id)`: pulls data from `PRODUCT_CATALOG` or card datasets, generates rich specifications, and renders dynamic sheet content.
- [ ] Wire the "افزودن به سبد خرید" button inside the sheet to invoke `SorenCartStore.addItem()` with haptic feedback (`navigator.vibrate(14)`).
- [ ] Implement `close()` via backdrop click, close button, touch drag gesture, or Escape key.

### Task 6: Comprehensive Verification & Quality Gates
**Files:** CLI / Scripts
- [ ] Run `node scripts/verify-responsive.mjs` to verify zero horizontal overflow across 6 mobile & desktop viewports (320px, 360px, 390px, 412px, 768px, 1280px).
- [ ] Run `node scripts/verify-stepper-and-upsell.mjs` to ensure cart operations, in-card steppers, and upsell shelf work cleanly.
- [ ] Confirm no regressions across the application.
