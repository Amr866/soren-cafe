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

function getChromePath() {
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

function startServer(port = 8845) {
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

async function launchChrome(port = 9245) {
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

async function captureSections() {
  const server = await startServer(8845);
  const { proc, wsUrl } = await launchChrome(9245);
  const cdp = new SimpleCDP(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");

  // Mobile viewport: 390x844 (iPhone 14/15/16)
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  await cdp.send("Page.navigate", { url: "http://127.0.0.1:8845/index.html" });
  await new Promise((r) => setTimeout(r, 1500));

  const sections = [
    { name: "header", selector: ".site-header" },
    { name: "hero", selector: "#home" },
    { name: "about", selector: "#about-soren" },
    { name: "categories", selector: "#categories-overview" },
    { name: "menu-chips-and-grid", selector: "#menu" },
    { name: "footer", selector: "#site-footer" },
    { name: "bottom-nav", selector: "#mobile-bottom-nav" },
  ];

  for (const sec of sections) {
    const evalRes = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const el = document.querySelector('${sec.selector}');
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          x: Math.max(0, rect.x),
          y: Math.max(0, rect.y + window.scrollY),
          width: rect.width,
          height: rect.height,
        };
      })()`,
      returnByValue: true,
    });

    const box = evalRes.result.value;
    if (box && box.height > 0) {
      console.log(`Section ${sec.name}: y=${Math.round(box.y)}, height=${Math.round(box.height)}px`);
      // Scroll to section to ensure lazy images and styles trigger
      await cdp.send("Runtime.evaluate", {
        expression: `window.scrollTo(0, ${Math.max(0, box.y - 40)})`,
      });
      await new Promise((r) => setTimeout(r, 300));

      const screenshot = await cdp.send("Page.captureScreenshot", {
        format: "png",
        clip: {
          x: 0,
          y: Math.max(0, box.y),
          width: 390,
          height: Math.min(box.height, 1200), // cap height at 1200 for single screenshot
          scale: 2,
        },
      });
      fs.writeFileSync(path.join(OUT_DIR, `section-${sec.name}.png`), Buffer.from(screenshot.data, "base64"));
    }
  }

  cdp.close();
  proc.kill();
  server.close();
  console.log("Section screenshots captured successfully in audit-mobile-screenshots/");
}

captureSections().catch(console.error);
