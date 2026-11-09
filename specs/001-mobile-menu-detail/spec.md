# Feature Specification: Mobile Landing Page & Menu Detail Unslopping

**Feature Branch**: `001-mobile-menu-detail`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "alright now go for the whole landing page on phone aspect ratio with /unslop make sure to check the menu detail too"

## Clarifications

### Session 2026-11-02

- Q: When a patron taps "افزودن به سبد خرید" inside the Menu Detail Bottom Sheet, should the sheet automatically dismiss or remain open for further adjustments? (FR-007) → A: Option A — Auto-dismiss after a 400ms confirmation animation, returning the patron to catalog browsing.
- Q: How should the Menu Detail Bottom Sheet handle items that are marked as out-of-stock by the barista? (FR-006) → A: Option A — Card remains tappable to open the detail sheet for tasting notes/ingredients, but the CTA is disabled with a "ناموجود در شیفت جاری" badge.
- Q: Should the Menu Detail Bottom Sheet include recipe customization chips (such as milk alternatives or extra espresso shots), or remain strictly focused on extraction specs and tasting notes with direct 1-tap addition? (FR-006) → A: Option A — Purely informational specs & tasting notes with direct 1-tap addition (standard barista recipe, zero modifier chips in v1).
- Q: How should product cards in the mobile 2-column catalog grid handle long product titles and descriptions to prevent broken row alignment? (FR-013) → A: Option A — 2-line clamp on titles (-webkit-line-clamp: 2), 2-line clamp on descriptions, and pinned action/price footer with margin-top: auto for uniform row alignment.
- Q: How many provenance or status badges should a mobile product card display simultaneously in .featured-top over the product photography? (FR-016) → A: Option A — Strictly 1 primary badge per card on mobile (e.g., عصاره‌گیری ۹ بار or ناموجود), deferring all secondary tags to the Menu Detail Bottom Sheet to preserve clean product photography.
- Q: How should the standalone category pages (coffee.html, shakes.html, cake.html) be unified with the updated interactive catalog? (FR-014) → A: Option A (Unified Single Surface with Distinct 3-Category UX) — Point all navigation and subpage entrypoints to index.html#menu?cat=<category>, ensuring the user clearly sees and navigates the 3 separate categories via active category chips and automatic deep-link filtering without code duplication.
- Q: When a patron navigates to "محصولات" on the menu, how should the 3 separate categories (قهوه, شیک, کیک) be visually structured on the screen? (FR-015) → A: Tabbed Switching with "All Products" View — Provide a sticky category tab bar with "همه آیتم‌ها" (displaying all catalog items) alongside 3 dedicated category tabs ("قهوه‌های تخصصی", "بار سرد و شیک‌ها", "کیک و دسر روز"). Tapping any category tab instantly switches the view to show only that category's items with smooth transitions, and deep-links from the navigation immediately activate and display that specific category tab.
- Q: When a patron types in the menu search box while a specific category tab (e.g. "کیک و دسر") is active, how should the catalog handle the search scope? (FR-016) → A: Option A (Auto-switch to All with Restore) — Automatically activate "همه آیتم‌ها" upon typing in the search box to find matching items across all categories, and restore the previously selected category filter when search input is cleared.
- Q: How should product cards gracefully handle image loading failures (e.g., poor outdoor cellular connectivity or asset 404) to avoid unsightly browser broken-image icons? (FR-017) → A: Option A — Replace failed images with an artisanal neutral canvas with the Soren coffee emblem SVG on onerror, preserving identical card dimensions and preventing layout shifts or broken-image icons.
- Q: How should the Menu Detail Bottom Sheet layout handle ultra-long product titles alongside prices on compact mobile screens (<= 360px)? (FR-018) → A: Option A — Fluid column stack on <= 360px: Title takes 100% width (up to 3 lines), price displays directly below on its own clean baseline with tabular Persian numerals.
- Q: How should the Artisanal Specs Grid (.detail-specs-grid) adapt for long tasting notes and terroir descriptions on compact mobile viewports? (FR-019) → A: Option A — Hybrid grid: Let 'نت‌های چشایی' (flavor notes) span full width (grid-column: 1 / -1) below the other 3 parameters, giving poetic flavor descriptions full horizontal breathing room.
- Q: How should the Menu Detail hero image frame (.detail-visual-box) behave regarding aspect ratio, short viewports, and image load failures? (FR-020) → A: Option A — Fix flex-collapse bug, apply Soren emblem fallback on 404/error, and use responsive aspect-ratio (compact 16:9 or 120px on short viewports <= 550px height) to ensure CTA button remains immediately reachable.
- Q: How should cart item rows (.sheet-item-row) adapt on mobile screens (<= 480px) to prevent product titles from collapsing to 30px? (FR-022) → A: Option A — 2-tier card layout on <= 480px: Top line pairs item image with full-width product title; bottom line neatly aligns unit/total prices on the right and stepper controls on the left.
- Q: How should the Checkout Modal footer (.soren-modal-footer) resolve price and submit button collision on compact screens (<= 480px)? (FR-023) → A: Option A — Full-width column stack on <= 480px: Total price sits on top with Persian tabular numerals, submit CTA button expands to 100% width (height 48px) below.
- Q: How should the payment methods selection grid (.payment-methods-grid) format on mobile viewports (<= 480px)? (FR-024) → A: Option A — Single-column vertical stack (1fr) on <= 480px: Both payment options span full width so payment titles and subtitle descriptions read comfortably.
- Q: How should the Dine-In Table Selection Grid (.table-selection-grid) adapt inside the Checkout Modal on mobile viewports (<= 480px)? (FR-026) → A: Option A — Responsive 1-column stack on <= 480px (grid-template-columns: 1fr; gap: 10px;), providing spacious 48px touch target cards with full-width legibility.
- Q: How should .table-card handle extreme table titles and party sizes on narrow 320px screens? (FR-027) → A: Option A — Flexible 2-tier card header: table title and capacity wrap gracefully without collision, and description is clamped to 2 lines with overflow-wrap: break-word.
- Q: How should the zone filtering tabs (.zone-tabs-bar) behave on compact mobile widths? (FR-028) → A: Option A — Smooth horizontal kinetic scroll track (flex-nowrap, scrollbar-width: none; -webkit-overflow-scrolling: touch; flex-shrink: 0) preserving single-row luxury aesthetic without wrapping into messy lines.
- Q: How should table hold status (TTL timer) and occupied states be represented on .table-card? (FR-029) → A: Option A — Live status pill with luxury color tokens and WCAG AA contrast (green dot for "آماده پذیرایی", amber dot with tabular Persian countdown for "در حال رزرو", and accessible muted styling with aria-disabled="true" for occupied tables).

### Session 2026-11-07

- Q: When a customer presses Enter in the landing page search bar, how should the page navigate or reveal the matching items? (FR-030) → A: Option A — Smooth-scroll directly to the catalog section (#menu) on the landing page, highlighting the filtered products without a full page reload.
- Q: When a user searches on the landing page, how should the category chip counts (e.g., ۱۸, ۶, ۶, ۶) update to reflect matching items? (FR-031) → A: Option A — Dynamically update each category chip count to display the matching items in each category (e.g., همه: ۲, قهوه: ۲, شیک: ۰), restoring original totals when search is cleared.
- Q: How should the English search option be provided to patrons? (FR-032) → A: Option A — Seamless bilingual matching: automatically match English terms (e.g. "latte", "espresso", "v60", "san sebastian") against English and Persian titles, descriptions, and tags without requiring a manual toggle.

### Session 2026-11-09

- Q: How should cart item controls (quantity stepper & item deletion) be restructured on mobile? (FR-031) → A: Clean inline row — Unified stepper (minus morphs to subtle trash icon at 1, alongside swipe-to-delete gesture), completely removing the isolated top-left trash button.
- Q: How should the checkout CTA and order summary be anchored on mobile? (FR-032) → A: Sticky bottom bar — Fixed bottom bar displaying total price + 'تکمیل خرید' CTA, ensuring checkout is always 1-tap accessible without forcing users to scroll past the entire list.
- Q: How would you like the Free Shipping tier to be presented? (FR-033) → A: Dynamic progress bar — Interactive milestone bar showing remaining amount to free shipping, turning into a subtle green/amber success badge when reached.
- Q: What visual aesthetic should replace the current card styling? (FR-034) → A: Artisan Editorial (No-Slop) — Warm cream background with crisp typographic hierarchy, elegant dividers instead of heavy nested cards, and natural food photography.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inspecting Specialty Coffee & Pastry Details on Phone (Priority: P1)

As a discerning café patron browsing the Soren Café menu on a smartphone, I want to tap on any coffee or bakery item to inspect its authentic extraction specs, roast terroir, and tasting notes in an interactive bottom sheet, so that I can make an informed choice and add it to my order in a single tap without losing my place in the catalog.

**Why this priority**: Specialty coffee patrons value knowing extraction parameters (9 bar pressure, 93.5°C brew temperature, single-origin terroir) before purchasing. On a phone screen, compact cards cannot fit these deep details, making a dedicated bottom sheet the core interaction moment.

**Independent Test**: Can be fully tested by navigating to the catalog on a 390px mobile viewport, tapping on "اسپرسو دبل", verifying the bottom sheet slides up with terroir and extraction metrics, tapping "افزودن به سبد خرید", and confirming the item is added to the cart with haptic feedback.

**Acceptance Scenarios**:

1. **Given** a patron is viewing the menu on a mobile viewport, **When** they tap on any product card (outside the stepper buttons), **Then** the Menu Detail Bottom Sheet slides up with an ambient backdrop blur (`5px`), displaying the high-res visual, bean origin, brew method, temperature, flavor notes, and a 48px touch CTA.
2. **Given** the Menu Detail Bottom Sheet is open, **When** the patron taps the "افزودن به سبد خرید" button, **Then** the product is added to `SorenCartStore`, haptic vibration triggers (`navigator.vibrate(14)`), button reflects the updated count with an 'افزوده شد!' confirmation, and the sheet automatically dismisses after ~400ms returning the patron to the catalog.
3. **Given** the Menu Detail Bottom Sheet is open, **When** the patron drags downward on the drag handle, taps the backdrop, or taps the close button (✕), **Then** the sheet dismisses with physics-based spring easing and restores normal background scrolling.
4. **Given** a product card has an active in-card stepper `[ − ] [ ۱ ] [ + ]`, **When** the patron taps `+` or `−` on the card, **Then** the quantity updates directly without triggering or opening the Menu Detail Bottom Sheet.
5. **Given** a product is marked out-of-stock (`isAvailable: false`), **When** the patron taps its card, **Then** the Menu Detail Bottom Sheet opens displaying full ingredients and tasting notes, but the CTA button is disabled displaying 'ناموجود در شیفت جاری' with no click action.

---

### User Story 2 - Clean, Unslopped Mobile Catalog Browsing (Priority: P2)

As a customer browsing the menu on my phone, I want to see an elegant, high-contrast artisanal catalog free from shouting supermarket discount badges and fake strikethrough prices, so that the experience reflects a calm, luxury specialty café.

**Why this priority**: The current mobile grid forces dark `#2e2621` background blocks onto an ivory linen page, cluttered with bright orange `۲۱٪ تخفیف` discount badges and `<del>` strikethrough prices that degrade brand trust and readability.

**Independent Test**: Can be fully tested by auditing the 18 catalog cards on a 360px viewport: verifying cards use luminous `#FFFFFF` surfaces against the `#F7F4EE` canvas, zero `<del>` tags exist, all prices use single tabular figures, and cards feature authentic provenance tags (e.g., `عصاره‌گیری ۹ بار`, `میکروفوم مخملی`).

**Acceptance Scenarios**:

1. **Given** a patron browses the mobile catalog, **When** looking at product cards, **Then** every card renders with a crisp white surface (`#FFFFFF`), warm bronze hairline border (`rgba(140, 94, 60, 0.14)`), and balanced 12px internal padding on a strict 4px grid.
2. **Given** product cards on mobile, **When** viewing prices and badges, **Then** no strikethrough prices or percentage discount pills appear; only a single authentic price formatted with Persian tabular numerals and a quiet provenance tag (e.g., `تک‌خاستگاه اتیوپی`, `پخت روزانه`).

---

### User Story 3 - Calm Mobile Navigation & Clean Shell (Priority: P3)

As a patron navigating the mobile interface, I want the header, off-canvas drawer, hero, and footer to feature cohesive SVG line icons and quiet editorial typography without raw emojis or artificial glowing blobs, so that the interface feels cohesive and professionally crafted.

**Why this priority**: Raw emojis (`☕`, `✦`, `📋`, `♥`) and glowing hero blobs are hallmarks of vibecoded templates that distract from the brand identity defined in the Constitution.

**Independent Test**: Can be tested by opening the mobile off-canvas drawer and inspecting the footer to verify that all icons are 1.8-stroke SVG vector glyphs and that the hero typography breathes calmly on mobile.

**Acceptance Scenarios**:

1. **Given** the patron opens the mobile off-canvas drawer (`#soren-offcanvas-drawer`), **When** viewing the navigation links, **Then** each link displays a unified 1.8-stroke SVG line icon rather than an emoji.
2. **Given** the patron scrolls to the footer, **When** reading the brand signoff, **Then** no raw unicode heart emoji appears; a subtle geometric glyph (`✦`) is used instead.
3. **Given** the hero section on a phone viewport, **When** the page loads, **Then** the hero eyebrow presents quiet editorial copy without decorative floating blobs or neon glow effects.

---

### Edge Cases

- **Rapid Interaction Conflict**: What happens when a user rapidly taps the stepper `+` button while the card is being tapped?
  - The click event listener must check `e.target.closest('.card-action-box, .card-stepper, .card-add-btn')` and immediately bail out so the detail sheet never opens inadvertently during stepper interactions.
- **Ultra-Compact Mobile Viewports (320px iPhone SE)**: How does the detail sheet handle short or narrow screens?
  - The sheet has `max-height: 85vh` with `overflow-y: auto` and `-webkit-overflow-scrolling: touch` to ensure all extraction specs and the CTA remain accessible on 320px screens without viewport clipping.
- **Offline / Low-Connectivity**: What happens if the customer has poor cellular reception at an outdoor café table?
  - All detail specs are sourced directly from local in-memory catalog data (`PRODUCT_CATALOG`), rendering instantly in <50ms with zero network roundtrips.
- **Out-of-Stock Products**: When an item has zero availability, the card in the catalog and the detail sheet clearly signal unavailability, disabling all addition and stepper actions while preserving educational tasting notes.
- **Searching Across Category Tabs**: When a patron searches while a specific category tab is active, the active tab switches to "همه آیتم‌ها" to query the complete catalog. Clearing the search input automatically restores the patron's prior category selection.
- **Subpage Direct Access / Legacy Bookmarks**: When a patron visits `frontend/pages/coffee.html`, `shakes.html`, or `cake.html` directly, the page immediately performs a seamless canonical client-side redirect (`window.location.replace("../index.html#menu?cat=<category>")`) to ensure they land on the unified, interactive catalog with the corresponding category pre-selected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render all catalog cards on mobile viewports using high-contrast white surfaces (`#FFFFFF`) against the ivory linen background (`#F7F4EE`) with subtle hairline borders (`rgba(140, 94, 60, 0.14)`).
- **FR-002**: System MUST eliminate all commercial discount badges (`۲۱٪ تخفیف`, `۱۵٪ تخفیف`, etc.) and strikethrough prices (`<del>...<del>`) across the entire product catalog.
- **FR-003**: System MUST format all monetary figures using Persian tabular numerals (`font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1`) to eliminate layout shifts during numerical updates.
- **FR-004**: System MUST open an interactive Menu Detail Bottom Sheet (`#menu-detail-sheet`) when a patron taps anywhere on a catalog product card (outside the stepper action area).
- **FR-005**: System MUST NOT open the Menu Detail Bottom Sheet when the patron taps on the card's `+`, `−`, or stepper container.
- **FR-006**: The Menu Detail Bottom Sheet MUST display the item visual, category label, unit price, title, artisanal description, and a 2-column key-value grid of roast terroir and brew parameters.
- **FR-007**: The Menu Detail Bottom Sheet MUST provide a full-width 48px touch CTA button allowing 1-tap addition to `SorenCartStore` with physical haptic vibration (`navigator.vibrate(14)`), which displays a brief visual confirmation and auto-dismisses after 400ms.
- **FR-008**: The Menu Detail Bottom Sheet MUST support dismissal via downward touch drag on the handle zone, backdrop tap, top close button (✕), and keyboard Escape.
- **FR-009**: System MUST replace all raw decorative emojis in the off-canvas drawer and footer with cohesive 1.8-stroke SVG line icons.
- **FR-010**: System MUST enforce a strict 4px spacing scale across mobile cards, gutters, and sheet controls (16px gutters, 12px card gap, 12px internal padding).
- **FR-011**: For products marked out-of-stock (`isAvailable: false`), the Menu Detail Bottom Sheet MUST remain accessible to view tasting notes and ingredients, but the CTA button MUST be disabled with a prominent 'ناموجود در شیفت جاری' label.
- **FR-012**: The Menu Detail Bottom Sheet MUST focus strictly on informational extraction parameters, terroir, and tasting notes with direct 1-tap addition of the barista's standard recipe, with zero modifier chips or ingredient customization toggles in v1.
- **FR-013**: System MUST enforce a 2-line clamp (`-webkit-line-clamp: 2`) on product card titles and descriptions within the mobile 2-column catalog grid, anchoring the price and action container to the bottom using `margin-top: auto` to maintain straight horizontal alignment across grid siblings.
- **FR-014**: System MUST unify the separate menu subpages (`coffee.html`, `shakes.html`, `cake.html`) with the main catalog by pointing navigation links and subpage entrypoints to `index.html#menu?cat=<coffee|shakes|cake>`, ensuring the patron experiences 3 distinct visual categories via dedicated category chips and automatic deep-link filtering.
- **FR-015**: System MUST provide a sticky category tab bar with a dedicated "همه آیتم‌ها" option alongside the 3 distinct categories ("قهوه‌های تخصصی", "بار سرد و شیک‌ها", "کیک و دسر روز"), where tapping any category instantly switches the visible grid items with a smooth fade/slide transition and deep-links from the navigation immediately activate that tab.
- **FR-016**: When a patron enters search input into `#menu-quick-search`, the catalog MUST automatically switch the active category to "همه آیتم‌ها" to query across all 18 products, and restore the previous category selection when the search field is emptied.
- **FR-017**: System MUST render at most 1 primary priority badge (`.featured-popular` / `.featured-top`) over product card imagery on mobile viewports to prevent visual occlusion, reserving all secondary terroir, dietary, and process notes for the Menu Detail Bottom Sheet.
- **FR-018**: System MUST provide an artisanal Soren emblem SVG fallback canvas on product image load failures (`onerror`), preserving exact card aspect ratios and preventing layout shifts or raw browser broken-image icons.
- **FR-019**: System MUST adapt the Menu Detail Bottom Sheet title row (`.detail-title-row`) on compact viewports (`<= 360px`) to a fluid vertical stack where the product title spans full width (clamped to max 3 lines) and the tabular Persian price renders cleanly below on its own baseline, preventing horizontal text compression and awkward single-word wrapping.
- **FR-020**: System MUST render the Menu Detail specs grid (`.detail-specs-grid`) with a hybrid layout where the tasting notes cell (`نت‌های چشایی`) spans the full container width (`grid-column: 1 / -1`) below the first 3 metrics, providing ample horizontal space for descriptive sensory profiles without vertical distortion.
- **FR-021**: System MUST eliminate flex-collapse on `.detail-visual-box` by setting `display: block` on `.menu-detail-sheet .sheet-body`, enforce responsive aspect ratios (compact 120px max on viewports with height `<= 550px`), provide the neutral Soren emblem fallback on image load failure, synchronize `aria-hidden` ("false" on open, "true" on close), and ensure close button has a minimum 44x44px touch target.
- **FR-022**: System MUST render `.sheet-item-row` in the Cart Bottom Sheet with a responsive 2-tier card layout on mobile viewports (`<= 480px`), pairing item thumbnail with a full-width product title on the upper tier and aligning unit/line prices and steppers on the lower tier to prevent product title truncation.
- **FR-023**: System MUST structure the Checkout Modal footer (`.soren-modal-footer`) with a full-width column stack on screens `<= 480px`, presenting the total sum with Persian tabular digits on top and a 100% width, 48px touch CTA button below.
- **FR-024**: System MUST render the payment methods selection grid (`.payment-methods-grid`) in a single-column vertical stack (`1fr`) on screens `<= 480px` to guarantee subtitle descriptions read without word breakage.
- **FR-025**: System MUST provide the neutral Soren emblem fallback on cart item images (`.sheet-item-img`), replace raw emoji in `.sheet-empty-state` with an SVG icon, and enforce safe-area bottom padding on `.sheet-footer`.
- **FR-026**: System MUST render `.table-selection-grid` in a single-column stack (`grid-template-columns: 1fr; gap: 10px;`) under `@media (max-width: 480px)` inside the checkout modal, preventing horizontal cramping and awkward table card squishing on compact screens.
- **FR-027**: System MUST configure `.table-card-top` with flex-wrap and responsive spacing on mobile viewports (`<= 480px`), clamp `.table-card-name` to 2 lines with `overflow-wrap: break-word`, and enforce a minimum touch target height of 44px per table card.
- **FR-028**: System MUST style `.zone-tabs-bar` as a single-row touch-scrollable pill track (`flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch;`) with `flex-shrink: 0` on tab buttons, ensuring smooth horizontal swipe exploration across all zones on mobile without multi-line layout jitter.
- **FR-029**: System MUST display table availability states in `.table-card-footer` with WCAG AA compliant text contrast and live status indicators (green dot for `FREE` "آماده پذیرایی", amber dot with tabular Persian countdown digits for active `HOLD` "در حال رزرو", and muted accessible styling with `aria-disabled="true"` for `OCCUPIED` tables).
- **FR-030**: System MUST stack `.order-fields-grid` into a single column (`grid-template-columns: 1fr; gap: 10px;`) under `@media (max-width: 480px)` so delivery name and phone inputs have full width and uncompressed labels on compact phones.
- **FR-031**: System MUST unify the mobile cart item quantity stepper into a clean inline control where decrementing below 1 transforms into a subtle trash icon (with swipe-to-delete support) and eliminates the isolated top-left delete icon button to avoid visual clutter.
- **FR-032**: System MUST anchor a sticky checkout bar at the bottom of the mobile cart view displaying total payable amount and an uncompressed 100% width primary CTA ("تکمیل سفارش و پرداخت آنلاین"), ensuring immediate reachability without scrolling.
- **FR-033**: System MUST render the Free Shipping indicator as a dynamic progress bar tracking progress toward the free shipping threshold (`FREE_SHIPPING_THRESHOLD`), transitioning to a celebrated status badge when unlocked.
- **FR-034**: System MUST apply the Artisan Editorial no-slop design to the mobile cart page (`cart.html`), replacing heavy boxed "card-soup" with clean typographic hierarchy, elegant 1px dividers, and balanced spacing.

### Key Entities

- **ProductCatalogItem**: Represents an artisanal beverage or bakehouse item containing unique identifier (`id`), title (`name`), category (`coffee`, `shakes`, `cake`), unit price (`price`), image source path (`image`), description (`desc`), and extraction metrics (origin terroir, brew method, serving temperature, flavor notes).
- **MenuDetailState**: Transient mobile UI controller state tracking sheet visibility (`is-open`), active product ID, and touch drag gesture displacement.
- **CartItem**: Active order entry persisting product ID, quantity, unit price, and timestamp in `localStorage`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero horizontal layout overflow (`scrollWidth <= viewportWidth`) across all 6 standardized test viewports: 320px, 360px, 390px, 412px, 768px, and 1280px (verified via `bun run test:responsive`).
- **SC-002**: The Menu Detail Bottom Sheet opens in under 50ms from touch trigger with zero network latency.
- **SC-003**: 100% of product prices render in tabular Persian numerals without layout jitter or jumping.
- **SC-004**: Zero fake discount percentage badges or `<del>` strikethrough tags remaining in the DOM.
- **SC-005**: Zero raw emojis remaining in navigation drawers or footer metadata.
- **SC-006**: 100% pass rate on the end-to-end cart, stepper, and upsell verification suite (`bun run test:e2e`).

## Assumptions

- Product metadata (origins, roasting parameters, temperatures) is derived from [`PROJECT_SPEC.md`](file:///d:/projects/soren-cafe/PROJECT_SPEC.md) and mapped to existing product IDs in `PRODUCT_CATALOG`.
- Users primarily browse on touch-enabled smartphone browsers supporting CSS flexbox/grid and backdrop-filter.
- The existing `SorenCartStore` state management and WebSocket synchronization architecture remain untouched and are reused as-is.
