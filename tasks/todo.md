# Tasks: Mobile Responsive Overhaul

- [ ] **Task 1: PWA Manifest, Viewport Meta & Mobile CSS Tokens**
  - [ ] Create `frontend/manifest.json`
  - [ ] Add PWA and Apple mobile meta tags to `frontend/index.html`
  - [ ] Define mobile tokens (`dvh`, safe-area insets, touch-target 48px) in `frontend/css/style.css`
  - [ ] Verification: Manifest loads without error, no CSS syntax issues
  - [ ] Commit changes

- [ ] **Task 2: Central Reactive Cart Store (`SorenCartStore`) & Session-Cached Intro**
  - [ ] Implement `SorenCartStore` in `frontend/main.js` with `localStorage` and `soren:cart-changed`
  - [ ] Integrate WebSocket `cart:sync` via `SorenWS`
  - [ ] Implement session-cached intro with `sessionStorage` and touch-to-dismiss
  - [ ] Update CSS for preloader bypass
  - [ ] Verification: Cart state persists on refresh, preloader shows only once per session
  - [ ] Commit changes

- [ ] **Checkpoint 1: Core Foundation & Store**
  - [ ] PWA & tokens verified
  - [ ] Store & session cache verified

- [ ] **Task 3: Minimalist Mobile Top Bar & Off-Canvas Drawer**
  - [ ] Add drawer markup to `frontend/index.html` (hours, contact, barista status)
  - [ ] Style minimal mobile top bar and blurred backdrop drawer in `frontend/css/style.css`
  - [ ] Wire drawer toggle and backdrop dismiss in `frontend/main.js`
  - [ ] Verification: Header stays clean on `< 768px`, drawer opens and closes smoothly
  - [ ] Commit changes

- [ ] **Task 4: Bottom Navigation Bar with Smart Auto-Hide (Thumb Zone)**
  - [ ] Add `.mobile-bottom-nav` markup (Home, Menu, Cart with badge, Account) in `frontend/index.html`
  - [ ] Style bottom nav with safe-area padding and auto-hide transition in `frontend/css/style.css`
  - [ ] Implement scroll headroom auto-hide and badge count listener in `frontend/main.js`
  - [ ] Verification: Auto-hides on downward scroll, reveals on upward scroll, badge updates live
  - [ ] Commit changes

- [ ] **Checkpoint 2: Navigation & Header Complete**
  - [ ] Top bar, drawer, and bottom navigation tested on mobile viewports

- [ ] **Task 5: Single-Surface Catalog with Sticky Category Chips & 2-Column Touch Cards**
  - [ ] Add sticky category chips markup in `frontend/index.html`
  - [ ] Style sticky chips and 2-column mobile product cards with active scale in `frontend/css/style.css`
  - [ ] Wire instant client-side filter, stepper button (+ / count / -) and haptic vibration in `frontend/main.js`
  - [ ] Verification: Chip click filters products instantly without page reload, stepper updates quantity
  - [ ] Commit changes

- [ ] **Task 6: Floating Order Bar & Interactive Cart Bottom Sheet Drawer**
  - [ ] Add floating order bar and cart bottom sheet markup in `frontend/index.html`
  - [ ] Style bottom sheet, drag handle, and price summary in `frontend/css/style.css`
  - [ ] Implement drag-to-dismiss gesture, item re-rendering, and visualViewport handling in `frontend/main.js`
  - [ ] Verification: Bottom sheet opens from bottom, allows quantity adjustment, closes on drag down
  - [ ] Commit changes

- [ ] **Checkpoint 3: Full Mobile Ordering Flow Complete**
  - [ ] End-to-end mobile flow from menu browse to cart bottom sheet works flawlessly

- [ ] **Task 7: Multi-Device Responsive Polish, Verification & Standalone Pages Check**
  - [ ] Polish standalone pages (`cart.html`, `login.html`, category subpages)
  - [ ] Verify zero horizontal scroll (`overflow-x`) on 320px, 360px, 390px, 412px, 768px
  - [ ] Performance check (60fps animations, no console errors)
  - [ ] Commit changes
