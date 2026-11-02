import fs from "node:fs";

async function main() {
  console.log("=========================================");
  console.log("EXTRACTING DEEP RECON DATA FOR RAG RUG");
  console.log("=========================================");

  // 1. Menu details
  const menuRes = await fetch("https://caferagrug.com/menu/");
  const menuHtml = await menuRes.text();

  // Categories
  const catMatches = [...menuHtml.matchAll(/class="cat[^"]*"[^>]*data-cat="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  console.log("\n--- Categories found (" + catMatches.length + ") ---");
  const categories = catMatches.map((m) => {
    const slug = m[1];
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return { slug, text };
  });
  console.log(categories);

  // Menu items in DOM
  const itemMatches = [...menuHtml.matchAll(/<article[^>]*class="item[^"]*"[^>]*data-search="([^"]+)"([\s\S]*?)<\/article>/g)];
  console.log("\nTotal item articles in DOM:", itemMatches.length);

  // Parse menuPrices
  const menuJsonMatch = menuHtml.match(/id="menuPrices"[^>]*>([\s\S]*?)<\/script>/i);
  let menuPrices = {};
  if (menuJsonMatch) {
    menuPrices = JSON.parse(menuJsonMatch[1].trim());
    console.log("Total items in menuPrices JSON:", Object.keys(menuPrices).length);
  }

  // Price analysis
  const prices = Object.values(menuPrices).map((i) => i.p);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  console.log(`Price range: ${minPrice.toLocaleString()} to ${maxPrice.toLocaleString()} Tomans (Average: ${avgPrice.toLocaleString()} Tomans)`);

  // Check sections
  const secMatches = [...menuHtml.matchAll(/<section[^>]*id="cat-([^"]+)"[^>]*class="cat-sec[^"]*"[^>]*>([\s\S]*?)<\/section>/g)];
  console.log("\n--- Sections breakdown ---");
  for (const s of secMatches) {
    const slug = s[1];
    const content = s[2];
    const titleMatch = content.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, " ").trim() : slug;
    const itemsInSection = [...content.matchAll(/<article[^>]*class="item/g)].length;
    console.log(`- [${slug}] ${title}: ${itemsInSection} items`);
  }

  // Dietary tags / badges
  const badgeMatches = [...menuHtml.matchAll(/class="badge[^"]*"[^>]*>([\s\S]*?)<\/span>/g)];
  const badges = [...new Set(badgeMatches.map((m) => m[1].replace(/<[^>]+>/g, " ").trim()))];
  console.log("\nBadges / Tags found:", badges);

  // 2. Home page inspection
  console.log("\n=========================================");
  console.log("HOME PAGE DETAILS");
  console.log("=========================================");
  const homeRes = await fetch("https://caferagrug.com/");
  const homeHtml = await homeRes.text();

  // Assistant script in Home
  const assistantScriptMatch = homeHtml.match(/\/\* Rag Rug assistant[\s\S]*?<\/script>/i);
  if (assistantScriptMatch) {
    console.log("\nAssistant script snippet (first 1000 chars):");
    console.log(assistantScriptMatch[0].slice(0, 1000));
  }

  // Home hours JSON
  const hoursMatch = homeHtml.match(/\{"hours":[\s\S]*?\}/);
  if (hoursMatch) {
    console.log("\nHome hours config:", hoursMatch[0]);
  }

  // 3. Passport (Loyalty) inspection
  console.log("\n=========================================");
  console.log("PASSPORT DETAILS");
  console.log("=========================================");
  const passRes = await fetch("https://caferagrug.com/passport/");
  const passHtml = await passRes.text();
  const passCfgMatch = passHtml.match(/id="cfg"[^>]*>([\s\S]*?)<\/script>/i);
  if (passCfgMatch) {
    console.log("Passport CFG:", passCfgMatch[1].trim());
  }

  // Passport logic script
  const passScriptMatch = passHtml.match(/\(function\(\)\{\s*'use strict';\s*var CFG =[\s\S]*?<\/script>/i);
  if (passScriptMatch) {
    console.log("\nPassport Script snippet (first 1200 chars):");
    console.log(passScriptMatch[0].slice(0, 1200));
  }

  // 4. Staff Portal inspection
  console.log("\n=========================================");
  console.log("STAFF PORTAL DETAILS");
  console.log("=========================================");
  const staffRes = await fetch("https://caferagrug.com/passport/staff/");
  const staffHtml = await staffRes.text();
  const staffScriptMatch = staffHtml.match(/\(function\(\)\{\s*'use strict';\s*var CFG =[\s\S]*?<\/script>/i);
  if (staffScriptMatch) {
    console.log("Staff Script snippet (first 1200 chars):");
    console.log(staffScriptMatch[0].slice(0, 1200));
  }

  // 5. Game inspection
  console.log("\n=========================================");
  console.log("GAME DETAILS (Sahand Pizza Run)");
  console.log("=========================================");
  const gameRes = await fetch("https://caferagrug.com/game/");
  const gameHtml = await gameRes.text();
  const gameScriptMatch = gameHtml.match(/\(function\(\)\{\s*'use strict';\s*var d =[\s\S]*?<\/script>/i);
  if (gameScriptMatch) {
    console.log("Game Script snippet (first 1200 chars):");
    console.log(gameScriptMatch[0].slice(0, 1200));
  }

  // 6. Typography & Design Tokens
  console.log("\n=========================================");
  console.log("TYPOGRAPHY & DESIGN TOKENS");
  console.log("=========================================");
  const fontMatches = [...menuHtml.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)];
  console.log("Font-face definitions found in menu:", fontMatches.length);
  fontMatches.forEach((f, i) => console.log(`Font ${i}:`, f[1].replace(/\s+/g, " ").trim()));

  const colorVars = menuHtml.match(/--[a-zA-Z0-9_-]+:\s*[^;]+;/g);
  if (colorVars) {
    console.log("CSS Variables sample (first 15):", colorVars.slice(0, 15));
  }
  // 7. API Endpoints
  console.log("\n=========================================");
  console.log("PASSPORT API ENDPOINTS");
  console.log("=========================================");
  const passPaths = [...passHtml.matchAll(/api\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  console.log("Passport API calls:", [...new Set(passPaths)]);

  // Let's test calling public endpoints
  for (const ep of ["/config", "/rewards", "/bands"]) {
    try {
      const res = await fetch("https://ragrug-orders.samkazerouni123.workers.dev/passport" + ep);
      if (res.ok) {
        console.log(`Endpoint ${ep} (status ${res.status}):`, await res.json());
      } else {
        console.log(`Endpoint ${ep} returned ${res.status}`);
      }
    } catch(e) {
      console.log(`Endpoint ${ep} error:`, e.message);
    }
  }
}

main().catch(console.error);
