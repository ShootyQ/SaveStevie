# Plaguefire performance and visibility — Alpha 0.1.67

Burned patches are filled as a single union with no strokes or internal borders. Wood grain is drawn once into a reusable canvas, anchored to page coordinates. New scars, resets, resizes and movement invalidate the layer; ordinary frames blit it. A private WeakMap retains each patch's 16-point rough outline instead of recalculating trigonometry every frame.

Active pools use one transparent green fill, two bubbles and two quieter flames instead of three filled outlines, five bubbles and four flames. Their damage, radii, duration, caps, strongest-overlap rule, immunities and erasing are retained. Damage checks reject distant enemies before consulting erased grid cells, and empty-patch updates return early. Paper-hole grain rendering remains available to the existing paper system.

A general crowded scene used 80 monsters and 12 walls, comparing rendering with and without the then-maximum Plaguefire load (24 scars and 12 active pools). The browser check also measures the isolated Plaguefire drawing pass. It uses Chromium, software-readable canvases and raster readback, with warm-up and the median of three 20-frame batches. These timings describe this headless environment, not mobile-device frame rates.

| Viewport width | Old Plaguefire pass | New Plaguefire pass |
| --- | ---: | ---: |
| 1280px | 63.8 ms | 2.3 ms |
| 393px | 23.1 ms | 1.4 ms |

The phone-sized scene without Plaguefire measured 6.4 ms before and 7.2 ms after; the loaded scene measured 40.0 ms before and 8.5 ms after. Desktop baseline timings varied substantially between contexts, so use the isolated effect measurements rather than treating the total-render ratio as an overall speedup.

Repeat the comparison by saving the previous `js/plaguefire.js` into a temporary file and running `node tests/browser-plaguefire-performance.cjs /tmp/plaguefire-before.js`. Without that argument, the check exercises only the current renderer. The check writes before/after screenshots under `/tmp`. Required `node tests/validate.cjs` and `npm run build:web` also passed.

Alpha 0.1.90 extends scar lifetime to a five-wave chapter and raises the safety budget to 512 scars. The same cached union desk layer remains in use; the timings above describe the earlier 24-scar benchmark.
