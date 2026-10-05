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

## Custom-art check

After integrating the notebook PNGs, the same seeded crowded-fight benchmark
was compared against the preceding mobile/sniper branch. Images were fully
loaded before timing. Median update + draw measured 8.1ms before and 7.4ms after
on this host; the combat/next-random hash matched exactly. This single comparison
establishes no observed regression in that scene, not a guaranteed speedup on
phones. Status combinations are composed once into a bounded cache (initially 32
entries; see the current limits below); wall artwork retains its bounded phase cache. Missing asset loads use vectors.

The subsequent barrier/arrow fix measured 7.9ms median update + draw and 10.1ms
p95 in the same crowded scene on this host. Forced movement now checks wall
paths; its combat hash intentionally differs because gravity no longer moves
monsters through barriers. The six additional PNGs still load once and share
the same bounded caches.

## Wave 20: mixed-monster status-cache churn

A late-wave scene with many monster types and stacked statuses exceeded the
old 32-entry tinted-sprite cache. Its first-in/first-out eviction also ignored
recent hits. A steady mixed crowd rebuilt most of its colored images every
frame, allocating thousands of offscreen canvases and repeatedly compositing
PNG artwork. CPU sampling showed `drawImage`, tint creation, context creation,
and garbage collection dominating this scene.

Tinted sprites now use least-recently-used eviction, with both a 192-entry
limit and a 16 MiB RGBA-pixel budget. Hits promote entries; genuinely unused
combinations are discarded first. Oversized individual images are not cached
and do not flush the working set. The original source dimensions, status colors,
alpha, animations, draw order, and combat rules are preserved. These limits
count cached pixel storage, not total browser/GPU process memory.

The existing benchmark now disables introductions and music before starting,
so its simulation actually runs. Add `wave20` to reproduce the rendering case:

```sh
node tests/browser-performance.cjs /path/to/source /tmp/wave20.json wave20
```

This phone-sized DPR-2 case draws 180 enemies across all 19 types and four
stacked-status combinations, 12 closed walls with all ten inks, 1,800 particles,
48 damage labels, eight lightning casts, and four explosions. It measures 150
render submissions after 40 warm-up frames; simulation is held fixed to isolate
rendering. A final capture freezes decorative wall hues and hashes canvas pixels
alongside combat state and the next random draw.

Observed on this host in headless Chromium, comparing main commit `5df2212`
with this fix:

| Mixed-crowd rendering | Before | After |
| --- | ---: | ---: |
| Median draw submission | 75.8 ms | 9.3 ms |
| 95th percentile | 87.7 ms | 11.2 ms |
| New canvases in timed loop and final capture | 22,975 | 23 |
| New tinted images after warm-up | continually rebuilt | 0 |

The remaining 23 canvases are bounded wall-glyph animation phases. The working
set contains 76 tinted images using 11,172,992 RGBA bytes, with no evictions in
this scene. Canvas-pixel and combat/randomness hashes matched exactly. The
separate seeded simulation benchmark also retained its combat hash. Timings
measure CPU/draw submission on this host; they do not establish physical Pixel
frame rates or total GPU/compositor cost.

Validation also exercises more than 32 mixed sprites, repeated cache hits,
eviction over many status combinations, storage limits, run reuse, and render
purity. `rendererCacheStats()` exposes cloned counts for profiling without
exposing images or changing combat state.
