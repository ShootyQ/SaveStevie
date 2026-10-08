# Wobblechomp animation preview

Open **Settings → Test a wave / boss → Wobblechomp · Animation preview**.
This is the first animation slice; the current wave-10 encounter still uses
Staple Snack. The preview neither spends ink nor changes combat or saved progress.

Try Punch, then draw across the shoulder threads inside the green circle and
lift your finger. One gesture can only make one cut, even if it crosses repeatedly.
The first cut interrupts the punch and leaves the arm dangling. The second
interrupts it and drops the fist, which bounces and settles on the page. Reset
restores the assembled monster. Pointer cancellation does not count as a cut.
Pause and backgrounding stop the preview; closing returns to Settings.

## Reusable pieces

`js/wobblechomp-animation.js` owns the deterministic model, poses, cut detection
and canvas drawing. The body, fist, eye and spiky foot are independent layers.
Connections are drawn between anchors, so losing another part later will not
require a separate sprite for every combination. Drawing never advances the
model or consumes combat randomness. Idle bob/sway and falling-fist rotation
are suppressed with reduced motion; the deliberate punch and falling motion
remain visible.

`js/wobblechomp-preview.js` owns loading, pointer input, its own animation loop
and dialog controls. The atlas loads only when the preview opens. Coordinates
are mapped through the canvas fit transform after resize; the underlying
Settings dialog becomes inert, with focus restored when the preview closes.

Only the fist is interactive in this slice. Spikes, tooth minions, eye beams,
rolling, other detachable parts, boss damage and combat integration are later
work. The tucked-body art is prepared but has no rolling animation yet.

## Checks

- `node tests/validate.cjs`
- `node tests/wobblechomp-animation.cjs`
- `NODE_PATH=/opt/codex/cua_node/lib/node_modules node tests/browser-wobblechomp.cjs`
- `NODE_PATH=/opt/codex/cua_node/lib/node_modules node tests/browser-menus.cjs`
- `npm run build:web`

The browser check covers desktop, two portrait phone sizes and landscape,
punching, repeated crossings, cancellation, both cuts, falling/settling, pause,
resize, reduced motion, keyboard focus, backgrounding and unchanged combat/save.
These are Chromium checks; physical Android testing is still useful.
