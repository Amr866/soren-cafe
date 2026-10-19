# Tasks: Mobile Responsive Overhaul

- [x] **Task 1: PWA Manifest, Viewport Meta & Mobile CSS Tokens**
  - [x] Create `frontend/manifest.json`
  - [x] Add PWA and Apple mobile meta tags to `frontend/index.html`
  - [x] Define mobile tokens (`dvh`, safe-area insets, touch-target 48px) in `frontend/css/style.css`
  - [x] Verification: Manifest loads without error, no CSS syntax issues
  - [x] Commit changes

- [x] **Task 2: Central Reactive Cart Store (`SorenCartStore`) & Session-Cached Intro**
  - [x] Implement `SorenCartStore` in `frontend/main.js` with `localStorage` and `soren:cart-changed`
  - [x] Integrate WebSocket `cart:sync` via `SorenWS`
  - [x] Implement session-cached intro with `sessionStorage` and touch-to-dismiss
  - [x] Update CSS for preloader bypass
  - [x] Verification: Cart state persists on refresh, preloader shows only once per session
  - [x] Commit changes

- [x] **Checkpoint 1: Core Foundation & Store**
  - [x] PWA & tokens verified
  - [x] Store & session cache verified

- [x] **Task 3: Minimalist Mobile Top Bar & Off-Canvas Drawer**
  - [x] Add drawer markup to `frontend/index.html` (hours, contact, barista status)
  - [x] Style minimal mobile top bar and blurred backdrop drawer in `frontend/css/style.css`
  - [x] Wire drawer toggle and backdrop dismiss in `frontend/main.js`
  - [x] Verification: Header stays clean on `< 768px`, drawer opens and closes smoothly
  - [x] Commit changes

- [x] **Task 4: Bottom Navigation Bar with Smart Auto-Hide (Thumb Zone)**
  - [x] Add `.mobile-bottom-nav` markup (Home, Menu, Cart with badge, Account) in `frontend/index.html`
  - [x] Style bottom nav with safe-area padding and auto-hide transition in `frontend/css/style.css`
  - [x] Implement scroll headroom auto-hide and badge count listener in `frontend/main.js`
  - [x] Verification: Auto-hides on downward scroll, reveals on upward scroll, badge updates live
  - [x] Commit changes

- [x] **Checkpoint 2: Navigation & Header Complete**
  - [x] Top bar, drawer, and bottom navigation tested on mobile viewports

- [x] **Task 5: Single-Surface Catalog with Sticky Category Chips & 2-Column Touch Cards**
  - [x] Add sticky category chips markup in `frontend/index.html`
  - [x] Style sticky chips and 2-column mobile product cards with active scale in `frontend/css/style.css`
  - [x] Wire instant client-side filter, stepper button (+ / count / -) and haptic vibration in `frontend/main.js`
  - [x] Verification: Chip click filters products instantly without page reload, stepper updates quantity
  - [x] Commit changes

- [x] **Task 6: Floating Order Bar & Interactive Cart Bottom Sheet Drawer**
  - [x] Add floating order bar and cart bottom sheet markup in `frontend/index.html`
  - [x] Style bottom sheet, drag handle, and price summary in `frontend/css/style.css`
  - [x] Implement drag-to-dismiss gesture, item re-rendering, and visualViewport handling in `frontend/main.js`
  - [x] Verification: Bottom sheet opens from bottom, allows quantity adjustment, closes on drag down
  - [x] Commit changes

- [x] **Checkpoint 3: Full Mobile Ordering Flow Complete**
  - [x] End-to-end mobile flow from menu browse to cart bottom sheet works flawlessly

- [x] **Task 7: Multi-Device Responsive Polish, Verification & Standalone Pages Check**
  - [x] Polish standalone pages (`cart.html`, `login.html`, category subpages)
  - [x] Verify zero horizontal scroll (`overflow-x`) on 320px, 360px, 390px, 412px, 768px, 1280px
  - [x] Performance check (60fps animations, no console errors)
  - [x] Commit changes
