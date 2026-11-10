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
    const mockProducts = [
      { id: 'prd_espresso_double', name: 'اسپرسو دبل', category: 'coffee', price: 95000 },
      { id: 'prd_latte', name: 'لاته آرت سورن', category: 'coffee', price: 150000 },
      { id: 'prd_shake_choc', name: 'شیک شکلات', category: 'shakes', price: 180000 },
      { id: 'prd_cheesecake', name: 'چیزکیک نیویورکی', category: 'cake', price: 180000 }
    ];
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(mockProducts));
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

const PORT = 8895;
const CHROME_PORT = 9245;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  console.log(`[TEST] HTTP test server listening on http://127.0.0.1:${PORT}`);

  const chromePath = await findChromePath();
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${CHROME_PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--remote-allow-origins=*',
    '--window-size=390,844'
  ]);

  await sleep(1500);

  let versionData;
  try {
    const res = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/list`);
    const tabs = await res.json();
    versionData = tabs[0];
  } catch (err) {
    console.error('Failed to connect to Chrome CDP endpoint:', err);
    chromeProcess.kill();
    server.close();
    process.exit(1);
  }

  const cdp = new SimpleCDP(versionData.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true
  });

  try {
    console.log('--- TEST 1: Mobile Header Search Button Visibility (index.html) ---');
    const loadPromise1 = new Promise(resolve => cdp.on('Page.loadEventFired', resolve));
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
    await loadPromise1;
    await sleep(800);

    const debugInfo = await cdp.eval(`(() => {
      const btn = document.querySelector('.mobile-search');
      if (!btn) return { exists: false };
      const style = window.getComputedStyle(btn);
      return {
        exists: true,
        width: window.innerWidth,
        display: style.display,
        visibility: style.visibility,
        parentClass: btn.parentElement?.className,
        parentDisplay: window.getComputedStyle(btn.parentElement).display
      };
    })()`);
    console.log(`[TEST 1] Mobile search button debug info:`, debugInfo);
    assert.strictEqual(debugInfo.display !== 'none' && debugInfo.visibility !== 'hidden', true, 'Mobile search button should be visible on mobile viewport');

    console.log('--- TEST 2: Tap Mobile Search Button Scrolls & Focuses #menu-quick-search ---');
    await cdp.eval(`document.querySelector('.mobile-search').click()`);
    await sleep(600);

    const searchState = await cdp.eval(`(() => {
      const input = document.getElementById('menu-quick-search');
      const wrapper = document.getElementById('menu-search-wrapper');
      return {
        hasInput: Boolean(input),
        isFocused: document.activeElement === input,
        scrollY: window.scrollY,
        hasHighlight: wrapper ? wrapper.classList.contains('has-highlight') : false
      };
    })()`);
    console.log(`[TEST 2] Search state on tap:`, searchState);
    assert.strictEqual(searchState.hasInput, true, '#menu-quick-search must exist in DOM');
    assert.ok(searchState.scrollY > 500, 'Page should smooth-scroll down to catalog section');
    assert.strictEqual(searchState.isFocused, true, '#menu-quick-search should be focused after tap');

    console.log('--- TEST 3: Typing in #menu-quick-search Filters Cards and Switches Category ---');
    await cdp.eval(`(() => {
      const input = document.getElementById('menu-quick-search');
      input.value = "لاته";
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await sleep(400);

    const filterResult = await cdp.eval(`(() => {
      const cards = Array.from(document.querySelectorAll('.featured-card'));
      const visible = cards.filter(c => !c.hidden && window.getComputedStyle(c).display !== 'none');
      const clearBtn = document.getElementById('menu-search-clear');
      return {
        totalCards: cards.length,
        visibleCards: visible.length,
        clearVisible: clearBtn ? !clearBtn.hidden : false
      };
    })()`);
    console.log(`[TEST 3] Filter result for "لاته":`, filterResult);
    assert.ok(filterResult.visibleCards > 0 && filterResult.visibleCards < filterResult.totalCards, 'Filter should reduce visible cards');
    assert.strictEqual(filterResult.clearVisible, true, 'Clear button should become visible when input has text');

    console.log('--- TEST 4: Clear Button Resets Search and Restores Catalog ---');
    await cdp.eval(`document.getElementById('menu-search-clear').click()`);
    await sleep(400);

    const clearResult = await cdp.eval(`(() => {
      const input = document.getElementById('menu-quick-search');
      const cards = Array.from(document.querySelectorAll('.featured-card'));
      const visible = cards.filter(c => !c.hidden && window.getComputedStyle(c).display !== 'none');
      const activeChip = document.querySelector('.category-chip.active');
      return {
        inputValue: input.value,
        visibleCards: visible.length,
        activeCategory: activeChip ? activeChip.dataset.category : null
      };
    })()`);
    console.log(`[TEST 4] Clear result:`, clearResult);
    assert.strictEqual(clearResult.inputValue, '', 'Input should be cleared');
    assert.strictEqual(clearResult.activeCategory, 'coffee', 'FR-016: Previous active category should be restored');
    assert.strictEqual(clearResult.visibleCards, 6, 'Restored category items should be visible');

    console.log('--- TEST 5: Subpage Mobile Search Redirects to index.html with focus_search ---');
    const loadPromiseProducts = new Promise(resolve => cdp.on('Page.loadEventFired', resolve));
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/pages/products.html` });
    await loadPromiseProducts;
    await sleep(800);

    const redirectPromise = new Promise(resolve => cdp.on('Page.loadEventFired', resolve));
    await cdp.eval(`document.querySelector('.mobile-search').click()`);
    await redirectPromise;
    await sleep(1000);

    const redirectState = await cdp.eval(`(() => {
      const input = document.getElementById('menu-quick-search');
      return {
        url: window.location.href,
        hasInput: Boolean(input),
        isFocused: document.activeElement === input,
        scrollY: window.scrollY
      };
    })()`);
    console.log(`[TEST 5] Subpage search redirect result:`, redirectState);
    assert.ok(redirectState.url.includes('focus_search=1'), 'URL should include focus_search query parameter');
    assert.strictEqual(redirectState.hasInput, true, 'Navigated to page with #menu-quick-search');
    assert.ok(redirectState.scrollY > 500, 'Page scrolled to menu section');

    console.log('✅ ALL MOBILE SEARCH BUTTON TESTS PASSED (5/5)!');
  } finally {
    cdp.close();
    chromeProcess.kill();
    server.close();
  }
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
