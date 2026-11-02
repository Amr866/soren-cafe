import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.resolve(ROOT_DIR, "frontend");
const ARTIFACT_DIR = "C:\\Users\\hp\\.gemini\\antigravity\\brain\\94a7d6ed-19f4-4657-a401-8e74999927fa";

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
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function startServer(port = 8788) {
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
        try {
          const data = JSON.parse(event.data);
          if (data.id && this.callbacks.has(data.id)) {
            const cb = this.callbacks.get(data.id);
            this.callbacks.delete(data.id);
            if (data.error) cb.reject(new Error(data.error.message || JSON.stringify(data.error)));
            else cb.resolve(data.result);
          }
        } catch (e) {
          console.error("CDP parse error:", e);
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
  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log("==================================================================");
  console.log(" 🧪 TARGET 4: TABLE RESERVATION GRID & ZONE TABS DEFENSIVE AUDIT");
  console.log("==================================================================");

  const port = 8788;
  const server = await startServer(port);
  const chromePath = getChromePath();
  const cdpPort = 9488;

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${cdpPort}`,
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "about:blank",
  ]);

  await new Promise((r) => setTimeout(r, 1200));

  let tabInfo;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: "PUT" });
      if (res.ok) {
        tabInfo = await res.json();
        break;
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  if (!tabInfo || !tabInfo.webSocketDebuggerUrl) {
    throw new Error("Failed to connect to headless Chrome CDP via /json/new");
  }

  const cdp = new SimpleCDP(tabInfo.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Runtime.enable");

  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/pages/cart.html` });
  await new Promise((r) => setTimeout(r, 1600));

  const testViewports = [
    { name: "320px Compact", width: 320, height: 640 },
    { name: "360px Android", width: 360, height: 780 },
    { name: "390px iPhone", width: 390, height: 844 },
    { name: "320x480 Short Viewport", width: 320, height: 480 },
  ];

  let allPassed = true;

  for (const vp of testViewports) {
    console.log(`\n--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await new Promise((r) => setTimeout(r, 350));

    // Open modal and inject extreme tables
    const evalResult = await cdp.send("Runtime.evaluate", {
      expression: `
        (async () => {
          if (window.SorenCart) {
            window.SorenCart.save([
              { id: "prd_1", name: "اسپرسو دبل تخصصی", price: 95000, quantity: 1, category: "coffee" }
            ]);
            if (window.SorenCart.load) window.SorenCart.load();
          }

          if (typeof window.openCheckoutModal === "function") {
            window.openCheckoutModal();
          } else {
            const checkoutBtn = document.querySelector(".checkout-btn, #checkout-btn");
            if (checkoutBtn) checkoutBtn.click();
          }
          await new Promise(r => setTimeout(r, 600));

          const modalBackdrop = document.getElementById("soren-checkout-modal");
          const tableGrid = document.querySelector(".table-selection-grid");
          const zoneTabsBar = document.querySelector(".zone-tabs-bar");
          const zoneBtns = Array.from(document.querySelectorAll(".zone-tab-btn"));
          const orderFieldsGrid = document.querySelector(".order-fields-grid");
          const fields = Array.from(document.querySelectorAll(".order-field-group"));

          // Custom render with extreme stress data
          if (tableGrid) {
            tableGrid.innerHTML = \`
              <div class="table-card is-selected" data-zone="vip" role="button" aria-pressed="true" tabindex="0">
                <div class="table-card-top">
                  <span class="table-card-number">میز شاه‌نشین VIP تشریفات شماره ۷</span>
                  <span class="table-card-capacity">۱۲ نفره</span>
                </div>
                <p class="table-card-name">جایگاه اختصاصی سالن تشریفات با چشم‌انداز پانورامای باغ ایرانی و نورپردازی اختصاصی شامگاهی</p>
                <div class="table-card-footer">
                  <span class="table-status-pill">
                    <span class="table-status-dot is-free"></span>
                    <span class="table-status-text is-free">آماده پذیرایی</span>
                  </span>
                  <span style="color: var(--muted);">تشریفات VIP</span>
                </div>
              </div>

              <div class="table-card is-held" data-zone="courtyard" role="button" aria-pressed="false" aria-disabled="true">
                <div class="table-card-top">
                  <span class="table-card-number">میز تراس سبز شماره ۴</span>
                  <span class="table-card-capacity">۶ نفره</span>
                </div>
                <p class="table-card-name">تراس رو به آب‌نما با سایه‌بان اتوماتیک و سیستم مه‌پاش تابستانه</p>
                <div class="table-card-footer">
                  <span class="table-status-pill">
                    <span class="table-status-dot is-held"></span>
                    <span class="table-status-text is-held">در حال رزرو (۰۳:۴۵)</span>
                  </span>
                  <span style="color: var(--muted);">حیاط و فضای سبز</span>
                </div>
              </div>

              <div class="table-card is-occupied" data-zone="indoor" role="button" aria-pressed="false" aria-disabled="true">
                <div class="table-card-top">
                  <span class="table-card-number">میز دونفره بار ۳</span>
                  <span class="table-card-capacity">۲ نفره</span>
                </div>
                <p class="table-card-name">کنار دستگاه عصاره‌گیری و بار قهوه‌دمی تخصصی</p>
                <div class="table-card-footer">
                  <span class="table-status-pill">
                    <span class="table-status-dot is-occupied"></span>
                    <span class="table-status-text is-occupied">مشغول</span>
                  </span>
                  <span style="color: var(--muted);">سالن اصلی</span>
                </div>
              </div>
            \`;
          }

          const cards = Array.from(document.querySelectorAll(".table-card"));
          const firstCard = cards[0];
          const firstCardTop = firstCard ? firstCard.querySelector(".table-card-top") : null;
          const firstCardName = firstCard ? firstCard.querySelector(".table-card-name") : null;

          const gridRect = tableGrid ? tableGrid.getBoundingClientRect() : null;
          const cardWidths = cards.map(c => Math.round(c.getBoundingClientRect().width));
          const topRect = firstCardTop ? firstCardTop.getBoundingClientRect() : null;
          const nameRect = firstCardName ? firstCardName.getBoundingClientRect() : null;

          const zoneBarStyle = zoneTabsBar ? getComputedStyle(zoneTabsBar) : null;
          const tableGridStyle = tableGrid ? getComputedStyle(tableGrid) : null;
          const orderGridStyle = orderFieldsGrid ? getComputedStyle(orderFieldsGrid) : null;
          const topStyle = firstCardTop ? getComputedStyle(firstCardTop) : null;
          const nameStyle = firstCardName ? getComputedStyle(firstCardName) : null;

          const zoneBtnShrinks = zoneBtns.map(b => getComputedStyle(b).flexShrink);
          const fieldWidths = fields.map(f => Math.round(f.getBoundingClientRect().width));

          return {
            pageScrollWidth: document.documentElement.scrollWidth,
            windowWidth: window.innerWidth,
            modalOpen: modalBackdrop && modalBackdrop.classList.contains("is-open"),
            gridWidth: gridRect ? Math.round(gridRect.width) : 0,
            cardWidths,
            gridColumns: tableGridStyle ? tableGridStyle.gridTemplateColumns : "",
            orderGridColumns: orderGridStyle ? orderGridStyle.gridTemplateColumns : "",
            fieldWidths,
            zoneBarFlexWrap: zoneBarStyle ? zoneBarStyle.flexWrap : "",
            zoneBarOverflowX: zoneBarStyle ? zoneBarStyle.overflowX : "",
            zoneBtnShrinks,
            topFlexWrap: topStyle ? topStyle.flexWrap : "",
            nameLineClamp: nameStyle ? nameStyle.webkitLineClamp : "",
            cardsCount: cards.length
          };
        })()
      `,
      returnByValue: true,
      awaitPromise: true,
    });

    if (evalResult.exceptionDetails) {
      console.error("Evaluation Exception:", evalResult.exceptionDetails);
    }
    const d = evalResult.result.value || {};
    const hOverflow = (d.pageScrollWidth || 0) - (d.windowWidth || 0);

    console.log(`  - Horizontal Overflow: ${hOverflow}px`);
    console.log(`  - Modal Open: ${d.modalOpen}`);
    console.log(`  - Table Grid Width: ${d.gridWidth}px, Card Widths: [${d.cardWidths.join(", ")}]`);
    console.log(`  - Order Form Field Widths: [${d.fieldWidths.join(", ")}]`);
    console.log(`  - Table Card Top Wrap: ${d.topFlexWrap}, Title Clamp: ${d.nameLineClamp}`);
    console.log(`  - Zone Bar Wrap: ${d.zoneBarFlexWrap}, OverflowX: ${d.zoneBarOverflowX}`);

    // Assertions
    if (hOverflow > 0) {
      console.error(`  ❌ FAIL: Horizontal layout overflow: ${hOverflow}px`);
      allPassed = false;
    } else {
      console.log(`  ✅ PASS: 0px horizontal overflow`);
    }

    if (!d.modalOpen) {
      console.error(`  ❌ FAIL: Modal is not open`);
      allPassed = false;
    } else {
      console.log(`  ✅ PASS: Checkout modal open`);
    }

    // 1-column stack on mobile
    if (vp.width <= 480) {
      const isSingleColumn = d.cardWidths.every((w) => w >= d.gridWidth - 4);
      if (!isSingleColumn) {
        console.error(`  ❌ FAIL: Table cards did not collapse to 1-column stack: ${d.cardWidths.join(", ")} (grid: ${d.gridWidth}px)`);
        allPassed = false;
      } else {
        console.log(`  ✅ PASS: Table grid collapses to full-width 1-column stack (${d.cardWidths[0]}px)`);
      }

      // Order fields 1-column stack
      const isSingleColFields = d.fieldWidths.every((w) => w >= d.gridWidth - 4);
      if (!isSingleColFields) {
        console.error(`  ❌ FAIL: Order form fields did not collapse to 1-column: ${d.fieldWidths.join(", ")}`);
        allPassed = false;
      } else {
        console.log(`  ✅ PASS: Order form fields collapse to full-width 1-column stack (${d.fieldWidths[0]}px)`);
      }
    }

    // Card header wrap and title clamp
    if (d.topFlexWrap !== "wrap") {
      console.error(`  ❌ FAIL: Table card top header is not wrap (got ${d.topFlexWrap})`);
      allPassed = false;
    } else {
      console.log(`  ✅ PASS: Table card top header wraps gracefully without text collision`);
    }

    if (d.nameLineClamp !== "2") {
      console.error(`  ❌ FAIL: Table card description is not clamped to 2 lines`);
      allPassed = false;
    } else {
      console.log(`  ✅ PASS: Table card description clamped to 2 lines with break-word`);
    }

    // Zone tabs single row kinetic scroll
    if (d.zoneBarFlexWrap !== "nowrap" || d.zoneBarOverflowX !== "auto") {
      console.error(`  ❌ FAIL: Zone tabs bar is not single-row touch scrollable (wrap: ${d.zoneBarFlexWrap}, overflowX: ${d.zoneBarOverflowX})`);
      allPassed = false;
    } else {
      console.log(`  ✅ PASS: Zone tabs bar is single-row touch-scrollable (nowrap, overflow-x: auto)`);
    }

    const allShrinkZero = d.zoneBtnShrinks.every((s) => s === "0");
    if (!allShrinkZero) {
      console.error(`  ❌ FAIL: Not all zone tab buttons have flex-shrink: 0 (${d.zoneBtnShrinks.join(", ")})`);
      allPassed = false;
    } else {
      console.log(`  ✅ PASS: All zone tab buttons maintain intrinsic width (flex-shrink: 0)`);
    }

    // Capture visual proof for 320px
    if (vp.width === 320 && vp.height === 640) {
      const ss = await cdp.send("Page.captureScreenshot", { format: "png" });
      const imgPath = path.join(ARTIFACT_DIR, "table_grid_defensive_worst_case_320.png");
      fs.writeFileSync(imgPath, Buffer.from(ss.data, "base64"));
      console.log(`  📸 Saved visual proof: ${imgPath}`);
    }
  }

  // Cleanup
  cdp.close();
  chromeProc.kill("SIGKILL");
  server.close();

  console.log("\n==================================================================");
  if (allPassed) {
    console.log(" 🎉 ALL TARGET 4 DEFENSIVE HARDENING VERIFICATIONS PASSED!");
  } else {
    console.error(" ❌ SOME TARGET 4 VERIFICATIONS FAILED!");
    process.exit(1);
  }
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("FATAL ERROR in verify-table-grid-defensive:", err);
  process.exit(1);
});
