# Mobile Phone Sizing & Academic Demo Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix small card sizing on mobile phone ratio by adopting portrait `4 / 5` cards, and replace the redundant sitemap footer with a high-craft academic demo hospitality footer featuring live status, quick call/map actions, and verified responsive zero-overflow.

**Architecture:** Native CSS flex/grid layout updates within existing mobile media queries (`<= 640px`) and semantic HTML5 footer refactor. Follows `/unslop` (no duplicate sitemaps, quiet chrome), `/emil-design-eng` (tactile press states, intentional scale), and `/ui-ux-pro-max` (44px touch targets, safe area spacing).

**Tech Stack:** HTML5, CSS3, Vanilla JS, Headless Chrome CDP testing harness.

**Spec:** `docs/superpowers/specs/2026-11-02-mobile-scale-and-footer-unslop-design.md`

## Global Constraints
- Desktop and tablet viewports (> 640px) must retain their existing high-quality layouts without regression.
- No external npm packages or UI frameworks.
- Zero horizontal overflow across all viewports (320px to 1280px).
- All 48 tests in `verify-responsive.mjs` must pass.
- Category carousel swipe and catalog sync in `verify-category-carousel-sync.mjs` must remain 100% operational.

## Review Focus
- Category card height on 390px viewport: must be >= 340px (not ~195px).
- Quick call button: must have valid `tel:` URI.
- Map button: must have valid external map link with `rel="noopener noreferrer"`.
- Bottom safe area: must reserve space above the sticky bottom navigation bar so no text or button is obscured.
- Touch feedback: buttons must provide `:active` scale response.

---

### Task 1: Mobile Category Card Scale & Portrait Proportions (CSS)

**Files:**
- Modify: `frontend/css/style.css:9220-9265`
- Test: `scripts/verify-mobile-scale-and-footer.mjs`

**Interfaces:**
- Consumes: `.category-card`, `.category-content`, `.category-button`.
- Produces: Immersive `4 / 5` aspect ratio cards with >= 340px height and responsive press state on mobile.

- [ ] **Step 1: Write test in `scripts/verify-mobile-scale-and-footer.mjs`**
Verify that on a 390x844 viewport:
1. `.category-card` computed aspect-ratio or height is >= 340px.
2. `.category-content h3` has `font-size >= 23px`.
3. `.category-button` has active feedback.

- [ ] **Step 2: Run test to verify it fails**
Run: `node scripts/verify-mobile-scale-and-footer.mjs`
Expected: FAIL on aspect-ratio/height check (currently ~195px).

- [ ] **Step 3: Update `frontend/css/style.css`**
Update `.category-card` to `aspect-ratio: 4 / 5 !important; min-height: 350px !important;` on mobile (`<= 640px`). Enhance title and paragraph sizes.

- [ ] **Step 4: Run test to verify it passes**
Run: `node scripts/verify-mobile-scale-and-footer.mjs`
Expected: PASS Task 1 assertions.

- [ ] **Step 5: Commit**
`git add frontend/css/style.css scripts/verify-mobile-scale-and-footer.mjs`
`git commit -m "style(mobile): upgrade category cards to 4:5 portrait proportions"`

---

### Task 2: Academic Demo Hospitality Footer (HTML)

**Files:**
- Modify: `frontend/index.html` (footer element)
- Test: `scripts/verify-mobile-scale-and-footer.mjs`

**Interfaces:**
- Consumes: `<footer>` element.
- Produces: Live status badge, quick action buttons (`tel:`, map), social handles, academic demo attribution; removes duplicate sitemap links.

- [ ] **Step 1: Add HTML assertions to `scripts/verify-mobile-scale-and-footer.mjs`**
Verify:
1. `.footer-live-status` exists with text indicating cafe is open.
2. Quick action buttons exist with `tel:` and map link.
3. No redundant `.footer-col` sitemap links for `خانه` or `منوی کافه`.

- [ ] **Step 2: Run test to verify it fails**
Run: `node scripts/verify-mobile-scale-and-footer.mjs`
Expected: FAIL on `.footer-live-status` not found.

- [ ] **Step 3: Update `frontend/index.html`**
Refactor `<footer>` to include the hospitality card structure and remove redundant sitemap links.

- [ ] **Step 4: Run test to verify it passes**
Run: `node scripts/verify-mobile-scale-and-footer.mjs`
Expected: PASS Task 2 assertions.

- [ ] **Step 5: Commit**
`git add frontend/index.html scripts/verify-mobile-scale-and-footer.mjs`
`git commit -m "feat(footer): add hospitality card with live status and quick actions"`

---

### Task 3: Hospitality Footer Styling & End-to-End Responsive Verification (CSS & Tests)

**Files:**
- Modify: `frontend/css/style.css`
- Test: `scripts/verify-mobile-scale-and-footer.mjs`, `scripts/verify-responsive.mjs`, `scripts/verify-category-carousel-sync.mjs`

**Interfaces:**
- Consumes: New footer HTML classes.
- Produces: Polished dark warm palette styling, emerald pulsing live indicator, tactile 44px buttons, zero overflow.

- [ ] **Step 1: Add styling assertions to `scripts/verify-mobile-scale-and-footer.mjs`**
Verify button heights >= 44px, safe area padding at footer bottom, zero horizontal scroll.

- [ ] **Step 2: Run test to verify it fails**
Run: `node scripts/verify-mobile-scale-and-footer.mjs`
Expected: FAIL on styling assertions.

- [ ] **Step 3: Update `frontend/css/style.css`**
Add styles for `.footer-hospitality`, `.footer-live-status`, `.status-indicator`, `.footer-action-btn`, `.footer-social-pill`.

- [ ] **Step 4: Run all verification test suites**
Run:
1. `node scripts/verify-mobile-scale-and-footer.mjs`
2. `node scripts/verify-category-carousel-sync.mjs`
3. `node scripts/verify-responsive.mjs`
Expected: ALL PASS with 0px overflow across all viewports.

- [ ] **Step 5: Commit**
`git add frontend/css/style.css scripts/verify-mobile-scale-and-footer.mjs`
`git commit -m "style(footer): style hospitality card and verify responsive design"`
