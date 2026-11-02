# Research & Architectural Decisions: Mobile Landing Page & Menu Detail Unslopping

**Feature Branch**: `001-mobile-menu-detail`  
**Date**: 2026-11-02  
**Status**: Completed  

---

## 1. Bottom Sheet Architecture & Motion Physics

### Decision
Implement `#menu-detail-sheet` as a pure CSS-driven fixed bottom sheet container accompanied by an `#menu-detail-backdrop` overlay with `-webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px)`. Dismissal is driven by touch drag gesture events (`touchstart`, `touchmove`, `touchend`), backdrop clicks, close button tap, and keyboard `Escape`. Transitions utilize custom spring easing `cubic-bezier(0.32, 0.72, 0, 1)`.

### Rationale
- Zero third-party library dependencies (adheres to Constitution Principle I).
- Spring-like bezier curve matches native iOS bottom sheets and modern Android bottom sheets.
- `transform: translateY(105%)` off-screen keeps the DOM in the render tree without causing reflows during open/close animations.
- Capping sheet height to `max-height: 85vh` with `overflow-y: auto` and `-webkit-overflow-scrolling: touch` prevents clipping on compact 320px screens (iPhone SE).

### Alternatives Considered
- `<dialog>` HTML element with `showModal()`: Rejected because native dialog backdrop styling and bottom-sheet touch drag-to-dismiss behavior across mobile Safari and Android WebViews require complex polyfilling.
- Third-party drawer libraries (e.g., Vaul or Hammer.js): Rejected due to Constitution Principle I (Zero JS Bloat).

---

## 2. Event Delegation & Stepper Click Isolation

### Decision
Delegate click handling on the `.featured-grid` / `.featured-card` container. Check `event.target.closest('.card-action-box, .card-stepper, .card-add-btn')`. If present, immediately return and allow the existing instant stepper logic to handle the event. Only if the click originates outside the action box does `SorenMenuDetail.open(productId)` trigger.

### Rationale
- Eliminates accidental sheet launches when patrons rapidly tap `+` or `−` to adjust drink quantities directly on the card.
- Single root event listener keeps memory footprint minimal and automatically handles dynamic catalog rendering.

### Alternatives Considered
- `stopPropagation()` on `.card-stepper` buttons: Fragile because event bubbling may be intercepted before reaching the document or other analytical listeners.

---

## 3. High-Contrast Artisanal Mobile Card Surfaces

### Decision
Refactor mobile `.featured-card` under `@media (max-width: 640px)` from the harsh dark `#2e2621` block to a crisp `#ffffff` card surface on the `#f7f4ee` ivory linen page background. Add a warm bronze hairline border (`1px solid rgba(140, 94, 60, 0.14)`) and subtle ambient elevation shadow (`0 4px 16px -2px rgba(36, 33, 32, 0.05)`).

### Rationale
- Replaces muddy AI-generated e-commerce styling with a quiet, architectural Mediterranean aesthetic.
- Dramatically increases legibility and contrast under outdoor terrace lighting conditions (satisfying Constitution Principle I & Quality Standards).

### Alternatives Considered
- Retaining dark cards: Fails visual contrast on mobile daylight browsing and contradicts the editorial ivory aesthetic.

---

## 4. Typography & Tabular Numerals

### Decision
Enforce `font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1;` on all product price elements (`.product-price`, `.detail-price`, `.cart-total`). Replace all 6 commercial discount percentage tags (`۲۱٪ تخفیف`) and strikethrough prices (`<del>`) with authentic provenance tags (e.g., `عصاره‌گیری ۹ بار`, `میکروفوم مخملی`).

### Rationale
- Tabular numerals ensure prices have identical character widths, preventing horizontal layout jank during live cart recalculations.
- Eliminating fake discounts aligns with luxury specialty café positioning and patron trust.

### Alternatives Considered
- Formatted Persian numbers without tabular settings: Causes subtle jumping/layout shifts when quantities increment.

---

## 5. Haptic Feedback & Auto-Dismiss Timing

### Decision
Trigger physical haptic vibration (`navigator.vibrate(14)`) and brief visual confirmation (`افزوده شد!`) on the 48px touch CTA button upon adding an item to `SorenCartStore`, followed by automatic sheet dismissal after 400ms.

### Rationale
- User clarification session 2026-11-02 resolved that 400ms provides sufficient confirmation feedback while swiftly returning the patron to their previous browsing position.
- Protects against ghost clicks and keeps the catalog interaction seamless.

### Alternatives Considered
- Sheet remaining open indefinitely: Requires redundant manual dismissal tap from patron, increasing friction.

---

## 6. Defensive 2-Column Mobile Card Layout & Title Clamping (FR-013)

### Decision
Enforce `-webkit-line-clamp: 2` on product card titles (`.featured-content h3` / `.product-title`) and descriptions within the mobile 2-column grid. Pin `.featured-footer` to the bottom of the card using `margin-top: auto` and `flex-direction: column` with `align-items: stretch`.

### Rationale
- In a 2-column layout on compact 320px–390px screens (~140px per card), varying title lengths cause cards in the same grid row to stretch unevenly.
- A 2-line clamp gives sufficient room for 99% of Persian specialty coffee names without clipping, while `margin-top: auto` guarantees that prices and "افزودن به سبد" / stepper buttons stay locked to the bottom in a clean horizontal baseline.

### Alternatives Considered
- Single-line truncation with ellipsis: Truncates informative specialty names prematurely.
- Unconstrained fluid growth: Produces jagged, misaligned rows where action buttons zig-zag vertically.

---

## 7. Single Priority Provenance Badge Policy (FR-016)

### Decision
Render strictly 1 priority badge in `.featured-top` (e.g., `عصاره‌گیری ۹ بار` or `ناموجود در شیفت`) on mobile cards. Restrict all secondary terroir, process, and dietary notes to the Menu Detail Bottom Sheet.

### Rationale
- On ~140px wide mobile cards, stacking multiple tags covers >50% of the product photography, degrading appetite appeal and visual elegance.
- 1 badge preserves photography clarity while leaving deep details for the detail bottom sheet.

---

## 8. Offline & Image Error Fallback Architecture (FR-017)

### Decision
Attach an inline `onerror` fallback handler to all catalog `<img>` tags (`this.onerror=null; this.src='...';`). When an image asset fails to load (offline or 404), replace it with a warm neutral textured container displaying the Soren coffee emblem SVG (`✦`), maintaining identical card aspect ratios.

### Rationale
- Prevents raw browser broken-image icons and unsightly alt text overflow.
- Avoids Cumulative Layout Shift (CLS) during poor cellular reception at outdoor terrace tables.
