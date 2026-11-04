# Synchronized Focused Category Carousel Design

## Intent & Why
Provide an intuitive, single-card focused carousel for Soren Café's 3 primary categories (`قهوه‌ها`, `بار سرد و شیک‌ها`, `کیک و دسرهای روز`) on mobile viewports. Each card is focused 100% on screen with synchronized pagination dots and two-way catalog filtering sync, eliminating awkward horizontal card slices and connecting the overview directly to the menu below.

## Goals
1. Focused 1-card view on mobile screens (<= 640px) with `scroll-snap-type: x mandatory`.
2. Minimal 3-dot pagination bar beneath the carousel, with active terracotta pill expansion and tap-to-scroll.
3. Two-way menu catalog synchronization: swiping to a category updates the single-surface catalog filter below (`setCategory('coffee' | 'shakes' | 'cake')`), smoothly updating sticky chips and product grid.
4. Native 60fps hardware acceleration, zero external JS libraries, and preservation of desktop layout.

## Non-Goals
- Desktop category grid remains untouched (standard 3-column layout).
- No external carousel libraries (no Swiper, Slick, or Keen-slider).

## Approaches Considered
- **Approach 1 (Selected):** Native CSS `scroll-snap` + `IntersectionObserver` in vanilla JS triggering existing `setCategory()`.
- **Approach 2 (Discarded):** Text tab switcher without photo carousel.
- **Approach 3 (Discarded):** Custom touch-gesture JS slider with chevron buttons.

## Interface & Behavioral Contracts
- `frontend/index.html`: `.category-card` elements have `data-category="coffee"`, `data-category="shakes"`, `data-category="cake"`.
- Container `<div class="category-carousel-dots" id="category-dots" role="tablist">` with 3 `<button class="carousel-dot" ...>` elements.
- `frontend/main.js`: `initCategoryCarouselSync()` manages synchronization between scroll position, dot state, and catalog filter.
