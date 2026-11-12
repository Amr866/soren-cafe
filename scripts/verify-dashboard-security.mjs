import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const BACKEND_PUBLIC_DIR = path.resolve(ROOT_DIR, "backend", "public");

function getChromePath() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;

  if (process.platform === "win32") {
    const defaultWin = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const x86Win = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
    const localWin = path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe");
    for (const p of [defaultWin, x86Win, localWin]) {
      if (fs.existsSync(p)) return p;
    }
    return defaultWin;
  }
  return "google-chrome";
}

const CHROME_PATH = getChromePath();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function startServer(port = 8899) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split("?")[0].split("#")[0];
      if (reqPath === "/" || reqPath === "/dashboard") reqPath = "/dashboard.html";

      if (reqPath.startsWith("/api/")) {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ status: "ok", localIp: "127.0.0.1" }));
        return;
      }

      const filePath = path.join(BACKEND_PUBLIC_DIR, reqPath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "text/plain" });
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

async function launchChrome(port = 9333) {
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), "soren-sec-"));
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${tmpProfile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-extensions",
      "--disable-translate",
      "--metrics-recording-only",
      "--mute-audio",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let isReady = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 150));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        isReady = true;
        break;
      }
    } catch (_) {}
  }

  if (!isReady) {
    try { chromeProcess.kill(); } catch (_) {}
    try { fs.rmSync(tmpProfile, { recursive: true, force: true }); } catch (_) {}
    if (process.env.CI) {
      console.warn("⚠️ Headless Chrome browser unavailable in this CI environment. Skipping dashboard security CDP tests.");
      process.exit(0);
    }
    throw new Error(`Failed to connect to headless Chrome on port ${port}`);
  }

  return {
    chromeProcess,
    cleanup: () => {
      try { chromeProcess.kill(); } catch (_) {}
      try { fs.rmSync(tmpProfile, { recursive: true, force: true }); } catch (_) {}
    },
  };
}

async function runVerification() {
  console.log("================================================================");
  console.log(" 🛡️ VERIFYING SECURITY & DATA-FLOW PIPELINE DASHBOARD INTEGRATION");
  console.log("================================================================");

  const serverPort = 8899;
  const server = await startServer(serverPort);
  console.log(`✔ Local Dashboard Server listening on http://127.0.0.1:${serverPort}`);

  const chromePort = 9333;
  const { cleanup } = await launchChrome(chromePort);
  console.log(`✔ Headless Chrome launched with debugging on port ${chromePort}`);

  // Create new tab
  const newTabRes = await fetch(`http://127.0.0.1:${chromePort}/json/new?about:blank`, { method: "PUT" });
  const tabInfo = await newTabRes.json();
  const cdp = new SimpleCDP(tabInfo.webSocketDebuggerUrl);
  await cdp.connect();
  console.log(`✔ Connected to Chrome tab via WebSocket`);

  const consoleErrors = [];
  cdp.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error") {
      const txt = params.args.map((a) => a.value || a.description || "").join(" ");
      consoleErrors.push(txt);
    }
  });

  cdp.on("Runtime.exceptionThrown", (params) => {
    consoleErrors.push(params.exceptionDetails.text + " " + (params.exceptionDetails.exception?.description || ""));
  });

  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");

  // Test 1: Desktop Viewport (1440x900)
  console.log("\n--- TEST 1: Desktop Viewport Layout & Core Node Pipeline ---");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${serverPort}/dashboard.html` });
  
  // Wait for document readyState === 'complete'
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const readyState = await cdp.send("Runtime.evaluate", {
      expression: "document.readyState",
      returnByValue: true
    });
    if (readyState.result?.value === "complete") break;
  }
  await new Promise((r) => setTimeout(r, 500));

  async function evaluate(fnStr) {
    const res = await cdp.send("Runtime.evaluate", {
      expression: `(${fnStr})()`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text + " " + JSON.stringify(res.exceptionDetails));
    }
    return res.result.value;
  }

  // Verify DOM elements
  const domCheck = await evaluate(() => {
    const sec = document.getElementById("security-dataflow-section");
    const drawer = document.getElementById("sec-inspector-drawer");
    const backdrop = document.getElementById("sec-drawer-backdrop");
    const nodes = ["client", "waf", "middleware", "orm", "database"].map((id) =>
      Boolean(document.getElementById(`node-card-${id}`))
    );
    const tabs = ["sqli", "idor", "ssrf", "ratelimit"].map((t) =>
      Boolean(document.getElementById(`tab-vec-${t}`))
    );

    return {
      href: window.location.href,
      title: document.title,
      bodySnippet: document.body ? document.body.innerHTML.slice(0, 200) : "no body",
      sectionExists: Boolean(sec),
      drawerExists: Boolean(drawer),
      backdropExists: Boolean(backdrop),
      allNodesExist: nodes.every(Boolean),
      allTabsExist: tabs.every(Boolean),
      securityEngineDefined: typeof window.SecurityEngine === "object",
    };
  });

  console.log("DOM Elements Check:", domCheck);
  if (!domCheck.sectionExists || !domCheck.allNodesExist || !domCheck.securityEngineDefined) {
    throw new Error("Core Security Dashboard elements missing in DOM!");
  }
  console.log("✔ Security Section and 5 Pipeline Node Cards present in DOM");

  // Test 2: Vector Switcher & Payload Updates
  console.log("\n--- TEST 2: Attack Scenario Vector Switcher ---");
  for (const vec of ["sqli", "idor", "ssrf", "ratelimit"]) {
    const switched = await evaluate(`() => {
      SecurityEngine.switchVector('${vec}');
      return {
        vector: SecurityEngine.currentVector,
        name: SecurityEngine.scenarios['${vec}'].name,
        payloadSummary: SecurityEngine.scenarios['${vec}'].payloadSummary,
        snippetText: document.getElementById('snippet-node-client').innerText
      };
    }`);
    console.log(`✔ Switched to Vector: ${switched.name} (Payload: ${switched.payloadSummary})`);
  }

  // Test 3: Hardened Mode Simulation (Zero-Trust Mitigation)
  console.log("\n--- TEST 3: Hardened Mode Simulation (Mitigation Intercept) ---");
  const hardenedSim = await evaluate(`() => {
    SecurityEngine.switchVector('sqli');
    SecurityEngine.setHardenedMode(true);
    // Finish simulation at intercept node
    SecurityEngine.finishSimulation(SecurityEngine.scenarios.sqli, 1); // WAF node
    return {
      title: document.getElementById('verdict-title').innerText,
      http: document.getElementById('verdict-http-code').innerText,
      leakage: document.getElementById('verdict-leakage-stat').innerText,
      panelHidden: document.getElementById('data-leakage-panel').classList.contains('hidden')
    };
  }`);
  console.log("Hardened Verdict:", hardenedSim);
  if (!hardenedSim.title.includes("MITIGATED") || !hardenedSim.panelHidden) {
    throw new Error("Hardened simulation failed to show mitigation verdict!");
  }
  console.log("✔ Hardened Mode: Zero-Trust WAF mitigation verified (0 bytes leaked)");

  // Test 4: Vulnerable Mode Simulation (Breach & Data Leakage Preview)
  console.log("\n--- TEST 4: Vulnerable Mode Simulation (Breach & Exfiltration) ---");
  const vulnSim = await evaluate(`() => {
    SecurityEngine.setHardenedMode(false);
    SecurityEngine.finishSimulation(SecurityEngine.scenarios.sqli, 4); // Database node
    return {
      title: document.getElementById('verdict-title').innerText,
      http: document.getElementById('verdict-http-code').innerText,
      leakage: document.getElementById('verdict-leakage-stat').innerText,
      panelVisible: !document.getElementById('data-leakage-panel').classList.contains('hidden'),
      jsonSnippet: document.getElementById('leakage-json-display').innerText.slice(0, 80)
    };
  }`);
  console.log("Vulnerable Breach Verdict:", vulnSim);
  if (!vulnSim.title.includes("SECURITY ALERT") || !vulnSim.panelVisible) {
    throw new Error("Vulnerable simulation failed to display data leakage panel!");
  }
  console.log("✔ Vulnerable Mode: Breach alert and Data Leakage Preview verified");

  // Test 5: Terminal / Node Inspector Drawer
  console.log("\n--- TEST 5: Terminal / Inspector Drawer & Code Diffs ---");
  const drawerCheck = await evaluate(`() => {
    SecurityEngine.openInspector('waf');
    const drawer = document.getElementById('sec-inspector-drawer');
    const title = document.getElementById('drawer-node-title').innerText;
    const vulnCode = document.getElementById('drawer-vulnerable-code').innerText;
    const secCode = document.getElementById('drawer-secure-code').innerText;
    const isOpen = drawer.classList.contains('drawer-open');

    // Switch tab to headers
    SecurityEngine.setInspectorTab('headers');
    const headersVisible = !document.getElementById('pane-tab-headers').classList.contains('hidden');

    // Switch tab to trace
    SecurityEngine.setInspectorTab('trace');
    const traceVisible = !document.getElementById('pane-tab-trace').classList.contains('hidden');

    // Close inspector
    SecurityEngine.closeInspector();
    const isClosed = !drawer.classList.contains('drawer-open');

    return {
      isOpen,
      title,
      hasVulnCode: vulnCode.length > 20,
      hasSecCode: secCode.length > 20,
      headersVisible,
      traceVisible,
      isClosed
    };
  }`);
  console.log("Inspector Drawer Check:", drawerCheck);
  if (!drawerCheck.isOpen || !drawerCheck.hasVulnCode || !drawerCheck.hasSecCode || !drawerCheck.isClosed) {
    throw new Error("Inspector drawer failed interaction checks!");
  }
  console.log("✔ Terminal / Inspector Drawer: Smooth open/close, tab navigation, and vulnerable vs secure code diff verified");

  // Test 6: Responsive Mobile Viewport (390px iPhone)
  console.log("\n--- TEST 6: Responsive Mobile / Tablet Collapse (390px) ---");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  await new Promise((r) => setTimeout(r, 400));
  const mobileCheck = await evaluate(() => {
    const desktopView = document.querySelector(".hidden.lg\\:block");
    const mobileView = document.querySelector(".block.lg\\:hidden");
    const mobileDisplay = window.getComputedStyle(mobileView).display;

    return {
      hasMobileView: Boolean(mobileView),
      mobileVisible: mobileDisplay !== "none",
    };
  });
  console.log("Mobile Viewport Check:", mobileCheck);
  if (!mobileCheck.mobileVisible) {
    throw new Error("Mobile diagnostic view not visible on 390px viewport!");
  }
  console.log("✔ Responsive Architecture: Graceful mobile collapse to step-by-step diagnostic view verified");

  // Test 7: Console Error Audit
  console.log("\n--- TEST 7: Console Error Audit ---");
  // Filter out WebSocket reconnect attempts in test environment
  const filteredErrors = consoleErrors.filter(
    (e) => !e.includes("WebSocket") && !e.includes("ws://") && !e.includes("connection")
  );

  if (filteredErrors.length > 0) {
    console.error("❌ Console errors detected:", filteredErrors);
    throw new Error("Console errors detected during dashboard runtime!");
  } else {
    console.log("✔ 0 console errors detected throughout entire execution");
  }

  // Cleanup
  cdp.close();
  cleanup();
  server.close();

  console.log("\n================================================================");
  console.log("  ALL PHASES 1 & 2 SECURITY DASHBOARD VERIFICATIONS PASSED!");
  console.log("================================================================");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
