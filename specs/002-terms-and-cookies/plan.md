# Implementation Plan: Terms & Conditions and Cookie Consent Manager

**Branch**: `feat/terms-and-cookies` (`002-terms-and-cookies`) | **Date**: 2026-11-09 | **Spec**: [spec.md](file:///C:/Users/hp/.t3/worktrees/soren-cafe/feat-terms-and-cookies/specs/002-terms-and-cookies/spec.md)

**Input**: Feature specification from `/specs/002-terms-and-cookies/spec.md`

## Summary

Build clean, readable, legal-compliant "Terms & Conditions" (`frontend/pages/terms.html`) and "Cookie Policy & Preferences" (`frontend/pages/cookies.html`) pages featuring an editorial prose layout (65–75 character line length, hierarchical headings, sticky scroll-spy ToC, print utility), alongside an interactive modular Cookie Consent Manager (`SorenCookieConsent`) supporting non-intrusive first-visit prompts, category switches, `localStorage` persistence, and DOM event emissions.

## Technical Context

**Language/Version**: HTML5, Modern Vanilla CSS3, Vanilla ECMAScript (ES2022+), Bun (dev server/tests)  
**Primary Dependencies**: None (Zero-JS-Bloat; no React/Vue or heavy third-party consent libraries)  
**Storage**: Browser `localStorage` (`soren_cookie_consent`) with defensive in-memory fallback  
**Testing**: Multi-viewport Puppeteer/Node verification script (`scripts/verify-legal-pages.mjs`)  
**Target Platform**: Mobile (320px–414px iOS Safari & Android Chrome), Tablet (768px), Desktop (1024px+)  
**Project Type**: Web Application Frontend (Static editorial pages + interactive client module)  
**Performance Goals**: First Contentful Paint < 400ms, Zero Cumulative Layout Shift (CLS = 0), 60fps animations  
**Constraints**: Zero external CDN consent libraries, strict adherence to Soren Café color design tokens  
**Scale/Scope**: 2 dedicated editorial pages, 1 interactive consent manager, 1 in-page search module, cross-page footer integration  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Zero-JS-Bloat & Artisanal Craft UI)**: **PASS** — Implemented entirely in vanilla HTML/CSS/JS without frameworks or third-party trackers.
- **Principle II (Microsecond Runtime & Atomic State)**: **N/A** — Pure client-side static pages & storage; no backend DB mutation required.
- **Principle III (Contract-First & Real-Time Telemetry Observability)**: **PASS** — Contract established in `contracts/cookie-consent-contract.md` with standard DOM events.
- **Principle IV (Test-First & Automated Verification Gates)**: **PASS** — Automated multi-viewport script specified in `scripts/verify-legal-pages.mjs`.
- **Principle V (Frictionless Patron Interaction)**: **PASS** — Cookie consent banner is subtle and bottom-anchored, never blocking menu browsing or checkout.

## Project Structure

### Documentation (this feature)

```text
specs/002-terms-and-cookies/
├── spec.md                  # Feature Specification & Clarifications
├── plan.md                  # This implementation plan
├── research.md              # Phase 0 Architectural Decisions & Rationale
├── data-model.md            # Phase 1 Data Entities & State Machines
├── contracts/
│   └── cookie-consent-contract.md # Phase 1 Contract for API & Events
├── quickstart.md            # Phase 1 Verification & testing guide
└── tasks.md                 # Phase 2 Implementation breakdown
```

### Source Code (repository root)

```text
frontend/
├── pages/
│   ├── terms.html           # Terms & Conditions editorial page
│   └── cookies.html         # Cookie Policy & Preferences editorial page
├── css/
│   └── style.css            # Extended with editorial typography, ToC, consent modal, and print styles
├── main.js                  # SorenCookieConsent & SorenLegalSearch modules integrated
scripts/
└── verify-legal-pages.mjs   # Headless browser verification script
```
