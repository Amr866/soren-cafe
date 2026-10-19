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

const VIEWPORTS = [
  { name: "320px (iPhone SE 1st gen)", width: 320, height: 658, mobile: true },
  { name: "360px (Standard Compact Android)", width: 360, height: 740, mobile: true },
  { name: "390px (iPhone 12/13/14/15)", width: 390, height: 844, mobile: true },
  { name: "412px (Samsung Galaxy / Pixel)", width: 412, height: 915, mobile: true },
  { name: "768px (iPad Mini / Tablet)", width: 768, height: 1024, mobile: false },
  { name: "1280px (Desktop Baseline)", width: 1280, height: 800, mobile: false },
];

const PAGES = [
  { name: "Home (index.html)", path: "/index.html", file: "index.html" },
  { name: "Cart (cart.html)", path: "/pages/cart.html", file: "pages/cart.html" },
  { name: "Coffee Menu (coffee.html)", path: "/pages/coffee.html", file: "pages/coffee.html" },
  { name: "Shakes Menu (shakes.html)", path: "/pages/shakes.html", file: "pages/shakes.html" },
  { name: "Cake Menu (cake.html)", path: "/pages/cake.html", file: "pages/cake.html" },
  { name: "About Us (about.html)", path: "/pages/about.html", file: "pages/about.html" },
  { name: "Login (login.html)", path: "/pages/login.html", file: "pages/login.html" },
  { name: "Register (register.html)", path: "/pages/register.html", file: "pages/register.html" },
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

// 1. Static HTML & Asset Audit
function auditStaticHtml() {
  console.log("\n========================================================");
  console.log(" 🔍 PHASE 1: Static HTML & Asset Link Audit");
  console.log("========================================================");

  let passed = true;

  // Check manifest.json
  const manifestPath = path.join(FRONTEND_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("❌ frontend/manifest.json does not exist!");
    passed = false;
  } else {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (!manifest.name || !manifest.icons) {
        console.error("❌ manifest.json is missing required fields (name, icons)");
        passed = false;
      } else {
        console.log("✅ frontend/manifest.json is valid JSON with valid fields");
      }
    } catch (e) {
      console.error("❌ manifest.json JSON parse error:", e.message);
      passed = false;
    }
  }

  for (const page of PAGES) {
    const filePath = path.join(FRONTEND_DIR, page.file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Page file not found: ${page.file}`);
      passed = false;
      continue;
    }

    const content = fs.readFileSync(filePath, "utf-8");

    // Check DOCTYPE & RTL
    if (!content.includes("<!DOCTYPE html>")) {
      console.error(`❌ ${page.file}: Missing <!DOCTYPE html>`);
      passed = false;
    }
    if (!content.includes('dir="rtl"')) {
      console.error(`❌ ${page.file}: Missing dir="rtl"`);
      passed = false;
    }

    // Check viewport-fit=cover
    if (!content.includes("viewport-fit=cover")) {
      console.error(`❌ ${page.file}: viewport meta missing viewport-fit=cover`);
      passed = false;
    }

    // Check theme-color
    if (!content.includes('name="theme-color"') || !content.includes("#F7F4EE")) {
      console.error(`❌ ${page.file}: Missing theme-color #F7F4EE`);
      passed = false;
    }

    // Check Apple web app capable
    if (!content.includes('name="apple-mobile-web-app-capable"')) {
      console.error(`❌ ${page.file}: Missing apple-mobile-web-app-capable`);
      passed = false;
    }

    // Check Manifest link
    if (!content.includes('rel="manifest"')) {
      console.error(`❌ ${page.file}: Missing rel="manifest"`);
      passed = false;
    }

    // Check for broken cart.css
    if (content.includes("cart.css")) {
      console.error(`❌ ${page.file}: Contains broken cart.css link!`);
      passed = false;
    }

    // Check local linked assets exist on disk
    const linkMatches = [...content.matchAll(/<(?:link|script|img)\s+[^>]*?(?:href|src)=["']([^"']+)["']/gi)];
    for (const match of linkMatches) {
      const url = match[1];
      if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("#") || url.startsWith("data:")) {
        continue;
      }
      const dir = path.dirname(filePath);
      const cleanUrl = url.split("?")[0].split("#")[0];
      const targetPath = path.resolve(dir, cleanUrl);
      if (!fs.existsSync(targetPath)) {
        console.error(`❌ ${page.file}: Broken asset link -> ${url} (Resolved: ${targetPath})`);
        passed = false;
      }
    }

    console.log(`✅ ${page.file}: Meta tags, PWA manifest, and static asset links verified`);
  }

  return passed;
}

// 2. Simple Local Static HTTP Server
function startStaticServer(port = 8765) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split("?")[0].split("#")[0];

      // Handle mock API calls from frontend
      if (reqPath.startsWith("/api/")) {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, data: [] }));
        return;
      }

      if (reqPath === "/") reqPath = "/index.html";
      const filePath = path.join(FRONTEND_DIR, reqPath);

      if (!filePath.startsWith(FRONTEND_DIR) || !fs.existsSync(filePath)) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
        return;
      }

      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(port, "127.0.0.1", () => {
      resolve(server);
    });
  });
}

// 3. Chrome CDP Client
class SimpleCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
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

  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }
  }
}

// Helper to launch Chrome and get WebSocket URL
async function launchChrome(port = 9222) {
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-sync",
      "--disable-background-networking",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  // Poll for debugger URL
  let wsUrl = null;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        const json = await res.json();
        wsUrl = json.webSocketDebuggerUrl;
        break;
      }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 100));
  }

  if (!wsUrl) {
    chromeProcess.kill();
    throw new Error("Failed to connect to Chrome headless debugger");
  }

  return { chromeProcess, wsUrl };
}

async function runBrowserVerification() {
  console.log("\n========================================================");
  console.log(" 🌐 PHASE 2: Multi-Device Browser Verification (Headless Chrome)");
  console.log("========================================================");

  const serverPort = 8765;
  const chromePort = 9333;
  const server = await startStaticServer(serverPort);
  console.log(`🚀 Static server running on http://127.0.0.1:${serverPort}`);

  const { chromeProcess, wsUrl } = await launchChrome(chromePort);
  console.log("🚀 Chrome headless launched with CDP");

  let totalTests = 0;
  let passedTests = 0;
  const failureDetails = [];

  try {
    for (const page of PAGES) {
      console.log(`\n📄 Testing Page: ${page.name}`);

      for (const vp of VIEWPORTS) {
        totalTests++;
        const testLabel = `${page.name} @ ${vp.width}px (${vp.name})`;

        // Create new tab via HTTP endpoint
        const newTabRes = await fetch(`http://127.0.0.1:${chromePort}/json/new?about:blank`, { method: "PUT" });
        const tabInfo = await newTabRes.json();
        const cdp = new SimpleCDP(tabInfo.webSocketDebuggerUrl);
        await cdp.connect();

        const consoleErrors = [];
        const networkErrors = [];

        cdp.on("Runtime.consoleAPICalled", (params) => {
          if (params.type === "error") {
            const text = params.args.map((a) => a.value || a.description || "").join(" ");
            // Ignore benign network aborts if any
            if (!text.includes("net::ERR_ABORTED") && !text.includes("favicon")) {
              consoleErrors.push(text);
            }
          }
        });

        cdp.on("Network.responseReceived", (params) => {
          if (params.response.status >= 400) {
            networkErrors.push(`${params.response.status} ${params.response.url}`);
          }
        });

        await cdp.send("Page.enable");
        await cdp.send("Runtime.enable");
        await cdp.send("Network.enable");

        await cdp.send("Emulation.setDeviceMetricsOverride", {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 2,
          mobile: vp.mobile,
        });

        // Set viewport-fit and touch emulation
        if (vp.mobile) {
          await cdp.send("Emulation.setTouchEmulationEnabled", {
            enabled: true,
            maxTouchPoints: 5,
          });
        }

        // Navigate
        const loadPromise = new Promise((resolve) => {
          cdp.on("Page.loadEventFired", () => resolve());
        });

        const targetUrl = `http://127.0.0.1:${serverPort}${page.path}`;
        await cdp.send("Page.navigate", { url: targetUrl });
        await loadPromise;

        // Allow layout and scripts to settle
        await new Promise((r) => setTimeout(r, 300));

        // Evaluate layout metrics
        const evalResult = await cdp.send("Runtime.evaluate", {
          returnByValue: true,
          expression: `
            (() => {
              const docEl = document.documentElement;
              const body = document.body;
              const winWidth = window.innerWidth;
              const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
              const clientW = docEl.clientWidth;
              const overflowX = scrollW - winWidth;

              // Check for overflowing elements
              const overflowingEls = [];
              const allElements = document.querySelectorAll('*');
              for (const el of allElements) {
                // Ignore hidden elements or elements with display:none
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  if (rect.right > winWidth + 1.5) {
                    overflowingEls.push({
                      tag: el.tagName,
                      id: el.id,
                      className: el.className,
                      right: Math.round(rect.right),
                      width: Math.round(rect.width)
                    });
                  }
                }
              }

              // Check interactive touch targets (< 768px)
              const smallTouchTargets = [];
              if (${vp.mobile}) {
                const buttons = document.querySelectorAll('button, a.btn, a.primary-btn, a.secondary-btn, .filter-btn, .btn-add, .delete-btn, .quantity button, .mobile-nav-item');
                for (const btn of buttons) {
                  const style = window.getComputedStyle(btn);
                  if (style.display === 'none' || style.visibility === 'hidden') continue;
                  const rect = btn.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    // Touch target should be at least 44px in at least one dimension or with padding
                    if (rect.width < 40 || rect.height < 40) {
                      smallTouchTargets.push({
                        text: (btn.innerText || btn.getAttribute('aria-label') || '').slice(0, 20),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        class: btn.className
                      });
                    }
                  }
                }
              }

              return {
                winWidth,
                scrollW,
                clientW,
                overflowX,
                overflowingCount: overflowingEls.length,
                overflowingEls: overflowingEls.slice(0, 5),
                smallTouchTargetsCount: smallTouchTargets.length,
                smallTouchTargets: smallTouchTargets.slice(0, 5)
              };
            })()
          `,
        });

        const metrics = evalResult.result.value;
        let testPassed = true;
        const issues = [];

        // Check horizontal overflow
        if (metrics.scrollW > metrics.winWidth + 1) {
          testPassed = false;
          issues.push(`Horizontal overflow detected! scrollWidth=${metrics.scrollW} > innerWidth=${metrics.winWidth} (delta=${metrics.overflowX}px)`);
          if (metrics.overflowingEls.length > 0) {
            issues.push(`Sample overflowing elements: ${JSON.stringify(metrics.overflowingEls)}`);
          }
        }

        // Check 404s
        if (networkErrors.length > 0) {
          testPassed = false;
          issues.push(`404 network errors: ${networkErrors.join(", ")}`);
        }

        // Check Console Errors
        if (consoleErrors.length > 0) {
          testPassed = false;
          issues.push(`Console errors: ${consoleErrors.join("; ")}`);
        }

        if (testPassed) {
          passedTests++;
          console.log(`  ✅ ${vp.width}px: Zero overflow (scrollWidth=${metrics.scrollW} <= ${metrics.winWidth}px), 0 errors`);
        } else {
          console.error(`  ❌ ${vp.width}px: FAILED`);
          for (const issue of issues) {
            console.error(`     ⚠️  ${issue}`);
          }
          failureDetails.push({ testLabel, issues });
        }

        cdp.close();
        await fetch(`http://127.0.0.1:${chromePort}/json/close/${tabInfo.id}`);
      }
    }
  } finally {
    chromeProcess.kill();
    server.close();
  }

  console.log("\n========================================================");
  console.log(` 📊 SUMMARY: ${passedTests}/${totalTests} Browser Tests Passed`);
  console.log("========================================================");

  if (failureDetails.length > 0) {
    console.error("\n❌ Failures breakdown:");
    for (const f of failureDetails) {
      console.error(`- ${f.testLabel}:`);
      for (const err of f.issues) console.error(`    ${err}`);
    }
    return false;
  }

  return true;
}

async function main() {
  const staticPassed = auditStaticHtml();
  const browserPassed = await runBrowserVerification();

  if (staticPassed && browserPassed) {
    console.log("\n🎉 ALL RESPONSIVE, AUDIT & MULTI-DEVICE TESTS PASSED SUCCESSFULLY!\n");
    process.exit(0);
  } else {
    console.error("\n💥 SOME TESTS FAILED. See error output above.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
