# Tasks: Mobile Landing Page & Menu Detail Unslopping

**Input**: Design documents from [`specs/001-mobile-menu-detail/`](file:///d:/projects/soren-cafe/specs/001-mobile-menu-detail)  
**Prerequisites**: [`plan.md`](file:///d:/projects/soren-cafe/specs/001-mobile-menu-detail/plan.md), [`spec.md`](file:///d:/projects/soren-cafe/specs/001-mobile-menu-detail/spec.md), [`research.md`](file:///d:/projects/soren-cafe/specs/001-mobile-menu-detail/research.md), [`data-model.md`](file:///d:/projects/soren-cafe/specs/001-mobile-menu-detail/data-model.md), [`contracts/menu-detail-ui-contract.md`](file:///d:/projects/soren-cafe/specs/001-mobile-menu-detail/contracts/menu-detail-ui-contract.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify clean workspace state and local dev server prerequisites

- [x] T001 Verify git working tree clean and local dev server running (`bun run dev`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core CSS tokens and tabular numeral utilities required by all stories

- [x] T002 Define mobile bottom sheet CSS variables, spring easing tokens, and tabular numeral utilities in `frontend/css/style.css`

---

## Phase 3: User Story 1 - Inspecting Specialty Coffee & Pastry Details on Phone (Priority: P1) 🎯 MVP

**Goal**: Deliver the interactive Menu Detail Bottom Sheet on phone viewports with roast terroir, extraction specs, tasting notes, and 1-tap add with 400ms auto-dismiss.

**Independent Test**: On a 390px mobile viewport, tap on "اسپرسو دبل" card outside steppers, confirm bottom sheet slides up with extraction specs in <50ms, tap "افزودن به سبد خرید", confirm item is added with haptics and auto-dismisses after 400ms.

- [x] T003 [US1] Inject semantic DOM markup for `#menu-detail-backdrop` and `#menu-detail-sheet` in `frontend/index.html` per `contracts/menu-detail-ui-contract.md`
- [x] T004 [US1] Style the Menu Detail Bottom Sheet container, backdrop blur (5px), drag handle, 2-column specs grid, and 48px touch CTA in `frontend/css/style.css`
- [x] T005 [US1] Implement `SorenMenuDetail` module in `frontend/main.js` with `open(productId)`, `close()`, touch drag-to-dismiss gesture, backdrop tap, and Escape key handlers
- [x] T006 [US1] Implement card tap delegation and stepper click isolation (`e.target.closest('.card-action-box, .card-stepper, .card-add-btn')`) in `frontend/main.js`
- [x] T007 [US1] Implement 1-tap add to `SorenCartStore` with haptic feedback (`navigator.vibrate(14)`), confirmation animation, and 400ms auto-dismiss in `frontend/main.js`
- [x] T008 [US1] Implement out-of-stock state handling (`isAvailable: false`) with disabled CTA and 'ناموجود در شیفت جاری' badge in `frontend/main.js`

**Checkpoint**: At this point, User Story 1 (the core artisanal detail bottom sheet) is fully functional and testable.

---

## Phase 4: User Story 2 - Clean, Unslopped Mobile Catalog Browsing (Priority: P2)

**Goal**: Eliminate AI/e-commerce slop (fake discount badges, `<del>` strikethrough prices, dark `#2e2621` mobile cards) and present clean, high-contrast white cards on ivory linen.

**Independent Test**: Audit all 18 product cards on a 360px mobile viewport: verify pure `#FFFFFF` card surfaces against `#F7F4EE` canvas, 0 strikethrough tags, single tabular prices, and authentic provenance tags (e.g. `عصاره‌گیری ۹ بار`).

- [x] T009 [P] [US2] Remove all 6 `<del>` strikethrough prices and percentage discount badges (`۲۱٪ تخفیف`, etc.) and replace with authentic provenance tags in `frontend/index.html`
- [x] T010 [P] [US2] Refactor mobile `.featured-card` styles under `@media (max-width: 640px)` to white `#ffffff` surface, warm hairline border, and 4px grid spacing in `frontend/css/style.css`
- [x] T011 [US2] Ensure all 18 product card prices apply Persian tabular numerals (`font-variant-numeric: tabular-nums`) in `frontend/css/style.css`

**Checkpoint**: User Stories 1 and 2 work seamlessly together, creating an uncluttered catalog browsing experience.

---

## Phase 5: User Story 3 - Calm Mobile Navigation & Clean Shell (Priority: P3)

**Goal**: Replace raw unicode emojis in drawer navigation and footer with cohesive 1.8-stroke SVG line icons and quiet brand typography.

**Independent Test**: Open mobile drawer `#soren-offcanvas-drawer`, confirm SVG line icons for menu/story/contact; inspect footer and hero for clean editorial typography without glowing blobs.

- [x] T012 [P] [US3] Replace raw drawer navigation emojis (`☕`, `✦`, `📋`) with 1.8-stroke SVG line icons in `frontend/index.html`
- [x] T013 [P] [US3] Replace footer emoji (`♥`) with geometric glyph (`✦`) and remove hero template glow blobs in `frontend/index.html`

---

## Phase 6: Polish & Verification

**Purpose**: Cross-cutting automated regression verification and multi-viewport validation.

- [x] T014 Run automated responsive layout verification across 6 viewports (320px–1280px) via `node scripts/verify-responsive.mjs`
- [x] T015 Run automated cart, stepper, and upsell flow verification via `node scripts/verify-stepper-and-upsell.mjs`

---

## Phase 7: Target 1 - Product Cards & Catalog Grid Defensive Hardening (Priority: P1) 🎯 Active Target

**Goal**: Stress-test and harden `.featured-card` and `.product-card` against extreme text lengths, large tabular figures, single-badge photography occlusion, and broken-image failure fallbacks on compact mobile viewports (320px–390px).

**Independent Test**: Inject worst-case product titles (>50 chars), 7-digit prices, multiple tags, and 404 image URLs on a 320px viewport; verify cards maintain straight horizontal row alignment with 0px overflow, title clamps cleanly at 2 lines, only 1 priority badge displays, and failed images render the elegant Soren emblem SVG.

- [x] T016 [US2/Target1] Implement 2-line title clamp (`-webkit-line-clamp: 2`) and 2-line description clamp on `.featured-content h3` and `.product-title` in `frontend/css/style.css` (FR-013)
- [x] T017 [US2/Target1] Pin card footer with `margin-top: auto` and configure flex alignment in `frontend/css/style.css` so action buttons and steppers maintain uniform horizontal baselines across grid rows (FR-013)
- [x] T018 [US2/Target1] Enforce single priority badge limit in `.featured-top` on mobile viewports to prevent covering product photography in `frontend/css/style.css` and `frontend/index.html` (FR-016)
- [x] T019 [US2/Target1] Implement graceful image load failure fallback (`onerror`) with neutral canvas and Soren coffee emblem SVG in `frontend/main.js` and `frontend/index.html` (FR-017)
- [x] T020 [US2/Target1] Create automated headless Chrome CDP verification script `scripts/verify-cards-defensive.mjs` and verify zero overflow, 2-line clamping, and zero-CLS image fallback across 320px, 360px, and 390px (SC-001, SC-003)

---

## Phase 8: Target 2 - Menu Detail Bottom Sheet Defensive Hardening (Priority: P1) 🎯 Active Target

**Goal**: Harden `.menu-detail-sheet` against extreme text lengths, narrow 320px viewports, short screen heights (<=550px), flex-collapse bugs, missing images, and ARIA accessibility desync.

**Independent Test**: Open Menu Detail Bottom Sheet with 115-char title, 125M Toman price, long 340-char tasting notes, and 404 broken image URL on 320px compact and 320x480 short viewports; verify 0px overflow, image renders luxury Soren emblem without collapsing, title and price stack cleanly on <=360px, tasting notes span full width, close button has >=44px hit target, and `aria-hidden` is properly synchronized.

- [x] T021 [US1/Target2] Fix flex-collapse on `.detail-visual-box` by setting `display: block` on `.menu-detail-sheet .sheet-body`, set `min-height: 140px; flex-shrink: 0`, and apply responsive compact sizing (`max-height: 120px; aspect-ratio: 16/7`) on short viewports (`@media (max-height: 550px)`) in `frontend/css/style.css` (FR-021)
- [x] T022 [US1/Target2] Implement fluid column stacking on `.detail-title-row` for narrow viewports (`@media (max-width: 360px)`) so long product titles take full width (clamped to max 3 lines) and price sits cleanly below with tabular Persian numerals in `frontend/css/style.css` (FR-019)
- [x] T023 [US1/Target2] Implement hybrid layout on `.detail-specs-grid` where "نت‌های چشایی" spans full width (`grid-column: 1 / -1`) below origin, method, and temperature in `frontend/css/style.css` (FR-020)
- [x] T024 [US1/Target2] Implement Soren emblem image load failure fallback (`onerror="window.handleImageError(this)"`) on `#menu-detail-img`, synchronize `aria-hidden` ("false" on open, "true" on close), ensure close button has 44x44px touch target, and hide `#break-ui-toggle` when sheet opens in `frontend/main.js` and `frontend/index.html` (FR-018, FR-021)
- [x] T025 [US1/Target2] Automate and verify Menu Detail Bottom Sheet defensive hardening across 320px, 360px, 390px, and 320x480 short viewports using headless Chrome CDP test script `scripts/verify-menu-detail-defensive.mjs` and capture visual proof (SC-001, SC-002)

---

## Phase 9: Target 3 - Cart Bottom Sheet & Checkout Modal Defensive Hardening (Priority: P1) ✅ Completed

**Goal**: Harden `.cart-bottom-sheet` and `.soren-modal-card` against extreme order titles (preventing 30px collapse), long order totals, cramped payment grids, broken item thumbnails, and CTA text crushing on compact mobile screens (320px–480px).

**Independent Test**: Load cart with 110-char title item, 125M Toman line price, and 404 broken image on 320px screen; verify item title takes 100% width on top tier, price/steppers sit on bottom tier with 0px overflow, image renders Soren emblem fallback, and opening checkout modal displays column-stacked footer with 100% submit button and 1-column payment options.

- [x] T026 [Target3] Implement responsive 2-tier card layout on `.sheet-item-row` under `@media (max-width: 480px)` in `frontend/css/style.css` so product titles have full horizontal width and prices/steppers align cleanly on lower tier (FR-022)
- [x] T027 [Target3] Implement column stacking on `.soren-modal-footer` and 1-column layout on `.payment-methods-grid` under `@media (max-width: 480px)` in `frontend/css/style.css` to eliminate CTA text crushing (FR-023, FR-024)
- [x] T028 [Target3] Add Soren emblem fallback (`onerror`) to `.sheet-item-img`, replace raw emoji `☕` with cohesive SVG icon in `.sheet-empty-state`, and add safe-area bottom padding to `.sheet-footer` in `frontend/main.js` and `frontend/css/style.css` (FR-025)
- [x] T029 [Target3] Suppress `#break-ui-toggle` when `#soren-checkout-modal` opens and ensure `aria-hidden` synchronization on cart sheet and checkout modal in `frontend/main.js` (FR-021, FR-025)
- [x] T030 [Target3] Create automated headless Chrome CDP verification script `scripts/verify-cart-and-checkout-defensive.mjs` and verify zero overflow, 2-tier item layout, column-stacked modal footer, and 1-column payment grid across 320px, 360px, 390px, and 320x480 viewports (SC-001)

---

## Phase 10: Target 4 - Dine-In Table Reservation Grid Defensive Hardening (Priority: P1) ✅ Completed

**Goal**: Harden `.table-selection-grid`, `.table-card`, `.zone-tabs-bar`, and `.order-fields-grid` against extreme table names/party sizes, horizontal cramping, and multi-line wrapping glitches on compact mobile viewports (320px–480px).

**Independent Test**: Open Checkout Modal with long table names ("میز شاه‌نشین VIP تشریفات شماره ۷"), 12-guest capacity labels, and 4-zone category tabs on 320px, 360px, 390px, and 320x480 viewports; verify 0px horizontal overflow, 1-column table card stack, 1-column order form fields, uncompressed table card top header, kinetic single-row touch-scrollable zone tabs, and accessible status indicators.

- [x] T031 [Target4] Implement 1-column stack on `.table-selection-grid` and `.order-fields-grid` under `@media (max-width: 480px)` in `frontend/css/style.css` (FR-026, FR-030)
- [x] T032 [Target4] Implement flexible wrapped header on `.table-card-top`, 2-line clamped title with `overflow-wrap: break-word` on `.table-card-name`, and min 44px touch targets on `.table-card` in `frontend/css/style.css` (FR-027)
- [x] T033 [Target4] Style `.zone-tabs-bar` with kinetic horizontal touch scrolling (`overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; flex-wrap: nowrap`) and `flex-shrink: 0` on `.zone-tab-btn` in `frontend/css/style.css` (FR-028)
- [x] T034 [Target4] Implement accessible status indicators and live hold TTL countdown formatting with Persian tabular digits in `renderTables()` within `frontend/main.js` and add WCAG AA styling for free, held, and occupied states in `frontend/css/style.css` (FR-029)
- [x] T035 [Target4] Create automated headless Chrome CDP verification script `scripts/verify-table-grid-defensive.mjs` and verify zero overflow, 1-column table grid, 1-column order fields, wrapped card top, kinetic zone tabs scroll, and hold indicators across 320px, 360px, 390px, and 320x480 viewports (SC-001)

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup; blocks User Story implementation.
- **User Story 1 (Phase 3)**: Depends on Foundational; delivers core MVP value.
- **User Story 2 (Phase 4)**: Can run after or in parallel with US1 (HTML/CSS changes).
- **User Story 3 (Phase 5)**: Can run in parallel with US2 on `frontend/index.html`.
- **Polish & Verification (Phase 6)**: Runs after all implementation tasks to gate completion.
- **Target 1 Defensive Hardening (Phase 7)**: Depends on Phase 4 card structures; hardens catalog cards against extreme data and unusual viewports.

### Parallel Opportunities
- `T016`, `T017`, and `T018` can be styled together in `frontend/css/style.css`.
- `T019` touches `frontend/main.js` and `frontend/index.html`.
- `T020` creates the standalone test suite `scripts/verify-cards-defensive.mjs`.
