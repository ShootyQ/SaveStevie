# Upgrade doodles

32 original transparent SVG drawings made for the upgrade cards. Each uses
simple uneven pen strokes, colored-pencil colors, and a 64×64 viewBox. They
illustrate ink tanks, refill, repair, walls, parallel strokes, health, rocks,
luck, and economy upgrades. Existing ink-family/pencil PNG artwork supplies the
remaining choices. Death Ink uses a small purple-eyed skull.

SVGs have no scripts, external resources, fonts, or animation. They are copied
with the static site and receive the same deployment version as existing art.
Cards keep a decorative pen fallback if an asset fails to load. Asset names
match the lower-case, hyphenated upgrade names; the selection and stacking
rules are unchanged.

`backdraft.svg` is original hand-drawn-style vector art for legendary Fire Ink.
In-game pressure pockets and the layered flame front are procedural Canvas
art in `js/backdraft.js`, driven by the shared wall heat and simulation clock.
Reduced motion removes pocket pulsing and animated ember drift.

`iceberg.svg` is original vector art for the Legendary Frost Ink · Iceberg reward: a graphite-outlined, faceted ice shelf with cracks and snowflakes.
