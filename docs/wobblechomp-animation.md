# Wobblechomp animation preview

Open **Settings → Test a wave / boss → Wobblechomp · Animation preview**.
This remains an isolated animation preview. Wave 10 now uses the fast
Wobblechomp phase-one fight described in [wobblechomp-phase-one.md](wobblechomp-phase-one.md).
The preview neither spends ink nor changes combat or saved progress.

Try **Punch**, **Spikes**, **Eye beam**, **Teeth!**, or **Tuck & roll**. Spikes lift the foot before launching
five projectiles; the eye coils back and marks its aim before sweeping a beam.
Draw across any circled joint and lift your finger. One gesture can only make
one cut to one part, even if it crosses several joints repeatedly. The first cut
interrupts that part’s attack and leaves it dangling; the second drops it. Fallen
parts bounce and settle independently. Any missing-part combination uses the
same rig. A missing spiky leg adds a little imbalance to the body’s idle pose.

**Inspect** keeps the original slow animation timing; **Quick · 2×** advances
all animations twice as fast, including warnings and recovery. **Cycle attacks**
rotates through punch, spikes, beam, teeth and rolling, skipping detached parts. This is a pace
preview, not the final combat balance. Attack poses are mutually exclusive.

**Tuck & roll** blends the upright body into its tucked core while folding attached
parts inward. A marked route and rocking wind-up precede three rolling legs of
the path: across the page, back the other way, then home to brake and unfold.
Successive rolls alternate the first direction. Three bursts each emit three
spikes while the spiky leg is attached; three separate teeth drop along the
route with short arcs, marked landings and the existing bounce/wait/scurry.
Removing the leg stops rolling spikes; teeth drops remain available. Missing
and dangling appendages retain their state when he unfolds. Cut guides hide
while tucked, and strokes cannot cut hidden joints during this animation.
Reduced motion keeps translation and the stage changes, with no core spinning,
wind-up squash/rocking, decorative bounce or speed streaks. Both preview speeds
and the attack cycle include the new move.

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

**Teeth!** rattles the body and opens its mouth, then launches 6–10 tooth doodles
in a staggered burst toward marked landing spots. Each follows an arc, bounces,
waits briefly, and starts scurrying. Teeth mirror when turning at the page edges.
The count varies deterministically between packs without combat RNG. Old packs
fade as a new pack launches, and preview teeth expire after seven seconds; at
most twenty can be present. Reset clears both queued launches and live teeth.
The mouth attack remains available with missing appendages.

`assets/art/wobble-tooth.png` is a separate original transparent crayon doodle,
loaded alongside the atlas only when opening the preview. No new sounds ship
with this animation slice. Reduced motion suppresses the rattle, airborne spin,
landing squash and decorative hops, while keeping launch and travel visible.

The arm, spiky leg and eye stalk are interactive. The real fight now uses
paid cuts, wall erasure, damage and tooth helpers. Spikes
and beams in this preview are animation effects only. Rolling reuses the tucked-body atlas cell; its curled little support feet are
part of the core, while the removable giant fist, spiky leg and eye remain
separate layers. This slice adds no new image assets.

## Checks

- `node tests/validate.cjs`
- `node tests/wobblechomp-animation.cjs`
- `NODE_PATH=/opt/codex/cua_node/lib/node_modules node tests/browser-wobblechomp.cjs`
- `NODE_PATH=/opt/codex/cua_node/lib/node_modules node tests/browser-menus.cjs`
- `npm run build:web`

The browser check covers desktop, two portrait phone sizes and landscape,
all five attacks, the roll stages and turns, all eight roll part combinations,
teeth warning/flight/bounce/scurry and bounded repeated packs, repeated crossings, cancellation, all six missing-part orders,
falling/settling, quick timing, auto cycling, pause,
resize, reduced motion, keyboard focus, backgrounding and unchanged combat/save.
These are Chromium checks; physical Android testing is still useful.
