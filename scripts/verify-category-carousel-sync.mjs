import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT_DIR, 'frontend/index.html');
const CSS_PATH = path.join(ROOT_DIR, 'frontend/css/style.css');
const JS_PATH = path.join(ROOT_DIR, 'frontend/main.js');

console.log('--- Verifying Task 1: Carousel HTML Structure ---');
const html = fs.readFileSync(HTML_PATH, 'utf8');

// Check category dots container and buttons
const hasCategoryDots = html.includes('id="category-dots"') || html.includes('class="category-carousel-dots"');
assert.ok(hasCategoryDots, 'category-dots element not found in index.html');

const hasCoffeeAttr = /<article[^>]*class="[^"]*category-card[^"]*"[^>]*data-category="coffee"/.test(html);
const hasShakesAttr = /<article[^>]*class="[^"]*category-card[^"]*"[^>]*data-category="shakes"/.test(html);
const hasCakeAttr = /<article[^>]*class="[^"]*category-card[^"]*"[^>]*data-category="cake"/.test(html);

assert.ok(hasCoffeeAttr, 'category-card for coffee missing data-category="coffee"');
assert.ok(hasShakesAttr, 'category-card for shakes missing data-category="shakes"');
assert.ok(hasCakeAttr, 'category-card for cake missing data-category="cake"');

console.log('✅ Task 1 HTML Structure verified successfully!');
