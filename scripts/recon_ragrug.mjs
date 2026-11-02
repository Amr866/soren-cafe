import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOTS_DIR = "C:\\Users\\hp\\.gemini\\antigravity\\brain\\14c6b1bd-b21a-4e12-a6b0-0d4ad919a09c\\screenshots";

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

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

async function launchChrome(port = 9444) {
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

async function captureScreenshot(cdp, filename, fullPage = false) {
  const filePath = path.join(SCREENSHOTS_DIR, filename);
  let params = { format: "png" };
  if (fullPage) {
    const layout = await cdp.send("Page.getLayoutMetrics");
    params.captureBeyondViewport = true;
    params.clip = {
      x: 0,
      y: 0,
      width: layout.cssContentSize.width,
      height: Math.min(layout.cssContentSize.height, 8000), // cap at 8000 to avoid memory overflow
      scale: 1,
    };
  }
  const result = await cdp.send("Page.captureScreenshot", params);
  fs.writeFileSync(filePath, Buffer.from(result.data, "base64"));
  console.log(`📸 Saved screenshot: ${filename} (${(result.data.length / 1024).toFixed(1)} KB)`);
  return filePath;
}

async function evaluate(cdp, expression) {
  const res = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.text || "Eval error");
  }
  return res.result.value;
}

async function setViewport(cdp, { width, height, deviceScaleFactor = 1, mobile = false }) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor,
    mobile,
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", {
    enabled: mobile,
  });
}

async function run() {
  const chromePort = 9444;
  console.log("🚀 Launching Chrome on port", chromePort);
  const { chromeProcess, wsUrl } = await launchChrome(chromePort);

  const logs = [];
  const networkErrors = [];

  try {
    async function createTab(url, viewport) {
      const newTabRes = await fetch(`http://127.0.0.1:${chromePort}/json/new?about:blank`, { method: "PUT" });
      const tabInfo = await newTabRes.json();
      const cdp = new SimpleCDP(tabInfo.webSocketDebuggerUrl);
      await cdp.connect();

      await cdp.send("Page.enable");
      await cdp.send("DOM.enable");
      await cdp.send("Runtime.enable");
      await cdp.send("Network.enable");

      cdp.on("Runtime.consoleAPICalled", (params) => {
        logs.push({
          url,
          type: params.type,
          text: params.args.map((a) => (a.value !== undefined ? String(a.value) : (a.description || ""))).join(" "),
        });
      });

      cdp.on("Network.responseReceived", (params) => {
        if (params.response.status >= 400) {
          networkErrors.push({
            page: url,
            url: params.response.url,
            status: params.response.status,
            statusText: params.response.statusText,
          });
        }
      });

      cdp.on("Network.loadingFailed", (params) => {
        networkErrors.push({
          page: url,
          requestId: params.requestId,
          errorText: params.errorText,
          canceled: params.canceled,
        });
      });

      await setViewport(cdp, viewport);
      await cdp.send("Page.navigate", { url });

      // Wait for page load
      await new Promise((resolve) => {
        const handler = () => {
          resolve();
        };
        cdp.on("Page.loadEventFired", handler);
        setTimeout(resolve, 8000); // 8s timeout safety
      });

      // Extra delay for animations/fonts
      await new Promise((r) => setTimeout(r, 1500));
      return { cdp, tabId: tabInfo.id };
    }

    async function closeTab(tabId) {
      try {
        await fetch(`http://127.0.0.1:${chromePort}/json/close/${tabId}`);
      } catch (_) {}
    }

    console.log("\n=======================================================");
    console.log("1. MENU PAGE: DESKTOP & MOBILE");
    console.log("=======================================================");

    // 1. Menu Desktop
    {
      const { cdp, tabId } = await createTab("https://caferagrug.com/menu/", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await captureScreenshot(cdp, "01_menu_desktop_viewport.png", false);
      await captureScreenshot(cdp, "01_menu_desktop_full.png", true);

      // Search interaction
      await evaluate(cdp, `(() => {
        try {
          const q = document.getElementById('q');
          if (q) {
            q.value = 'پپرونی';
            q.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } catch(e) { console.error('Search error', e); }
      })()`);
      await new Promise((r) => setTimeout(r, 600));
      await captureScreenshot(cdp, "02_menu_search_pep_desktop.png", false);

      // Clear search
      await evaluate(cdp, `(() => {
        try {
          const q = document.getElementById('q');
          if (q) {
            q.value = '';
            q.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } catch(e) { console.error('Clear error', e); }
      })()`);
      await new Promise((r) => setTimeout(r, 300));

      // Trigger 3D view
      const has3d = await evaluate(cdp, `(() => {
        try {
          const btn = document.querySelector('.see3d');
          if (btn) { btn.click(); return true; }
        } catch(e) { console.error('3d click error', e); }
        return false;
      })()`);
      if (has3d) {
        await new Promise((r) => setTimeout(r, 2000));
        await captureScreenshot(cdp, "03_menu_3d_modal_desktop.png", false);
        await evaluate(cdp, `(() => {
          const closeBtn = document.getElementById('v3dX');
          if (closeBtn) closeBtn.click();
        })()`);
      }

      cdp.close();
      await closeTab(tabId);
    }

    // 2. Menu Mobile (iPhone 14 / 390x844)
    {
      const { cdp, tabId } = await createTab("https://caferagrug.com/menu/", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
      await captureScreenshot(cdp, "04_menu_mobile_viewport.png", false);

      // Add item to cart and add note
      await evaluate(cdp, `(() => {
        try {
          // Click '+' on first item
          const firstPlus = document.querySelector('.i-order [data-act="inc"]');
          if (firstPlus) firstPlus.click();

          // Click note on first item
          const firstNote = document.querySelector('.i-order .note-btn');
          if (firstNote) firstNote.click();
        } catch(e) { console.error('Note/Inc error', e); }
      })()`);
      await new Promise((r) => setTimeout(r, 600));
      await captureScreenshot(cdp, "05_menu_mobile_with_item_note.png", false);

      // View sticky cart bar
      await evaluate(cdp, `(() => {
        try {
          // Type a note
          const noteInput = document.querySelector('.note-in');
          if (noteInput) {
            noteInput.value = 'کم نمک و بدون فلفل';
            noteInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          // Add another item
          const secondPlus = document.querySelectorAll('.i-order [data-act="inc"]')[1];
          if (secondPlus) secondPlus.click();
        } catch(e) { console.error('Cart bar error', e); }
      })()`);
      await new Promise((r) => setTimeout(r, 600));
      await captureScreenshot(cdp, "06_menu_mobile_sticky_cart_bar.png", false);

      // Open Cart Sheet
      await evaluate(cdp, `(() => {
        const cartOpen = document.getElementById('cartOpen');
        if (cartOpen) cartOpen.click();
      })()`);
      await new Promise((r) => setTimeout(r, 800));
      await captureScreenshot(cdp, "07_menu_mobile_cart_sheet_eat_in.png", false);

      // Switch to takeaway
      await evaluate(cdp, `(() => {
        const takeawayRadio = document.querySelector('input[name="otype"][value="takeaway"]');
        if (takeawayRadio) {
          takeawayRadio.checked = true;
          takeawayRadio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()`);
      await new Promise((r) => setTimeout(r, 500));
      await captureScreenshot(cdp, "08_menu_mobile_cart_sheet_takeaway.png", false);

      cdp.close();
      await closeTab(tabId);
    }

    console.log("\n=======================================================");
    console.log("2. HOME PAGE (DESKTOP & MOBILE)");
    console.log("=======================================================");

    // Home Desktop
    {
      const { cdp, tabId } = await createTab("https://caferagrug.com/", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await captureScreenshot(cdp, "09_home_desktop_viewport.png", false);
      await captureScreenshot(cdp, "09_home_desktop_full.png", true);

      // Check assistant input if present
      const hasAssistant = await evaluate(cdp, `(() => {
        const inp = document.querySelector('input[type="text"], input[type="search"], .assistant-input');
        if (inp) {
          inp.value = 'ساعت کاری امروز تا چه زمانیه؟';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      })()`);
      if (hasAssistant) {
        await new Promise((r) => setTimeout(r, 1000));
        await captureScreenshot(cdp, "10_home_assistant_interaction.png", false);
      }

      cdp.close();
      await closeTab(tabId);
    }

    // Home Mobile
    {
      const { cdp, tabId } = await createTab("https://caferagrug.com/", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
      await captureScreenshot(cdp, "11_home_mobile_viewport.png", false);
      cdp.close();
      await closeTab(tabId);
    }

    console.log("\n=======================================================");
    console.log("3. PASSPORT (LOYALTY) & STAFF PORTAL");
    console.log("=======================================================");

    // Passport Mobile & Desktop
    {
      const { cdp, tabId } = await createTab("https://caferagrug.com/passport/", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await captureScreenshot(cdp, "12_passport_desktop_viewport.png", false);
      await captureScreenshot(cdp, "12_passport_desktop_full.png", true);
      cdp.close();
      await closeTab(tabId);
    }
    {
      const { cdp, tabId } = await createTab("https://caferagrug.com/passport/", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
      await captureScreenshot(cdp, "13_passport_mobile_viewport.png", false);
      cdp.close();
      await closeTab(tabId);
    }

    // Staff Portal
    {
      const { cdp, tabId } = await createTab("https://caferagrug.com/passport/staff/", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await captureScreenshot(cdp, "14_passport_staff_desktop.png", false);
      cdp.close();
      await closeTab(tabId);
    }

    console.log("\n=======================================================");
    console.log("4. ABOUT PAGE & SAHAND PIZZA RUN GAME");
    console.log("=======================================================");

    // About Page
    {
      const { cdp, tabId } = await createTab("https://caferagrug.com/about/", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await captureScreenshot(cdp, "15_about_desktop_viewport.png", false);
      await captureScreenshot(cdp, "15_about_desktop_full.png", true);
      cdp.close();
      await closeTab(tabId);
    }
    {
      const { cdp, tabId } = await createTab("https://caferagrug.com/about/", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
      await captureScreenshot(cdp, "16_about_mobile_viewport.png", false);
      cdp.close();
      await closeTab(tabId);
    }

    // Game Page
    {
      const { cdp, tabId } = await createTab("https://caferagrug.com/game/", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await captureScreenshot(cdp, "17_game_desktop_viewport.png", false);
      cdp.close();
      await closeTab(tabId);
    }
    {
      const { cdp, tabId } = await createTab("https://caferagrug.com/game/", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
      await captureScreenshot(cdp, "18_game_mobile_viewport.png", false);
      cdp.close();
      await closeTab(tabId);
    }

    // English Menu
    {
      const { cdp, tabId } = await createTab("https://caferagrug.com/menu/?lang=en", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await captureScreenshot(cdp, "19_menu_en_desktop.png", false);
      cdp.close();
      await closeTab(tabId);
    }

    console.log("\n=======================================================");
    console.log("AUDIT SUMMARY: CONSOLE LOGS & NETWORK ERRORS");
    console.log("=======================================================");
    console.log("Console Log Count:", logs.length);
    logs.forEach((l) => console.log(`[CONSOLE ${l.type.toUpperCase()}] (${l.url}) ${l.text}`));

    console.log("\nNetwork Errors / 4xx / 5xx Count:", networkErrors.length);
    networkErrors.forEach((e) => console.log(`[NETWORK FAIL] (${e.page}) ${e.url || e.requestId}: ${e.status || e.errorText}`));

    // Save logs to json file
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, "audit_logs.json"),
      JSON.stringify({ logs, networkErrors }, null, 2)
    );
    console.log("\n✅ Finished all captures and saved audit_logs.json!");

  } finally {
    try {
      chromeProcess.kill();
    } catch (_) {}
  }
}

run().catch((err) => {
  console.error("FATAL ERROR in recon script:", err);
  process.exit(1);
});
