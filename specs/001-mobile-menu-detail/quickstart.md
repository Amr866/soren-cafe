# Quickstart & Verification Guide: Mobile Landing Page & Menu Detail Unslopping

**Feature Branch**: `001-mobile-menu-detail`  
**Date**: 2026-11-02  
**Status**: Completed  

---

## 1. Prerequisites

- **Bun Runtime**: v1.2+ installed
- **Node.js**: v18+ (for running CDP verification scripts)
- **Chrome / Chromium**: installed locally for headless test execution

Verify tools:
```powershell
bun --version
node --version
```

---

## 2. Local Development Server

Start the Soren Café backend and static server:
```powershell
bun run dev
```
The application will be accessible at `http://localhost:3000`.

---

## 3. Automated Verification Suites

### 3.1 Multi-Viewport Responsive & Overflow Gate (SC-001)
Proves zero horizontal overflow (`scrollWidth <= viewportWidth`) across 6 standardized screen sizes (320px, 360px, 390px, 412px, 768px, 1280px):
```powershell
node scripts/verify-responsive.mjs
```
**Expected Outcome**: All 48 responsive layout checks exit with code 0 and `0px overflow`.

### 3.2 Stepper, Cart & Menu Detail Verification Gate (SC-002, SC-006)
Validates that card taps open the bottom sheet, stepper `+`/`−` buttons remain isolated, and cart additions reflect tabular pricing:
```powershell
node scripts/verify-stepper-and-upsell.mjs
```
**Expected Outcome**: 100% assertions pass, verifying bottom sheet opening, 400ms auto-dismiss, and store persistence.

---

## 4. Manual Verification Walkthrough (Phone Aspect Ratio)

1. **Launch Mobile Inspection**:
   - Open Chrome DevTools (`Ctrl + Shift + I`).
   - Toggle Device Toolbar (`Ctrl + Shift + M`).
   - Select **iPhone 14 Pro (393 x 852)** or **iPhone SE (375 x 667)**.
2. **Inspect Catalog Cards & Defensive Constraints (US2, FR-013, FR-016, FR-017)**:
   - Verify card backgrounds are luminous `#FFFFFF` surfaces with subtle `#8c5e3c24` borders against the ivory page background.
   - Verify zero commercial discount badges (`۲۱٪ تخفیف`) or strikethrough prices exist; only a single authentic provenance tag (e.g. `عصاره‌گیری ۹ بار`) is displayed.
   - Verify product titles clamp to max 2 lines on compact 320px/360px screens without pushing buttons out of horizontal alignment.
   - Verify failed image loads display the elegant Soren emblem fallback rather than browser broken-image icons.
3. **Trigger Menu Detail Bottom Sheet (US1)**:
   - Tap on the "اسپرسو دبل" card body (outside the stepper button).
   - Confirm the bottom sheet slides up with blurred backdrop in <50ms.
   - Verify roast origin, brew method, serving temperature, and tasting notes render in the 2-column grid.
4. **Test Isolated Stepper**:
   - Close the sheet. Tap the `+` button directly on the card.
   - Confirm the quantity increments to `۱` with haptic feedback, without triggering the bottom sheet.
5. **Test 1-Tap Add & Auto-Dismiss**:
   - Reopen the detail sheet. Tap "افزودن به سبد خرید".
   - Confirm the button shows confirmation feedback and automatically dismisses after ~400ms, updating the floating bottom bar count.
