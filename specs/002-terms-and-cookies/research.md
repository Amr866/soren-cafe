# Research & Architectural Decisions: Terms & Conditions and Cookie Consent

**Feature Branch**: `feat/terms-and-cookies` (`002-terms-and-cookies`)  
**Date**: 2026-11-09  
**Status**: Completed  

---

## 1. Editorial Typography & Layout Architecture

### Decision
Implement `/pages/terms.html` and `/pages/cookies.html` using semantic HTML5 (`<main>`, `<article>`, `<section>`, `<aside>`, `<nav>`) governed by strict editorial typography rules:
- Maximum prose line length capped at `65ch` to `75ch` (`max-width: 72ch; margin-inline: auto;`) for sustained human readability.
- Multi-tier typographic hierarchy using local Peyda (`fonts/Peyda-Regular.woff2`, `fonts/Peyda-Bold.woff2`) for Persian headings/body and Plus Jakarta Sans for English clauses, numbers, and tags.
- Sticky sidebar Table of Contents (ToC) positioned via `position: sticky; top: 96px;` on viewports $\ge 1024\text{px}$.
- Active scroll-spy implemented using standard `IntersectionObserver` with `rootMargin: "-20% 0px -70% 0px"` threshold tracking, dynamically applying `.active` to current ToC links.
- On viewports $< 768\text{px}$, ToC transforms into a sticky quick-jump pill bar and floating bottom drawer with backdrop blur (`backdrop-filter: blur(8px)`).

### Rationale
- Zero third-party bundle dependencies, complying strictly with Soren Café Constitution Principle I (Zero-JS-Bloat).
- High visual legibility under café terrace and indoor light conditions, matching the artisanal ivory-linen brand design system (`--bg-base: #F6F3EE`, `--text-main: #261F1A`).
- IntersectionObserver provides 60fps hardware-composited performance without scroll event thrashing or main-thread layout jank.

### Alternatives Considered
- Scroll event listeners with `element.getBoundingClientRect()`: Rejected due to layout thrashing and high main thread CPU usage on mobile devices.
- Monolithic PDF embed (`<embed>` / `<iframe>`): Rejected because it fails mobile responsiveness, lacks accessibility for screen readers, and prevents granular in-page search and dark mode styling.

---

## 2. Interactive Cookie Consent Management & Category State Engine

### Decision
Build a lightweight, self-contained modular client script (`SorenCookieConsent`) stored in `localStorage` under key `soren_cookie_consent`:
1. **Consent Categories**:
   - `strictly_necessary`: Permanently locked to `true` (handles session security, cart state, table assignment, CSRF tokens). Cannot be toggled off.
   - `analytics`: Optional (Bun telemetry, page load metrics, performance counters).
   - `functional`: Optional (language preferences, custom UI layout memory, sound feedback).
   - `marketing`: Optional (campaign attribution, seasonal promotion vouchers).
2. **First-Visit Notification**:
   - A quiet, bottom-anchored notification banner (`#cookie-consent-banner`) rendered on initial visit if no consent record is present in `localStorage`.
   - Banner offers three direct actions: "Accept All" (`تایید همه`), "Reject Non-Essential" (`رد موارد غیرضروری`), and "Manage Preferences" (`مدیریت ترجیحات`).
   - The banner never obstructs core ordering, cart floating bars, or table QR navigation (Constitution Principle V).
3. **Preference Modal / Drawer**:
   - An accessible dialog container (`#cookie-preference-modal`) with individual switch toggles (`role="switch"`, `aria-checked="true|false"`), detailed category explanations, cookie provider names, and retention durations.
   - Focus trap and `Escape` key listener implemented natively.
4. **Custom DOM Event Emitter**:
   - When preferences are saved, dispatch `new CustomEvent('soren:cookie-consent-updated', { detail: consentPayload })` on `window`.

### Rationale
- Complies with ePrivacy Directive, GDPR standards, and Iranian e-commerce privacy standards without loading third-party bloated trackers (Cookiebot, OneTrust, Termly).
- Decouples cookie storage from tracking scripts: analytics and telemetry modules simply subscribe to the event or query `SorenCookieConsent.hasConsent('analytics')`.

### Alternatives Considered
- Third-party CDN widgets (e.g., Cookiebot script tags): Rejected due to heavy payload (>150KB), slow external DNS lookup, and violation of Constitution Principle I and Principle IV.
- Blocking full-screen overlay: Rejected because patron ordering in physical café situations demands zero artificial checkout or browsing barriers (Constitution Principle V).

---

## 3. In-Page Clause Search & Highlight Interaction

### Decision
Implement client-side clause search (`SorenLegalSearch`) operating directly against the document text:
- Non-destructive keyword matching using dynamic DOM tree traversal, wrapping matching text instances in `<mark class="search-match">`.
- Active match highlighted as `<mark class="search-match is-current">` with distinct amber glow (`--brand-accent`).
- Real-time hit counter display (e.g., `۳ از ۱۲` / `3 of 12`) with Next (`↓`) and Previous (`↑`) button navigation.
- Smooth scrolling to current match using `matchEl.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
- Clearing input instantly unwraps all `<mark>` elements and restores original text nodes with zero layout shift.

### Rationale
- Allows patrons and legal auditors to find specific terms (e.g., "بازپرداخت" / "Refund", "رزرو میز" / "Table booking", "مدت نگهداری" / "Retention") in under 500ms.
- High accessibility with `aria-live="polite"` announcing match counts to screen readers.

### Alternatives Considered
- Filtering by hiding non-matching `<section>` blocks: Rejected because legal clauses often rely on preceding context, cross-references, and section numbering. Hiding sections disorients users reading a contract.
- Browser native `Ctrl+F`: Native search lacks mobile touch navigation, match counting in custom UI, and bilingual cross-tag awareness.

---

## 4. Bilingual / Mirror Clause Architecture

### Decision
Structure each document section with primary Persian legal text and an optional collapsible or mirrored English summary card (`.legal-en-mirror`):
- High-level toggle at top of document: `[FA] فارسی` (active default) and `[EN] English Summary`.
- Persian typography styled with Peyda / Vazirmatn (`dir="rtl"`, line-height `1.85`).
- English summary blocks styled with Plus Jakarta Sans (`dir="ltr"`, line-height `1.65`, monospace for identifiers and retention timelines).

### Rationale
- Soren Café is an international-standard specialty coffee bar catering to both local patrons and foreign expatriates/tourists.
- Fulfills the user's explicit preference from the clarification session while preserving Iranian legal precision and international transparency.

---

## 5. Print & PDF Export Architecture

### Decision
Provide a "Download PDF / Print" (`چاپ / ذخیره PDF`) action button executing `window.print()` coupled with `@media print` stylesheets:
- Strips headers, navigation bars, cookie banners, search toolbars, and footer social links.
- Sets background to pure white `#FFFFFF` and text to `#000000` with high-contrast typography.
- Adds page break rules: `h2, h3 { page-break-after: avoid; break-after: avoid; }`, `section { break-inside: avoid; }`.
- Appends document metadata footer with generation timestamp and verified URL.

### Rationale
- Native `window.print()` allows users to "Save as PDF" using the operating system's built-in PDF printer without needing backend headless PDF generators (Puppeteer/wkhtmltopdf), saving server memory and CPU.
