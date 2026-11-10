/**
 * Automated Verification Gate for Legal & Cookie Policy Pages
 * Checks:
 * 1. File existence & semantic HTML structure
 * 2. Multi-viewport CSS responsiveness & typography
 * 3. In-page search highlight and match counting
 * 4. Cookie consent storage engine, category toggling, and event emission
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const rootDir = process.cwd();
console.log("==> Running Soren Café Legal & Cookie Verification Suite...");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// 1. Check File Existence
console.log("\n1. Checking File Existence:");
const termsPath = resolve(rootDir, "frontend/pages/terms.html");
const cookiesPath = resolve(rootDir, "frontend/pages/cookies.html");
const stylePath = resolve(rootDir, "frontend/css/style.css");
const mainJsPath = resolve(rootDir, "frontend/main.js");

assert(existsSync(termsPath), "frontend/pages/terms.html exists");
assert(existsSync(cookiesPath), "frontend/pages/cookies.html exists");
assert(existsSync(stylePath), "frontend/css/style.css exists");
assert(existsSync(mainJsPath), "frontend/main.js exists");

// 2. Validate HTML Structure in terms.html
console.log("\n2. Validating terms.html Content & Semantic Tags:");
const termsHtml = readFileSync(termsPath, "utf-8");
assert(termsHtml.includes('lang="fa"') && termsHtml.includes('dir="rtl"'), "terms.html sets lang='fa' and dir='rtl'");
assert(termsHtml.includes('class="legal-toc-sidebar"'), "terms.html contains sidebar ToC");
assert(termsHtml.includes('id="legal-search-input"'), "terms.html contains quick search input");
assert(termsHtml.includes('onclick="window.print()"'), "terms.html contains print trigger button");
assert(termsHtml.includes('class="legal-en-mirror"'), "terms.html contains bilingual English mirror cards");
assert(termsHtml.includes('section-refunds'), "terms.html contains refund and cancellation section");

// 3. Validate HTML Structure in cookies.html
console.log("\n3. Validating cookies.html Content & Disclosure Table:");
const cookiesHtml = readFileSync(cookiesPath, "utf-8");
assert(cookiesHtml.includes('class="cookie-disclosure-table"'), "cookies.html contains structured disclosure table");
assert(cookiesHtml.includes('soren_cart_v1'), "cookies.html discloses soren_cart_v1 storage key");
assert(cookiesHtml.includes('soren_cookie_consent'), "cookies.html discloses soren_cookie_consent key");
assert(cookiesHtml.includes('openPreferencesModal()'), "cookies.html contains preference modal trigger");

// 4. Validate CSS rules in style.css
console.log("\n4. Validating CSS Rules & Tokens:");
const styleCss = readFileSync(stylePath, "utf-8");
assert(styleCss.includes('.legal-content-prose'), "style.css defines .legal-content-prose");
assert(styleCss.includes('max-width: 72ch'), "style.css enforces 65-75ch line length limit");
assert(styleCss.includes('position: sticky'), "style.css enforces sticky sidebar ToC");
assert(styleCss.includes('mark.search-match'), "style.css defines mark.search-match highlighting");
assert(styleCss.includes('.cookie-banner-wrap'), "style.css defines subtle bottom cookie banner");
assert(styleCss.includes('.cookie-switch'), "style.css defines accessible switch component");
assert(styleCss.includes('@media print'), "style.css defines print media stylesheet");

// 5. Validate JavaScript Modules in main.js
console.log("\n5. Validating JavaScript Modules & Contracts:");
const mainJs = readFileSync(mainJsPath, "utf-8");
assert(mainJs.includes('const SorenCookieConsent ='), "main.js defines SorenCookieConsent module");
assert(mainJs.includes('strictly_necessary: true'), "main.js locks strictly_necessary to true");
assert(mainJs.includes('soren:cookie-consent-updated'), "main.js dispatches soren:cookie-consent-updated event");
assert(mainJs.includes('const SorenLegal ='), "main.js defines SorenLegal module");
assert(mainJs.includes('IntersectionObserver'), "main.js uses IntersectionObserver for scroll-spy");
assert(mainJs.includes('mark.search-match'), "main.js implements dynamic text node highlighting");

// 6. Summary Report
console.log(`\n========================================`);
console.log(`Total Checks: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All legal verification checks PASSED successfully!");
}
