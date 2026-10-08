# Wobblechomp animation preview

Open **Settings → Test a wave / boss → Wobblechomp · Animation preview**.
This is an animation preview; the current wave-10 encounter still uses
Staple Snack. The preview neither spends ink nor changes combat or saved progress.

Try **Punch**, **Spikes**, or **Eye beam**. Spikes lift the foot before launching
five projectiles; the eye coils back and marks its aim before sweeping a beam.
Draw across any circled joint and lift your finger. One gesture can only make
one cut to one part, even if it crosses several joints repeatedly. The first cut
interrupts that part’s attack and leaves it dangling; the second drops it. Fallen
parts bounce and settle independently. Any missing-part combination uses the
same rig. A missing spiky leg adds a little imbalance to the body’s idle pose.

**Inspect** keeps the original slow animation timing; **Quick · 2×** advances
all animations twice as fast, including warnings and recovery. **Cycle attacks**
rotates through punch, spikes and beam, skipping detached parts. This is a pace
preview, not the final combat balance. Attack poses are mutually exclusive.

Reset restores the assembled monster. Pointer cancellation does not count as a
cut. Pause and backgrounding stop the preview; closing returns to Settings.

## Reusable pieces

`js/wobblechomp-animation.js` owns the deterministic model, poses, cut detection
and canvas drawing. The body, fist, eye and spiky foot are independent layers.
Connections are drawn between anchors, so losing another part later will not
require a separate sprite for every combination. Drawing never advances the
model or consumes combat randomness. Idle bob/sway, imbalance and falling-part rotation
are suppressed with reduced motion; the deliberate punch and falling motion
remain visible.

`js/wobblechomp-preview.js` owns loading, pointer input, its own animation loop
and dialog controls. The atlas loads only when the preview opens. Coordinates
are mapped through the canvas fit transform after resize; the underlying
Settings dialog becomes inert, with focus restored when the preview closes.

The arm, spiky leg and eye stalk are interactive. Tooth minions, rolling,
drawing erasure, boss damage and combat integration are later work. Spikes
and beams in this preview are animation effects only. The tucked-body art is
prepared but has no rolling animation yet.

## Checks

- `node tests/validate.cjs`
- `node tests/wobblechomp-animation.cjs`
- `NODE_PATH=/opt/codex/cua_node/lib/node_modules node tests/browser-wobblechomp.cjs`
- `NODE_PATH=/opt/codex/cua_node/lib/node_modules node tests/browser-menus.cjs`
- `npm run build:web`

The browser check covers desktop, two portrait phone sizes and landscape,
all three attacks, repeated crossings, cancellation, all six missing-part orders,
falling/settling, quick timing, auto cycling, pause,
resize, reduced motion, keyboard focus, backgrounding and unchanged combat/save.
These are Chromium checks; physical Android testing is still useful.
