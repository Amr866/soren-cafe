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
const SERVER_PORT = 8993;
const CHROME_PORT = 9445;

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

async function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split("?")[0].split("#")[0];
      if (reqPath === "/") reqPath = "/index.html";
      const filePath = path.join(FRONTEND_DIR, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });
    server.listen(SERVER_PORT, "127.0.0.1", () => resolve(server));
  });
}

async function run() {
  console.log("========================================================");
  console.log(" ☕ VERIFYING: IN-CARD STEPPERS & CONTEXTUAL UPSELL SHELF");
  console.log("========================================================");

  const server = await startServer();
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${CHROME_PORT}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  await new Promise((r) => setTimeout(r, 1200));

  try {
    const newTabRes = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/new?about:blank`, { method: "PUT" });
    const tabInfo = await newTabRes.json();
    const cdp = new SimpleCDP(tabInfo.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    const loadPromise = new Promise((resolve) => {
      cdp.on("Page.loadEventFired", () => resolve());
    });

    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${SERVER_PORT}/index.html` });
    await loadPromise;
    await new Promise((r) => setTimeout(r, 600));

    // Test 1: Verify clean rollback - NO customizer modals, NO tasting notes, NO stamped badges
    const rawTest1 = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        return {
          hasCustomizerBackdrop: !!document.getElementById('drink-customizer-backdrop'),
          hasCustomizerSheet: !!document.getElementById('drink-customizer-sheet'),
          tastingNotesCount: document.querySelectorAll('.drink-tasting-notes').length,
          stampedPriceCount: document.querySelectorAll('.hand-stamped-price').length,
          cardCustomizeBtnCount: document.querySelectorAll('.card-customize-btn').length,
        };
      })()`,
    });
    const test1 = rawTest1.result ? rawTest1.result.value : rawTest1.value;
    console.log("✅ Test 1: Clean Rollback of Customizer & Clutter:", test1);
    if (
      test1.hasCustomizerBackdrop ||
      test1.hasCustomizerSheet ||
      test1.tastingNotesCount > 0 ||
      test1.stampedPriceCount > 0 ||
      test1.cardCustomizeBtnCount > 0
    ) {
      throw new Error("Customizer elements or clutter still present in DOM!");
    }

    // Test 2: Instant In-Card Stepper - tap + directly on Espresso Double
    const rawTest2 = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
        if (!card) return { found: false };
        const addBtn = card.querySelector('.card-add-btn');
        if (!addBtn) return { found: true, addBtn: false };

        addBtn.click();

        const stepper = card.querySelector('.card-stepper');
        const countEl = card.querySelector('.stepper-count');
        const count = countEl ? countEl.textContent.trim() : null;
        return {
          found: true,
          stepperAppeared: !!stepper,
          stepperCount: count,
          cartCount: window.SorenCartStore ? window.SorenCartStore.getTotalCount() : 0,
        };
      })()`,
    });
    const test2 = rawTest2.result ? rawTest2.result.value : rawTest2.value;
    console.log("✅ Test 2: Instant In-Card Stepper Activation on + Tap:", test2);
    if (!test2.stepperAppeared || test2.cartCount < 1) {
      throw new Error("In-card stepper did not appear or cart item count is 0!");
    }

    // Test 3: Floating Persistent Order Pill state and pulse
    const rawTest3 = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const pill = document.getElementById('floating-order-bar');
        const countEl = document.getElementById('order-bar-count');
        const priceEl = document.getElementById('order-bar-price');
        return {
          visible: pill ? pill.classList.contains('is-visible') : false,
          countText: countEl ? countEl.textContent.trim() : '',
          priceText: priceEl ? priceEl.textContent.trim() : '',
        };
      })()`,
    });
    const test3 = rawTest3.result ? rawTest3.result.value : rawTest3.value;
    console.log("✅ Test 3: Floating Order Pill Visible & Synchronized:", test3);
    if (!test3.visible || !test3.countText.includes("۱")) {
      throw new Error("Floating order pill is not visible with correct count!");
    }

    // Test 4: Stepper increment on the card
    const rawTest4 = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const card = document.querySelector('.featured-card[data-id="prd_espresso_double"]');
        const plusBtn = card.querySelector('.stepper-plus');
        if (plusBtn) plusBtn.click();
        const countEl = card.querySelector('.stepper-count');
        return {
          countAfterPlus: countEl ? countEl.textContent.trim() : '',
          cartCount: window.SorenCartStore ? window.SorenCartStore.getTotalCount() : 0,
        };
      })()`,
    });
    const test4 = rawTest4.result ? rawTest4.result.value : rawTest4.value;
    console.log("✅ Test 4: Stepper + Button Increments Quantity on the Fly:", test4);
    if (test4.cartCount !== 2) {
      throw new Error("Stepper increment failed!");
    }

    // Test 5: Open Cart Drawer & Check Contextual Upsell Shelf
    const rawTest5 = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        if (typeof window.openCartBottomSheet === 'function') {
          window.openCartBottomSheet();
        }
        const shelf = document.querySelector('.cart-upsell-shelf');
        const title = shelf ? shelf.querySelector('.upsell-shelf-title')?.textContent.trim() : null;
        const addBtn = shelf ? shelf.querySelector('#upsell-add-basque-btn') : null;
        return {
          shelfVisible: !!shelf,
          shelfTitle: title,
          hasAddBtn: !!addBtn,
        };
      })()`,
    });
    const test5 = rawTest5.result ? rawTest5.result.value : rawTest5.value;
    console.log("✅ Test 5: Contextual Upsell Shelf Triggered in Cart Drawer:", test5);
    if (!test5.shelfVisible || !test5.shelfTitle.includes("پیشنهاد باریستا")) {
      throw new Error("Contextual upsell shelf not visible in cart drawer!");
    }

    // Test 6: 1-Tap Add on Basque Cheesecake Upsell
    const rawTest6 = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const addBtn = document.querySelector('#upsell-add-basque-btn');
        if (addBtn) addBtn.click();

        const items = window.SorenCartStore ? window.SorenCartStore.getItems() : [];
        const hasBasque = items.some(it => (it.productId || it.id) === 'prd_basque');
        const shelfAfter = document.querySelector('.cart-upsell-shelf');
        const drawerOpen = document.getElementById('cart-bottom-sheet').classList.contains('is-open');

        return {
          hasBasqueInCart: hasBasque,
          shelfDismissed: !shelfAfter,
          drawerStillOpen: drawerOpen,
          totalItemsCount: window.SorenCartStore ? window.SorenCartStore.getTotalCount() : 0,
        };
      })()`,
    });
    const test6 = rawTest6.result ? rawTest6.result.value : rawTest6.value;
    console.log("✅ Test 6: 1-Tap Upsell Added Seamlessly (Zero Momentum Loss):", test6);
    if (!test6.hasBasqueInCart || !test6.drawerStillOpen || !test6.shelfDismissed) {
      throw new Error("1-tap add on upsell failed!");
    }

    cdp.close();
    chromeProcess.kill();
    server.close();

    console.log("\n========================================================");
    console.log(" 🎯 ALL 6 TESTS PASSED: CLEAN ROLLBACK + KEEP 2 FEATURES");
    console.log("========================================================");
  } catch (err) {
    chromeProcess.kill();
    server.close();
    console.error("Test error:", err);
    process.exit(1);
  }
}

run();
