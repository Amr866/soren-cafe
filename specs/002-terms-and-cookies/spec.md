# Feature Specification: Terms & Conditions and Cookie Policy & Preferences

**Feature Branch**: `feat/terms-and-cookies`

**Created**: 2026-11-09

**Status**: Implemented

**Input**: User description: "Build clean, readable, legal-compliant 'Terms & Conditions' and 'Cookie Policy & Preferences' pages, complete with an interactive cookie consent manager."

## Clarifications

### Session 2026-11-09
- Q: Which language presentation do you prefer for the Terms & Conditions and Cookie Policy documents? → A: Bilingual / Persian-primary (فارسی) with English mirror text or language switch, aligned with the rest of Soren Café's brand identity
- Q: How should the first-time visitor cookie banner behave on initial visit? → A: Subtle bottom banner that appears non-intrusively without blocking the menu or order flow, expandable into the full preference modal
- Q: How should the Quick Search bar interact with the legal document text when users type a keyword? → A: In-page real-time text highlight with instant hit count and Next/Prev jump buttons

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review Terms & Conditions and Cookie Disclosure (Priority: P1)

Patrons and visitors to Soren Café need to review clear, legally compliant, and accessible Terms & Conditions and Cookie Policy documents to understand their privacy rights, data handling, café ordering conditions, and dispute terms.

**Why this priority**: Essential compliance requirement and baseline editorial documentation for customer trust and legal transparency.

**Independent Test**: Visit `/pages/terms.html` and `/pages/cookies.html`, navigate through hierarchical legal headings via the sticky scroll-spy ToC, verify readability (65–75 character line length) and metadata badges ("Last updated: [Date]"), and test the "Download PDF / Print" utility button.

**Acceptance Scenarios**:

1. **Given** a user navigates to `/pages/terms.html` or `/pages/cookies.html`, **When** the page renders, **Then** editorial typography displays with high legibility, 65–75 character line length, hierarchical `h1` through `h4` headings, and a "Last updated" date badge.
2. **Given** a desktop or tablet viewport, **When** scrolling down the document, **Then** the sidebar Table of Contents remains sticky and highlights the active section currently in the viewport via scroll-spy.
3. **Given** a user clicks "Download PDF / Print", **When** activated, **Then** `window.print()` triggers clean print stylesheets optimizing margins, hiding navbars/drawers, and displaying full text.

---

### User Story 2 - Interactive Cookie Consent Management & Category Controls (Priority: P1)

Patrons need clear control over non-essential tracking and analytics cookies while maintaining strictly necessary functional operation (e.g., cart state, table assignment, active orders).

**Why this priority**: Crucial for legal compliance (GDPR/ePrivacy style best practices) and zero-interruption patron interaction without breaking core café ordering features.

**Independent Test**: Trigger the "Manage Cookie Preferences" button on the Cookie Policy page or footer, interact with toggles in the modal/drawer, verify "Strictly Necessary" is permanently locked/enabled, change preferences, and check `localStorage` persistence and event emission.

**Acceptance Scenarios**:

1. **Given** a user visiting any page, **When** clicking "Manage Cookie Preferences" or visiting with no prior consent choice, **Then** an interactive consent modal/drawer opens explaining Strictly Necessary, Analytics, Marketing, and Functional cookies.
2. **Given** the cookie preference modal, **When** viewing categories, **Then** "Strictly Necessary" is disabled/locked in the ON position with clear explanation, while Analytics, Marketing, and Functional can be toggled independently or accepted/rejected in bulk ("Accept All", "Reject Non-Essential", "Save Preferences").
3. **Given** saved preferences, **When** choices change, **Then** state is stored in `localStorage` under `soren_cookie_consent` and a custom DOM event (`soren:cookie-consent-updated`) is dispatched so external/telemetry scripts can conditionally initialize or halt.

---

### User Story 3 - In-Page Clause Search & Rapid Filter (Priority: P2)

Users searching for specific clauses (e.g., "Refunds", "Table reservation", "Data deletion", "Retention", "Liability") need to quickly locate relevant sections without scanning long documents.

**Why this priority**: Enhances accessibility, usability, and speed of finding specific legal and privacy guarantees.

**Independent Test**: Enter keywords like "Refunds" or "Retention" into the in-page search input; verify real-time highlighting or section filtering, showing matching clauses and count of results.

**Acceptance Scenarios**:

1. **Given** a user typing into the quick search input on the Terms or Cookie Policy page, **When** matching text is found, **Then** matching sections remain visible, non-matching sections dim/collapse or matching occurrences highlight, and the sticky ToC reflects matching areas.
2. **Given** search input is cleared, **When** empty, **Then** all sections restore immediately with zero layout shift.

---

### User Story 4 - Responsive & Mobile Polish (Priority: P2)

Patrons accessing the café menu and policies from mobile smartphones (320px–414px) need ergonomic navigation without desktop sidebar crowding.

**Why this priority**: Soren Café customers predominantly order on mobile phones during live café visits.

**Independent Test**: Resize viewport to 375px/414px; verify ToC collapses into an accessible mobile bottom sheet or accordion with smooth jump navigation.

**Acceptance Scenarios**:

1. **Given** a viewport narrower than 768px, **When** viewing the policy pages, **Then** the sidebar ToC converts into an accessible mobile quick-jump drawer/sheet or floating bottom bar.
2. **Given** selecting a section on mobile, **When** tapped, **Then** the sheet smoothly closes, scrolls the target heading into view with appropriate header offset, and updates browser history without layout jitter.

---

### Edge Cases

- **Cookies/Storage Disabled**: If `localStorage` is blocked or unavailable (e.g. strict private browsing or disabled cookies), the consent manager gracefully falls back to session in-memory state without crashing.
- **Bi-directional Typography (Bilingual / Persian & English)**: The site default is Persian (RTL) with brand / legal English terms. The layout and typography must cleanly handle RTL body text while supporting LTR code/terms snippets and English mirror versions without alignment glitches.
- **Keyboard & Screen Reader Accessibility**: Modals trap focus when opened, Escape key closes modal/sheet, all toggles use semantic `<button role="switch">` or `<input type="checkbox">` with accessible `aria-checked` and `aria-labelledby` attributes.
- **Zero CLS & Vanilla Integrity**: No heavy third-party consent libraries (e.g., OneTrust, Cookiebot CDN bundles); implemented cleanly in vanilla JavaScript and CSS complying with Constitution Principle I (Zero-JS-Bloat).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide dedicated, standalone editorial HTML pages for `/pages/terms.html` (Terms & Conditions) and `/pages/cookies.html` (Cookie Policy & Preferences).
- **FR-002**: Pages MUST implement an editorial prose layout adhering to 65–75 character line length, standard design tokens (`--bg-base`, `--text-main`, `--brand-primary`, `--brand-accent`), and hierarchical headings (`h1` through `h4`).
- **FR-003**: System MUST provide a sticky Table of Contents with an active `IntersectionObserver`-based scroll-spy highlighting the section in viewport.
- **FR-004**: System MUST include a "Last updated: [Date]" metadata badge and a "Download PDF / Print" action button triggering print styling.
- **FR-005**: System MUST present a structured Cookie Disclosure Table categorizing cookies into Strictly Necessary, Analytics, Marketing, and Functional, including Purpose, Provider, and Retention Duration.
- **FR-006**: System MUST provide an interactive Cookie Consent Manager consisting of a non-intrusive bottom notification banner on first visit (without blocking menu or ordering) and an expandable modal/drawer accessible anytime via persistent "Manage Cookie Preferences" links.
- **FR-007**: Cookie consent preferences MUST lock "Strictly Necessary" to ON while allowing granular or bulk toggles ("Accept All", "Reject All Non-Essential", "Save Selection") for others.
- **FR-008**: System MUST persist consent choices in `localStorage` under key `soren_cookie_consent` with schema `{ version: number, timestamp: string, categories: { strictly_necessary: boolean, analytics: boolean, marketing: boolean, functional: boolean } }`.
- **FR-009**: System MUST dispatch a custom DOM event `soren:cookie-consent-updated` on `window` carrying consent details so third-party or telemetry scripts can conditionally bind.
- **FR-010**: System MUST include a real-time in-page clause search bar providing non-destructive keyword highlighting (`<mark>`), total match counter (e.g., "3 of 12"), and Next/Previous navigation buttons that smoothly scroll matches into view.
- **FR-011**: On viewports < 768px, the ToC MUST collapse into an ergonomic mobile sheet/accordion.
- **FR-012**: Footer of all pages (`index.html`, `pages/*.html`) MUST link to Terms & Conditions and Cookie Policy & Preferences.
- **FR-013**: Pages MUST be structured primarily in Persian (fa/RTL) with high-legibility Peyda/Vazirmatn typography, accompanied by an in-page English mirror / toggle switch to review international English clauses.

### Non-Functional Quality Attributes

- **Performance**: Zero external render-blocking scripts or CDN consent libraries; First Contentful Paint < 400ms.
- **Accessibility**: WCAG 2.1 AA compliant; keyboard navigable, visible focus states, ARIA roles for switches and modal dialogues.
- **Print Optimization**: Clean print stylesheet stripping navigation, buttons, and backgrounds for printer-friendly output.
