# Implementation Plan: Mobile Landing Page & Menu Detail Unslopping

**Branch**: `001-mobile-menu-detail` | **Date**: 2026-11-02 | **Spec**: [`specs/001-mobile-menu-detail/spec.md`](./spec.md)

**Input**: Feature specification from [`specs/001-mobile-menu-detail/spec.md`](./spec.md)

---

## Summary

Transform the mobile landing page and product catalog of Soren Café (`soren-cafe`) on phone aspect ratio (320px–414px) using the `/unslop` discipline. This plan strips out commercial e-commerce cliches (muddy dark card backgrounds, screaming discount badges, fake strikethrough prices, raw emojis in navigation/footer) and implements an interactive **Artisanal Menu Detail Bottom Sheet** for inspecting coffee terroir, extraction parameters, and tasting notes with direct 1-tap addition to the cart.

The technical approach adheres to a zero-JS-bloat architecture: semantic HTML5, modern CSS3 variables with spring physics, and Vanilla ES6+ modules. All state integrates with the existing `SorenCartStore` in `localStorage` without third-party frameworks or bundlers.

---

## Technical Context

**Language/Version**: Vanilla HTML5, CSS3, ECMAScript 2022+ (Vanilla JavaScript ES Modules), Node.js v18+ / Bun v1.2+ for test harnesses.  
**Primary Dependencies**: None (Zero third-party runtime libraries; native Web APIs: `IntersectionObserver`, `CSS variables`, `navigator.vibrate`, `localStorage`).  
**Storage**: Client-side `localStorage` (`soren_cart_v1`) managed by `SorenCartStore`.  
**Testing**: Headless Chrome CDP via `node scripts/verify-responsive.mjs` (48 responsive checks) and `node scripts/verify-stepper-and-upsell.mjs`.  
**Target Platform**: Mobile smartphone browsers (iOS Safari, Android Chrome, 320px–414px viewports).  
**Project Type**: Client-facing mobile-first web application.  
**Performance Goals**: <50ms bottom sheet presentation latency, zero horizontal layout shift (Persian tabular numerals), 60fps spring transitions, FCP < 400ms.  
**Constraints**: 0 external build step or bundle dependencies, 0 horizontal overflow across 6 standard viewports (320px–1280px).  
**Scale/Scope**: 18 catalog items, mobile landing page shell (drawer, hero, catalog cards, footer, bottom sheet).  

---

## Constitution Check

*GATE: Evaluated against `.specify/memory/constitution.md` (v1.0.0). All gates passed.*

| Principle | Gate Status | Evidence / Architectural Alignment |
|---|---|---|
| **I. Zero-JS-Bloat & Artisanal Craft UI** | **PASS** | Semantic HTML5 and pure CSS3/ES6; no React/Vue or bundler layers. Haptic vibration (`navigator.vibrate(14)`), sub-50ms opening, defensive 2-line title clamping (FR-013), single-badge limit (FR-016), zero-CLS image fallback (FR-017), fluid title/price column stacking on <=360px (FR-019), full-width tasting notes span (FR-020), flex-collapse elimination (FR-021), 2-tier cart item rows on <=480px (FR-022), column-stacked checkout modal footer (FR-023), 1-column payment grid (FR-024), 1-column table selection grid on <=480px (FR-026), flexible table card header with 2-line clamped title (FR-027), kinetic touch-scrollable zone tabs (FR-028), live hold TTL indicators with WCAG AA contrast (FR-029), and 1-column order fields (FR-030). |
| **II. Microsecond Runtime & Atomic State** | **PASS** | Pure client-side UI feature; backend Bun + SQLite WAL engine remains untouched and fully compatible. |
| **III. Contract-First & Real-Time Telemetry** | **PASS** | UI interaction contracts documented in [`contracts/menu-detail-ui-contract.md`](./contracts/menu-detail-ui-contract.md); `data-model.md` specifies all entities. |
| **IV. Test-First & Automated Verification Gates** | **PASS** | Automated headless verification (`verify-responsive.mjs` and `verify-stepper-and-upsell.mjs`) gates execution before release. |
| **V. Frictionless Patron Interaction** | **PASS** | Zero mandatory login or registration barriers; 1-tap add with 400ms auto-dismiss; isolated card steppers prevent accidental sheet opening. |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-mobile-menu-detail/
├── spec.md              # Feature specification & clarification log
├── plan.md              # This implementation plan
├── research.md          # Phase 0 architectural research & decisions
├── data-model.md        # Phase 1 data entities and lifecycle states
├── quickstart.md        # Phase 1 runnable validation scenarios
├── contracts/           # Phase 1 interface contracts
│   └── menu-detail-ui-contract.md
├── checklists/          # Quality verification checklist
│   └── requirements.md
└── tasks.md             # Phase 2 task decomposition (/speckit-tasks)
```

### Source Code (repository root)

```text
frontend/
├── index.html           # Injects bottom sheet markup, removes emojis & discount tags
├── css/
│   └── style.css        # Mobile card white surface refactor, hairline borders, bottom sheet styles
└── main.js              # SorenMenuDetail engine, card event delegation, stepper click isolation

scripts/
├── verify-responsive.mjs         # Headless Chrome multi-viewport responsiveness gate
└── verify-stepper-and-upsell.mjs # Stepper & cart flow verification gate
```

**Structure Decision**: The Soren Café project is a zero-build-step client application with an in-tree Bun backend. Frontend code lives under `frontend/` and is served directly as static assets. All changes are contained within `frontend/index.html`, `frontend/css/style.css`, and `frontend/main.js`.

---

## Complexity Tracking

> **No violations recorded.** Implementation strictly conforms to all constitutional principles.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| *None* | *N/A* | *N/A* |
