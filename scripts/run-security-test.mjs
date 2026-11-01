import { spawn } from "node:child_process";

const PORT = 4099;
console.log(`🚀 Launching Soren Café Engine on port ${PORT} for automated security audit...`);

const serverProcess = spawn("bun", ["src/server.ts"], {
  cwd: "./backend",
  env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});

serverProcess.stderr.on("data", (d) => {
  const msg = d.toString();
  if (msg.includes("error") || msg.includes("Error")) {
    process.stderr.write(msg);
  }
});

// Poll for health check
let healthy = false;
for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch(`http://localhost:${PORT}/api/v1/health`);
    if (res.ok) {
      healthy = true;
      break;
    }
  } catch (_) {}
  await new Promise((r) => setTimeout(r, 150));
}

if (!healthy) {
  serverProcess.kill();
  console.error("❌ Failed to reach backend server within 4.5s");
  process.exit(1);
}

console.log("🎯 Backend server armed. Executing security audit suite...\n");

const auditProcess = spawn("bun", ["scripts/security-audit.ts"], {
  cwd: "./backend",
  env: { ...process.env, TARGET_URL: `http://localhost:${PORT}` },
  stdio: "inherit",
});

auditProcess.on("exit", (code) => {
  serverProcess.kill();
  if (code === 0) {
    console.log("🛡️ Security verification completed with exit code 0.");
  }
  process.exit(code ?? 0);
});
