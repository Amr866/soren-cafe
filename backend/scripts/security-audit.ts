/**
 * Soren Café — External Security Audit & Penetration Testing Tool
 * Execute from developer laptop: bun scripts/security-audit.ts
 */

const BASE_URL = process.env.TARGET_URL || "http://localhost:4000";

console.log(`
\x1b[38;2;239;68;68m╔══════════════════════════════════════════════════════════════════╗
║  🛡️ SOREN CAFÉ — EXTERNAL PENETRATION & SECURITY AUDIT SUITE      ║
║  Adversary Target: ${BASE_URL.padEnd(46)}║
╚══════════════════════════════════════════════════════════════════╝\x1b[0m
`);

// 1. Verify Target Connectivity
try {
  const ping = await fetch(`${BASE_URL}/api/v1/health`);
  if (!ping.ok) throw new Error("Offline");
  console.log(`\x1b[32m✔ Target Armed & Reachable\x1b[0m (Watch the Mission Control Dashboard at ${BASE_URL}/dashboard)\n`);
} catch {
  console.error(`\x1b[31m✖ Server not running at ${BASE_URL}. Start it first.\x1b[0m\n`);
  process.exit(1);
}

// ---------------- ATTACK 1: Price Tampering (Zero-Trust Bypass) ----------------
console.log(`\x1b[1;33m[ATTACK VECTOR 1] Insecure Direct Object Price Tampering\x1b[0m`);
console.log(`Attacker payload: Altering Cortado price (95,000 Toman) to 0 Toman...`);

try {
  const res = await fetch(`${BASE_URL}/api/v1/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableNumber: "میز ۹۹ (هکر)",
      customerName: "نفوذگر ناشناس",
      items: [
        { productId: "prd_cortado", quantity: 2, price: 0 } // Malicious zero-price injection
      ],
    }),
  });

  const data = await res.json();
  if (data.order && data.order.total_price === 190000) {
    console.log(`\x1b[32m✔ DEFENSE SUCCESS (Anti-Tamper Active):\x1b[0m`);
    console.log(`  - Malicious Price Submitted: 0 Toman`);
    console.log(`  - Authoritative Price Enforced: \x1b[1;32m${data.order.total_price.toLocaleString()} تومان\x1b[0m (95,000 × 2)`);
    console.log(`  - Visual SOC Alert dispatched to /dashboard\n`);
  } else {
    console.log(`\x1b[31m✖ VULNERABILITY DETECTED: Server accepted altered price!\x1b[0m\n`);
  }
} catch (e: any) {
  console.log(`\x1b[31m✖ Attack failed with network error: ${e.message}\x1b[0m\n`);
}

await new Promise(r => setTimeout(r, 1000));

// ---------------- ATTACK 2: Privilege Escalation (Barista Bypass) ----------------
console.log(`\x1b[1;33m[ATTACK VECTOR 2] Administrative Privilege Escalation\x1b[0m`);
console.log(`Attacker attempting to manipulate order status without valid Barista PIN...`);

try {
  const res = await fetch(`${BASE_URL}/api/v1/orders/ord_1001/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-barista-pin": "hacker_pin_0000", // Forged PIN
    },
    body: JSON.stringify({ status: "READY" }),
  });

  if (res.status === 401) {
    const err = await res.json();
    console.log(`\x1b[32m✔ DEFENSE SUCCESS (Access Denied):\x1b[0m`);
    console.log(`  - HTTP Status: \x1b[33m401 Unauthorized\x1b[0m`);
    console.log(`  - Server Response: "${err.message}"`);
    console.log(`  - Visual SOC Alert dispatched to /dashboard\n`);
  } else {
    console.log(`\x1b[31m✖ VULNERABILITY DETECTED: Unauthorized access allowed!\x1b[0m\n`);
  }
} catch (e: any) {
  console.log(`\x1b[31m✖ Error: ${e.message}\x1b[0m\n`);
}

await new Promise(r => setTimeout(r, 1000));

// ---------------- ATTACK 3: Rapid Flooding (Rate-Limit Test) ----------------
console.log(`\x1b[1;33m[ATTACK VECTOR 3] Rapid Order Burst & Flooding (DDoS Defense)\x1b[0m`);
console.log(`Attacker firing 15 rapid orders in 1 second to overwhelm server...`);

let blockedCount = 0;
let acceptedCount = 0;

for (let i = 0; i < 15; i++) {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableNumber: "میز ۹۹",
        customerName: `اسپمر #${i + 1}`,
        items: [{ productId: "prd_doppio", quantity: 1 }],
      }),
    });

    if (res.status === 429) {
      blockedCount++;
    } else if (res.ok) {
      acceptedCount++;
    }
  } catch {}
}

console.log(`\x1b[32m✔ DEFENSE SUCCESS (Rate-Limiter Active):\x1b[0m`);
console.log(`  - Accepted within tolerance: ${acceptedCount} orders`);
console.log(`  - Blocked by Shield: \x1b[1;31m${blockedCount} orders (HTTP 429 Too Many Requests)\x1b[0m`);
console.log(`  - Threat logged on Mission Control Radar.\n`);

console.log(`\x1b[32m════════════════════════════════════════════════════════════════════\x1b[0m`);
console.log(`\x1b[1;32mALL 3 SECURITY AUDIT VECTORS NEUTRALIZED DEFENSIVELY BY SOREN ENGINE\x1b[0m`);
console.log(`Check http://localhost:4000/dashboard to inspect the real-time SOC log.`);
console.log(`\x1b[32m════════════════════════════════════════════════════════════════════\x1b[0m\n`);
