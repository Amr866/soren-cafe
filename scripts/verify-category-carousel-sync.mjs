import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT_DIR, 'frontend/index.html');
const CSS_PATH = path.join(ROOT_DIR, 'frontend/css/style.css');

console.log('--- Verifying Task 1: Carousel HTML Structure ---');
const html = fs.readFileSync(HTML_PATH, 'utf8');

const hasCategoryDots = html.includes('id="category-dots"') && html.includes('class="category-carousel-dots"');
assert.ok(hasCategoryDots, 'category-dots element not found in index.html');

const hasCoffeeAttr = /<article[^>]*class="[^"]*category-card[^"]*"[^>]*data-category="coffee"/.test(html);
const hasShakesAttr = /<article[^>]*class="[^"]*category-card[^"]*"[^>]*data-category="shakes"/.test(html);
const hasCakeAttr = /<article[^>]*class="[^"]*category-card[^"]*"[^>]*data-category="cake"/.test(html);

assert.ok(hasCoffeeAttr, 'category-card for coffee missing data-category="coffee"');
assert.ok(hasShakesAttr, 'category-card for shakes missing data-category="shakes"');
assert.ok(hasCakeAttr, 'category-card for cake missing data-category="cake"');

console.log('✅ Task 1 HTML Structure verified successfully!');

console.log('--- Verifying Task 2: CSS Scroll-Snap and Carousel Dots ---');
const css = fs.readFileSync(CSS_PATH, 'utf8');

// Check desktop hides dots
assert.ok(
  css.includes('.category-carousel-dots') && css.includes('display: none'),
  'category-carousel-dots should be hidden on desktop by default'
);

// Check mobile media query enables dots and scroll snap
assert.ok(
  css.includes('scroll-snap-type: x mandatory'),
  'CSS must include scroll-snap-type: x mandatory for mobile carousel'
);

assert.ok(
  css.includes('.carousel-dot.active'),
  'CSS must include .carousel-dot.active with active styling'
);

console.log('✅ Task 2 CSS Scroll-Snap and Dots verified successfully!');
