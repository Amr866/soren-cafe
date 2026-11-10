# Client Contract: Cookie Consent & Legal Interactions

**Feature Branch**: `feat/terms-and-cookies` (`002-terms-and-cookies`)  
**Date**: 2026-11-09  
**Status**: Completed  

---

## 1. JavaScript API: `window.SorenCookieConsent`

The consent manager is exposed globally on `window` as `SorenCookieConsent`.

```typescript
interface SorenCookieConsentAPI {
  /**
   * Initializes consent listeners and checks storage.
   */
  init(): void;

  /**
   * Retrieves the current active consent record.
   * Returns default record if not yet established.
   */
  getConsent(): CookieConsentRecord;

  /**
   * Checks whether a specific category has user consent.
   * Strictly necessary is always true.
   */
  hasConsent(category: 'strictly_necessary' | 'analytics' | 'functional' | 'marketing'): boolean;

  /**
   * Updates and saves category choices to localStorage.
   * Emits 'soren:cookie-consent-updated' event.
   */
  setConsent(categories: Partial<Record<'analytics' | 'functional' | 'marketing', boolean>>): void;

  /**
   * Sets all categories to true and dismisses dialogs.
   */
  acceptAll(): void;

  /**
   * Sets non-essential categories to false and strictly_necessary to true.
   */
  rejectNonEssential(): void;

  /**
   * Opens the preferences modal drawer with focus trapped.
   */
  openPreferencesModal(): void;

  /**
   * Closes the preferences modal drawer.
   */
  closePreferencesModal(): void;
}
```

---

## 2. Custom DOM Events

### `soren:cookie-consent-updated`

Dispatched on `window` whenever consent choices are created or modified.

**Event Payload (`event.detail`)**:
```json
{
  "version": 1,
  "timestamp": "2026-11-09T22:30:00.000Z",
  "categories": {
    "strictly_necessary": true,
    "analytics": true,
    "functional": false,
    "marketing": false
  }
}
```

**Subscriber Example**:
```javascript
window.addEventListener("soren:cookie-consent-updated", (event) => {
  const { categories } = event.detail;
  if (categories.analytics) {
    // Initialize Bun client telemetry or telemetry ping
    console.log("[Consent] Analytics enabled by user.");
  } else {
    // Disable or tear down analytics observers
    console.log("[Consent] Analytics disabled by user.");
  }
});
```

---

## 3. DOM Component Contracts

### 3.1 Cookie Banner (`#cookie-consent-banner`)
- **Mount Point**: Root `<body>`, appended or declared statically at end of HTML.
- **Attributes**: `role="region"`, `aria-label="اعلان کوکی و حریم خصوصی"`
- **Required Action Buttons**:
  - `[data-consent-action="accept-all"]`: Triggers `acceptAll()`
  - `[data-consent-action="reject-all"]`: Triggers `rejectNonEssential()`
  - `[data-consent-action="open-preferences"]`: Triggers `openPreferencesModal()`

### 3.2 Cookie Preference Modal (`#cookie-preference-modal`)
- **Container**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="cookie-modal-title"`
- **Category Switch Controls**:
  - `<button type="button" role="switch" id="cookie-switch-strictly" aria-checked="true" disabled>`
  - `<button type="button" role="switch" id="cookie-switch-analytics" aria-checked="false">`
  - `<button type="button" role="switch" id="cookie-switch-functional" aria-checked="false">`
  - `<button type="button" role="switch" id="cookie-switch-marketing" aria-checked="false">`
- **Dismiss Triggers**:
  - `[data-modal-close]` or `Escape` key.
  - Clicking backdrop overlay `#cookie-modal-backdrop`.

### 3.3 Quick Search Component (`#legal-search-input`)
- **Container**: `<div class="legal-search-box">`
- **Elements**:
  - `<input type="search" id="legal-search-input" placeholder="جستجو در متن قوانین (مثال: بازپرداخت، کوکی، نگهداری)..." aria-label="جستجوی مفاد و بندها">`
  - `<span id="legal-search-count" aria-live="polite">۰ نتیجه</span>`
  - `<button type="button" id="legal-search-prev" aria-label="نتیجه قبلی" disabled>↑</button>`
  - `<button type="button" id="legal-search-next" aria-label="نتیجه بعدی" disabled>↓</button>`
