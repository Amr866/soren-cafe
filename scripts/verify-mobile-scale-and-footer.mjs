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
  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(fullPath).pipe(res);
  });
});

class SimpleCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
  }
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
      this.ws.addEventListener('message', (ev) => {
        const d = JSON.parse(ev.data);
        if (d.id && this.callbacks.has(d.id)) {
          const { res, rej } = this.callbacks.get(d.id);
          this.callbacks.delete(d.id);
          if (d.error) rej(d.error);
          else res(d.result);
        } else if (d.method && this.eventListeners.has(d.method)) {
          for (const cb of this.eventListeners.get(d.method)) {
            cb(d.params);
          }
        }
      });
    });
  }
  on(method, cb) {
    if (!this.eventListeners.has(method)) this.eventListeners.set(method, []);
    this.eventListeners.get(method).push(cb);
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { res: resolve, rej: reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    if (this.ws) this.ws.close();
  }
}

const PORT = 8861;
const CHROME_PORT = 9247;

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

    // ============================================
    // Task 1: Check Category Card Proportions
    // ============================================
    console.log('--- Verifying Task 1: Mobile Category Card Scale & Portrait Proportions ---');
    const cardMetrics = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.querySelector('.category-card');
        if (!card) return null;
        const rect = card.getBoundingClientRect();
        const style = window.getComputedStyle(card);
        const title = card.querySelector('h3');
        const titleStyle = title ? window.getComputedStyle(title) : null;
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          aspectRatio: style.aspectRatio,
          titleFontSize: titleStyle ? parseFloat(titleStyle.fontSize) : 0
        };
      })()`,
      returnByValue: true
    });

    const metrics = cardMetrics.result.value;
    assert.ok(metrics, 'Category card not found');
    console.log(`Measured Card at 390px viewport: width=${metrics.width}px, height=${metrics.height}px, titleFontSize=${metrics.titleFontSize}px`);

    assert.ok(metrics.height >= 340, `Category card height (${metrics.height}px) must be >= 340px for generous mobile portrait proportions`);
    assert.ok(metrics.titleFontSize >= 23, `Category card title font size (${metrics.titleFontSize}px) must be >= 23px for readability`);
    console.log('✅ Task 1: Mobile Category Card Scale & Proportions verified successfully!');

    // ============================================
    // Task 2: Check Hospitality Footer & Restored Bottom Elements
    // ============================================
    console.log('--- Verifying Task 2: Mobile Hospitality Footer & Restored Bottom Elements ---');
    const footerCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const liveStatus = document.querySelector('.footer-live-status');
        const callBtn = document.querySelector('a[href^="tel:"]');
        const mapBtn = document.querySelector('.footer-action-btn[href*="maps"]');
        const footerMain = document.querySelector('.footer-main');
        const hospitalityCard = document.querySelector('.footer-hospitality-card');
        const footerCopy = document.querySelector('.footer-copy');
        const footerNote = document.querySelector('.footer-bottom-note');
        const dividerIcon = document.querySelector('.footer-divider-icon');
        return {
          hasLiveStatus: !!liveStatus,
          liveStatusText: liveStatus ? liveStatus.textContent.trim() : null,
          hasCallBtn: !!callBtn,
          callHref: callBtn ? callBtn.getAttribute('href') : null,
          hasMapBtn: !!mapBtn,
          footerMainHidden: footerMain ? window.getComputedStyle(footerMain).display === 'none' : false,
          hospitalityVisible: hospitalityCard ? window.getComputedStyle(hospitalityCard).display !== 'none' : false,
          hasFooterCopy: !!footerCopy,
          copyText: footerCopy ? footerCopy.textContent.trim() : '',
          hasFooterNote: !!footerNote,
          noteText: footerNote ? footerNote.textContent.trim() : '',
          dividerGlyph: dividerIcon ? dividerIcon.textContent.trim() : ''
        };
      })()`,
      returnByValue: true
    });

    const fRes = footerCheck.result.value;
    assert.ok(fRes.hasLiveStatus, 'Footer must contain .footer-live-status badge');
    assert.ok(fRes.liveStatusText.includes('هم‌اکنون باز است'), 'Live status must show cafe is open');
    assert.ok(fRes.hasCallBtn, 'Footer must contain direct call action button with tel: protocol');
    assert.ok(fRes.hasMapBtn, 'Footer must contain direct map navigation action button');
    assert.ok(fRes.footerMainHidden, 'Desktop footer .footer-main must be hidden on mobile viewport');
    assert.ok(fRes.hospitalityVisible, 'Mobile hospitality card must be visible on mobile viewport');
    assert.ok(fRes.hasFooterCopy && fRes.copyText.includes('کافه سورن'), 'Footer must contain restored copyright');
    assert.ok(fRes.hasFooterNote && fRes.noteText.includes('عطر قهوه'), 'Footer must contain restored love/coffee note');
    assert.strictEqual(fRes.dividerGlyph, '✦', 'Footer divider must contain diamond glyph ✦');
    console.log('✅ Task 2: Mobile Hospitality Footer & Restored Bottom Elements verified successfully!');

    // ============================================
    // Task 3: Check Hospitality Footer Styling
    // ============================================
    console.log('--- Verifying Task 3: Hospitality Footer Styling & Ergonomics ---');
    const styleCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const actionBtn = document.querySelector('.footer-action-btn');
        const footer = document.querySelector('.site-footer');
        const card = document.querySelector('.footer-hospitality-card');
        const btnStyle = actionBtn ? window.getComputedStyle(actionBtn) : null;
        const footerStyle = footer ? window.getComputedStyle(footer) : null;
        const cardStyle = card ? window.getComputedStyle(card) : null;
        const scrollWidth = document.documentElement.scrollWidth;
        return {
          btnHeight: actionBtn ? actionBtn.offsetHeight : 0,
          footerPaddingBottom: footerStyle ? parseFloat(footerStyle.paddingBottom) : 0,
          hasCardBorder: cardStyle ? cardStyle.borderWidth !== '0px' : false,
          scrollWidth
        };
      })()`,
      returnByValue: true
    });

    const sRes = styleCheck.result.value;
    console.log(`Measured Footer: btnHeight=${sRes.btnHeight}px, paddingBottom=${sRes.footerPaddingBottom}px, scrollWidth=${sRes.scrollWidth}px`);
    assert.ok(sRes.btnHeight >= 44, `Action button height (${sRes.btnHeight}px) must be >= 44px touch target`);
    assert.ok(sRes.footerPaddingBottom >= 80, `Footer padding-bottom (${sRes.footerPaddingBottom}px) must be >= 80px for bottom-nav safe area`);
    assert.ok(sRes.scrollWidth <= 390, `Page scrollWidth (${sRes.scrollWidth}px) must not exceed 390px viewport width`);
    console.log('✅ Task 3: Hospitality Footer Styling verified successfully!');

    cdp.close();
    await fetch(`http://127.0.0.1:${CHROME_PORT}/json/close/${tabInfo.id}`);
  } catch (err) {
    console.error('Test error:', err.message);
    process.exit(1);
  } finally {
    try { chromeProcess.kill(); } catch (e) {}
    try { server.close(); } catch (e) {}
    process.exit(0);
  }
});
