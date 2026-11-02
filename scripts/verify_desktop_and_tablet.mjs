import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.resolve(ROOT_DIR, "frontend");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

function startServer(port = 8798) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split("?")[0].split("#")[0];
      if (reqPath === "/") reqPath = "/index.html";
      const filePath = path.join(FRONTEND_DIR, reqPath);
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end("404");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
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
      this.ws.onerror = reject;
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

async function launchChrome(port = 9235) {
  const proc = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      "--no-first-run",
      "--no-default-browser-check",
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
  throw new Error("Could not connect to Chrome debugging port");
}

async function checkViewport(cdp, width, height, name) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
  await cdp.send("Page.navigate", { url: "http://127.0.0.1:8798/index.html" });
  await new Promise((r) => setTimeout(r, 1000));

  const metrics = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      const card = document.querySelector('.featured-card');
      const grid = document.getElementById('catalog-products-grid');
      const bottomNav = document.getElementById('mobile-bottom-nav');
      const heroContainer = document.querySelector('.hero-container');
      const heroContent = document.querySelector('.hero-content');
      const heroImageWrapper = document.querySelector('.hero-image-wrapper');
      const gridStyle = grid ? window.getComputedStyle(grid) : null;
      const navStyle = bottomNav ? window.getComputedStyle(bottomNav) : null;
      const cardStyle = card ? window.getComputedStyle(card) : null;
      const cardImg = card ? card.querySelector('.featured-image') : null;
      const cardImgStyle = cardImg ? window.getComputedStyle(cardImg) : null;
      const heroStyle = heroContainer ? window.getComputedStyle(heroContainer) : null;
      return {
        cardWidth: card ? Math.round(card.getBoundingClientRect().width) : 0,
        cardHeight: card ? Math.round(card.getBoundingClientRect().height) : 0,
        cardAspectRatio: cardStyle ? cardStyle.aspectRatio : null,
        imgPosition: cardImgStyle ? cardImgStyle.position : null,
        gridColumnsCount: gridStyle ? gridStyle.gridTemplateColumns.split(' ').length : 0,
        bottomNavDisplay: navStyle ? navStyle.display : null,
        heroGridColumns: heroStyle ? heroStyle.gridTemplateColumns.split(' ').length : 0,
      };
    })()`,
    returnByValue: true,
  });

  console.log(`✅ Viewport ${name} (${width}x${height}):`, metrics.result.value);
}

async function run() {
  const server = await startServer(8798);
  const { proc, wsUrl } = await launchChrome(9235);
  const cdp = new SimpleCDP(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");

  // Check 1280px (Desktop)
  await checkViewport(cdp, 1280, 800, "Desktop");

  // Check 1024px (Small Desktop / iPad Pro)
  await checkViewport(cdp, 1024, 768, "Laptop");

  // Check 768px (Tablet)
  await checkViewport(cdp, 768, 1024, "Tablet");

  // Check 390px (Mobile)
  await checkViewport(cdp, 390, 844, "Mobile (iPhone 13)");

  cdp.close();
  proc.kill();
  server.close();
}

run().catch(console.error);
