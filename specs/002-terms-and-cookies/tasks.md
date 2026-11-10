# Implementation Tasks: Terms & Conditions, Cookie Policy & Consent Manager

**Branch**: `feat/terms-and-cookies` (`002-terms-and-cookies`) | **Date**: 2026-11-09  
**Spec**: [spec.md](file:///C:/Users/hp/.t3/worktrees/soren-cafe/feat-terms-and-cookies/specs/002-terms-and-cookies/spec.md) | **Plan**: [plan.md](file:///C:/Users/hp/.t3/worktrees/soren-cafe/feat-terms-and-cookies/specs/002-terms-and-cookies/plan.md)

---

## Phase 1: Setup & Foundational Infrastructure

- [x] T001 Setup CSS classes and design tokens for legal pages in `frontend/css/style.css` (prose container `max-width: 72ch`, typography scale, sticky sidebar ToC, active state indicators).
- [x] T002 Implement print media styles in `frontend/css/style.css` to hide headers, footers, search bars, and banners while formatting legal text for standard A4 paper.

---

## Phase 2: User Story 1 - Review Terms & Conditions and Cookie Disclosure (Priority: P1) 🎯 MVP

**Goal**: Deliver fully navigable, editorial Terms & Conditions and Cookie Policy pages with sticky scroll-spy ToC, "Last updated" metadata badge, and "Download PDF / Print" utility button.

- [x] T003 [US1] Create `frontend/pages/terms.html` with clean editorial structure, hierarchical headings (`h1`–`h4`), 65–75 character line length, Persian legal clauses (ordering, reservations, liability, refunds), English mirror summaries, sticky ToC, and print button.
- [x] T004 [US1] Create `frontend/pages/cookies.html` with categorized cookie disclosure table (Strictly Necessary, Analytics, Marketing, Functional), provider/purpose/duration breakdown, sticky ToC, in-page consent trigger, and print button.
- [x] T005 [US1] Implement `IntersectionObserver` scroll-spy logic in `frontend/main.js` to dynamically highlight the active section in the sticky ToC during scrolling.

---

## Phase 3: User Story 2 - Interactive Cookie Consent Management & Category Controls (Priority: P1)

**Goal**: Implement non-intrusive first-visit banner, expandable preference drawer/modal, `localStorage` persistence, and `soren:cookie-consent-updated` event dispatching.

- [x] T006 [US2] Implement CSS for `#cookie-consent-banner` (subtle non-blocking bottom banner) and `#cookie-preference-modal` (accessible dialog with category switches and backdrop blur) in `frontend/css/style.css`.
- [x] T007 [US2] Implement `SorenCookieConsent` module in `frontend/main.js` conforming to `cookie-consent-contract.md` (methods `init`, `getConsent`, `hasConsent`, `setConsent`, `acceptAll`, `rejectNonEssential`, `openPreferencesModal`, `closePreferencesModal`).
- [x] T008 [US2] Wire up DOM event emission (`soren:cookie-consent-updated`) on `window` and bind "Manage Cookie Preferences" click triggers across pages and footers.

---

## Phase 4: User Story 3 - In-Page Clause Search & Rapid Filter (Priority: P2)

**Goal**: Implement real-time keyword highlighting, match counter, and Next/Previous navigation jump buttons for legal clauses.

- [x] T009 [US3] Add search box styling, `<mark.search-match>` highlights, and active match pulse in `frontend/css/style.css`.
- [x] T010 [US3] Implement `SorenLegalSearch` module in `frontend/main.js` handling dynamic DOM text matching, active hit counter (`X of Y`), smooth scroll into view, and Next/Prev jump button actions.

---

## Phase 5: User Story 4 - Responsive Polish & Footer Integration (Priority: P2)

**Goal**: Support mobile viewports (< 768px) with quick-jump sheet/accordion, zero layout shift, and link Terms and Cookie Policy in footers across all site pages.

- [x] T011 [US4] Add mobile responsive styling for legal pages (< 768px) in `frontend/css/style.css` (mobile sticky jump-bar / drawer, touch-friendly switches).
- [x] T012 [US4] Update footer links in `frontend/index.html` and other main pages (`about.html`, `coffee.html`, `cake.html`, `shakes.html`, `cart.html`, `products.html`) to link to `pages/terms.html` and `pages/cookies.html`.

---

## Phase 6: Automated Verification & Gate

- [x] T013 Create and execute automated verification script `scripts/verify-legal-pages.mjs` verifying multi-viewport rendering (320px, 375px, 768px, 1280px), scroll-spy, search highlight, consent storage, and zero console errors.
