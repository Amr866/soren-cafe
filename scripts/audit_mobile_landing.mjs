import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.resolve(ROOT_DIR, "frontend");
const OUT_DIR = path.resolve(ROOT_DIR, "audit-mobile-screenshots");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function getChromePath() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === "win32") {
    const candidates = [
      path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Google\\Chrome\\Application\\chrome.exe"),
      path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Google\\Chrome\\Application\\chrome.exe"),
      path.join(process.env["LocalAppData"] || "C:\\Users\\Default\\AppData\\Local", "Google\\Chrome\\Application\\chrome.exe"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  }
  return "google-chrome";
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function startServer(port = 8840) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split("?")[0].split("#")[0];
      if (reqPath === "/" || reqPath === "/index.html") reqPath = "/index.html";
      const filePath = path.join(FRONTEND_DIR, reqPath.replace(/^\//, ""));
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

class SimpleCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
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
      try { this.ws.close(); } catch (_) {}
    }
  }
}

async function launchChrome(port = 9240) {
  const chromePath = getChromePath();
  const proc = spawn(
    chromePath,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 150));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      if (res.ok) {
        const targets = await res.json();
        const page = targets.find((t) => t.type === "page");
        if (page && page.webSocketDebuggerUrl) {
          return { proc, wsUrl: page.webSocketDebuggerUrl };
        }
      }
    } catch (_) {}
  }
  proc.kill();
  throw new Error("Failed to connect to headless Chrome CDP");
}

async function runAudit() {
  console.log("=== Mobile Landing Page Unslopping Audit ===");
  const server = await startServer(8840);
  console.log("Serving at http://127.0.0.1:8840");

  const { proc, wsUrl } = await launchChrome(9240);
  const cdp = new SimpleCDP(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");

  // Mobile viewport: 390x844 (iPhone 14/15/16)
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
  });

  await cdp.send("Page.navigate", { url: "http://127.0.0.1:8840/index.html" });
  await new Promise((r) => setTimeout(r, 1500));

  // Take full page screenshot
  const fullLayoutMetrics = await cdp.send("Page.getLayoutMetrics");
  const fullHeight = Math.ceil(fullLayoutMetrics.contentSize.height);
  console.log(`Mobile page total content height: ${fullHeight}px at 390px width`);

  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: 0,
      y: 0,
      width: 390,
      height: 844,
      scale: 2,
    },
  });
  fs.writeFileSync(path.join(OUT_DIR, "hero-390x844.png"), Buffer.from(screenshot.data, "base64"));
  console.log("Captured hero screenshot: audit-mobile-screenshots/hero-390x844.png");

  // Capture full landing page screenshot in chunks or full height
  const fullPageScreenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  fs.writeFileSync(path.join(OUT_DIR, "full-mobile-landing.png"), Buffer.from(fullPageScreenshot.data, "base64"));
  console.log("Captured full mobile landing screenshot: audit-mobile-screenshots/full-mobile-landing.png");

  // Run DOM inspection for slop signs
  const auditResult = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const findings = [];
      const emojiRegex = /(\\p{Extended_Pictographic}|[\\u2600-\\u27BF])/gu;

      // 1. Check raw emojis
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        const text = node.nodeValue.trim();
        const matches = text.match(emojiRegex);
        if (matches) {
          const parent = node.parentElement;
          if (parent && !parent.closest('script') && !parent.closest('style')) {
            findings.push({
              category: 'raw-emoji',
              element: parent.tagName.toLowerCase() + (parent.className ? '.' + parent.className.split(' ').join('.') : ''),
              snippet: text,
              emojis: matches
            });
          }
        }
      }

      // 2. Check for gradients, colored glows, pulsing animations
      const allEls = document.querySelectorAll('*');
      const pulsingEls = [];
      const glowEls = [];
      const gradientEls = [];
      const smallTouchTargets = [];

      allEls.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.animation && (style.animation.includes('pulse') || style.animation.includes('ping') || style.animation.includes('infinite'))) {
          pulsingEls.push({
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : ''),
            animation: style.animation
          });
        }
        if (style.boxShadow && (style.boxShadow.includes('rgba(') || style.boxShadow.includes('rgb('))) {
          // Check if box shadow has color that is not neutral or subtle
          if (/rgba?\\(\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+/.test(style.boxShadow) && !style.boxShadow.includes('rgba(0, 0, 0') && !style.boxShadow.includes('rgba(36, 33, 32')) {
            glowEls.push({
              selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : ''),
              boxShadow: style.boxShadow
            });
          }
        }
        if (style.backgroundImage && style.backgroundImage.includes('gradient')) {
          gradientEls.push({
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : ''),
            background: style.backgroundImage
          });
        }

        // Check clickable buttons and links for touch target size < 44px
        if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button') {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
            smallTouchTargets.push({
              text: (el.innerText || el.getAttribute('aria-label') || '').slice(0, 30),
              selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : ''),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            });
          }
        }
      });

      // 3. Inspect sections layout & spacing on mobile
      const hero = document.querySelector('.hero');
      const heroMetrics = hero ? {
        height: hero.offsetHeight,
        titleSize: window.getComputedStyle(document.querySelector('.hero-title') || document.body).fontSize,
        titleLineHeight: window.getComputedStyle(document.querySelector('.hero-title') || document.body).lineHeight,
      } : null;

      const about = document.querySelector('.about-section');
      const aboutMetrics = about ? {
        height: about.offsetHeight,
        hasFeaturesGrid: !!document.querySelector('.features-grid'),
      } : null;

      const categories = document.querySelector('.categories-section');
      const catalog = document.querySelector('.menu-catalog-section');
      const chipsBar = document.querySelector('.category-chips-bar');

      return {
        emojis: findings,
        pulsing: pulsingEls,
        glows: glowEls.slice(0, 10),
        gradients: gradientEls.slice(0, 10),
        smallTouchTargets: smallTouchTargets.slice(0, 15),
        heroMetrics,
        aboutMetrics,
        totalSections: document.querySelectorAll('section').length
      };
    })()`,
    returnByValue: true,
  });

  console.log("\n--- AUDIT FINDINGS ---");
  console.log("Raw emojis found in UI:", JSON.stringify(auditResult.result.value.emojis, null, 2));
  console.log("Pulsing/infinite animations:", JSON.stringify(auditResult.result.value.pulsing, null, 2));
  console.log("Gradients detected:", JSON.stringify(auditResult.result.value.gradients, null, 2));
  console.log("Small touch targets (< 44px):", JSON.stringify(auditResult.result.value.smallTouchTargets, null, 2));
  console.log("Hero & section metrics:", JSON.stringify({
    hero: auditResult.result.value.heroMetrics,
    about: auditResult.result.value.aboutMetrics,
    totalSections: auditResult.result.value.totalSections
  }, null, 2));

  fs.writeFileSync(path.join(OUT_DIR, "audit-results.json"), JSON.stringify(auditResult.result.value, null, 2));

  cdp.close();
  proc.kill();
  server.close();
}

runAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
