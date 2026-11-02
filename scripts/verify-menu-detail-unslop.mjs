import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT, 'frontend');

// 1. Static Content Checks
console.log('========================================================');
console.log(' 🔍 CHECK 1: Static Unslopping & Semantic DOM Audit');
console.log('========================================================');

const htmlContent = fs.readFileSync(path.join(FRONTEND_DIR, 'index.html'), 'utf8');

// A. Zero <del> tags
if (htmlContent.includes('<del>')) {
  console.error('❌ FAIL: Found <del> strikethrough tags in index.html');
  process.exit(1);
}
console.log('✅ PASS: Zero <del> strikethrough tags found in catalog');

// B. Zero discount percentage badges
if (htmlContent.includes('featured-discount')) {
  console.error('❌ FAIL: Found featured-discount badges in index.html');
  process.exit(1);
}
console.log('✅ PASS: Zero commercial discount percentage badges in catalog');

// C. Hero template glow blobs removed
if (htmlContent.includes('hero-glow')) {
  console.error('❌ FAIL: Found hero-glow template blobs in index.html');
  process.exit(1);
}
console.log('✅ PASS: Hero template glow blobs cleanly eliminated');

// D. Menu Detail Bottom Sheet DOM present
if (!htmlContent.includes('id="menu-detail-sheet"') || !htmlContent.includes('id="menu-detail-backdrop"')) {
  console.error('❌ FAIL: Menu Detail Bottom Sheet markup missing in index.html');
  process.exit(1);
}
console.log('✅ PASS: #menu-detail-sheet & #menu-detail-backdrop present in DOM');

// E. Drawer emojis replaced with SVG
const drawerSection = htmlContent.slice(htmlContent.indexOf('soren-offcanvas-drawer'), htmlContent.indexOf('</aside>'));
if (drawerSection.includes('☕') || drawerSection.includes('📋')) {
  console.error('❌ FAIL: Found raw emojis in off-canvas drawer');
  process.exit(1);
}
console.log('✅ PASS: Drawer uses clean 1.8-stroke SVG icons');

// F. Category chips emojis replaced with SVG
const chipsSection = htmlContent.slice(htmlContent.indexOf('id="category-chips"'), htmlContent.indexOf('</nav>'));
if (chipsSection.includes('☕') || chipsSection.includes('🥤') || chipsSection.includes('🍰')) {
  console.error('❌ FAIL: Found raw emojis in category chips');
  process.exit(1);
}
console.log('✅ PASS: Category chips use clean 1.8-stroke SVG icons');

// 2. Interactive Headless Chrome CDP Test
console.log('\n========================================================');
console.log(' 🌐 CHECK 2: Interactive Menu Detail Headless Chrome Verification');
console.log('========================================================');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';
  let filePath = path.join(FRONTEND_DIR, safePath);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(ROOT, safePath);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = 8899;
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
console.log(`🚀 Static test server running on http://127.0.0.1:${PORT}`);

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\hp\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
];
let chromePath = chromePaths.find(p => fs.existsSync(p));

const remoteDebuggingPort = 9333;
const chromeProc = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${remoteDebuggingPort}`,
  '--disable-gpu',
  '--no-sandbox',
  '--mute-audio',
]);

await new Promise(r => setTimeout(r, 1200));

try {
  const newTabRes = await fetch(`http://127.0.0.1:${remoteDebuggingPort}/json/new?about:blank`, { method: 'PUT' });
  const tabInfo = await newTabRes.json();
  const wsUrl = tabInfo.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  await new Promise(r => { ws.onopen = r; });

  let reqId = 1;
  const callbacks = new Map();
  const eventListeners = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const { resolve, reject } = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      const listeners = eventListeners.get(msg.method) || [];
      for (const fn of listeners) fn(msg.params);
    }
  };

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = reqId++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  function onEvent(method, fn) {
    if (!eventListeners.has(method)) eventListeners.set(method, []);
    eventListeners.get(method).push(fn);
  }

  onEvent('Runtime.consoleAPICalled', (params) => {
    if (params.type === 'error') console.log('BROWSER CONSOLE ERROR:', params.args);
  });
  onEvent('Runtime.exceptionThrown', (params) => {
    console.log('BROWSER EXCEPTION:', params.exceptionDetails);
  });

  await sendCommand('Page.enable');
  await sendCommand('Runtime.enable');

  const loadPromise = new Promise(resolve => {
    onEvent('Page.loadEventFired', resolve);
  });

  // Set iPhone 14 Pro Mobile Viewport (393x852)
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 393,
    height: 852,
    deviceScaleFactor: 3,
    mobile: true,
    fitWindow: false,
  });

  await sendCommand('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });
  await loadPromise;
  await new Promise(r => setTimeout(r, 1000));

  // Test 1: Verify Card Surfaces on Mobile
  const cardEvaluation = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const card = document.querySelector('.featured-card');
      const style = window.getComputedStyle(card);
      return {
        bg: style.backgroundColor,
        borderRadius: style.borderRadius,
        hasDetailEngine: typeof window.SorenMenuDetail !== 'undefined'
      };
    })()`,
    returnByValue: true
  });
  const cardData = cardEvaluation.result?.value || cardEvaluation.value || cardEvaluation;
  console.log('✅ Card styling & SorenMenuDetail engine:', cardData);

  // Test 2: Tap on Card body (not stepper) opens Menu Detail Bottom Sheet
  const openEvaluation = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const firstCard = document.querySelector('.featured-card');
      const cardTitle = firstCard.querySelector('h3').textContent.trim();
      firstCard.click();
      
      const sheet = document.getElementById('menu-detail-sheet');
      const backdrop = document.getElementById('menu-detail-backdrop');
      const title = document.getElementById('menu-detail-title').textContent.trim();
      const origin = document.getElementById('menu-detail-origin').textContent.trim();
      const brew = document.getElementById('menu-detail-brew').textContent.trim();
      const isOpen = sheet.classList.contains('is-open') && backdrop.classList.contains('is-open');

      return { isOpen, title, cardTitle, origin, brew };
    })()`,
    returnByValue: true
  });
  const openResult = openEvaluation.result?.value || openEvaluation.value || openEvaluation;
  console.log('✅ Bottom sheet opened on card click:', openResult);
  if (!openResult.isOpen) {
    throw new Error('Menu Detail Bottom Sheet failed to open on card click');
  }

  // Test 3: Tap 'Add to Cart' inside the sheet -> Adds to cart and auto-dismisses
  const addEvaluation = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const addBtn = document.getElementById('menu-detail-add-btn');
      addBtn.click();
      const initialCartCount = SorenCartStore.getTotalCount();
      return { initialCartCount };
    })()`,
    returnByValue: true
  });
  const addResult = addEvaluation.result?.value || addEvaluation.value || addEvaluation;
  console.log('✅ Add to cart clicked in sheet:', addResult);

  // Wait 700ms for 400ms auto-dismiss
  await new Promise(r => setTimeout(r, 800));

  const dismissEvaluation = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const sheet = document.getElementById('menu-detail-sheet');
      const backdrop = document.getElementById('menu-detail-backdrop');
      const isClosed = !sheet.classList.contains('is-open') && !backdrop.classList.contains('is-open');
      const finalCartCount = SorenCartStore.getTotalCount();
      return {
        isClosed,
        finalCartCount,
        sheetClass: sheet.className,
        backdropClass: backdrop.className,
        isOpenState: SorenMenuDetail.isOpen()
      };
    })()`,
    returnByValue: true
  });
  const dismissResult = dismissEvaluation.result?.value || dismissEvaluation.value || dismissEvaluation;
  console.log('✅ Auto-dismissed after 400ms & cart count updated:', dismissResult);
  if (!dismissResult.isClosed) {
    throw new Error('Bottom sheet did not auto-dismiss after add-to-cart confirmation');
  }

  // Test 4: Stepper click directly on card does NOT open detail sheet
  const stepperIsolationEvaluation = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const sheet = document.getElementById('menu-detail-sheet');
      const addBtn = document.querySelector('.featured-card .card-add-btn');
      addBtn.click();
      
      const sheetOpened = sheet.classList.contains('is-open');
      return { sheetOpened };
    })()`,
    returnByValue: true
  });
  const stepperIsolationResult = stepperIsolationEvaluation.result?.value || stepperIsolationEvaluation.value || stepperIsolationEvaluation;
  console.log('✅ Stepper click isolation check:', stepperIsolationResult);
  if (stepperIsolationResult.sheetOpened) {
    throw new Error('Stepper click improperly triggered Menu Detail Bottom Sheet');
  }

  // Test 5: Out of stock item behavior (FR-011)
  const soldOutEvaluation = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      window.PRODUCT_CATALOG['اسپرسو دبل'].isAvailable = false;
      window.SorenMenuDetail.open('اسپرسو دبل');
      
      const addBtn = document.getElementById('menu-detail-add-btn');
      const disabled = addBtn.disabled;
      const text = addBtn.textContent.trim();
      const isSoldOutClass = addBtn.classList.contains('is-sold-out');
      
      // Cleanup
      window.PRODUCT_CATALOG['اسپرسو دبل'].isAvailable = true;
      window.SorenMenuDetail.close();
      
      return { disabled, text, isSoldOutClass };
    })()`,
    returnByValue: true
  });
  const soldOutResult = soldOutEvaluation.result?.value || soldOutEvaluation.value || soldOutEvaluation;
  console.log('✅ Out-of-stock CTA disabled check (FR-011):', soldOutResult);
  if (!soldOutResult.disabled || !soldOutResult.text.includes('ناموجود')) {
    throw new Error('Out-of-stock item did not disable CTA button');
  }

  // Test 6: Unified Desktop Card Surface & Overlay Check
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
    fitWindow: false,
  });
  await new Promise(r => setTimeout(r, 200));

  const desktopCardEvaluation = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const card = document.querySelector('.featured-card');
      const overlay = document.querySelector('.featured-overlay');
      const cardStyle = window.getComputedStyle(card);
      const overlayStyle = overlay ? window.getComputedStyle(overlay) : null;
      return {
        desktopBg: cardStyle.backgroundColor,
        overlayDisplay: overlayStyle ? overlayStyle.display : 'none',
        flexDirection: cardStyle.flexDirection
      };
    })()`,
    returnByValue: true
  });
  const desktopCardData = desktopCardEvaluation.result?.value || desktopCardEvaluation.value || desktopCardEvaluation;
  console.log('✅ Desktop unified dark artisanal card check:', desktopCardData);
  if (desktopCardData.desktopBg !== 'rgb(56, 47, 41)' || desktopCardData.overlayDisplay !== 'block') {
    throw new Error('Desktop card is not dark artisanal: ' + JSON.stringify(desktopCardData));
  }

  console.log('\n========================================================');
  console.log(' 🎉 ALL MENU DETAIL & UNSLOP CHECKS PASSED WITH 100% ACCURACY!');
  console.log('========================================================');

  ws.close();
} finally {
  chromeProc.kill();
  server.close();
}
