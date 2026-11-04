# Mobile Phone Sizing & Academic Demo Footer Redesign Spec

**Date:** 2026-11-02  
**Context:** University project demo for professor grading.  
**Branch:** `feat/mobile-landing-unslop` in worktree `d:/projects/soren-cafe-mobile-unslop`.

---

## 1. Intent & The Why
The goal is to elevate the mobile landing page from an "AI-generated school assignment" look into an impressive, production-grade product that earns an A+ from the professor.
Currently:
1. **Phone Ratio Scale:** The category cards in mobile use `16 / 9` aspect ratio, making them squished (~195px height), narrow, and diminutive on vertical smartphone displays.
2. **Footer:** The footer contains an obsolete, redundant multi-column sitemap (`خانه`, `منو`, `درباره ما`...) that clumsily duplicates the sticky bottom navigation bar, with generic placeholder copy and oversized empty social boxes.

---

## 2. Goals & Non-Goals

### Goals
- **Immersive Mobile Card Proportions:** Switch `.category-card` on mobile to `aspect-ratio: 4 / 5` (min-height ~350px), giving the coffee photography, badge, typography, and button generous breathing room and rich presence.
- **High-Craft Mobile Footer (Approach 1: Functional Hospitality & Live Status):**
  - **Live Opening Status:** Elegant pill with a green dot (`● هم‌اکنون باز است · تا ساعت ۲۳:۳۰`) showing the cafe is currently open.
  - **Quick Tactile Actions:** 44px tap targets for "تماس سریع" (`tel:021...`) and "مسیریابی" (Google Maps / Balad / Neshan link), responsive with `scale(0.97)` on press.
  - **Social Handles:** High-contrast, clean Telegram and Instagram badges displaying real handles (`@sorencafe`).
  - **Academic Demo Attribution:** A quiet, respectful signoff indicating the academic demo context (`پروژه دانشگاهی طراحی وب · کافه سورن`).
  - **Clean Safe Area:** Proper bottom spacing ensuring no clash with the sticky bottom navigation bar.

### Non-Goals
- Adding complex backend reservation systems or payment gateways.
- Modifying desktop or tablet layouts (> 640px) which already look great.

### Anti-Goals
- Keeping redundant sitemap links that duplicate the bottom navbar.
- AI clichés like glowing borders, purple gradients, or empty hype copy.

---

## 3. Approaches Considered
- **Approach 1 (Selected):** Functional Hospitality & Live Status Card. Best for professor demo because it exhibits realistic domain-specific UX (operating hours, live status, working call/map actions).
- **Approach 2:** Ultra-Minimalist Signoff (Only logo and copyright). Clean, but misses the opportunity to demonstrate rich interactive UI to the professor.
- **Approach 3:** Heavy Corporate Multi-Column Sitemap. Rejected as slop that fails modern mobile design standards.

---

## 4. Technical Specifications
- **Files Modified:**
  - `frontend/index.html`: Footer structure rewritten into a unified, high-craft mobile footer component.
  - `frontend/css/style.css`: Mobile rules for category card aspect ratio (`4 / 5`), font sizing, and footer styling.
- **Validation:**
  - `scripts/verify-category-carousel-sync.mjs`: Must continue to pass all sync tests.
  - `scripts/verify-responsive.mjs`: Must continue to pass 48/48 multi-device tests with 0px overflow across all 8 pages.
