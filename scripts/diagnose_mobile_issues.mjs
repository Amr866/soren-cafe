import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.resolve(ROOT_DIR, "frontend");
const ARTIFACT_DIR = "C:\\Users\\hp\\.gemini\\antigravity\\brain\\fe5ac2d5-a26f-4591-9074-438ea7db05f9";
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

function startServer(port = 8792) {
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

async function launchChrome(port = 9227) {
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

async function run() {
  const server = await startServer(8792);
  const { proc, wsUrl } = await launchChrome(9227);
  const cdp = new SimpleCDP(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");

  // Mobile viewport: iPhone 13 (390 x 844)
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  await cdp.send("Page.navigate", { url: "http://127.0.0.1:8792/index.html" });
  await new Promise((r) => setTimeout(r, 1500));

  // Screenshot 1: Top of landing page (Header & Hero)
  const ssTop = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "mobile_top_view.png"), Buffer.from(ssTop.data, "base64"));

  // Scroll to Categories & About
  await cdp.send("Runtime.evaluate", { expression: `window.scrollTo(0, 700);` });
  await new Promise((r) => setTimeout(r, 300));
  const ssMid = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "mobile_mid_view.png"), Buffer.from(ssMid.data, "base64"));

  // Scroll to Catalog Menu
  await cdp.send("Runtime.evaluate", { expression: `document.getElementById('menu').scrollIntoView();` });
  await new Promise((r) => setTimeout(r, 300));
  const ssCatalog = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "mobile_catalog_view.png"), Buffer.from(ssCatalog.data, "base64"));

  // Scroll to very bottom (Footer)
  await cdp.send("Runtime.evaluate", { expression: `window.scrollTo(0, document.body.scrollHeight);` });
  await new Promise((r) => setTimeout(r, 400));
  const ssBottom = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "mobile_bottom_view.png"), Buffer.from(ssBottom.data, "base64"));

  // Comprehensive box & font analysis
  const fullAudit = await cdp.send("Runtime.evaluate", {
    expression: `(() => {
      function getBoxInfo(selector) {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          selector,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          padding: \`\${style.paddingTop} \${style.paddingRight} \${style.paddingBottom} \${style.paddingLeft}\`,
          margin: \`\${style.marginTop} \${style.marginRight} \${style.marginBottom} \${style.marginLeft}\`,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          fontFamily: style.fontFamily.split(',')[0].replace(/['"]/g, ''),
          display: style.display,
          position: style.position,
        };
      }

      return {
        header: getBoxInfo('.site-header'),
        brand: getBoxInfo('.brand'),
        heroContainer: getBoxInfo('.hero-container'),
        heroImageFrame: getBoxInfo('.hero-image-frame'),
        heroTitle: getBoxInfo('.hero-title'),
        heroDescription: getBoxInfo('.hero-description'),
        heroButtons: getBoxInfo('.hero-buttons'),
        heroHighlights: getBoxInfo('.hero-highlights'),
        aboutContainer: getBoxInfo('.about-container'),
        categoriesGrid: getBoxInfo('.categories-grid'),
        categoryCard0: getBoxInfo('.category-card'),
        categoryChipsBar: getBoxInfo('.category-chips-bar'),
        catalogGrid: getBoxInfo('#catalog-products-grid'),
        featuredCard0: getBoxInfo('.featured-card'),
        siteFooter: getBoxInfo('.site-footer'),
        mobileBottomNav: getBoxInfo('.mobile-bottom-nav'),
      };
    })()`,
    returnByValue: true,
  });

  console.log("=== FULL BOX & FONT AUDIT AT 390PX VIEWPORT ===");
  console.log(JSON.stringify(fullAudit.result.value, null, 2));

  cdp.close();
  proc.kill();
  server.close();
}

run().catch(console.error);
