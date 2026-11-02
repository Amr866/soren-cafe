import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
];
let chromePath = chromePaths.find(p => fs.existsSync(p));

const remoteDebuggingPort = 9894;
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

  const consoleLogs = [];
  const exceptions = [];

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      consoleLogs.push(msg.params.args.map(a => a.value || a.description || '').join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(msg.params.exceptionDetails);
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

  // Wait for page load
  await sendCommand('Page.navigate', { url: 'http://127.0.0.1:4000/index.html' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('CONSOLE LOGS:', consoleLogs.slice(0, 10));
  if (exceptions.length > 0) {
    console.log('EXCEPTIONS:', JSON.stringify(exceptions, null, 2));
  }

  const checkDiag = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      return {
        readyState: document.readyState,
        hasSorenCartStore: typeof window.SorenCartStore !== 'undefined',
        hasSorenCart: typeof window.SorenCart !== 'undefined',
      };
    })()`,
    returnByValue: true
  });
  console.log('DIAGNOSTICS:', checkDiag.result.value);

  ws.close();
} finally {
  chromeProc.kill('SIGKILL');
}
