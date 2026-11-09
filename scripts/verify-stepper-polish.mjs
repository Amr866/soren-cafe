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

const PORT = 8877;
const CHROME_PORT = 9255;

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
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  await loadPromise;
  await new Promise(r => setTimeout(r, 800));

  console.log('[TEST] index.html loaded successfully');

  // TEST 1: Initial Add-to-Cart reveals stepper and persists at 1000ms (NOT collapsing at 500ms)
  console.log('--- TEST 1: Stepper 2000ms Inactivity Duration ---');
  await cdp.eval(`(() => {
    const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
    const addBtn = card.querySelector('.card-add-btn');
    addBtn.click();
  })()`);

  // At 1000ms, the stepper MUST still be visible (a 500ms timer would have already collapsed it)
  await new Promise(r => setTimeout(r, 1000));
  const isVisibleAt1000ms = await cdp.eval(`(() => {
    const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
    const stepper = card.querySelector('.card-stepper');
    return !!stepper && !stepper.classList.contains('is-collapsing');
  })()`);
  console.log(`[TEST 1] Stepper visible at 1000ms: ${isVisibleAt1000ms}`);
  assert.ok(isVisibleAt1000ms, 'Stepper collapsed prematurely before 2000ms (e.g. at old 500ms timer)!');

  // At 2300ms total (1000ms + 1300ms), the stepper should be collapsed
  await new Promise(r => setTimeout(r, 1300));
  const isCollapsedAt2300ms = await cdp.eval(`(() => {
    const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
    const stepper = card.querySelector('.card-stepper');
    const pill = card.querySelector('.card-in-cart-pill');
    return !stepper && !!pill;
  })()`);
  console.log(`[TEST 1] Stepper collapsed into pill at 2300ms: ${isCollapsedAt2300ms}`);
  assert.ok(isCollapsedAt2300ms, 'Stepper did not collapse into compact pill indicator after 2000ms!');

  // TEST 2: Clicking collapsed pill brings controls back
  console.log('--- TEST 2: Click to Bring Stepper Back ---');
  await cdp.eval(`(() => {
    const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
    const pillBtn = card.querySelector('.card-add-btn.has-items') || card.querySelector('.card-in-cart-pill');
    pillBtn.click();
  })()`);
  await new Promise(r => setTimeout(r, 100));
  const stepperReopened = await cdp.eval(`(() => {
    const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
    return !!card.querySelector('.card-stepper');
  })()`);
  console.log(`[TEST 2] Stepper brought back: ${stepperReopened}`);
  assert.ok(stepperReopened, 'Clicking collapsed indicator failed to bring stepper back');

  // TEST 3: Hover pauses countdown
  console.log('--- TEST 3: Hover Pauses Countdown ---');
  // Dispatch mouseover to pause countdown
  await cdp.eval(`(() => {
    const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
    const stepper = card.querySelector('.card-stepper');
    stepper.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  })()`);

  // Wait 2200ms while hovering; stepper must NOT collapse
  await new Promise(r => setTimeout(r, 2200));
  const isStillVisibleOnHover = await cdp.eval(`(() => {
    const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
    const stepper = card.querySelector('.card-stepper');
    return !!stepper && !stepper.classList.contains('is-collapsing');
  })()`);
  console.log(`[TEST 3] Stepper paused on hover: ${isStillVisibleOnHover}`);
  assert.ok(isStillVisibleOnHover, 'Stepper collapsed while being hovered!');

  // Dispatch mouseout; countdown should resume and collapse after 2000ms
  await cdp.eval(`(() => {
    const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
    const stepper = card.querySelector('.card-stepper');
    stepper.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: card }));
  })()`);
  await new Promise(r => setTimeout(r, 2300));
  const collapsedAfterHoverExit = await cdp.eval(`(() => {
    const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
    return !card.querySelector('.card-stepper');
  })()`);
  console.log(`[TEST 3] Stepper collapsed after hover exit: ${collapsedAfterHoverExit}`);
  assert.ok(collapsedAfterHoverExit, 'Stepper failed to collapse 2000ms after hover exit');

  // TEST 4: Immediate revert when quantity reaches 0
  console.log('--- TEST 4: Immediate Revert on Quantity 0 ---');
  // Open stepper again
  await cdp.eval(`(() => {
    const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
    card.querySelector('.card-add-btn').click();
  })()`);
  await new Promise(r => setTimeout(r, 50));

  // Click minus to reduce from 1 to 0
  await cdp.eval(`(() => {
    const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
    const minus = card.querySelector('.stepper-minus');
    minus.click();
  })()`);

  // Immediately check that it reverted to default Add to Cart button (0ms delay)
  const isDefaultButtonImmediately = await cdp.eval(`(() => {
    const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
    const stepper = card.querySelector('.card-stepper');
    const addBtn = card.querySelector('.card-add-btn');
    const hasItems = addBtn?.classList.contains('has-items');
    return !stepper && !!addBtn && !hasItems;
  })()`);
  console.log(`[TEST 4] Reverted to default Add button immediately on qty 0: ${isDefaultButtonImmediately}`);
  assert.ok(isDefaultButtonImmediately, 'Failed to revert immediately to default Add to Cart button on 0 quantity');

  console.log('✅ ALL STEPPER POLISH TESTS PASSED!');
  cdp.close();
  chromeProcess.kill();
  server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Stepper polish test failed:', err);
  process.exit(1);
});
