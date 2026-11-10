import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0].split('#')[0];

  if (reqPath.startsWith('/api/v1/products')) {
    const urlObj = new URL(req.url, 'http://localhost:3000');
    const q = (urlObj.searchParams.get('q') || '').toLowerCase().trim();
    const mockProducts = [
      { id: 'prd_espresso', name: 'اسپرسو دوپیو سورن (Soren Doppio)', category: 'coffee', price: 75000, description: 'اتیوپی یرگاچف' },
      { id: 'prd_cortado', name: 'کورتادو پارسه (Parseh Cortado)', category: 'coffee', price: 95000, description: 'اسپرسو با شیر بخارپز' },
      { id: 'prd_latte', name: 'لاته آرت سورن', category: 'coffee', price: 150000, description: 'شیر بخارداده شده ابریشمی' }
    ];
    let filtered = mockProducts;
    if (q) {
      filtered = mockProducts.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(filtered));
    return;
  }

  if (reqPath === '/') reqPath = '/index.html';
  let fullPath = path.join(FRONTEND_DIR, reqPath);
  if (reqPath.startsWith('/assets/')) {
    fullPath = path.join(ROOT_DIR, 'assets', reqPath.replace('/assets/', ''));
  }
  if (!fs.existsSync(fullPath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(fullPath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(fullPath).pipe(res);
});

class SimpleCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
  }
  on(method, fn) {
    const arr = this.eventListeners.get(method) || [];
    arr.push(fn);
    this.eventListeners.set(method, arr);
  }
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.method && this.eventListeners.has(data.method)) {
          for (const fn of this.eventListeners.get(data.method)) fn(data.params);
        }
        if (data.id && this.callbacks.has(data.id)) {
          const cb = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) cb.reject(new Error(data.error.message));
          else cb.resolve(data.result);
        }
      };
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || 'CDP Eval Exception: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }
  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
  }
}

async function findChromePath() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'chrome';
}

const PORT = 8899;
const CHROME_PORT = 9244;

async function main() {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  console.log(`[TEST] HTTP test server listening on http://127.0.0.1:${PORT}`);

  const chromePath = await findChromePath();
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${CHROME_PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    'about:blank'
  ]);

  let tabInfo = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/new?about:blank`, { method: 'PUT' });
      if (res.ok) {
        tabInfo = await res.json();
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  assert.ok(tabInfo, 'Failed to launch Chrome tab');

  const cdp = new SimpleCDP(tabInfo.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const loadPromise = new Promise(resolve => cdp.on('Page.loadEventFired', resolve));
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/pages/products.html` });
  await loadPromise;
  await new Promise(r => setTimeout(r, 800));

  console.log('[TEST] Page loaded successfully');

  // TEST 1: Check live debounced search and card filtering on products.html
  console.log('--- TEST 1: Live Input Event & Debounced Filtering ---');
  const initialCardsCount = await cdp.eval(`document.querySelectorAll('.product-card').length`);
  console.log(`[TEST 1] Initial cards count: ${initialCardsCount}`);
  assert.ok(initialCardsCount > 0, 'No product cards found initially');

  // Trigger input event with "لاته"
  await cdp.eval(`(() => {
    const input = document.querySelector('.desktop-search input');
    input.value = "لاته";
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);

  // Wait for debounce window (350ms total)
  await new Promise(r => setTimeout(r, 350));
  const visibleCardsAfterDebounce = await cdp.eval(`(() => {
    return Array.from(document.querySelectorAll('.product-card')).filter(c => !c.hidden && getComputedStyle(c).display !== 'none').length;
  })()`);
  console.log(`[TEST 1] Visible cards after debounce: ${visibleCardsAfterDebounce} (total was ${initialCardsCount})`);
  assert.ok(visibleCardsAfterDebounce < initialCardsCount, 'Debounced search failed to filter product cards on live input');

  // TEST 2: Special Characters & Regex safety (e.g. "[", "(", "*", "+")
  console.log('--- TEST 2: Special Characters & Regex Safety ---');
  const regexResult = await cdp.eval(`(() => {
    try {
      const input = document.querySelector('.desktop-search input');
      input.value = "([*+?^$|{}])";
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return { success: true };
    } catch(err) {
      return { success: false, error: err.message };
    }
  })()`);
  assert.ok(regexResult.success, 'Special characters caused exception: ' + regexResult.error);
  await new Promise(r => setTimeout(r, 350));

  // TEST 3: Empty State Display on 0 matching items
  console.log('--- TEST 3: Empty State Container Display ---');
  await cdp.eval(`(() => {
    const input = document.querySelector('.desktop-search input');
    input.value = "عبارت_ناموجود_تست_کافه_سورن";
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await new Promise(r => setTimeout(r, 350));
  const emptyStateVisible = await cdp.eval(`(() => {
    const el = document.getElementById('catalog-empty-state') || document.querySelector('.catalog-empty-state');
    return el && !el.hidden && getComputedStyle(el).display !== 'none';
  })()`);
  console.log(`[TEST 3] Empty state visible: ${emptyStateVisible}`);
  assert.ok(emptyStateVisible, 'Catalog empty state container is not visible when 0 products match');

  // TEST 4: Clearing Input restores all items and hides empty state
  console.log('--- TEST 4: Cleared Input State Restoration ---');
  await cdp.eval(`(() => {
    const input = document.querySelector('.desktop-search input');
    input.value = "";
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await new Promise(r => setTimeout(r, 350));
  const visibleAfterClear = await cdp.eval(`(() => {
    return Array.from(document.querySelectorAll('.product-card')).filter(c => !c.hidden && getComputedStyle(c).display !== 'none').length;
  })()`);
  console.log(`[TEST 4] Visible after clearing input: ${visibleAfterClear}`);
  assert.strictEqual(visibleAfterClear, initialCardsCount, 'Clearing search input failed to restore all cards');

  // TEST 5: Arabic / Persian normalization in UI search
  console.log('--- TEST 5: Arabic/Persian Character Normalization ---');
  await cdp.eval(`(() => {
    const input = document.querySelector('.desktop-search input');
    input.value = "\u0643\u0627\u067e\u0648\u0686\u064A\u0646\u0648"; // كاپوچينو with Arabic Kaf and Yeh
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await new Promise(r => setTimeout(r, 350));
  const cappuccinoMatches = await cdp.eval(`(() => {
    return Array.from(document.querySelectorAll('.product-card')).filter(c => !c.hidden && getComputedStyle(c).display !== 'none').length;
  })()`);
  console.log(`[TEST 5] Cappuccino matches with Arabic Kaf/Yeh: ${cappuccinoMatches}`);
  assert.ok(cappuccinoMatches > 0, 'Arabic Kaf/Yeh query failed to match Persian Keheh/Yeh product name');

  // TEST 6: Catalog filtering on Home page (index.html)
  console.log('--- TEST 6: Catalog Filtering on Home Page (index.html) ---');
  const indexLoadPromise = new Promise(resolve => cdp.on('Page.loadEventFired', resolve));
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  await indexLoadPromise;
  await new Promise(r => setTimeout(r, 800));

  const initialFeaturedCards = await cdp.eval(`document.querySelectorAll('#catalog-products-grid .featured-card').length`);
  console.log(`[TEST 6] Initial featured cards on index.html: ${initialFeaturedCards}`);
  assert.ok(initialFeaturedCards > 0, 'No featured cards found on index.html');

  await cdp.eval(`(() => {
    const input = document.querySelector('.desktop-search input');
    input.value = "اسپرسو";
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await new Promise(r => setTimeout(r, 350));

  const visibleFeaturedAfterSearch = await cdp.eval(`(() => {
    return Array.from(document.querySelectorAll('#catalog-products-grid .featured-card')).filter(c => !c.hidden && !c.classList.contains('is-filtered-out') && getComputedStyle(c).display !== 'none').length;
  })()`);
  console.log(`[TEST 6] Visible featured cards after search: ${visibleFeaturedAfterSearch}`);
  assert.ok(visibleFeaturedAfterSearch > 0 && visibleFeaturedAfterSearch < initialFeaturedCards, 'Featured cards were not filtered properly on index.html');

  // TEST 7: URL Query Parameter Hydration
  console.log('--- TEST 7: URL Query Parameter Hydration (?q=...) ---');
  const hydrateLoadPromise = new Promise(resolve => cdp.on('Page.loadEventFired', resolve));
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/pages/products.html?q=${encodeURIComponent('کاپوچینو')}` });
  await hydrateLoadPromise;
  await new Promise(r => setTimeout(r, 800));

  const hydratedInputValue = await cdp.eval(`document.querySelector('.desktop-search input')?.value`);
  const hydratedVisibleCards = await cdp.eval(`(() => {
    return Array.from(document.querySelectorAll('.product-card')).filter(c => !c.hidden && getComputedStyle(c).display !== 'none').length;
  })()`);
  console.log(`[TEST 7] Hydrated input value: "${hydratedInputValue}", visible cards: ${hydratedVisibleCards}`);
  assert.strictEqual(hydratedInputValue, 'کاپوچینو', 'URL query param failed to hydrate search input');
  assert.ok(hydratedVisibleCards > 0 && hydratedVisibleCards < 18, 'Initial search filter was not applied from URL parameter');

  // TEST 8: Dynamic Category Chip Counts and Restoration on Clear (index.html)
  console.log('--- TEST 8: Dynamic Category Chip Counts (index.html) ---');
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  const indexReloadPromise = new Promise(resolve => cdp.on('Page.loadEventFired', resolve));
  await indexReloadPromise;
  await new Promise(r => setTimeout(r, 800));

  const getChipCounts = async () => {
    return await cdp.eval(`(() => {
      const chips = document.querySelectorAll('#category-chips .category-chip');
      const counts = {};
      chips.forEach(c => {
        const cat = c.dataset.category;
        counts[cat] = c.querySelector('.chip-count')?.textContent.trim();
      });
      return counts;
    })()`);
  };

  const initialCounts = await getChipCounts();
  console.log('[TEST 8] Initial chip counts:', initialCounts);
  assert.strictEqual(initialCounts.all, '۱۸', 'Initial "all" chip count should be ۱۸');
  assert.strictEqual(initialCounts.coffee, '۶', 'Initial "coffee" chip count should be ۶');
  assert.strictEqual(initialCounts.shakes, '۶', 'Initial "shakes" chip count should be ۶');
  assert.strictEqual(initialCounts.cake, '۶', 'Initial "cake" chip count should be ۶');

  // Search "کاپوچینو" (which matches 1 coffee item on index)
  await cdp.eval(`(() => {
    const input = document.querySelector('.desktop-search input');
    input.value = "کاپوچینو";
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await new Promise(r => setTimeout(r, 350));

  const cappuccinoCounts = await getChipCounts();
  console.log('[TEST 8] Chip counts after searching "کاپوچینو":', cappuccinoCounts);
  assert.strictEqual(cappuccinoCounts.coffee, '۱', 'Coffee chip count should be ۱ for "کاپوچینو"');
  assert.strictEqual(cappuccinoCounts.shakes, '۰', 'Shakes chip count should be ۰ for "کاپوچینو"');
  assert.strictEqual(cappuccinoCounts.cake, '۰', 'Cake chip count should be ۰ for "کاپوچینو"');
  assert.strictEqual(cappuccinoCounts.all, '۱', 'All chip count should be ۱ for "کاپوچینو"');

  // Search "اسپرسو" (which matches 6 coffee items and 1 tiramisu on index)
  await cdp.eval(`(() => {
    const input = document.querySelector('.desktop-search input');
    input.value = "اسپرسو";
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await new Promise(r => setTimeout(r, 350));

  const espressoCounts = await getChipCounts();
  console.log('[TEST 8] Chip counts after searching "اسپرسو":', espressoCounts);
  assert.strictEqual(espressoCounts.coffee, '۶', 'Coffee chip count should be ۶ for "اسپرسو"');
  assert.strictEqual(espressoCounts.shakes, '۰', 'Shakes chip count should be ۰ for "اسپرسو"');
  assert.strictEqual(espressoCounts.cake, '۱', 'Cake chip count should be ۱ for "اسپرسو" (tiramisu with espresso)');
  assert.strictEqual(espressoCounts.all, '۷', 'All chip count should be ۷ for "اسپرسو"');

  // Clear search and verify restoration
  await cdp.eval(`(() => {
    const input = document.querySelector('.desktop-search input');
    input.value = "";
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await new Promise(r => setTimeout(r, 350));

  const restoredCounts = await getChipCounts();
  console.log('[TEST 8] Restored chip counts:', restoredCounts);
  assert.strictEqual(restoredCounts.all, '۱۸', 'Restored "all" count should be ۱۸');
  assert.strictEqual(restoredCounts.coffee, '۶', 'Restored "coffee" count should be ۶');
  assert.strictEqual(restoredCounts.shakes, '۶', 'Restored "shakes" count should be ۶');
  assert.strictEqual(restoredCounts.cake, '۶', 'Restored "cake" count should be ۶');

  // TEST 9: Seamless Bilingual English Search
  console.log('--- TEST 9: Seamless Bilingual English Search ---');
  // 1. Search "cheesecake"
  await cdp.eval(`(() => {
    const input = document.querySelector('.desktop-search input');
    input.value = "cheesecake";
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await new Promise(r => setTimeout(r, 350));

  const cheesecakeCounts = await getChipCounts();
  console.log('[TEST 9] Chip counts for English "cheesecake":', cheesecakeCounts);
  assert.strictEqual(cheesecakeCounts.cake, '۱', 'Cake chip count should be ۱ for English "cheesecake"');
  assert.strictEqual(cheesecakeCounts.coffee, '۰', 'Coffee chip count should be ۰ for English "cheesecake"');

  // 2. Search "latte"
  await cdp.eval(`(() => {
    const input = document.querySelector('.desktop-search input');
    input.value = "latte";
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await new Promise(r => setTimeout(r, 350));

  const latteCounts = await getChipCounts();
  assert.strictEqual(latteCounts.coffee, '۲', 'Coffee chip count should be ۲ for English "latte" (latte and cappuccino with latte art)');

  // 3. Search "shake"
  await cdp.eval(`(() => {
    const input = document.querySelector('.desktop-search input');
    input.value = "shake";
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await new Promise(r => setTimeout(r, 350));

  const shakeCounts = await getChipCounts();
  console.log('[TEST 9] Chip counts for English "shake":', shakeCounts);
  assert.strictEqual(shakeCounts.shakes, '۶', 'Shakes chip count should be ۶ for English "shake"');

  // TEST 10: Enter Key Smooth-Scrolls to #menu
  console.log('--- TEST 10: Enter Key Smooth-Scrolls to #menu on index.html ---');
  await cdp.eval(`window.scrollTo(0, 0);`);
  await new Promise(r => setTimeout(r, 100));

  const scrollBefore = await cdp.eval(`window.scrollY`);
  console.log('[TEST 10] Scroll Y before Enter:', scrollBefore);

  await cdp.eval(`(() => {
    const input = document.querySelector('.desktop-search input');
    input.value = "اسپرسو";
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(event);
  })()`);
  await new Promise(r => setTimeout(r, 800));

  const scrollAfter = await cdp.eval(`window.scrollY`);
  const menuTop = await cdp.eval(`document.getElementById('menu')?.getBoundingClientRect().top`);
  console.log(`[TEST 10] Scroll Y after Enter: ${scrollAfter}, Menu bounding top: ${menuTop}`);
  assert.ok(scrollAfter > 200, 'Page should have scrolled down to the menu after pressing Enter');

  // TEST 11: Hover on Menu Item Card turns Title Yellow (#fde68a)
  console.log('--- TEST 11: Hover on Menu Item Card turns Title Yellow (#fde68a) ---');
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const doc = await cdp.send('DOM.getDocument');
  const cardNode = await cdp.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '.featured-card' });
  await cdp.send('CSS.forcePseudoState', { nodeId: cardNode.nodeId, forcedPseudoClasses: ['hover'] });
  await new Promise(r => setTimeout(r, 400));

  const hoveredTitleColor = await cdp.eval(`(() => {
    const card = document.querySelector('.featured-card');
    const h3 = card.querySelector('h3');
    return getComputedStyle(h3).color;
  })()`);
  console.log('[TEST 11] Hovered title computed color:', hoveredTitleColor);
  assert.strictEqual(hoveredTitleColor, 'rgb(253, 230, 138)', 'Menu card title should turn yellow (rgb(253, 230, 138) / #fde68a) on hover');

  // Cleanup
  console.log('✅ ALL SEARCH & HOVER SUITE TESTS PASSED (11/11)!');
  cdp.close();
  chromeProcess.kill();
  server.close();
  process.exit(0);
}


main().catch((err) => {
  console.error('❌ Search test failed:', err);
  process.exit(1);
});
