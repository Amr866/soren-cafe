import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.resolve(ROOT_DIR, "frontend");

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

function startServer(port = 8799) {
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
    if (this.ws) this.ws.close();
  }
}

async function run() {
  const port = 8799;
  const server = await startServer(port);
  const chromePath = getChromePath();
  const cdpPort = 9444;

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
  for (let i = 0; i < 15; i++) {
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

  const cdp = new SimpleCDP(tabInfo.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  // Navigate to worst case URL
  await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/index.html?data=worst` });
  await new Promise((r) => setTimeout(r, 1200));

  console.log("=================================================");
  console.log(" BREAK-UI VERIFICATION: TESTING WORST-CASE FIXES");
  console.log("=================================================");

  const testWidths = [1200, 768, 390, 320];

  for (const w of testWidths) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: w,
      height: 800,
      deviceScaleFactor: 2,
      mobile: w <= 768,
    });
    await new Promise((r) => setTimeout(r, 400));

    const check = await cdp.send("Runtime.evaluate", {
      expression: `
        (() => {
          const docScroll = document.documentElement.scrollWidth;
          const bodyScroll = document.body.scrollWidth;
          const vw = window.innerWidth;
          const hasHorizontalOverflow = (docScroll > vw + 1 || bodyScroll > vw + 1);

          const imgBadge = document.querySelector('.hero-image-badge');
          const imgFrame = document.querySelector('.hero-image-frame');
          let badgeClipped = false;
          let badgeClippedPixels = 0;
          if (imgBadge && imgFrame) {
            const b = imgBadge.getBoundingClientRect();
            const f = imgFrame.getBoundingClientRect();
            if (b.left < f.left - 1) {
              badgeClipped = true;
              badgeClippedPixels = Math.round(f.left - b.left);
            }
          }

          const imgTag = document.querySelector('.hero-image-tag');
          let tagOverflow = false;
          if (imgTag && imgFrame) {
            const t = imgTag.getBoundingClientRect();
            const f = imgFrame.getBoundingClientRect();
            if (t.right > f.right + 1) {
              tagOverflow = true;
            }
          }

          const btns = Array.from(document.querySelectorAll('.hero-btn'));
          const btnData = btns.map(b => ({
            text: b.innerText.trim().replace(/\\n/g, ' '),
            width: Math.round(b.getBoundingClientRect().width),
            height: Math.round(b.getBoundingClientRect().height)
          }));

          const highlights = Array.from(document.querySelectorAll('.hero-highlights .highlight-item'));
          const hlData = highlights.map(h => ({
            colWidth: Math.round(h.getBoundingClientRect().width),
            valWidth: Math.round(h.querySelector('.highlight-value').scrollWidth),
            overflow: h.querySelector('.highlight-value').scrollWidth > h.clientWidth + 2
          }));

          const hasToggle = !!document.getElementById('break-ui-toggle');

          return {
            vw,
            hasHorizontalOverflow,
            docScroll,
            badgeClipped,
            badgeClippedPixels,
            tagOverflow,
            btnData,
            hlData,
            hasToggle
          };
        })()
      `,
      returnByValue: true,
    });

    const res = check.result.value;
    console.log(`\n--- Viewport: ${w}px ---`);
    console.log(`Horizontal Overflow: ${res.hasHorizontalOverflow ? "❌ FAILED (" + res.docScroll + "px)" : "✅ CLEAN (0px)"}`);
    console.log(`Floating Badge Clipped: ${res.badgeClipped ? "❌ Clipped by " + res.badgeClippedPixels + "px" : "✅ Perfectly Contained"}`);
    console.log(`Top Tag Overflow: ${res.tagOverflow ? "❌ Tag Overflows Frame" : "✅ Contained"}`);
    console.log(`Buttons: ${JSON.stringify(res.btnData)}`);
    console.log(`Dev Toggle Present: ${res.hasToggle ? "✅ YES" : "❌ NO"}`);

    if (w === 320) {
      const screenshot = await cdp.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(
        "C:/Users/hp/.gemini/antigravity/brain/94a7d6ed-19f4-4657-a401-8e74999927fa/break_ui_worst_case_320.png",
        Buffer.from(screenshot.data, "base64")
      );
      console.log("Saved screenshot: break_ui_worst_case_320.png");
    }
    if (w === 1200) {
      const screenshot = await cdp.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(
        "C:/Users/hp/.gemini/antigravity/brain/94a7d6ed-19f4-4657-a401-8e74999927fa/break_ui_worst_case_1200.png",
        Buffer.from(screenshot.data, "base64")
      );
      console.log("Saved screenshot: break_ui_worst_case_1200.png");
    }
  }

  cdp.close();
  chromeProc.kill("SIGKILL");
  server.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
