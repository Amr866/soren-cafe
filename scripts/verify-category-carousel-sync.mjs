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
const HTML_PATH = path.join(FRONTEND_DIR, 'index.html');
const CSS_PATH = path.join(FRONTEND_DIR, 'css/style.css');
const JS_PATH = path.join(FRONTEND_DIR, 'main.js');

console.log('--- Verifying Task 1: Carousel HTML Structure ---');
const html = fs.readFileSync(HTML_PATH, 'utf8');

const hasCategoryDots = html.includes('id="category-dots"') && html.includes('class="category-carousel-dots"');
assert.ok(hasCategoryDots, 'category-dots element not found in index.html');

const hasCoffeeAttr = /<article[^>]*class="[^"]*category-card[^"]*"[^>]*data-category="coffee"/.test(html);
const hasShakesAttr = /<article[^>]*class="[^"]*category-card[^"]*"[^>]*data-category="shakes"/.test(html);
const hasCakeAttr = /<article[^>]*class="[^"]*category-card[^"]*"[^>]*data-category="cake"/.test(html);

assert.ok(hasCoffeeAttr, 'category-card for coffee missing data-category="coffee"');
assert.ok(hasShakesAttr, 'category-card for shakes missing data-category="shakes"');
assert.ok(hasCakeAttr, 'category-card for cake missing data-category="cake"');

console.log('✅ Task 1 HTML Structure verified successfully!');

console.log('--- Verifying Task 2: CSS Scroll-Snap and Carousel Dots ---');
const css = fs.readFileSync(CSS_PATH, 'utf8');

assert.ok(
  css.includes('.category-carousel-dots') && css.includes('display: none'),
  'category-carousel-dots should be hidden on desktop by default'
);

assert.ok(
  css.includes('scroll-snap-type: x mandatory'),
  'CSS must include scroll-snap-type: x mandatory for mobile carousel'
);

assert.ok(
  css.includes('.carousel-dot.active'),
  'CSS must include .carousel-dot.active with active styling'
);

console.log('✅ Task 2 CSS Scroll-Snap and Dots verified successfully!');

console.log('--- Verifying Task 3: Interactive Headless CDP Synchronization ---');
const js = fs.readFileSync(JS_PATH, 'utf8');
assert.ok(
  js.includes('initCategoryCarouselSync'),
  'initCategoryCarouselSync function not found in main.js'
);
assert.ok(
  js.includes('window.setCatalogCategory'),
  'window.setCatalogCategory export not found in main.js'
);

// CDP Browser verification
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0].split('#')[0];

  // Handle mock API calls from frontend
  if (reqPath.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, data: [] }));
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
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) rej(new Error(data.error.message));
          else res(data.result);
        } else if (data.method) {
          const listeners = this.eventListeners.get(data.method) || [];
          for (const fn of listeners) fn(data.params);
        }
      };
    });
  }
  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = this.msgId++;
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
  }
}

const PORT = 8847;
const CHROME_PORT = 9231;

server.listen(PORT, '127.0.0.1', async () => {
  const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${CHROME_PORT}`,
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-sync',
    '--disable-background-networking',
    '--hide-scrollbars',
    'about:blank'
  ]);

  try {
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
    await cdp.send('Console.enable');

    cdp.ws.addEventListener('message', (ev) => {
      const d = JSON.parse(ev.data);
      if (d.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', d.params.exceptionDetails);
      }
    });
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });

    const loadPromise = new Promise(resolve => cdp.on('Page.loadEventFired', resolve));
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
    await loadPromise;
    await new Promise(r => setTimeout(r, 800));

    // Test 1: Click Dot 2 (Shakes) and verify menu sync
    const res1 = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const dots = document.querySelectorAll('#category-dots .carousel-dot');
        const before = Array.from(dots).map(d => ({ cat: d.dataset.category, cls: d.className }));
        if (dots.length > 1) dots[1].click();
        const after = Array.from(dots).map(d => ({ cat: d.dataset.category, cls: d.className }));
        const activeChip = document.querySelector('.category-chip.active');
        return {
          before,
          after,
          dotsLen: dots.length,
          activeChipCategory: activeChip ? activeChip.dataset.category : null
        };
      })()`,
      returnByValue: true
    });

    const val1 = res1.result ? res1.result.value : res1;
    assert.strictEqual(val1.after[1].cls.includes('active'), true, 'Dot 2 should be active after click');
    assert.strictEqual(val1.activeChipCategory, 'shakes', 'Menu chip should switch to shakes when Dot 2 is clicked');

    // Test 2: Click Dot 3 (Cake) and verify menu sync
    const res2 = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const dots = document.querySelectorAll('#category-dots .carousel-dot');
        dots[2].click(); // Click Cake dot
        const activeChip = document.querySelector('.category-chip.active');
        return {
          dot2Active: dots[2].classList.contains('active'),
          activeChipCategory: activeChip ? activeChip.dataset.category : null
        };
      })()`,
      returnByValue: true
    });

    const val2 = res2.result ? res2.result.value : res2;
    assert.strictEqual(val2.dot2Active, true, 'Dot 3 should be active after click');
    assert.strictEqual(val2.activeChipCategory, 'cake', 'Menu chip should switch to cake when Dot 3 is clicked');

    cdp.close();
    await fetch(`http://127.0.0.1:${CHROME_PORT}/json/close/${tabInfo.id}`);
    console.log('✅ Task 3 CDP interactive synchronization tests passed!');
  } catch (err) {
    console.error('CDP test error:', err);
    process.exit(1);
  } finally {
    try { chromeProcess.kill(); } catch (e) {}
    try { server.close(); } catch (e) {}
    process.exit(0);
  }
});
