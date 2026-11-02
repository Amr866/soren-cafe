# Synchronized Focused Category Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a focused, 1-card-at-a-time mobile category carousel with pagination dots that synchronizes in real-time with the menu catalog filter below.

**Architecture:** Use native CSS `scroll-snap` for 60fps touch momentum on mobile screens, paired with an `IntersectionObserver` in vanilla JavaScript that updates pagination dots and triggers `setCategory()` on the catalog below.

**Tech Stack:** HTML5, CSS3 (CSS Scroll Snap, Flexbox/Grid), Vanilla JavaScript (ES2022, IntersectionObserver), Node.js CDP test harness.

**Spec:** `docs/superpowers/specs/2026-11-02-category-carousel-sync-design.md`

## Global Constraints
- Desktop and tablet viewports (> 640px) must retain the original 3-column category grid.
- Zero external libraries or NPM slider packages.
- All touch targets must satisfy minimum 44px ergonomics or appropriate tap padding.
- Persian RTL swipe orientation must be respected (`dir="rtl"`).

## Review Focus
- Fast swiping between cards must not cause erratic flashing or infinite scroll loops.
- Tapping a dot must smoothly scroll the carousel to the corresponding card.
- Changing categories from the sticky chips below must not trigger a conflicting reverse scroll event.
- 320px viewport must not have horizontal scrollbar leakage outside the carousel container.
- All 48 responsive tests in `verify-responsive.mjs` must continue to pass with 0px overflow.

---

### Task 1: Add HTML Structure for Carousel Dots and Category Attributes

**Files:**
- Modify: `frontend/index.html:459-525`
- Test: `scripts/verify-category-carousel-sync.mjs`

**Interfaces:**
- Consumes: Existing `.category-card` elements in `#categories-overview`.
- Produces: `data-category` attributes on each card and `<div class="category-carousel-dots" id="category-dots">` containing 3 button dots.

- [ ] **Step 1: Write the failing test in `scripts/verify-category-carousel-sync.mjs`**
Test checks that:
1. `#category-dots` exists with 3 `.carousel-dot` buttons.
2. The 3 `.category-card` elements have `data-category="coffee"`, `data-category="shakes"`, `data-category="cake"`.

- [ ] **Step 2: Run test to verify it fails**
Run: `node scripts/verify-category-carousel-sync.mjs`
Expected: FAIL with "category-dots element not found".

- [ ] **Step 3: Update `frontend/index.html`**
Add `data-category` attributes to cards and insert `.category-carousel-dots` container.

- [ ] **Step 4: Run test to verify it passes**
Run: `node scripts/verify-category-carousel-sync.mjs`
Expected: PASS Task 1 assertions.

- [ ] **Step 5: Commit**
`git add frontend/index.html scripts/verify-category-carousel-sync.mjs`
`git commit -m "feat(carousel): add carousel dots and category attributes in index.html"`

---

### Task 2: Mobile CSS Scroll-Snap and Dots Styling

**Files:**
- Modify: `frontend/css/style.css` (mobile media query section <= 640px)
- Test: `scripts/verify-category-carousel-sync.mjs`

**Interfaces:**
- Consumes: `.categories-grid`, `.category-card`, `.category-carousel-dots`, `.carousel-dot`.
- Produces: Focused 100% width scroll-snap layout for `.category-card` on mobile and sleek terracotta animated dots.

- [ ] **Step 1: Add CSS verification assertions to test script**
Verify that on a 390px viewport:
1. `.categories-grid` has `scroll-snap-type: x mandatory`.
2. `.category-card` width is 100% of the visible container width.
3. `.category-carousel-dots` is displayed on mobile and hidden on desktop (> 640px).

- [ ] **Step 2: Run test to verify it fails**
Run: `node scripts/verify-category-carousel-sync.mjs`
Expected: FAIL on CSS scroll-snap properties.

- [ ] **Step 3: Update `frontend/css/style.css`**
Add mobile rules for full-width snap cards and terracotta dot styling with active expansion (`width: 22px`).

- [ ] **Step 4: Run test to verify it passes**
Run: `node scripts/verify-category-carousel-sync.mjs`
Expected: PASS Task 2 assertions.

- [ ] **Step 5: Commit**
`git add frontend/css/style.css`
`git commit -m "style(carousel): add mobile scroll-snap and animated dot indicators"`

---

### Task 3: JavaScript Synchronization Engine

**Files:**
- Modify: `frontend/main.js`
- Test: `scripts/verify-category-carousel-sync.mjs`

**Interfaces:**
- Consumes: `initSingleSurfaceCatalog()`'s `setCategory(cat, shouldPushState)` function.
- Produces: `initCategoryCarouselSync()` connecting scroll events, dot state, and catalog filtering.

- [ ] **Step 1: Add CDP interaction assertions to test script**
Emulate mobile touch scroll to Slide 2 (`shakes`), verify:
1. Second dot becomes active.
2. Catalog filter below switches to `shakes`.
3. Sticky chip for `shakes` receives `.active`.

- [ ] **Step 2: Run test to verify it fails**
Run: `node scripts/verify-category-carousel-sync.mjs`
Expected: FAIL (carousel does not yet synchronize catalog).

- [ ] **Step 3: Implement `initCategoryCarouselSync()` in `frontend/main.js`**
Use `IntersectionObserver` with threshold `0.65`. Update dots and invoke `setCategory(catId, false)`. Add click handlers on dots to scroll smoothly to cards.

- [ ] **Step 4: Run test to verify it passes**
Run: `node scripts/verify-category-carousel-sync.mjs`
Expected: PASS Task 3 assertions.

- [ ] **Step 5: Run full responsive test suite**
Run: `node scripts/verify-responsive.mjs`
Expected: 48/48 tests PASS with 0px overflow across all breakpoints.

- [ ] **Step 6: Commit**
`git add frontend/main.js`
`git commit -m "feat(carousel): synchronize mobile category carousel with catalog filter"`
