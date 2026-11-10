# Quickstart: Terms, Cookies & Consent Verification

**Feature Branch**: `feat/terms-and-cookies` (`002-terms-and-cookies`)  
**Date**: 2026-11-09  

---

## 1. Local Preview & Manual Testing

1. **Serve the frontend locally**:
   ```bash
   bun run dev
   # Or using a simple static server
   npx serve frontend -p 3000
   ```

2. **Navigate to the legal pages**:
   - Terms & Conditions: `http://localhost:3000/pages/terms.html`
   - Cookie Policy & Preferences: `http://localhost:3000/pages/cookies.html`

3. **Verify Interactive Features**:
   - **Scroll-Spy**: Scroll down the page; verify that the sticky sidebar highlights the active section heading.
   - **Quick Search**: Type `"بازپرداخت"` or `"کوکی"` in the search input; verify matching text highlights in amber, the hit counter displays (e.g. `۲ از ۵`), and clicking `↑` / `↓` navigates through occurrences smoothly.
   - **Print / PDF**: Click "چاپ / ذخیره PDF"; verify browser print dialog launches with headers/nav hidden and clear black/white contrast.
   - **Consent Banner & Modal**:
     - Clear `localStorage.removeItem('soren_cookie_consent')` and refresh.
     - Verify bottom banner appears non-intrusively.
     - Click "مدیریت ترجیحات" (Manage Preferences); toggle Analytics/Marketing switches.
     - Save preferences and verify in DevTools: `localStorage.getItem('soren_cookie_consent')`.

---

## 2. Automated Multi-Viewport & Accessibility Gate

Run the automated verification suite:

```bash
# Verify responsiveness across 320px, 375px, 768px, and 1280px viewports
node scripts/verify-legal-pages.mjs
```
