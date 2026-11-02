import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
];
let chromePath = chromePaths.find(p => fs.existsSync(p));

const remoteDebuggingPort = 9893;
const chromeProc = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${remoteDebuggingPort}`,
  '--disable-gpu',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--remote-allow-origins=*',
]);

async function getWsUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${remoteDebuggingPort}/json/version`);
      const data = await res.json();
      return data.webSocketDebuggerUrl;
    } catch (e) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  throw new Error('Chrome did not start');
}

try {
  await getWsUrl();
  const newTabRes = await fetch(`http://127.0.0.1:${remoteDebuggingPort}/json/new?http://127.0.0.1:4000/index.html`, { method: 'PUT' });
  const tabData = await newTabRes.json();
  const ws = new WebSocket(tabData.webSocketDebuggerUrl);

  await new Promise(r => (ws.onopen = r));
  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  };

  function sendCommand(method, params = {}) {
    return new Promise(resolve => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCommand('Page.enable');
  await sendCommand('Runtime.enable');
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  await new Promise(r => setTimeout(r, 1200));

  // Add items via SorenCartStore directly
  const addResult = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      document.documentElement.style.scrollBehavior = 'auto';

      if (window.SorenCartStore) {
        window.SorenCartStore.addItem({
          id: 'prd_brownie',
          name: 'براونی شکلاتی فاج',
          price: 130000,
          category: 'cake'
        });
        window.SorenCartStore.addItem({
          id: 'prd_tiramisu',
          name: 'تیرامیسو',
          price: 170000,
          category: 'cake'
        });
      }

      // Scroll to brownie card
      const brownie = document.querySelector('.featured-card[data-id=\"prd_brownie\"]');
      if (brownie) {
        const rect = brownie.getBoundingClientRect();
        window.scrollBy(0, rect.top - 200);
      }

      return {
        cartCount: window.SorenCartStore ? window.SorenCartStore.getTotalCount() : null,
      };
    })()`,
    returnByValue: true
  });

  console.log('CART ADD RESULT:', addResult.result.value);

  await new Promise(r => setTimeout(r, 600));

  // Check state and take screenshot
  const checkState = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const brownieCard = document.querySelector('.featured-card[data-id=\"prd_brownie\"]');
      const tiramisuCard = document.querySelector('.featured-card[data-id=\"prd_tiramisu\"]');
      const floatingBar = document.getElementById('floating-order-bar');

      return {
        brownieStepper: brownieCard ? !!brownieCard.querySelector('.card-stepper') : false,
        brownieActionHtml: brownieCard ? brownieCard.querySelector('.card-action-box')?.innerHTML : null,
        tiramisuStepper: tiramisuCard ? !!tiramisuCard.querySelector('.card-stepper') : false,
        floatingBarVisible: floatingBar ? floatingBar.classList.contains('is-visible') : false,
      };
    })()`,
    returnByValue: true
  });

  console.log('CHECK STATE:', checkState.result.value);

  // Capture screenshot
  const screenshot = await sendCommand('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });

  const outPath = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\75bc7d92-c9f1-4abe-9cbf-9a17e1581b60\\verified_mobile_declutter_stepper.png';
  fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
  console.log('Saved screenshot to:', outPath);

  ws.close();
} finally {
  chromeProc.kill('SIGKILL');
}
