# Artisanal Frontend Architecture & Drink Customizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the specialty café artisanal frontend overhaul for Soren Café, including the iOS-style dynamic drink customization bottom sheet with live digit-flip price reaction, contextual cart upsell shelf, sticky category scroll-spy, dual-font luxury typography, hand-stamped price badges, and high-contrast outdoor terrace styling.

**Architecture:** A zero-dependency vanilla JS and native CSS architecture integrating modular components (`DrinkCustomizerModal`, `CartUpsellShelf`, `CategoryScrollSpy`, `TerraceTokens`) directly into `frontend/index.html`, `frontend/css/style.css`, and `frontend/main.js`. All state flows through the existing `SorenCartStore` and persists to `localStorage`.

**Tech Stack:** Vanilla JavaScript (ES6+), Native CSS3 (CSS Variables, Flexbox/Grid, Backdrop Filter, CSS Keyframe Animations), Semantic HTML5.

**Spec:** [`docs/superpowers/specs/2026-10-22-frontend-artisanal-architecture-design.md`](file:///d:/projects/soren-cafe/docs/superpowers/specs/2026-10-22-frontend-artisanal-architecture-design.md)

---

## File Map & Responsibilities

* `frontend/css/style.css`:
  * Outdoor terrace glare high-contrast tokens (`--terrace-text: #1C130D`, `--ceramic-bg: #FAF7F2`, `--ceramic-warm: #F4ECE1`).
  * Hand-stamped price badges and secondary origin tasting notes styling.
  * iOS-style Drink Customizer Bottom Sheet (`#drink-customizer-sheet`) with blurred backdrop (`blur(12px)`), drag handle, modifier chips, and radio pills.
  * Price digit-flip animation (`.price-digit-flip`).
  * In-cart custom recipe tags (`.cart-item-recipe-tags`, `.recipe-tag`, `.dietary-tag`).
  * Contextual upsell shelf styling (`.cart-upsell-shelf`).
  * Floating persistent order pill pulse animation (`.order-pill-pulse`).

* `frontend/index.html`:
  * Product cards enhanced with "سفارشی‌سازی" (Customize) tap target, tasting notes, and hand-stamped price badges.
  * Markup for `#drink-customizer-backdrop` and `#drink-customizer-sheet`.
  * Placement anchor for `#cart-upsell-shelf` in the Cart Bottom Sheet.

* `frontend/main.js`:
  * `DrinkCustomizerModal`: Drink archetype schema, touch drag-to-dismiss gesture, live price calculator with digit-flip animation, structured customization payload formatting.
  * `renderCartBottomSheet`: In-cart recipe tags rendering, contextual upsell shelf rendering with 1-tap add.
  * `initSingleSurfaceCatalog`: Sticky category chips `IntersectionObserver` scroll-spy, hybrid card interaction (tap card/customize to open sheet, tap `+` for instant stepper with haptics).
  * `syncFloatingOrderBar`: Spring pulse and haptics trigger on cart updates.

---

## Tasks

### Task 1: High-Contrast Design Tokens, Typography & Price Badge Styling in CSS
- [ ] Add terrace glare tokens (`--terrace-text`, `--ceramic-bg`, `--tag-border`) and typography utilities to `frontend/css/style.css`.
- [ ] Add CSS styling for hand-stamped price tags and secondary origin tasting notes.
- [ ] Add CSS for `#drink-customizer-sheet`, `#drink-customizer-backdrop`, modifier option groups, and dietary badges.
- [ ] Add CSS keyframe animations for digit-flip (`.digit-flip-up`) and order pill pulse (`.order-pill-pulse`).
- [ ] Add CSS for `.cart-item-recipe-tags`, `.recipe-tag`, and `.cart-upsell-shelf`.
- [ ] Verify CSS syntax and rules.
- [ ] Commit changes.

### Task 2: HTML Enhancements for Product Cards & Modal Templates in `index.html`
- [ ] Add secondary tasting notes, hand-stamped badges, and "سفارشی‌سازی" buttons to coffee cards in `frontend/index.html`.
- [ ] Add HTML structure for `#drink-customizer-backdrop` and `#drink-customizer-sheet` with drag handle, dynamic body container, and live price CTA.
- [ ] Add container for `#cart-upsell-shelf` within `#cart-bottom-sheet`.
- [ ] Verify HTML validity and structure.
- [ ] Commit changes.

### Task 3: Drink Customizer Modal Engine & Live Number-Flip Logic in `main.js`
- [ ] Define drink archetypes (Milk-Based Hot Coffee, Black Coffee, Iced Drinks, Shakes) with modifier definitions and prices in `frontend/main.js`.
- [ ] Implement `openDrinkCustomizer(productId)` and `closeDrinkCustomizer()`.
- [ ] Implement drag-to-dismiss gesture handling for the customizer sheet.
- [ ] Implement real-time price calculation and digit-flip animation when modifier chips change.
- [ ] Implement add-to-cart logic that bundles customizations and `barista_summary` into `SorenCartStore`.
- [ ] Commit changes.

### Task 4: In-Cart Recipe Tags & Contextual Upsell Shelf in `main.js`
- [ ] Update `renderCartBottomSheet(items)` to display `.cart-item-recipe-tags` under customized items.
- [ ] Implement `renderCartUpsellShelf()`: detect coffee items in cart and display the Basque Cheesecake upsell row with a 1-tap `+ افزودن` button.
- [ ] Wire 1-tap add to seamlessly add the cheesecake without closing or jumping the cart sheet.
- [ ] Commit changes.

### Task 5: Sticky Category Scroll-Spy & Floating Pill Pulse Polish
- [ ] Upgrade category bar to use `IntersectionObserver` across category targets for scroll-spy highlighting.
- [ ] Ensure smooth scrolling on chip tap with proper sticky header offset.
- [ ] Add subtle spring pulse animation and haptics (`navigator.vibrate(12)`) to `#floating-order-bar` when items are added.
- [ ] Commit changes.

### Task 6: End-to-End Verification & Responsive Testing
- [ ] Run responsive tests and browser checks.
- [ ] Verify touch interactions, drag gestures, modifier calculations, upsell shelf, and localStorage persistence.
- [ ] Ensure zero console errors and clean FCP performance.
- [ ] Commit and finalize.
