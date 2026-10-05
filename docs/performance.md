# Crowded-fight performance

## Changes

- Cache bounds, segments, and centers for immutable completed-wall point arrays.
  Skip distant walls/segments before exact collision checks. Use squared-radius
  checks and stop lightning target selection once the original target limit is
  reached, preserving enemy order and strict radius boundaries.
- Reuse small ink-glyph sprites through OffscreenCanvas, with bounded animation
  phase caches and a vector fallback. Reset sprites when pixel density changes.
- Preserve upgrade/ink badge DOM nodes until their displayed contents change;
  update HUD text only when its value changes.
- Track active damage labels without per-hit array filtering. Keep their existing
  budget and presentation behavior.
- Limit cosmetic particles to 1,800; prioritize contact/death bursts and consume
  the same random draws even for omitted particles. Combat stays deterministic.

Wall points produced by createWall are immutable. If a future feature edits
coordinates in place, it must invalidate or revise wallGeometry caching.

## Repeatable benchmark

With Playwright available to Node and Chromium installed, run:

```sh
node tests/browser-performance.cjs /path/to/source /tmp/performance.json
```

Set CHROMIUM_PATH when Chromium is at a custom location. The game itself still
needs no packages. The benchmark intercepts local HTTP requests, so no local
server is required. It runs a seeded phone-sized DPR-2 scene with 180 enemies,
12 walls × 120 vertices, eight ink families, and active synergies. It measures
180 frames after 30 warm-up frames and prints API costs and a CPU sample profile.
It hashes combat state and the next random draw so reference comparisons can
verify unchanged outcomes independently of visual particle counts.

Observed on the onboarding host in headless Chromium:

| Metric | Before | After |
| --- | ---: | ---: |
| Median update + draw | 20.7 ms | 8.2 ms |
| 95th percentile update + draw | 26.2 ms | 11.6 ms |
| Median simulation update | 11.8 ms | 2.2 ms |
| Median draw submission | 8.7 ms | 6.0 ms |
| Active particles at end | 8,579 | 1,750 |

Combat-state and next-random-value hashes matched exactly. These are synchronous
CPU/update/draw-submission measurements on this host, not end-to-end frame rate,
GPU/compositor timing, or physical Pixel results. Use device playtests to assess
battery, thermals, and real-world smoothness.
